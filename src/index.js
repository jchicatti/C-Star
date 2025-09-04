/*	Tesis de J.D. Chicatti
	13 octubre del 2023
	testo.js es un nodo de uso general en el que corro
	cualquier cosa que quiera probar. Es un nodo con información
	temporal y que cambia constantemente.
*/
const versionTag = '0.2.3';
const path = require('path');
const configConstants = require('../configs/config.js');
const secrets = require('../configs/secrets.js');
const { parseDriveArgs, handleDriveCommand } = require(path.resolve(__dirname, '..', 'scripts', 'driveHandler.js'));
const { parseArmArgs, handleArmCommand } = require(path.resolve(__dirname, '..', 'scripts', 'armHandler.js'));
const { parseIKArgs, handleIKCommand } =  require(path.resolve(__dirname, '..', 'scripts', 'ikHandler.js'));
const { parseScaraArgs, handleScaraCommand } = require(path.resolve(__dirname, '..', 'scripts', 'scaraHandler.js'));
const { parseLoopArgs, handleLoopCommand } = require(path.resolve(__dirname, '..', 'scripts', 'loopHandler.js'));
const { parseStepArgs, handleStepCommand } = require(path.resolve(__dirname, '..', 'scripts','stepHandler.js'));
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
// Para distinguir entre ejecución mediante 'cmd node' y .exe.
const isPkg = typeof process.pkg !== 'undefined';
const basePath = isPkg ? process.cwd() : __dirname;
const wwebVersion = '2.2412.54';
const MODEL_URL = 'http://127.0.0.1:11434/api/generate';

const { Client, LocalAuth } = require('whatsapp-web.js');
const client = new Client({
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-extensions',
    ],
  },
  authStrategy: new LocalAuth({ dataPath: path.join(basePath, '.wwebjs_auth') }),
  takeoverOnConflict: true,
  restartOnAuthFail: true,
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
function template(str, obj = {}) {
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (k in obj ? obj[k] : `{${k}}`));
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
  if (rl) { rl.pause(); process.stdout.write('\n'); }
  console.log('QR event triggered');
  qrterminal.generate(qr, { small: true });
  await qrcode.toFile(qrimagePath, qr);
  console.log(`QR saved: ${qrimagePath}`);
  if (rl) { rl.resume(); rl.prompt(); }
});
client.on('auth_failure', msg => {
    console.error('Authentication failure', msg);
});
client.on('disconnected', (reason) => {
    console.log('Phone is disconnected!', reason);
});
client.on('change_state', s => console.log('[change_state]', s));
const iv = setInterval(async () => {
  try { console.log('state:', await client.getState()); } catch {}
}, 3000);
client.on('ready', () => { console.log('[ready]'); clearInterval(iv); });

