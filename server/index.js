// --- QR TOKEN SYSTEM ---
const TOKEN_EXPIRY_MS = parseInt(process.env.TOKEN_EXPIRY_MS, 10) || 300000; // default 5 min
const SECRET = process.env.TOKEN_SECRET || 'zonta-secret';
const ALLOWED_IPS = (process.env.ALLOWED_IPS || '127.0.0.1,::1').split(',').map(ip => ip.trim());

function getCurrentToken() {
  // Token changes every TOKEN_EXPIRY_MS, based on current time window
  const now = Date.now();
  const window = Math.floor(now / TOKEN_EXPIRY_MS);
  const crypto = require('crypto');
  return crypto.createHmac('sha256', SECRET).update(String(window)).digest('hex').slice(0, 16);
}

function isIpAllowed(req) {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress;

  // Normalize IPv6 mapped IPv4
  const normalizedIp = clientIp ? clientIp.replace(/^::ffff:/, '') : '';

  console.log(`Checking IP access: ${clientIp} (normalized: ${normalizedIp})`);

  return ALLOWED_IPS.some(allowed => {
    const normalizedAllowed = allowed.replace(/^::ffff:/, '');
    return normalizedAllowed === normalizedIp || allowed === clientIp;
  });
}

// Point d'entrée principal du serveur
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const webpush = require('web-push');
require('dotenv').config();


const app = express();

// Add JSON body parsing middleware (for POST requests)
app.use(express.json());

