// Utilitaire pour appeler l'API Perspective de Google
require('dotenv').config();
const fetch = require('node-fetch');

const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY;
const API_URL = PERSPECTIVE_API_KEY
  ? 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=' + PERSPECTIVE_API_KEY
  : null;

async function getToxicityScore(text) {
  // Fallback gracieux : si pas de clé on retourne null (aucune toxicité calculée)
  if (!PERSPECTIVE_API_KEY || !API_URL) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[Perspective] Clé API absente - classification basée uniquement sur patterns internes.');
    }
    return null; // Indique qu'on n'a pas de score
  }
  const body = {
    comment: { text },
    languages: ['fr'],
    requestedAttributes: { TOXICITY: {} }
  };
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error('Erreur API Perspective');
  const data = await response.json();
  return data.attributeScores.TOXICITY.summaryScore.value;
}

module.exports = { getToxicityScore };
