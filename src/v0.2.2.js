/*	Tesis de J.D. Chicatti
	13 octubre del 2023
	testo.js es un nodo de uso general en el que corro
	cualquier cosa que quiera probar. Es un nodo con información
	temporal y que cambia constantemente.
*/
const versionTag = '0.2.2';
const configConstants = require('../configs/configv0.2.2.js');
const secrets = require('../configs/secrets.js');
/*	REQUIRED NODES SECTION
	Do not modify this section.
	No modifique este bloque de código.
*/
const { MessageMedia } = require('whatsapp-web.js');
const fetch = require('node-fetch');
const qrterminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const fs = require('fs');
const fsp = fs.promises;
const readline = require('readline');
const fastcsv = require('fast-csv');
const path = require('path');
// Para distinguir entre ejecución mediante 'cmd node' y .exe.
const isPkg = typeof process.pkg !== 'undefined';
const basePath = isPkg ? process.cwd() : __dirname;
const wwebVersion = '2.2412.54';

const MODEL_URL = 'http://127.0.0.1:11434/api/generate';

const { Client, LocalAuth } = require('whatsapp-web.js');
const client = new Client({
    puppeteer: {
        executablePath: path.join(basePath, 'chrome-win', 'chrome.exe'),
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    },
    webVersionCache: {
        type: 'remote',
        remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${wwebVersion}.html`,
    },
    authStrategy: new LocalAuth()
});

const startTime = new Date();
// Helper function to remove accents/diacritics from a string
function removeAccents(str) {return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");}

/*	CONFIGURATIONS, CONSTANTS AND SECRETS IMPORT
*/
// Load config into globals (assumes these objects exist)
for (const [key, value] of Object.entries(configConstants)) global[key] = value;
for (const [key, value] of Object.entries(secrets)) global[key] = value;
// Build paths
const logsPath = path.join(basePath, logsFolder);
const mediaPath = path.join(basePath, mediaFolder);
const csvLogfilePath = path.join(logsPath, logFileName);
// Ensure folders exist
if (!fs.existsSync(mediaPath)) fs.mkdirSync(mediaPath, { recursive: true });
if (!fs.existsSync(logsPath)) fs.mkdirSync(logsPath, { recursive: true });

/* LOG SAVING SECTION
*/
let functionCounts = {
    txtCount: 0,
    gptCount: 0,
	imgCount: 0,
	vidCount: 0,
	wikiCount: 0,
	dalleCount: 0,
	menuCount: 0,
	infoCount: 0,
	boxCount: 0,
	pingCount: 0,
	invalidCount: 0
};
function formatDate(date) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return date.toLocaleDateString('en-US', options).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
}

async function writeLogToFile() {
    // Check if all counts are zero
    const allZero = Object.values(functionCounts).every(count => count === 0);
    if (allZero) {
        console.log('No activity registered, skipping log save.');
        return;
    }

    try {
        let endTime = new Date();
        let formattedStartTime = formatDate(startTime); // Ensure formatDate is defined
        let formattedEndTime = formatDate(endTime);     // Ensure formatDate is defined
        let newRow = ["", formattedStartTime, formattedEndTime, ...Object.values(functionCounts)];

        let csvString = await fastcsv.writeToString([newRow], { headers: false, includeEndRowDelimiter: true });
        fs.appendFileSync(csvLogfilePath, csvString);
        console.log('Log saved.');
    } catch (err) {
        console.error('Error writing to file:', err);
    }
}
async function writeCommentToFile(comment) {
    try {
        await fsp.appendFile(inboxFilePath, comment + "\n"); // Añade el comentario al archivo
        console.log("Comentario guardado con éxito.");
    } catch (error) {
        console.error("Error al escribir el comentario en el archivo:", error);
    }
}

/* 	STARTUP AND DIAGNOSIS SECTION
*/
client.on('qr', async (qr) => {
    console.log('QR event triggered');
	qrterminal.generate(qr, {small: true});
    await qrcode.toFile(qrimagePath, qr);
    console.log(`QR code generated and saved as ${qrimagePath}. Scan it with your phone.`);
});
client.on('auth_failure', msg => {
    console.error('Authentication failure', msg);
});
client.on('disconnected', (reason) => {
    console.log('Phone is disconnected!', reason);
});
client.on('ready', () => {
    console.log('Client is ready!');
    //let message = 'Array test. You are now talking to GPT 3.5 Turbo -J.D. Chicatti';
    //client.sendMessage(`${number}@c.us`, message);
    //console.log(`Message: $authorizedIDs[0]` + message);
	//client.sendMessage(`Message: $authorizedIDs[0]`, message);
});

/*	SERVER CONSOLE COMMANDS SECTION
*/
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '  // Prompt symbol. Changeable.
});
setImmediate(() => {
    rl.prompt();
});
rl.on('line', async (input) => {
    switch(input.trim()) {
		// CONSOLE COMMANDS GO HERE. Add more cases if needed.
        case 'broadcast':
            // Broadcast message to all authorized IDs
            const broadcastMessage = 'Broadcasted message to all authorized IDs';
            for (const id of authorizedIDs) {
                client.sendMessage(`${id}@c.us`, broadcastMessage);
            }
            console.log('\nBroadcast message sent to all authorized IDs.');
            break;
		case 'fetch':
			await testFetch();
			break;
        case 'listcontacts':
            try {
                const contacts = await client.getContacts();
                console.log(`\nYou have ${contacts.length} contacts.`);
                contacts.forEach(contact => {
                    console.log(`ID: ${contact.id.user}, Name: ${contact.name || contact.pushname}`);
                });
            } catch (error) {
                console.error('Error fetching contacts:', error);
            }
            break;
		case 'listgroups':
			try {
                const chats = await client.getChats();
                const groupChats = chats.filter(chat => chat.isGroup);
                console.log(`You have ${groupChats.length} group chats.`);
                groupChats.forEach(groupChat => {
                    console.log(`ID: ${groupChat.id.user}, Title: ${groupChat.name}`);
                });
            } catch (error) {
                console.error('Error fetching group chats:', error);
            }
			break;
		case 'log':
			writeLogToFile();
			break;
		case 'ping':
			functionCounts.pingCount++;
			break;
		case cmdDelimiter + ollamaCmd:
			const response = await askModel("Qué dice mi color favorito de mí?");
			console.log(response);
        default:
			if (input.trim().startsWith('!img')) {
				const searchTerm = input.trim().slice(5);
				try {
					const firstImageSource = await getImageSource(searchTerm);
					const infoMessage = await getInfoMessage(firstImageSource);
					console.log(infoMessage);
				} catch (error) {
					console.error('Error fetching or sending image:', error);
				}
			}
			else if (input.trim().startsWith('!vid')) {
				const searchTerm = input.trim().slice(5);
				try {
					const firstVideoUrl = await getVideoSource(searchTerm);
					console.log(`Video URL: ${firstVideoUrl}`);
				} catch (error) {
					console.error('Error fetching or sending video:', error.response ? error.response.data : error);
				}
			}
			else if (input.trim().startsWith('!gpt')) {
				const query = input.trim().slice(5);
				const replyText = await getOpenAIResponse(query);
				console.log(replyText);
			}
			else if (input.trim().toLowerCase().startsWith('!wiki')) {
				let langCode = 'es'; // Default language code
				let query;
				
				if (input.trim()[5] === ' ') { // Check if there's a space after !wiki
					query = input.trim().slice(6).trim(); // If true, it's the default language
				} else {
					langCode = input.trim().substring(5, 7).toLowerCase(); // Extract the language code
					query = input.trim().slice(7).trim(); // Extract the query
				}
				if (query.length > 0) {
					const wikiResponse = await getWikipediaResponse(query, langCode);
					console.log(wikiResponse.text);
					if (wikiResponse.url) {
						console.log("Fuente: " + wikiResponse.url);
					}
				} else {
					console.log("Please provide a search term after !wiki");
				}
			}
			else {
				console.log('Unknown command: ', input.trim());
			}
		break;
    }
    //rl.prompt();  // Prompt for next command
});

/*	CHATBOT FETCHING SECTION
*/
const getOpenAIResponse = async (incomingMessage) => {
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
		const data = await response.json();
		console.dir(data, { depth: null });
		if (!data?.choices?.[0]?.message?.content) {
			console.dir(data, { depth: null });
			throw new Error('OpenAI response missing choices[0].message.content');
		}
		return data.choices[0].message.content.trim();
		console.dir(data, "Exit but no catch.");
	} catch (error) {
		console.error('An error occurred:', error);
		return 'I encountered an error. Please try again later.';
	}
};

/*	Free GPT FETCHING FUNCTION
*/
/*
const getFreeGpt = (query) => {
    return new Promise((resolve, reject) => {
        gpt({
            prompt: contextDelimiter + query,
            model: "gpt-4",
            type: "json"
        }, (err, data) => {
            if (err != null) {
                reject(err);
            } else {
                resolve(data.gpt);
}});});};
*/
/* LOCAL MODEL FUNCTION
*/ 
async function askModel(prompt) {
  const response = await fetch(MODEL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'phi3',
      prompt: contextDelimiter + prompt,
      options: {
        maxTo: maxTokens,
        temperature: 0.7
      },
      stream: false
    })
  });
  const data = await response.json();
  return data;
}

const testFetch = async () => {
	try {
		const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');
		const data = await res.json();
		console.log('✅ Fetch succeeded:\n', data);
	} catch (err) {
		console.error('❌ Fetch failed:', err.message || err);
	}
};

/*	IMAGE FETCHING SECTION
*/
const getImageSource = async (searchTerm) => {
	const params = new URLSearchParams({ q: searchTerm, imageType: 'Photo' });
	const response = await fetch(`https://api.bing.microsoft.com/v7.0/images/search?${params.toString()}`, {
		headers: { 'Ocp-Apim-Subscription-Key': bingSearchApiKey }
	});
	const data = await response.json();
	return data.value[0];
};
const getImageMedia = async (imageSource) => {
	const firstImageURL = imageSource.thumbnailUrl;
	const imageResponse = await fetch(firstImageURL);

	const arrayBuffer = await imageResponse.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const contentType = imageResponse.headers.get('content-type');
	const fileExtension = contentType.split('/')[1];

	const imagePath = path.join(DOWNLOADS_FOLDER, `image.${fileExtension}`);
	fs.writeFileSync(imagePath, buffer);

	const imageMedia = new MessageMedia(`image/${fileExtension}`, buffer.toString('base64'));
	return imageMedia;
};

