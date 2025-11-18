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
const server = http.createServer(app);

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://client.zonta.eikon.ch',
  'https://www.client.zonta.eikon.ch',
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(bodyParser.json());

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:jminguely@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Store push subscriptions in memory (in production, use a database)
const pushSubscriptions = new Set();

// Helper function to send push notification to all subscribers
async function sendPushNotification(payload) {
  const notifications = [];

  for (const subscription of pushSubscriptions) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      notifications.push({ subscription, success: true });
    } catch (error) {
      console.error('Error sending push notification:', error);
      // If subscription is no longer valid, remove it
      if (error.statusCode === 410) {
        pushSubscriptions.delete(subscription);
      }
      notifications.push({ subscription, success: false, error });
    }
  }

  return notifications;
}

// Token management system
const TOKEN_EXPIRY_MS = parseInt(process.env.TOKEN_EXPIRY_MS) || 120000;
let currentToken = '';
let tokenTimestamp = 0;

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

function getCurrentToken() {
  const now = Date.now();
  if (now - tokenTimestamp > TOKEN_EXPIRY_MS) {
    currentToken = generateToken();
    tokenTimestamp = now;
    console.log(`New token generated: ${currentToken} (expires in ${TOKEN_EXPIRY_MS}ms)`);
  }
  return currentToken;
}

function isValidToken(token) {
  return token === getCurrentToken();
}

app.get('/api/current-token', (req, res) => {
  res.json({
    token: getCurrentToken(),
    expiresAt: new Date(tokenTimestamp + TOKEN_EXPIRY_MS).toISOString(),
    expiryMs: TOKEN_EXPIRY_MS
  });
});

app.get('/api/validate-token/:token', (req, res) => {
  const { token } = req.params;
  res.json({
    valid: isValidToken(token),
    currentToken: getCurrentToken()
  });
});

// Mode debug : messages de test (tirés de votre CSV)
const DEBUG_MESSAGES = [
  { author: 'A', content: "Allez Fribourg-Gottéron.", toxicity: 0.007 },
  { author: 'A', content: "J'ai mis des années à comprendre que les remarques constantes sur mon poids...", toxicity: 0.015 },
  { author: 'A', content: "À toutes les femmes qui se battent en silence, vous n'êtes pas seules.", toxicity: 0.006 },
  { author: 'A', content: "Les hommes aussi subissent des violences ! Pourquoi on ne parle que des femmes ? C'est de la discrimination.", toxicity: 0.061 },
  { author: 'A', content: "La plupart du temps, ce sont des problèmes de couple. Si les femmes étaient moins provocantes, ça n'arriverait pas.", toxicity: 0.055 },
  { author: 'A', content: "Moi, je me suis jamais laissé faire. J'aurais mis mon agresseur au tapis.", toxicity: 0.148 },
  { author: 'A', content: "Nique la police", toxicity: 0.1 }, // Exemple ajouté
  { author: 'A', content: "S4l0p3 de féministes", toxicity: 0.2 }, // Exemple ajouté
  { author: 'A', content: "Nike les arbres", toxicity: 0.15 } // Exemple ajouté
];

