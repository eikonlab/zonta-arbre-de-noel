// Utilitaire pour appeler l'API Perspective de Google
require('dotenv').config();
const fetch = require('node-fetch');

const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY;
const API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=' + PERSPECTIVE_API_KEY;

async function getToxicityScore(text) {
  if (!PERSPECTIVE_API_KEY) throw new Error('Perspective API key not set');
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