const getInfoMessage = async (imageSource) => {
	const imageInfo = imageSource;
	let authorOrPublisher = 'Unknown';
	if (imageInfo.creator && imageInfo.creator.name !== 'Unknown') {
		authorOrPublisher = `Author: ${imageInfo.creator.name}`;
	} else if (imageInfo.publisher && imageInfo.publisher.name !== 'Unknown') {
		authorOrPublisher = `Publisher: ${imageInfo.publisher.name}`;
	} else if (imageInfo.hostPageDomainFriendlyName !== 'Unknown') {
		authorOrPublisher = `Publisher: ${imageInfo.hostPageDomainFriendlyName}`;
	} else if (imageInfo.hostPageDisplayUrl !== 'Unknown') {
		authorOrPublisher = `Publisher: ${imageInfo.hostPageDisplayUrl}`;
	} else {
		authorOrPublisher = ``;
	}
	const infoMessage = `Title: ${imageInfo.name}\nSource: ${imageInfo.hostPageDisplayUrl}\n${authorOrPublisher}`;
	return infoMessage;
}

/*	VIDEO FETCHING 
*/
const getVideoSource = async (searchTerm) => {
	const params = new URLSearchParams({ q: searchTerm });
	const response = await fetch(`https://api.bing.microsoft.com/v7.0/videos/search?${params.toString()}`, {
		headers: { 'Ocp-Apim-Subscription-Key': bingSearchApiKey }
	});
	const data = await response.json();
	return data.value[0].contentUrl;
};


