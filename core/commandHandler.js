// core/commandHandler.js
const lang = require('../lang');
const { getOpenAIResponse, getLocalLLMResponse } = require('./inference');
const { insertCommandUsage } = require('./db');
const { logCommandExecution } = require('./logger');
const { appendContext, getContextForUser, enforceRateLimit } = require('./context');
const { fetchImage, fetchWikiSummary, fetchYoutubeVideo } = require('./external');
const config = require('../config');

async function handleUserMessage(messageObj, sendMessageFn) {
    const { from, body } = messageObj;
    if (!body.startsWith(config.commandSymbol)) return;

    const trimmedBody = body.slice(config.commandSymbol.length).trim();
    const [command, ...args] = trimmedBody.split(/\s+/);
    const argText = args.join(' ');

    try {
        await enforceRateLimit(from, command);
        await insertCommandUsage(from, command);
        logCommandExecution(from, command);

        switch (command.toLowerCase()) {
            case 'ping':
                return sendMessageFn(from, lang.responses.ping);

            case 'wiki': {
                if (!argText) return sendMessageFn(from, lang.responses.missingQuery);
                const summary = await fetchWikiSummary(argText);
                return sendMessageFn(from, summary);
            }

            case 'image': {
                if (!argText) return sendMessageFn(from, lang.responses.missingQuery);
                const imageUrl = await fetchImage(argText);
                return sendMessageFn(from, imageUrl || lang.responses.noResults);
            }

            case 'video': {
                if (!argText) return sendMessageFn(from, lang.responses.missingQuery);
                const videoUrl = await fetchYoutubeVideo(argText);
                return sendMessageFn(from, videoUrl || lang.responses.noResults);
            }

            case 'chat': {
                if (!argText) return sendMessageFn(from, lang.responses.missingQuery);
                const context = await getContextForUser(from);
                const fullContext = [
                    ...config.initialSystemPrompt,
                    ...context,
                    { role: 'user', content: argText }
                ];

                const reply = config.modelSource === 'openai'
                    ? await getOpenAIResponse(fullContext)
                    : await getLocalLLMResponse(fullContext);

                await appendContext(from, { role: 'user', content: argText });
                await appendContext(from, { role: 'assistant', content: reply });
                return sendMessageFn(from, reply);
            }

            default:
                return sendMessageFn(from, lang.responses.unknownCommand);
        }
    } catch (err) {
        console.error('Command handling error:', err);
        return sendMessageFn(from, lang.responses.errorGeneric);
    }
}

module.exports = {
    handleUserMessage,
};