// --- CORS CONFIGURATION ---
app.use(cors({
  origin: [
    'https://client.zonta.eikon.ch',
    'https://admin.zonta.eikon.ch',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust as needed
    methods: ["GET", "POST", "PATCH", "DELETE"]
  }
});
const DEBUG_MESSAGES = [
  { author: 'A', content: "Allez Fribourg-Gottéron." },
  { author: 'A', content: "J'ai mis des années à comprendre que les remarques constantes sur mon poids..." },
  { author: 'A', content: "À toutes les femmes qui se battent en silence, vous n'êtes pas seules." },
  { author: 'A', content: "Les hommes aussi subissent des violences ! Pourquoi on ne parle que des femmes ? C'est de la discrimination." },
  { author: 'A', content: "La plupart du temps, ce sont des problèmes de couple. Si les femmes étaient moins provocantes, ça n'arriverait pas." },
  { author: 'A', content: "Moi, je me suis jamais laissé faire. J'aurais mis mon agresseur au tapis." },
  { author: 'A', content: "Nique la police" }, // Exemple ajouté
  { author: 'A', content: "S4l0p3 de féministes" }, // Exemple ajouté
  { author: 'A', content: "Nike les arbres" } // Exemple ajouté
];

// ... (Le endpoint /debug/messages reste le même) ...
app.post('/debug/messages', async (req, res) => {
  try {
    const createdMessages = [];
    for (const { author, content } of DEBUG_MESSAGES) {
      const messageData = {
        author,
        content,
        hidden: true,
        priorityNumber: Math.floor(Math.random() * 5) + 1,
        createdAt: new Date().toISOString()
      };
      const message = await createMessage(messageData);
      createdMessages.push(message);
      io.to('admin').emit('admin-new-message', message);
    }

    if (createdMessages.length > 0) {
      sendPushNotification({
        title: 'Messages de debug',
        body: `${createdMessages.length} nouveaux messages de debug ajoutés`,
        data: { url: '/admin' },
        tag: 'debug-messages'
      });
    }

    res.json({ status: 'ok', count: createdMessages.length });
  } catch (error) {
    console.error('Error creating debug messages:', error);
    res.status(500).json({ error: 'Failed to create debug messages' });
  }
});

// --- MODERATION LOGIC ---

// Normalize text (remove accents, lowercase, trim)
function normalizeText(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Patterns TOXIQUES (prioritaires) – victim-blaming, insultes, sexisme, racisme, anti-feminisme, etc.
const NEW_TOXIC_PATTERNS = [
  // Culpabilisation / Minimisation (vos anciens patterns)
  /les hommes aussi subissent des violences/i,
  /discrimination/i,
  /problèmes? de couple/i,
  /si les femmes étaient moins provocantes/i,
  /provocantes?/i,
  /se faire respecter/i,
  /elle l’a mérité/i,
  /manipulatrices/i,
  /féministes inventent/i,
  /crier au viol/i,
  /comment elles sont habillées/i,
  /paraît exagéré/i,
  /restent avec leurs agresseurs/i,
  /tous les hommes ne sont pas violents/i,
  /not all men/i,
  /culpabiliser les hommes/i,
  /féministes? = hystériques/i,
  /trop faibles?/i,
  /je me suis jamais laissé faire/i,
  /j'aurais mis mon agresseur au tapis/i,
  /violence psychologique, non \?/i, // Banalisation

  // Victim-blaming - blaming women for violence against them
  /femmes?.+(part|responsabilit|faute|cause)/i,
  /si elle.+(portait|mettait|habillait).+(pas|moins)/i,
  /si elles?.+(portaient|mettaient|habillaient).+(pas|moins)/i,
  /leur part de responsabilit/i,
  /(un peu|aussi).+responsables?/i,
  /vivraient mieux si/i,
  /auraient (dû|du).+(éviter|faire attention)/i,

  // Dénonciations (selon votre CSV)
  /MAEL VIOLEUR/i,
  /agresser par Titouan/i,

  // Racisme / Xénophobie / Coded
  /p0lice tue les femmes/i,
  /gentil juif/i,
  /nike les arbres/i, // Coded
  /les albanais violent/i,
  /agressé par un nwar/i,
  /agresser par un nwoir/i,
  /n4gre/i,
  /les arbres violeurs/i, // Coded
  /forcer par un mohamed/i,
  /les israelien mon violer/i,
  /BAMBOU LA/i, // Coded
  /mangeur de foutou/i,
  /les blanc on raison/i,
  /femmes? voilées? sortez/i,
  /force au femme voilée, pas du tout/i,

  // Antisémitisme / Provocation
  /liste de shindler/i,
  /Bardella notre exemple/i,

  // Divisive messages - introducing religious/ethnic exclusions in support messages
  /même les (juives?|musulmanes?|arabes?|noires?|blanches?)/i,
  /(juives?|musulmanes?|arabes?).+(ne méritent pas|méritent)/i,
  /sauf les (juives?|musulmanes?|arabes?)/i,

  // Insultes / Sexisme / Slang
  /pvt3/i,
  /s4l0p3 de féministes/i,
  /caler un doigt/i,
  /rentre chez ta mere/i,
  /LA bite/i,
  /femme de joie/i,
  /tous les hommes violent/i,
  /les femme a la cuisine/i,
  /molester par un nain/i // Coded / moquerie
];


// Note: Off-topic detection is now handled by LLM via checkTopicRelevance()
// Only explicit spam/link patterns remain here for immediate filtering
const EXPLICIT_SPAM_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /\btelegram\b|\bwhatsapp\b|\binstagram\b|\btiktok\b/i,
  /\bpromo\b|\bvente\b|\bsolde\b|\bcasino\b/i
];

// ** SEUIL PERSPECTIVE RECOMMANDÉ **
// Votre seuil de 0.7 est trop élevé. Vos propres messages de debug ont des scores < 0.2
// Essayez 0.4 ou 0.5 pour commencer.
const PERSPECTIVE_THRESHOLD = 0.4;

// Perspective API (appel réel)


// Database
const { getAllMessages, createMessage, updateMessage, deleteMessage, bulkUpdateMessages, getHiddenMessagesSince, hasPostedToday, addSubscription, removeSubscription, getAllSubscriptions, countAllMessages } = require('./models/database');
const { countHiddenMessagesSince } = require('./models/database');

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@zonta.eikon.ch',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('VAPID keys configured');
} else {
  console.warn('VAPID keys not configured. Push notifications will not work.');
}

// Helper to send push notifications
async function sendPushNotification(payload) {
  try {
    const subscriptions = await getAllSubscriptions();
    console.log(`Sending push notification to ${subscriptions.length} subscribers`);

    const notifications = subscriptions.map(sub => {
      return webpush.sendNotification(sub, JSON.stringify(payload))
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription has expired or is no longer valid
            console.log(`Subscription expired/invalid: ${sub.endpoint}`);
            return removeSubscription(sub.endpoint);
          }
          console.error('Error sending notification:', err);
        });
    });

    await Promise.all(notifications);
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}