/*	WIKIPEDIA FETCHING SECTION
*/
const getWikipediaResponse = async (query, langCode) => {
	try {
		const searchUrl = `https://${langCode}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`;
		const searchResponse = await fetch(searchUrl);
		const searchData = await searchResponse.json();

		const pages = searchData.query.search;
		if (pages.length > 0) {
			const pageId = pages[0].pageid;
			const contentUrl = `https://${langCode}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&pageids=${pageId}&format=json`;
			const contentResponse = await fetch(contentUrl);
			const contentData = await contentResponse.json();

			const page = contentData.query.pages[pageId];
			const extract = page.extract;
			const truncatedText = extract.split(" ").slice(0, 1000).join(" ");
			const pageUrl = `https://${langCode}.wikipedia.org/?curid=${pageId}`;
			return { text: truncatedText, url: pageUrl };
		} else {
			return { text: "No results found for your query.", url: "" };
		}
	} catch (error) {
		console.error('An error occurred:', error);
		return { text: "I encountered an error. Please try again later.", url: "" };
	}
};

/*
const getFreeGpt = (query) => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject('GPT request timed out');
        }, 15000); // Timeout after 15 seconds

        console.log('Calling gpt with query:', query);
        gpt({
            prompt: query,
            model: "gpt-4",
            type: "json"
        }, (err, data) => {
            clearTimeout(timeout); // Clear the timeout on response
            if (err != null) {
                console.error('Error from GPT:', err);
                reject(err);
            } else {
                console.log('GPT data received:', data);
                if (data && data.gpt) {
                    resolve(data.gpt);
                } else {
                    reject('No GPT data received');
                }
            }
        });
    });
};
*/

