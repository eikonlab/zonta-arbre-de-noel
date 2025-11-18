// LLM-based moderation for off-topic detection
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Initialize Gemini client
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

/**
 * Checks if a message is on-topic using Gemini's LLM
 * Context: This is for a platform about violence against women, feminicide,
 * gender-based violence, testimonies, and empowerment.
 *
 * @param {string} text - The message to analyze
 * @returns {Promise<{isOnTopic: boolean, reason: string|null}>}
 */
async function checkTopicRelevance(text) {
  // Fallback if no API key
  if (!GOOGLE_API_KEY || !genAI) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[LLM Moderation] Clé API Gemini absente - pas de vérification hors-sujet basée sur LLM.');
    }
    return { isOnTopic: true, reason: 'no-api-key' }; // Assume on-topic if no LLM available
  }

  try {
    // Use Gemini 2.5 Flash (fast and cost-effective)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash'
    });

    const systemPrompt = `Tu es un modérateur pour une plateforme de témoignages sur les violences faites aux femmes.

CONTEXTE DE LA PLATEFORME:
Cette plateforme recueille des témoignages et messages concernant:
- Les violences faites aux femmes (physiques, psychologiques, sexuelles, économiques)
- Le harcèlement et les agressions
- Les féminicides
- Les témoignages de survivantes
- Les messages de soutien et de solidarité
- L'empowerment et les droits des femmes
- Les messages d'espoir et de reconstruction
- La lutte contre les violences de genre

MESSAGES ACCEPTABLES (ON-TOPIC):
- Témoignages personnels de violences
- Messages de soutien aux victimes
- Réflexions sur les violences de genre
- Partage d'expériences
- Messages de solidarité
- Appels à la justice et au respect
- Messages d'espoir et de courage

MESSAGES HORS-SUJET (OFF-TOPIC):
- Sport (football, hockey, etc.)
- Politique générale non liée aux droits des femmes
- Technologie et produits
- Météo et vie quotidienne
- Publicités et promotions
- Sujets sans rapport avec le thème principal

TA TÂCHE:
Analyse le message suivant et détermine s'il est pertinent pour cette plateforme.
Réponds UNIQUEMENT avec un JSON au format: {"on_topic": true/false, "reason": "explication courte"}

Note: Sois tolérant avec les messages qui ont un lien même indirect avec le sujet (droits humains, justice sociale liée au genre, etc.). En cas de doute, privilégie on_topic: true.`;

    const prompt = `${systemPrompt}\n\nMessage à analyser: "${text}"`;

    const result = await model.generateContent(prompt, {
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 150
      }
    });
    const response = result.response;
    const responseText = response.text();

    // Try to parse JSON, handling potential markdown code blocks
    let parsedResult;
    try {
      // Remove potential markdown code blocks
      const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResult = JSON.parse(cleanText);
    } catch (e) {
      console.error('[LLM Moderation] Failed to parse JSON response:', responseText);
      return { isOnTopic: false, reason: 'parse-error' };
    }

    return {
      isOnTopic: parsedResult.on_topic === true,
      reason: parsedResult.reason || null
    };
  } catch (error) {
    console.error('[LLM Moderation] Erreur lors de l\'appel Gemini:', error.message);
    // In case of error, assume on-topic (let pattern matching and Perspective handle moderation)
    return { isOnTopic: true, reason: 'llm-error' };
  }
}

module.exports = { checkTopicRelevance };
