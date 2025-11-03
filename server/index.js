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
  // Check if we need to generate a new token using env variable
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

// Endpoint to get current valid token (for QR app)
app.get('/api/current-token', (req, res) => {
  res.json({
    token: getCurrentToken(),
    expiresAt: new Date(tokenTimestamp + TOKEN_EXPIRY_MS).toISOString(),
    expiryMs: TOKEN_EXPIRY_MS
  });
});

// Endpoint to validate token
app.get('/api/validate-token/:token', (req, res) => {
  const { token } = req.params;
  res.json({
    valid: isValidToken(token),
    currentToken: getCurrentToken()
  });
});

// Mode debug : messages de test
const DEBUG_MESSAGES = [
  {
    author: 'A',
    content: "Allez Fribourg Gottéron!",
    toxicity: 0.007
  },
  {
    author: 'A',
    content: "J'ai mis des années à comprendre que les remarques constantes sur mon poids, mes vêtements, et mes choix n'étaient pas de l'amour, mais une forme de contrôle. La violence psychologique est une prison invisible. Aujourd'hui, je réapprends à m'aimer, loin de sa voix.",
    toxicity: 0.015
  },
  {
    author: 'A',
    content: "Le soir où il a levé la main pour la première fois, j'ai eu l'impression que le monde s'arrêtait. On ne voit ça que dans les films, pas chez soi. Je veux dire à toutes celles qui vivent ça : il n'y a pas de 'première et dernière fois'. Il faut partir. J'ai eu peur, mais je suis partie. Et je suis en vie.",
    toxicity: 0.023
  },
  {
    author: 'A',
    content: "À toutes les survivantes, votre courage est une lumière. Votre douleur n'est pas une honte. Votre force est une inspiration. À toutes les femmes qui se battent en silence, vous n'êtes pas seules. Nous vous voyons, nous vous écoutons, et nous vous soutenons.",
    toxicity: 0.006
  },
  {
    author: 'A',
    content: "Il m'a forcée à lui donner l'accès à mon compte en banque, puis m'a mise dans une situation de totale dépendance financière. La violence économique est un piège insidieux qui vous enlève tout espoir de liberté. J'ai dû tout reconstruire à zéro. C'est difficile, mais chaque pas est une victoire.",
    toxicity: 0.038
  },
  {
    author: 'A',
    content: "On m'a fait croire que le 'non' n'était pas un 'non' s'il n'était pas crié assez fort. Le consentement n'est pas une négociation. La violence sexuelle ne se résume pas aux coups. C'est l'effacement de notre corps, de notre voix, de notre droit de dire stop. Je témoigne pour que d'autres sachent que leur 'non' est valable, peu importe la façon dont il est prononcé.",
    toxicity: 0.028
  },
  {
    author: 'A',
    content: "J'ai traversé la rue et on m'a siflé, ce n'est pas acceptable",
    toxicity: 0.023
  },
  {
    author: 'A',
    content: "Les hommes aussi subissent des violences ! Pourquoi on ne parle que des femmes ? C'est de la discrimination.",
    toxicity: 0.061
  },
  {
    author: 'A',
    content: "La plupart du temps, ce sont des problèmes de couple. Si les femmes étaient moins provocantes, ça n'arriverait pas. Il faut savoir se faire respecter.",
    toxicity: 0.055
  },
  {
    author: 'A',
    content: "Moi, je me suis jamais laissé faire. J'aurais mis mon agresseur au tapis. Celles qui ne se défendent pas sont trop faibles.",
    toxicity: 0.148
  }
];

// Route debug pour injecter les messages de test
app.post('/debug/messages', async (req, res) => {
  try {
    const createdMessages = [];
    for (const { author, content, toxicity } of DEBUG_MESSAGES) {
      // Utilise la même logique de flagging
      let flagged = null;
      const onTopic = isOnTopic(content);
      if (!onTopic) flagged = 'hors-sujet';
      if (TOXIC_PATTERNS.some(re => re.test(content))) {
        flagged = flagged ? flagged + ', toxic' : 'toxic';
      } else if (toxicity !== null && toxicity > 0.7) {
        flagged = flagged ? flagged + ', toxic' : 'toxic';
      }
      const messageData = {
        author,
        content,
        toxicity,
        onTopic,
        flagged,
        hidden: false,
        createdAt: new Date().toISOString()
      };
      const message = await createMessage(messageData);
      createdMessages.push(message);
      io.emit('new-message', message);
    }
    res.json({ status: 'ok', count: createdMessages.length });
  } catch (error) {
    console.error('Error creating debug messages:', error);
    res.status(500).json({ error: 'Failed to create debug messages' });
  }
});

