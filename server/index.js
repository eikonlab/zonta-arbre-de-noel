// Point d'entrée principal du serveur
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());

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

      // Nouvelle logique unifiée
      const base = classifyContentSync(content);
      let flagged = base.flagged;
      let flagReason = base.flagReason;
      const onTopic = base.onTopic;
      if (!flagged && toxicity !== null && toxicity > PERSPECTIVE_THRESHOLD) {
        flagged = 'toxic';
        flagReason = `perspective:>${PERSPECTIVE_THRESHOLD}`;
      }

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

// --- LOGIQUE DE DETECTION (refacto cohérence de contexte) ---

// Normalisation de texte (accents, casse, espaces)
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

// Mots-clés du domaine (violences faites aux femmes, féminicides, etc.)
const CONTEXT_DOMAIN_KEYWORDS = [
  'violence', 'violent', 'violences',
  'femme', 'femmes', 'fille', 'filles', 'genre',
  'harcelement', 'harceler', 'harcelee', 'harcele',
  'agression', 'agressions', 'agresse', 'agressee', 'agresseur',
  'viol', 'viols', 'violeur', 'abus', 'abuse', 'abusee',
  'controle', 'menace', 'menaces', 'insulte', 'insultes',
  'psychologique', 'physique', 'sexuel', 'sexuelle', 'sexuelles',
  'temoignage', 'temoigner',
  'victime', 'victimes',
  'consentement', 'dependance', 'financiere', 'economique', 'liberte',
  'survivantes', 'courage', 'honte', 'force', 'silence', 'reconstruire', 'espoir', 'partir', 'peur', 'prison', 'amour', 'choix', 'voix', 'corps', 'droit', 'stop', 'non',
  // féminicide et variantes
  'feminicide', 'feminicides', 'stop feminicide', 'stop feminicides',
  // violences conjugales/domestiques
  'violence conjugale', 'violences conjugales', 'violence domestique', 'violences domestiques', 'maltraitance'
];

// Termes positifs d'empowerment / soutien (cohérents avec le contexte)
const CONTEXT_POSITIVE_KEYWORDS = [
  'egalite', 'egalite des sexes', 'droits des femmes', 'droits des femmes',
  'sororite', 'soutien', 'je te crois', 'solidarite', 'respect', 'justice', 'autonomie', 'emancipation', 'empowerment', 'briser le silence'
];

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

// Patterns HORS CONTEXTE (off-topic explicite, pubs/liens, sport, etc.)
// Ceux-ci sont vérifiés APRÈS les patterns toxiques.
const NEW_OFF_TOPIC_PATTERNS = [
  // Sport / Salutations / Tech / Météo / Divers
  /fribourg-gottéron/i,
  /salut maman/i,
  /match ce soir/i,
  /dernier iphone/i,
  /prix de l’essence/i,
  /rêve d’aller au japon/i,
  /putain de pluie/i,
  /Laeticia la gourgandine/i,

  // Politique / Conflits (non liés au sujet principal)
  /la police tue/i, // Version générique
  /free palestine/i,
  /f\* les sionistes/i,
  /la suisse complice/i,
  /nique la police/i, // Classé Hors-Sujet dans votre CSV
  /n\* les arabes/i, // Classé Hors-Sujet dans votre CSV
  /VIVE HIT L’AIR/i, // Provocation Hors-Sujet

  // Coded / Insultes (classés Hors-Sujet dans votre CSV)
  /B!t3/i,
  /trop d’arbre en suisse/i, // Coded
  // Liens / pubs évidents
  /https?:\/\//i,
  /www\./i,
  /\btelegram\b|\bwhatsapp\b|\binstagram\b|\btiktok\b/i,
  /\bpromo\b|\bvente\b|\bsolde\b|\bcasino\b/i
];

// Est-ce cohérent avec le contexte ? (domain OR positif)
function isOnContext(text) {
  if (!text) return false;
  const t = normalizeText(text);
  const hasDomain = CONTEXT_DOMAIN_KEYWORDS.some(k => t.includes(k));
  const hasPositive = CONTEXT_POSITIVE_KEYWORDS.some(k => t.includes(k));
  return hasDomain || hasPositive;
}

// ** SEUIL PERSPECTIVE RECOMMANDÉ **
// Votre seuil de 0.7 est trop élevé. Vos propres messages de debug ont des scores < 0.2
// Essayez 0.4 ou 0.5 pour commencer.
const PERSPECTIVE_THRESHOLD = 0.4;

// Perspective API (appel réel)
const { getToxicityScore } = require('./models/perspective');

// Database
const { getAllMessages, createMessage, updateMessage, deleteMessage, bulkUpdateMessages, getHiddenMessagesSince } = require('./models/database');
const { countHiddenMessagesSince } = require('./models/database');

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

// Classification de contenu (synchrone, hors appel Perspective)
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
    return { flagged: 'toxic', onTopic: true, flagReason: `toxic:${tox}` };
  }
  // 2) Off-topic explicite
  const off = firstMatchingPattern(NEW_OFF_TOPIC_PATTERNS, content);
  if (off) {
    return { flagged: 'hors-sujet', onTopic: false, flagReason: `off-topic:${off}` };
  }
  // 3) Cohérence de contexte via mots-clés
  const onTopic = isOnContext(content);
  if (!onTopic) {
    return { flagged: 'hors-sujet', onTopic, flagReason: 'context:missing' };
  }
  return { flagged: null, onTopic, flagReason: null };
}

// Poster un message (logique refactorisée)
app.post('/messages', async (req, res) => {
  const { author, content } = req.body;
  if (!author || !content) return res.status(400).json({ error: 'Champs manquants' });

  let toxicity = null;
  try {
    toxicity = await getToxicityScore(content);
  } catch (e) {
    console.warn('Échec récupération score toxicité:', e.message);
  }

  // --- LOGIQUE DE FLAGGING (refacto) ---
  const base = classifyContentSync(content);
  let flagged = base.flagged;
  let flagReason = base.flagReason;
  const onTopic = base.onTopic;
  // Si pas encore flaggé et qu'on est dans le contexte, on regarde Perspective
  if (!flagged && toxicity !== null && toxicity > PERSPECTIVE_THRESHOLD) {
    flagged = 'toxic';
    flagReason = `perspective:>${PERSPECTIVE_THRESHOLD}`;
  }
  // --- FIN LOGIQUE ---

  const messageData = {
    author,
    content,
    toxicity,
    onTopic, // onTopic est maintenant juste basé sur les mots-clés
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