/*	SERVER CONSOLE COMMANDS SECTION
*/
let rl = null;
function openConsole() {
  if (rl) return rl;
  rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
  rl.on('line', onLine);
  rl.prompt();
  return rl;
}
function closeConsole() {
  if (!rl) return;
  rl.removeListener('line', onLine);
  rl.close();
  rl = null;
}
async function onLine(input) {
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
		case 'quit': closeConsole(); break;
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
}

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
//@drive

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
	else if (lowerBody.startsWith('@hola') || msg.body.toLowerCase().startsWith('hola')) {
		await client.sendMessage(msg.from, holaCommandResponse);
		functionCounts.menuCount++;
	}
	if (lowerBody.startsWith('@ping')) {
		await client.sendMessage(msg.from, pingSuccessful);
		functionCounts.pingCount++;
	}
	else if (lowerBody.startsWith('@info')) {
		await client.sendMessage(msg.from, infoCommandResponse);
		functionCounts.infoCount++;
	}
	else if (removeAccents(lowerBody).startsWith('@buzon')) {
		const comment = msg.body.slice(7).trim();
		await writeCommentToFile(msg.from + ": " + comment);
		await client.sendMessage(inboxAddress, comment);
		await client.sendMessage(msg.from, boxCommandResponse);
		functionCounts.boxCount++;
	}
	else if (lowerBody.startsWith('@img')) {
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
	else if (lowerBody.startsWith('@vid')) {
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
	else if (lowerBody.startsWith('@wiki')) {
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
	else if (lowerBody.startsWith('@dalle')) {
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
	else if (lowerBody.startsWith('@drive')) {
		const argsText = msg.body.slice('@drive'.length).trim();
		if (!argsText) { await client.sendMessage(msg.from, noQueryDrive); return; }

		const parsed = parseDriveArgs(argsText);

		if (!parsed.ok) {
		// DEBUG opcional
		// console.log('parser fail:', parsed);

		let msgText = noQueryDrive;
		switch (parsed.reason) {
		  case 'missing_key':
			msgText = template(driveMissingKey, { k: parsed.k });
			break;
		  case 'nan':
			msgText = template(driveNotNumeric, { k: parsed.k, val: parsed.val });
			break;
		  case 'bad_token':
			msgText = template(driveBadToken, { tok: parsed.tok });
			break;
		  case 'bad_noeq_key':
			msgText = template(driveBadNoEqKey, { tok: parsed.tok });
			break;
		  // 'missing' u otros → mensaje de uso genérico
		}
		await client.sendMessage(msg.from, msgText);
		return;
		}

		try {
		const { img, final_pose } = await handleDriveCommand(parsed.params);
		const media = new MessageMedia('image/png', fs.readFileSync(img).toString('base64'), 'drive.png');
		const { v, w, t } = parsed.params;
		const [xStr, yStr, thStr] = final_pose.map(n => Number(n).toFixed(3));
		await client.sendMessage(msg.from, media, {
		  caption:
			`Simulación del movimiento diferencial: ` +
			`la trayectoria azul muestra cómo avanzó el robot con v=${v} m/s y w=${w} rad/s durante t=${t} s. ` +
			`Pose final: (x=${xStr}, y=${yStr}, θ=${thStr} rad).`
		});
		} catch (e) {
		// opcional para depurar mapeo desde Python:
		// console.error('drive error:', e.code, e.meta, e.message);

		const msgText =
		  e.code === 'DRIVE_TOO_MANY_STEPS' ? template(driveTooManySteps, e.meta) :
		  e.code === 'DRIVE_BAD_T'          ? template(driveBadT, e.meta) :
		  e.code === 'DRIVE_BAD_DT'         ? template(driveBadDt, e.meta) :
		  e.code === 'DRIVE_NOMOTION'       ? driveNoMotion :
		  e.code === 'EBADJSON'             ? errDriveBadJSON :
		  noQueryDrive;
		await client.sendMessage(msg.from, msgText);
		}
	}
	else if (lowerBody.startsWith('@arm')) {
		const argsText = msg.body.slice('@arm'.length).trim();
		const parsed = parseArmArgs(argsText);
		if (!parsed.ok) {
			await client.sendMessage(msg.from, noQueryArm || 'error');
			return;
		}
		try {
			const res = await handleArmCommand(parsed.params);
			const { n } = parsed.params;
			const media = new MessageMedia('image/png', fs.readFileSync(res.img).toString('base64'), 'arm.png');
			const [x, y] = res.ee;
			await client.sendMessage(msg.from, media, { 
			caption: `Cinemática directa de un brazo con ${n} eslabones. El extremo del brazo (end effector) quedó en la posición (x=${x.toFixed(2)}, y=${y.toFixed(2)}). La imagen ilustra la cadena de eslabones desde el origen hasta la punta.`});
		} catch (e) {
			console.error('arm failed:', e.code || '', e.message || e);
			const txt =
			e.code === 'ARM_BAD_L_AT' ? template(armBadLengthIdx, e.meta) :
			e.code === 'ARM_BAD_UNITS'? armBadUnits :
			e.code === 'EBADJSON'     ? errArmBadJSON :
			noQueryArm;
			await client.sendMessage(msg.from, txt);
		}
	}
	else if (lowerBody.startsWith('@ik')) {
		const argsText = msg.body.slice(4).trim(); // formato: l1 l2 x y [deg|rad]
		const parsed = parseIKArgs(argsText);
		if (!parsed.ok) {
			await client.sendMessage(msg.from, noQueryIK);
			return;
		}
		try {
			const res = await handleIKCommand(parsed.params);
			const { x, y, units: unitsIn } = parsed.params;
			const xStr = Number(x).toFixed(2);
			const yStr = Number(y).toFixed(2);
			const units = res.units || unitsIn;
			const media = new MessageMedia('image/png', fs.readFileSync(res.img).toString('base64'), 'ik2.png');
			const s = res.solutions; // [[th1,th2],[th1b,th2b]]
			const a = s[0].map(v => Number(v).toFixed(3)).join(', ');
			const b = s[1].map(v => Number(v).toFixed(3)).join(', ');
			await client.sendMessage(msg.from, media, { 
				caption: `Cinemática inversa de un brazo de 2 eslabones. Para alcanzar el objetivo en (x=${xStr}, y=${yStr}), existen dos posturas posibles en ${units}:\n• Codo arriba: ${a}\n• Codo abajo: ${b}\nLa figura muestra ambas configuraciones superpuestas para comparar.` });
		} catch (e) {
			console.error('ik failed:', e.code || '', e.message || e, e.meta || '');
			const msgText =
			e.code === 'IK_UNREACH_OUT' ? template(ikUnreachOutside, e.meta) :
			e.code === 'IK_UNREACH_IN'  ? template(ikUnreachInside,  e.meta) :
			e.code === 'IK_BAD_LENGTHS' ? template(ikBadLengths,     e.meta) :
			e.code === 'IK_BAD_UNITS'   ? template(ikBadUnits,       e.meta) :
			e.code === 'EBADJSON'       ? errIKBadJSON :
			// fallback genérico para otros EBADPARAMS
			noQueryIK;
			await client.sendMessage(msg.from, msgText);
		}
	}
	else if (lowerBody.startsWith('@scara')) {
		const argsText = msg.body.slice('@scara'.length).trim();
		const parsed = parseScaraArgs(argsText);
		if (!parsed.ok) {
		const txt =
		  parsed.reason === 'missing'      ? noQueryScara :
		  parsed.reason === 'bad_numbers'  ? errScaraBadNumbers :
		  parsed.reason === 'bad_lens'     ? errScaraLens :
		  parsed.reason === 'bad_units'    ? errScaraUnits :
		  noQueryScara;
		await client.sendMessage(msg.from, txt);
		return;
		}

		try {
		const res = await handleScaraCommand(parsed.params);
		const { l1,l2,t1,t2,z, units } = parsed.params;
		const media = new MessageMedia('image/png', fs.readFileSync(res.img).toString('base64'), 'scara.png');
		const { x, y, theta } = res.ee;
		const angUnits = (res.units?.angles) || parsed.params.units;
		await client.sendMessage(
		  msg.from,
		  media, { 
		  // scara
		  caption: `Cinemática directa de un robot SCARA (RRP). Con L1=${l1}, L2=${l2}, θ1=${t1}, θ2=${t2} y z=${z}, el extremo del brazo quedó en (x=${x.toFixed(3)}, y=${y.toFixed(3)}, z=${z.toFixed(3)}), con orientación θ=${theta.toFixed(3)} rad. La vista superior muestra el alcance en el plano XY con la altura z anotada.`});
		} catch (e) {
		console.error('scara failed:', e.code || '', e.message || e);
		const txt =
		  e.code === 'EBADPARAMS_LENS'  ? errScaraLens :
		  e.code === 'EBADPARAMS_UNITS' ? errScaraUnits :
		  e.code === 'EBADJSON'         ? errScaraBadJSON :
		  e.code === 'ESPAWN'           ? errScaraSpawn :
		  e.code === 'ETIMEDOUT'        ? errScaraTimeout :
		  genericError;
		await client.sendMessage(msg.from, txt);
		}
	}
	else if (lowerBody.startsWith('@loop')) {
	  const argsText = msg.body.slice('@loop'.length).trim();

	  if (!argsText) {
		await client.sendMessage(msg.from, noQueryLoopGeneral);
		return;
	  }

	  const { parseLoopArgs, handleLoopCommand } = require('../scripts/loopHandler');
	  const parsed = parseLoopArgs(argsText);

	  if (!parsed.ok) {
		if (parsed.reason === 'bad_mode')           await client.sendMessage(msg.from, noQueryLoopInvalid);
		else if (parsed.reason === 'missing_ref') {
		  const m = (parsed.mode || '').toLowerCase();
		  if (m === 'arm')      await client.sendMessage(msg.from, noQueryLoopArmShort);
		  else if (m === 'drive') await client.sendMessage(msg.from, noQueryLoopDriveShort);
		  else if (m === 'motor') await client.sendMessage(msg.from, noQueryLoopMotorShort);
		  else await client.sendMessage(msg.from, noQueryLoopInvalid);
		}
		else if (parsed.reason === 'bad_number')    await client.sendMessage(msg.from, loopBadNumber);
		else                                        await client.sendMessage(msg.from, noQueryLoopGeneral);
		return;
	  }

	  try {
		const res = await handleLoopCommand(parsed.params);
		const { img, metrics } = res;

		const media = new MessageMedia('image/png', fs.readFileSync(img).toString('base64'), `loop_${metrics.mode}.png`);
		const f2 = (v) => (v == null ? '—' : Number(v).toFixed(2));
		const inalcanzable = (metrics.reachable === false);

		let caption = '';
		if (metrics.mode === 'arm') {
		  caption =
			`Comparación lazo abierto vs cerrado (articulación) con PID (Kp=${f2(metrics.Kp)}, Ki=${f2(metrics.Ki)}, Kd=${f2(metrics.Kd)}).\n` +
			`Abierto: θ_ss = K·Umax = ${f2(metrics.x_ss_open)} rad (θ_ref = ${f2(metrics.ref)}).\n` +
			(inalcanzable
			  ? `Cerrado: la referencia no es alcanzable con Umax y K actuales (saturación total ≈ ${f2(metrics.sat_time)} s; déficit ≈ ${f2(metrics.deficit)} rad).`
			  : `Cerrado: ts ≈ ${f2(metrics.ts)} s; error final ≈ ${f2(metrics.x_final_closed - metrics.ref)} rad; saturación ≈ ${f2(metrics.sat_time)} s.`);
		} else if (metrics.mode === 'drive') {
		  caption =
			`Comparación lazo abierto vs cerrado (velocidad) con PID (Kp=${f2(metrics.Kp)}, Ki=${f2(metrics.Ki)}, Kd=${f2(metrics.Kd)}).\n` +
			`Abierto: v_ss = K·Umax = ${f2(metrics.x_ss_open)} m/s (v_ref = ${f2(metrics.ref)}).\n` +
			(inalcanzable
			  ? `Cerrado: v_ref no es alcanzable con Umax y K actuales (saturación total ≈ ${f2(metrics.sat_time)} s; déficit ≈ ${f2(metrics.deficit)} m/s).`
			  : `Cerrado: ts ≈ ${f2(metrics.ts)} s; error final ≈ ${f2(metrics.x_final_closed - metrics.ref)} m/s; saturación ≈ ${f2(metrics.sat_time)} s.`);
		} else {
		  caption =
			`Comparación lazo abierto vs cerrado (motor DC) con PID (Kp=${f2(metrics.Kp)}, Ki=${f2(metrics.Ki)}, Kd=${f2(metrics.Kd)}).\n` +
			`Abierto: ω_ss = K·Umax = ${f2(metrics.x_ss_open)} rad/s (ω_ref = ${f2(metrics.ref)}).\n` +
			(inalcanzable
			  ? `Cerrado: ω_ref no es alcanzable con Umax y K actuales (saturación total ≈ ${f2(metrics.sat_time)} s; déficit ≈ ${f2(metrics.deficit)} rad/s).`
			  : `Cerrado: ts ≈ ${f2(metrics.ts)} s; error final ≈ ${f2(metrics.x_final_closed - metrics.ref)} rad/s; saturación ≈ ${f2(metrics.sat_time)} s.`);
		}

		await client.sendMessage(msg.from, media, { caption });
	  } catch (e) {
		console.error('loop failed:', e.code || '', e.message || e);
		const txt =
		  e.code === 'LOOP_TOO_MANY_STEPS' ? template(loopTooManySteps, e.meta) :
		  e.code === 'LOOP_BAD_T'          ? loopBadT :
		  e.code === 'LOOP_BAD_DT'         ? loopBadT :
		  e.code === 'EBADPARAMS'          ? loopBadNumber :
		  e.code === 'EBADJSON'            ? genericError :
		  genericError;
		await client.sendMessage(msg.from, txt);
	  }
	}
	else if (lowerBody.startsWith('@step')) {
	  const argsText = msg.body.slice('@step'.length).trim();

	  // si NO hay argumentos → mostrar ayuda y salir
	  if (!argsText || argsText.toLowerCase() === 'help' || argsText.toLowerCase() === 'params') {
		await client.sendMessage(msg.from, noQueryStep);
		return;
	  }

	  const { parseStepArgs, handleStepCommand } = require('../scripts/stepHandler');
	  const parsed = parseStepArgs(argsText);

	  if (!parsed.ok) {
		await client.sendMessage(msg.from, stepBadNumber);
		return;
	  }

	  try {
		const res = await handleStepCommand(parsed.params);
		const { img, metrics } = res;

		const media = new MessageMedia('image/png', fs.readFileSync(img).toString('base64'), 'step.png');
		const f2 = v => (v == null || Number.isNaN(Number(v))) ? '—' : Number(v).toFixed(2);

		const caption =
		  `Respuesta al escalón (A=${f2(metrics.A)}). Planta 2º orden (ζ=${f2(metrics.zeta)}, ωₙ=${f2(metrics.wn)} rad/s). ` +
		  `PID: Kp=${f2(metrics.Kp)}, Ki=${f2(metrics.Ki)}, Kd=${f2(metrics.Kd)}.\n` +
		  `Métricas: tr≈${f2(metrics.tr)} s, Mp≈${f2(metrics.Mp)} %, ts≈${f2(metrics.ts)} s, error final≈${f2(metrics.ess)}.`;

		await client.sendMessage(msg.from, media, { caption });
	  } catch (e) {
		console.error('step failed:', e.code || '', e.message || e);
		const txt =
		  e.code === 'STEP_TOO_MANY_STEPS' ? template(stepTooManySteps, e.meta) :
		  e.code === 'STEP_BAD_T'          ? stepBadT :
		  e.code === 'STEP_BAD_DT'         ? stepBadT :
		  e.code === 'STEP_BAD_ZETA'       ? stepBadZeta :
		  e.code === 'STEP_BAD_WN'         ? stepBadWn :
		  e.code === 'EBADJSON'            ? errStepBadJSON :
		  stepGenericError;
		await client.sendMessage(msg.from, txt);
	  }
	}
	/*
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
	/*
	else{
		const query = msg.body;
		//console.log(`str = (${typeof query})`, query);
		if (query.length > 1) {
			await client.sendMessage(msg.from, writingYourAnswer);
			const replyText = (await askModel(query)).response;
			await client.sendMessage(msg.from, replyText);
		} else {
			await client.sendMessage(msg.from, noQueryTxt);
		}
		functionCounts.gptCount++;
	}
	*/
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

process.on('unhandledRejection', (reason) => console.error('unhandledRejection:', reason));
process.on('uncaughtException', (err) => console.error('uncaughtException:', err));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGHUP', () => shutdown('SIGHUP'));
process.on('SIGTERM', () => shutdown('SIGTERM'));