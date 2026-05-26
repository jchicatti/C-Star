// utils/llmClient.js
const fetch = require('node-fetch');

const BASE_DELAY_MS = 500;   // base: 500 ms
const CAP_MS = 16000;        // cap: 16 segundos
const MAX_RETRIES = 5;

function jitterDelay(attempt) {
  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const ceiling = Math.min(CAP_MS, exponential);
  return Math.random() * ceiling; // Full Jitter: uniforme entre 0 y el techo
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getOpenAIResponseWithBackoff(incomingMessage, { openaiApiKey, contextDelimiter, maxTokens }) {
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: contextDelimiter + incomingMessage }],
          max_tokens: maxTokens,
          model: 'gpt-3.5-turbo'
        })
      });

      // Rate limiting: esperar y reintentar
      if (response.status === 429) {
        if (attempt === MAX_RETRIES) throw new Error('MAX_RETRIES_EXCEEDED');
        const wait = jitterDelay(attempt);
        console.warn(`[backoff] 429 recibido, intento ${attempt + 1}/${MAX_RETRIES}, esperando ${Math.round(wait)}ms`);
        await sleep(wait);
        attempt++;
        continue;
      }

      const data = await response.json();
      if (!data?.choices?.[0]?.message?.content) {
        throw new Error('OpenAI response missing choices[0].message.content');
      }
      return data.choices[0].message.content.trim();

    } catch (error) {
      if (error.message === 'MAX_RETRIES_EXCEEDED') {
        console.error('[backoff] Máximo de reintentos alcanzado.');
        return 'El servicio está saturado en este momento. Intenta de nuevo en unos minutos.';
      }
      console.error('[backoff] Error inesperado:', error.message);
      return 'Encontré un error. Por favor intenta de nuevo.';
    }
  }
}

module.exports = { getOpenAIResponseWithBackoff };