// ... (Le endpoint /debug/messages reste le même) ...
app.post('/debug/messages', async (req, res) => {
  try {
    const createdMessages = [];
    for (const { author, content, toxicity: debugTox } of DEBUG_MESSAGES) {
      // Simule l'appel API ou utilise la toxicité fournie
      let toxicity = debugTox;

      // Nouvelle logique unifiée avec LLM
      const classification = await classifyContent(content);
      let flagged = classification.flagged;
      let flagReason = classification.flagReason;
      if (!flagged && toxicity !== null && toxicity > PERSPECTIVE_THRESHOLD) {
        flagged = 'toxic';
        flagReason = `perspective:>${PERSPECTIVE_THRESHOLD}`;
      }
      const onTopic = flagged !== 'hors-sujet';

      const messageData = {
        author,
        content,
        toxicity,
        onTopic,
        flagged,
        flagReason: flagReason || null,
        // If flagged, default to hidden so admin sees it as not displayed
        hidden: Boolean(flagged),
        createdAt: new Date().toISOString()
      };
      const message = await createMessage(messageData);
      createdMessages.push(message);
      if (message.flagged) io.to('admin').emit('admin-new-message', message);
      else io.emit('new-message', message);
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
const { getToxicityScore } = require('./models/perspective');
// LLM-based moderation for off-topic detection
const { checkTopicRelevance } = require('./models/llmModeration');

// Database
const { getAllMessages, createMessage, updateMessage, deleteMessage, bulkUpdateMessages, getHiddenMessagesSince } = require('./models/database');
const { countHiddenMessagesSince } = require('./models/database');

// Push notification endpoints
app.post('/push/subscribe', (req, res) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }

  pushSubscriptions.add(subscription);
  console.log(`New push subscription: ${subscription.endpoint.substring(0, 50)}...`);

  res.json({ success: true, message: 'Subscription saved' });
});

app.post('/push/unsubscribe', (req, res) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }

  // Find and remove subscription
  for (const sub of pushSubscriptions) {
    if (sub.endpoint === subscription.endpoint) {
      pushSubscriptions.delete(sub);
      console.log(`Push subscription removed: ${subscription.endpoint.substring(0, 50)}...`);
      break;
    }
  }

  res.json({ success: true, message: 'Subscription removed' });
});

app.get('/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
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
async function classifyContent(content) {
  // 1) Check synchronous patterns first (toxic + spam)
  const syncResult = classifyContentSync(content);
  if (syncResult.flagged) {
    return syncResult;
  }

  // 2) Use LLM to check topic relevance
  const llmResult = await checkTopicRelevance(content);
  if (!llmResult.isOnTopic) {
    return {
      flagged: 'hors-sujet',
      flagReason: `llm:${llmResult.reason || 'off-topic'}`
    };
  }

  // 3) Not flagged
  return { flagged: null, flagReason: null };
}

// Poster un message (logique refactorisée avec LLM)
app.post('/messages', async (req, res) => {
  const { author, content } = req.body;
  if (!author || !content) return res.status(400).json({ error: 'Champs manquants' });

  // Run Perspective API and LLM classification in parallel
  const [toxicity, classification] = await Promise.all([
    getToxicityScore(content).catch(e => {
      console.warn('Échec récupération score toxicité:', e.message);
      return null;
    }),
    classifyContent(content)
  ]);

  // --- LOGIQUE DE FLAGGING (refacto avec LLM) ---
  let flagged = classification.flagged;
  let flagReason = classification.flagReason;

  // Si pas encore flaggé, on regarde Perspective
  if (!flagged && toxicity !== null && toxicity > PERSPECTIVE_THRESHOLD) {
    flagged = 'toxic';
    flagReason = `perspective:>${PERSPECTIVE_THRESHOLD}`;
  }

  // onTopic is true unless flagged as hors-sujet
  const onTopic = flagged !== 'hors-sujet';
  // --- FIN LOGIQUE ---

  const messageData = {
    author,
    content,
    toxicity,
    onTopic, // onTopic is true unless flagged as hors-sujet (determined by LLM)
    flagged, // 'toxic', 'hors-sujet', or null
    flagReason: flagReason || null,
    // Si flaggé, masquer par défaut côté admin (cohérent avec l'affichage public)
    hidden: Boolean(flagged),
    createdAt: new Date().toISOString()
  };

  try {
    const message = await createMessage(messageData);
    if (message.flagged) io.to('admin').emit('admin-new-message', message);
    else io.emit('new-message', message);

    // Send push notification if message is flagged
    if (message.flagged && pushSubscriptions.size > 0) {
      const flagType = message.flagged === 'toxic' ? 'toxique' : 'hors-sujet';
      await sendPushNotification({
        title: 'Nouveau message signalé',
        body: `Message ${flagType}: "${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}"`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'message-flagged',
        data: {
          messageId: message.id,
          flagged: message.flagged,
          url: '/admin'
        }
      });
    }

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

const PORT = process.env.PORT || 8102;
const HOST = process.env.IP || '::';
server.listen(PORT, HOST, () => {
  console.log(`Serveur démarré sur http://[${HOST}]:${PORT}`);
});