/*	DALL-E FETCHING SECTION
*/
const getDalleMedia = (query) => {
    return new Promise((resolve, reject) => {
        dalle.v1({ prompt: query }, (err, data) => {
            if (err != null) {
                reject(err);
            } else {
                const base64ImageData = data.images[0];
                const [, imageFormat, base64Data] = base64ImageData.match(/^data:image\/(\w+);base64,(.+)$/);
                const imageBuffer = Buffer.from(base64Data, 'base64');
                //const imagePath = `${DOWNLOADS_FOLDER}\\dalle_image.${imageFormat}`;
                //fs.writeFileSync(imagePath, imageBuffer);
                const imageMedia = new MessageMedia(`image/${ imageFormat}`, imageBuffer.toString('base64'), 'image.' + imageFormat);
                resolve(imageMedia);
            }
        });
    });
};

const getDalleMiniMedia = (query) => {
    return new Promise((resolve, reject) => {
        dalle.mini({ prompt: query }, (err, data) => {
            if (err != null) {
                reject(err);
            } else {
                const base64ImageData = data.images[0];
                const [, imageFormat, base64Data] = base64ImageData.match(/^data:image\/(\w+);base64,(.+)$/);
                const imageBuffer = Buffer.from(base64Data, 'base64');
                //const imagePath = `${DOWNLOADS_FOLDER}\\dalle_image.${imageFormat}`;
                //fs.writeFileSync(imagePath, imageBuffer);
                const imageMedia = new MessageMedia(`image/${ imageFormat}`, imageBuffer.toString('base64'), 'image.' + imageFormat);
                resolve(imageMedia);
            }
        });
    });
};