// Push notification endpoints
app.post('/push/subscribe', async (req, res) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }

  try {
    await addSubscription(subscription);
    console.log(`New push subscription: ${subscription.endpoint.substring(0, 50)}...`);
    res.json({ success: true, message: 'Subscription saved' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

app.post('/push/unsubscribe', async (req, res) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }

  try {
    await removeSubscription(subscription.endpoint);
    console.log(`Push subscription removed: ${subscription.endpoint.substring(0, 50)}...`);
    res.json({ success: true, message: 'Subscription removed' });
  } catch (error) {
    console.error('Error removing subscription:', error);
    res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

app.get('/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Récupérer le nombre total de messages
app.get('/messages/count', async (req, res) => {
  try {
    const count = await countAllMessages();
    res.json({ count });
  } catch (error) {
    console.error('Error counting messages:', error);
    res.status(500).json({ error: 'Failed to count messages' });
  }
});

// Récupérer tous les messages
app.get('/messages', async (req, res) => {
  try {
    const messages = await getAllMessages();
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Analytics: hidden messages since ?since=ISO (default: last 24h)
app.get('/analytics/hidden-messages', async (req, res) => {
  try {
    const since = req.query.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || '100')));
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const offset = (page - 1) * limit;
    const includeRaw = (req.query.include === 'raw');

    const [total, messages] = await Promise.all([
      countHiddenMessagesSince(since),
      includeRaw ? getHiddenMessagesSince(since, limit, offset) : Promise.resolve([])
    ]);

    const byFlag = (includeRaw ? messages : []).reduce((acc, m) => {
      const key = m.flagged || 'autre';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const result = {
      since,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit))
    };
    if (includeRaw) {
      result.count = messages.length;
      result.byFlag = byFlag;
      result.messages = messages;
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching hidden messages analytics:', error);
    res.status(500).json({ error: 'Failed to fetch hidden messages analytics' });
  }
});

// Classification de contenu (synchrone, hors appel Perspective et LLM)
function firstMatchingPattern(patterns, text) {
  for (const re of patterns) {
    if (re.test(text)) return re;
  }
  return null;
}

function classifyContentSync(content) {
  // 1) Toxic patterns en premier
  const tox = firstMatchingPattern(NEW_TOXIC_PATTERNS, content);
  if (tox) {
    return { flagged: 'toxic', flagReason: `toxic:${tox}` };
  }
  // 2) Explicit spam/links
  const spam = firstMatchingPattern(EXPLICIT_SPAM_PATTERNS, content);
  if (spam) {
    return { flagged: 'hors-sujet', flagReason: `spam:${spam}` };
  }
  // 3) Not flagged by patterns
  return { flagged: null, flagReason: null };
}

// Classification de contenu (asynchrone, avec LLM pour off-topic)


// Poster un message (logique refactorisée avec LLM)

// Poster un message (tous les messages sont masqués par défaut, aucune modération automatique)
app.post('/messages', async (req, res) => {
  const { author, content } = req.body;
  if (!author || !content) return res.status(400).json({ error: 'Champs manquants' });

  // Enforce 140 character limit
  if (content.length > 140) {
    return res.status(400).json({ error: 'Le message ne peut pas dépasser 140 caractères' });
  }

  // Get client IP address
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress;

  // Check if IP has exceeded daily post limit
  try {
    const canPost = await require('./models/database').canPost(ipAddress);
    if (!canPost) {
      return res.status(429).json({ error: `Vous avez atteint la limite de ${process.env.POSTS_PER_DAY || 5} messages par jour.` });
    }
  } catch (error) {
    console.error('Error checking post limit:', error);
    return res.status(500).json({ error: 'Erreur lors de la vérification de la limite de messages.' });
  }

  // All messages are hidden by default, no flagging, no moderation
  const priorityNumber = Math.floor(Math.random() * 5) + 1;
  const messageData = {
    author,
    content,
    toxicity: null,
    onTopic: true,
    flagged: null,
    flagReason: null,
    hidden: true, // always hidden by default
    priorityNumber,
    ipAddress,
    createdAt: new Date().toISOString()
  };

  try {
    const message = await createMessage(messageData);
    io.to('admin').emit('admin-new-message', message);

    // Emit count update
    const count = await countAllMessages();
    io.emit('message-count-update', count);

    // Send push notification to admins
    sendPushNotification({
      title: 'Nouveau message',
      body: `${author}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      data: { url: '/admin' },
      tag: `message-${message.id}`
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// ... (Le reste de vos endpoints: PATCH /messages/:id, DELETE, /bulk, etc. reste identique) ...

// Mettre à jour un message (pour la modération)
app.patch('/messages/:id', async (req, res) => {
  const messageId = parseInt(req.params.id);
  const { hidden, flagged, flagReason } = req.body;

  // Validate payload (all optional)
  if (
    typeof hidden !== 'undefined' && typeof hidden !== 'boolean'
  ) {
    return res.status(400).json({ error: 'Champ hidden invalide' });
  }
  if (
    typeof flagged !== 'undefined' && !(flagged === null || typeof flagged === 'string')
  ) {
    return res.status(400).json({ error: 'Champ flagged invalide' });
  }
  if (
    typeof flagReason !== 'undefined' && !(flagReason === null || typeof flagReason === 'string')
  ) {
    return res.status(400).json({ error: 'Champ flagReason invalide' });
  }

  try {
    const updatedMessage = await updateMessage(messageId, { hidden, flagged, flagReason });
    io.emit('message-updated', updatedMessage);

    // If message is displayed (hidden: false), remove notification
    if (hidden === false) {
      sendPushNotification({
        action: 'close',
        tag: `message-${messageId}`
      });
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error updating message:', error);
    if (error.message === 'Message not found') {
      res.status(404).json({ error: 'Message non trouvé' });
    } else {
      res.status(500).json({ error: 'Failed to update message' });
    }
  }
});

// Supprimer un message
app.delete('/messages/:id', async (req, res) => {
  const messageId = parseInt(req.params.id);

  try {
    await deleteMessage(messageId);
    io.emit('message-deleted', messageId);

    // Emit count update
    const count = await countAllMessages();
    io.emit('message-count-update', count);

    // Remove notification
    sendPushNotification({
      action: 'close',
      tag: `message-${messageId}`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    if (error.message === 'Message not found') {
      res.status(404).json({ error: 'Message non trouvé' });
    } else {
      res.status(500).json({ error: 'Failed to update message' });
    }
  }
});

// Action groupée sur les messages
app.patch('/messages/bulk', async (req, res) => {
  const { updates } = req.body;

  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Format invalide' });
  }

  try {
    await bulkUpdateMessages(updates);

    // Fetch updated messages and emit events
    for (const update of updates) {
      if (typeof update.hidden === 'boolean') {
        const updatedMessage = await updateMessage(update.id, { hidden: update.hidden });
        io.emit('message-updated', updatedMessage);
      }
    }

    res.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error('Error bulk updating messages:', error);
    res.status(500).json({ error: 'Failed to update messages' });
  }
});


// Socket.IO pour le temps réel
io.on('connection', (socket) => {
  console.log('Nouvel utilisateur connecté');
  socket.on('register-admin', () => {
    socket.join('admin');
    console.log('Socket registered as admin');
  });
});


// --- QR TOKEN ENDPOINTS (must be after app is initialized and middleware is set up) ---
app.get('/api/current-token', (req, res) => {
  if (!isIpAllowed(req)) {
    return res.status(403).json({ error: 'Access denied: IP not whitelisted' });
  }
  const token = getCurrentToken();
  res.json({ token, expiresIn: TOKEN_EXPIRY_MS });
});

app.get('/api/validate-token/:token', (req, res) => {
  const { token } = req.params;
  const validTokens = [getCurrentToken()];
  // Optionally allow previous window for clock skew
  const now = Date.now();
  const prevWindow = Math.floor((now - TOKEN_EXPIRY_MS) / TOKEN_EXPIRY_MS);
  const crypto = require('crypto');
  validTokens.push(
    crypto.createHmac('sha256', SECRET).update(String(prevWindow)).digest('hex').slice(0, 16)
  );
  res.json({ valid: validTokens.includes(token) });
});

const PORT = process.env.PORT || 8102;
const HOST = process.env.IP || '::';
server.listen(PORT, HOST, () => {
  console.log(`Serveur démarré sur http://[${HOST}]:${PORT}`);
});
