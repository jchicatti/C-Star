// core/inference.js

const fetch = require('node-fetch');
const config = require('../config');
const { getRecentMessages, saveMessage } = require('./database');

async function getCompletion(model, userId, userMessage) {
  const contextMessages = await getRecentMessages(userId, config.langContextLimit);
  const messages = [
    { role: 'system', content: config.systemPrompt },
    ...contextMessages,
    { role: 'user', content: userMessage }
  ];

  let response;
  switch (model) {
    case 'openai':
      response = await callOpenAI(messages);
      break;
    case 'local':
      response = await callLocalModel(messages);
      break;
    case 'freegpt':
      response = await callFreeGPT(userMessage); // Deprecated/legacy fallback
      break;
    default:
      throw new Error(`Unknown model type: ${model}`);
  }

  if (response) {
    await saveMessage(userId, 'user', userMessage);
    await saveMessage(userId, 'assistant', response);
  }

  return response;
}

async function callOpenAI(messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.openaiModel,
      max_tokens: config.maxTokens,
      messages: messages
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim();
}

async function callLocalModel(messages) {
  const res = await fetch(config.localModelUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messages })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim();
}

async function callFreeGPT(userMessage) {
  const response = await fetch(config.freeGptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt: userMessage })
  });
  const data = await response.json();
  return data.text || null;
}

module.exports = { getCompletion };