/*	MESSAGE RESPONSE HANDLING SECTION
*/
client.on('message', async msg => {
	const lowerBody = msg.body.toLowerCase();
	console.log(`str = (${typeof lowerBody})`, lowerBody);
	const greetings = [cmdDelimiter + 'hello', 'hi', 'hey', 'hello'];
	
	if (greetings.some(greet => lowerBody.startsWith(greet))) {
		await client.sendMessage(msg.from, helloCommandResponse);
		functionCounts.menuCount++;
	}
	else if (lowerBody.startsWith('!hola') || msg.body.toLowerCase().startsWith('hola')) {
		await client.sendMessage(msg.from, holaCommandResponse);
		functionCounts.menuCount++;
	}
	else if (lowerBody.startsWith('!ping')) {
		rl.prompt();
		await client.sendMessage(msg.from, pingSuccessful);
		functionCounts.pingCount++;
	}
	else if (lowerBody.startsWith('!info')) {
		await client.sendMessage(msg.from, infoCommandResponse);
		functionCounts.infoCount++;
	}
	else if (removeAccents(lowerBody).startsWith('!buzon')) {
		const comment = msg.body.slice(7).trim();
		await writeCommentToFile(msg.from + ": " + comment);
		await client.sendMessage(inboxAddress, comment);
		await client.sendMessage(msg.from, boxCommandResponse);
		functionCounts.boxCount++;
	}
	else if (lowerBody.startsWith('!img')) {
		const addressee = msg.from;
		const searchTerm = msg.body.slice(5).trim();
		if (searchTerm.length > 0) {
			try {
				const firstImageSource = await getImageSource(searchTerm);
				const imageMedia = await getImageMedia(firstImageSource);
				const infoMessage = await getInfoMessage(firstImageSource);
				// Sending message with the appropiate source reference first
				await client.sendMessage(addressee, infoMessage);
				// Sending media after
				await client.sendMessage(addressee, imageMedia);
			} catch (error) {
				console.error('Error fetching or sending image:', error);
				await client.sendMessage(msg.from, 'Sorry, I could not fetch an image for that term.');
			}
		} else {
			await client.sendMessage(msg.from, noQueryImg);
		}
		functionCounts.imgCount++;
	}
	else if (lowerBody.startsWith('!vid')) {
		const searchTerm = msg.body.slice(5);
		if (searchTerm.length > 0) {
			try {
				const firstVideoUrl = await getVideoSource(searchTerm);
				await client.sendMessage(msg.from, `Video URL: ${firstVideoUrl}`);
			} catch (error) {
				console.error('Error fetching or sending video:', error.response ? error.response.data : error);
				await client.sendMessage(msg.from, 'Sorry, I could not fetch a video for that term.');
			}
		} else {
			await client.sendMessage(msg.from, noQueryVid);
		}
		functionCounts.vidCount++;
	}
	else if (lowerBody.startsWith('!wiki')) {
		let langCode = 'es'; // Default language code
		let query;

		if (msg.body[5] === ' ') { // Check if there's a space after !wiki
			query = msg.body.slice(6).trim(); // If true, it's the default language
		} else {
			langCode = msg.body.substring(5, 7).toLowerCase(); // Extract the language code
			query = msg.body.slice(7).trim(); // Extract the query
		}
		
		if (query.length > 0) {
			const wikiResponse = await getWikipediaResponse(query, langCode);
			await client.sendMessage(msg.from, wikiResponse.text);
			if (wikiResponse.url) {
				await client.sendMessage(msg.from, "Fuente: " + wikiResponse.url);
			}
		} else {
			await client.sendMessage(msg.from, "Please provide a search term after !wiki");
		}
		functionCounts.wikiCount++;
	}
	else if (lowerBody.startsWith('!dalle')) {
		const query = msg.body.slice(7).trim();
		try {
			await client.sendMessage(msg.from, drawingYourAnswer);
			const imageMedia = await getDalleMedia(query);
			await client.sendMessage(msg.from, imageMedia);
		} catch (error) {
			console.error('Error fetching DALL·E media:', error);
			await client.sendMessage(msg.from, canNotDrawAnswer);
		}
		functionCounts.dalleCount++;
	}
	else if (lowerBody.startsWith('!pro')) {
		const query = msg.body.slice(5).trim();
		try {
			await client.sendMessage(msg.from, drawingYourAnswer);
			const imageMedia = await getDalleMiniMedia(query);
			await client.sendMessage(msg.from, imageMedia);
		} catch (error) {
			console.error('Error fetching DALL·E media:', error);
			await client.sendMessage(msg.from, canNotDrawAnswer);
		}
		functionCounts.dalleCount++;
	}
	else{
		const query = msg.body;
		console.log(`str = (${typeof query})`, query);
		if (query.length > 1) {
			await client.sendMessage(msg.from, writingYourAnswer);
			const replyText = (await askModel(query)).response;
			await client.sendMessage(msg.from, replyText);
		} else {
			await client.sendMessage(msg.from, noQueryTxt);
		}
		functionCounts.gptCount++;
	}
});

/*	TAKEOFF
*/
client.initialize();

/*	CLOSING AND CLEANUP
*/
async function shutdown(signal) {
    console.log(`${signal} signal received. Saving log...`);
    await writeLogToFile();
    console.log('Log saved. Exiting now.');
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGHUP', () => shutdown('SIGHUP'));
process.on('SIGTERM', () => shutdown('SIGTERM'));