// Détection améliorée du hors-sujet et de la toxicité
const TOPIC_KEYWORDS = [
  'violence', 'violent', 'violences',
  'femme', 'femmes', 'fille', 'filles', 'genre',
  'harcèlement', 'harcelement', 'harceler',
  'agression', 'agressions', 'agressé', 'agressee', 'agressée', 'agresseur',
  'viol', 'viols', 'violeur', 'abus', 'abusé', 'abusee', 'abusée',
  'contrôle', 'controle', 'menace', 'menaces', 'insulte', 'insultes',
  'psychologique', 'physique', 'sexuel', 'sexuelle', 'sexuelles',
  'témoignage', 'temoignage', 'témoigner', 'temoigner',
  'victime', 'victimes',
  'consentement', 'dépendance', 'financière', 'économique', 'liberté', 'soutien', 'survivantes', 'courage', 'honte', 'force', 'battent', 'silence', 'reconstruire', 'espoir', 'partir', 'peur', 'prison', 'contrôle', 'amour', 'choix', 'voix', 'corps', 'droit', 'stop', 'non', 'crié', 'prononcé'
];

const OFF_TOPIC_PATTERNS = [
  /les hommes aussi subissent des violences/i, // concurrence des victimes
  /problèmes? de couple/i, // banalisation
  /argent facile/i, // discrédit
  /fausses? histoires/i, // discrédit
  /discrimination/i, // détournement
  /provocantes?/i, // culpabilisation
  /se faire respecter/i, // culpabilisation
  /trop faibles?/i, // jugement moral
  /je me suis jamais laissé faire
  / ce n'est pas de la violence/i, // minimisation
  / c'est normal/i // minimisation
];

const TOXIC_PATTERNS = [
  /les hommes aussi subissent des violences/i, // concurrence des victimes
  /discrimination/i, // détournement
  /argent facile/i, // discrédit
  /fausses? histoires/i, // discrédit
  /provocantes?/i, // culpabilisation
  /se faire respecter/i, // culpabilisation
  /trop faibles?/i, // jugement moral
  /je me suis jamais laissé faire/i, // jugement moral
  /si les femmes étaient moins provocantes/i, // culpabilisation explicite
  /j'aurais mis mon agresseur au tapis/i, // jugement moral
  /c'est de la violence psychologique, non \?/i, // banalisation
  /ce n'est pas de la violence/i, // minimisation
  /c'est normal/i // minimisation
];

function isOnTopic(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  // Si un pattern hors-sujet est détecté, c'est hors-sujet
  if (OFF_TOPIC_PATTERNS.some(re => re.test(text))) return false;
  // Sinon, on vérifie les mots-clés
  return TOPIC_KEYWORDS.some(k => lower.includes(k));
}

// Perspective API (appel réel)
const { getToxicityScore } = require('./models/perspective');

// Database
const { getAllMessages, createMessage, updateMessage, deleteMessage, bulkUpdateMessages } = require('./models/database');

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

// Poster un message
app.post('/messages', async (req, res) => {
  const { author, content } = req.body;
  if (!author || !content) return res.status(400).json({ error: 'Champs manquants' });

  let toxicity = null;
  try {
    toxicity = await getToxicityScore(content);
  } catch (e) {
    console.warn('Échec récupération score toxicité:', e.message);
  }

  // Détection hors-sujet et toxicité
  let flagged = null;
  const onTopic = isOnTopic(content);

  // Si le message est hors-sujet
  if (!onTopic) {
    flagged = 'hors-sujet';
  }

  // Si le message correspond à un pattern toxique, flag "toxic" (prioritaire)
  if (TOXIC_PATTERNS.some(re => re.test(content))) {
    flagged = flagged ? flagged + ', toxic' : 'toxic';
  }
  // Sinon, si le message est toxique (score Perspective > 0.7)
  else if (toxicity !== null && toxicity > 0.7) {
    flagged = flagged ? flagged + ', toxic' : 'toxic';
  }

  const messageData = {
    author,
    content,
    toxicity,
    onTopic,
    flagged,
    hidden: false, // Default to visible
    createdAt: new Date().toISOString()
  };

  try {
    const message = await createMessage(messageData);
    io.emit('new-message', message);
    res.status(201).json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Mettre à jour un message (pour la modération)
app.patch('/messages/:id', async (req, res) => {
  const messageId = parseInt(req.params.id);
  const { hidden } = req.body;

  if (typeof hidden !== 'boolean') {
    return res.status(400).json({ error: 'Données invalides' });
  }

  try {
    const updatedMessage = await updateMessage(messageId, { hidden });
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
      res.status(500).json({ error: 'Failed to delete message' });
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
});

const PORT = process.env.PORT || 8102;
const HOST = process.env.IP || '::';
server.listen(PORT, HOST, () => {
  console.log(`Serveur démarré sur http://[${HOST}]:${PORT}`);
});
