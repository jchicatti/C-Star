/*	Tesis de J.D. Chicatti
	13 octubre del 2023
	testo.js es un nodo de uso general en el que corro
	cualquier cosa que quiera probar. Es un nodo con información
	temporal y que cambia constantemente.
*/

/*	REQUIRED NODES SECTION
	Do not modify this section.
	No modifique este bloque de código.
*/
const { Client } = require('whatsapp-web.js');
const { MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const qrterminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const fs = require('fs');
const readline = require('readline');
const fastcsv = require('fast-csv');
const client = new Client();
const { gpt, dalle, lexica, prodia, util } = require("gpti");
const startTime = new Date();

/*	CONFIGURATION CONSTANTS IMPORT
*/
const configConstants = require('..\\config');
for (const [key, value] of Object.entries(configConstants)) { global[key] = value; }

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
	pingCount: 0
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

/*	WIKIPEDIA FETCHING SECTION
*/
const getWikipediaResponse = async (query, langCode) => {
    try {
        let searchUrl = `https://${langCode}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`;
        let searchResponse = await axios.get(searchUrl);
        let pages = searchResponse.data.query.search;
        if (pages.length > 0) {
            let pageId = pages[0].pageid;
            let contentUrl = `https://${langCode}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&pageids=${pageId}&format=json`;
            let contentResponse = await axios.get(contentUrl);
            let page = contentResponse.data.query.pages[pageId];
            let extract = page.extract;
            let truncatedText = extract.split(" ").slice(0, 1000).join(" "); // Truncate to 1000 words
            let pageUrl = `https://${langCode}.wikipedia.org/?curid=${pageId}`;
            return { text: truncatedText, url: pageUrl };
        } else {
            return { text: "No results found for your query.", url: "" };
        }
    } catch (error) {
        console.error('An error occurred:', error.response ? error.response.data : error);
        return { text: "I encountered an error. Please try again later.", url: "" };
    }
};

/*	CHATBOT FETCHING SECTION
*/
const getOpenAIResponse = async (incomingMessage) => {
	try {
		const gpt3Response = await axios.post(
		'https://api.openai.com/v1/chat/completions',
		{
			messages: [{ role: 'user', content: `Intenta responder en ${Math.floor(maxTokens/3)} palabras como máximo. Se breve y conciso. Si no te alcanza, házmelo saber en el idioma que te escribí que tienes un espacio limitado y mejor pregunte algo más corto: \n` + incomingMessage}],
			max_tokens: maxTokens,
			model: 'gpt-3.5-turbo'
		},
		{
			headers: {
				'Authorization': `Bearer ${openaiApiKey}`,
				'Content-Type': 'application/json'
			}
		}
		);
		return await gpt3Response.data.choices[0].message.content.trim();
	} catch (error) {
		console.error('An error occurred:', error.response ? error.response.data : error);
		return 'I encountered an error. Please try again later.';
	}
};

/*	IMAGE FETCHING SECTION
*/
const getImageSource = async (searchTerm) => {
	const response = await axios.get('https://api.bing.microsoft.com/v7.0/images/search', {
		params: { q: searchTerm, imageType : 'Photo' },  // 'Photo' limits results to JPG and PNG
		headers : { 'Ocp-Apim-Subscription-Key': bingSearchApiKey }
	});
	return response.data.value[0];
};
const getImageMedia = async (imageSource) => {
	const firstImageURL = imageSource.thumbnailUrl;
	// Downloading the image
	const imageResponse = await axios.get(firstImageURL, { responseType: 'arraybuffer' });
	// Determine the file extension from the Content-Type header
	const contentType = imageResponse.headers['content-type'];
	const fileExtension = contentType.split('/')[1];  // Assumes contentType is like 'image/jpeg' or 'image/png'
	// Save the image with the correct file extension
	const imagePath = `${DOWNLOADS_FOLDER}\\image.${ fileExtension }`;
	fs.writeFileSync(imagePath, imageResponse.data);
	// Sending the image as MEDIA. Not as URL as that would defeat the purpose.
	const imageMedia = new MessageMedia(`image/${ fileExtension }`, imageResponse.data.toString('base64'));
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
	const response = await axios.get('https://api.bing.microsoft.com/v7.0/videos/search', {
		params: { q: searchTerm },
		headers: { 'Ocp-Apim-Subscription-Key': bingSearchApiKey }
	});
	const firstVideoUrl = response.data.value[0].contentUrl;
	return firstVideoUrl;
};

/*	Free GPT FETCHING SECTION
*/
const getFreeGpt = (query) => {
    return new Promise((resolve, reject) => {
        gpt({
            prompt: query,
            model: "gpt-4",
            type: "json"
        }, (err, data) => {
            if (err != null) {
                reject(err);
            } else {
                resolve(data.gpt);
            }
        });
    });
};

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

/*	MESSAGE RESPONSE HANDLING SECTION
*/
client.on('message', async msg => {
	console.log(`Received message from ${msg.from}: ${msg.body}`);
	// Sólo responde a los usuarios autorizados
	//if (authorizedIDs.includes(msg.from)) {
		/*	IMAGE RESPONSE HANDLING
		*/
		if (msg.body.toLowerCase().startsWith('!img')) {
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
				// If there is no query, send the message about silence and asking questions
				await client.sendMessage(msg.from, noQueryImg);
			}
			// Increment count for log
			functionCounts.imgCount++;
		}
		/*	VIDEO RESPONSE HANDLING
		*/
		else if (msg.body.toLowerCase().startsWith('!vid')) {
			const searchTerm = msg.body.slice(5);
			if (searchTerm.length > 0) {
			// If there is a query, process it
				try {
					const firstVideoUrl = await getVideoSource(searchTerm);
					await client.sendMessage(msg.from, `Video URL: ${firstVideoUrl}`);
				} catch (error) {
					console.error('Error fetching or sending video:', error.response ? error.response.data : error);
					await client.sendMessage(msg.from, 'Sorry, I could not fetch a video for that term.');
				}
			} else {
				// If there is no query, send the message about silence and asking questions
				await client.sendMessage(msg.from, noQueryVid);
			}
			functionCounts.vidCount++;
		}
		/*	CHATBOT RESPONSE HANDLING
		*/
		else if (msg.body.toLowerCase().startsWith('!gpt')) {
			const query = msg.body.slice(5).trim();

			if (query.length > 0) {
				// If there is a query, process it
				await client.sendMessage(msg.from, writingYourAnswer);
				const replyText = await getOpenAIResponse(query);
				await client.sendMessage(msg.from, replyText);
			} else {
				// If there is no query, send the message about silence and asking questions
				await client.sendMessage(msg.from, noQueryTxt);
			}
			functionCounts.gptCount++;
		}
		else if (msg.body.toLowerCase().startsWith('!wiki')) {
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
		else if (msg.body.toLowerCase().startsWith('!dalle')) {
			const query = msg.body.slice(6).trim();
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
		else if (msg.body.toLowerCase().startsWith('!txt')) {
			const query = msg.body.slice(5).trim();
			if (query.length > 0) {
				// If there is a query, process it
				try {
					await client.sendMessage(msg.from, writingYourAnswer);
					const gptText = await getFreeGpt(query);
					await client.sendMessage(msg.from, gptText);
				} catch (error) {
					console.error('Error fetching GPT response:', error);
				}
			} else {
				// If there is no query, send the message about silence and asking questions
				await client.sendMessage(msg.from, noQueryTxt);
			}
			functionCounts.txtCount++;
		}
		/*	HELP AND INFO HANDLING
		*/
		else if (msg.body.toLowerCase().startsWith('!hello')) {
			await client.sendMessage(msg.from, helloCommandResponse);
			functionCounts.menuCount++;
		}
		else if (msg.body.toLowerCase().startsWith('!hola')) {
			await client.sendMessage(msg.from, holaCommandResponse);
			functionCounts.menuCount++;
		}
		else if (msg.body.toLowerCase().startsWith('!info')) {
			await client.sendMessage(msg.from, infoCommandResponse);
			functionCounts.infoCount++;
		}
		else if (msg.body.toLowerCase().startsWith('!ping')) {
			rl.prompt();
			functionCounts.pingCount++;
			await client.sendMessage(msg.to, pingSuccess);
		}
	//}
});

/*	SENT MESSAGE CONTROL SECTION
*/
client.on('message_create', async msg => {
    //if (listenerIDs.includes(msg.to)) {
        console.log(`Sent message to ${msg.to}: ${msg.body}`);
		
		/*	CHATBOT LOOPBACK HANDLING
		*/
		if (msg.body.toLowerCase().startsWith('!gpt')) {
			const query = msg.body.slice(5).trim();
			if (query.length > 0) {
				// If there is a query, process it
				client.sendMessage(msg.to, writingYourAnswer);
				const replyText = await getOpenAIResponse(query);
				client.sendMessage(msg.to, replyText);
			} else {
				// If there is no query, send the message about silence and asking questions
				client.sendMessage(msg.to, noQueryTxt);
			}
			functionCounts.gptCount++;
		}
		/*	IMAGE LOOPACK HANDLING
		*/
		else if (msg.body.toLowerCase().startsWith('!img')) {
			const searchTerm = msg.body.slice(5).trim();
			if (searchTerm.length > 0) {
				try {
					const firstImageSource = await getImageSource(searchTerm);
					const imageMedia = await getImageMedia(firstImageSource);
					const infoMessage = await getInfoMessage(firstImageSource);
					// Sending message with the appropiate source reference first
					await client.sendMessage(msg.to, infoMessage);
					// Sending media after
					await client.sendMessage(msg.to, imageMedia);
				} catch (error) {
					console.error('Error fetching or sending image:', error);
					await client.sendMessage(msg.to, 'Sorry, I could not fetch an image for that term.');
				}
			} else {
				// If there is no query, send the message about silence and asking questions
				await client.sendMessage(msg.from, noQueryImg);
			}
			functionCounts.imgCount++;
		}
		/*	VIDEO LOOPBACK HANDLING
		*/
		else if (msg.body.toLowerCase().startsWith('!vid')) {
			const searchTerm = msg.body.slice(5);
			if (searchTerm.length > 0) {
			// If there is a query, process it
				try {
					const firstVideoUrl = await getVideoSource(searchTerm);
					await client.sendMessage(msg.to, `Video URL: ${firstVideoUrl}`);
				} catch (error) {
					console.error('Error fetching or sending video:', error.response ? error.response.data : error);
					await client.sendMessage(msg.to, 'Sorry, I could not fetch a video for that term.');
				}
			} else {
				// If there is no query, send the message about silence and asking questions
				await client.sendMessage(msg.to, noQueryVid);
			}
			functionCounts.vidCount++;
		}
		else if (msg.body.toLowerCase().startsWith('!wiki')) {
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
				await client.sendMessage(msg.to, wikiResponse.text);
				if (wikiResponse.url) {
					await client.sendMessage(msg.to, wikiResponse.url);
				}
			} else {
				await client.sendMessage(msg.to, "Please provide a search term after !wiki");
			}
			functionCounts.wikiCount++;
		}
		else if (msg.body.toLowerCase().startsWith('!dalle')) {
			const query = msg.body.slice(6).trim();
			
			try {
				await client.sendMessage(msg.to, drawingYourAnswer);
				const imageMedia = await getDalleMedia(query);
				await client.sendMessage(msg.to, imageMedia);
			} catch (error) {
				console.error('Error fetching DALL·E media:', error);
				await client.sendMessage(msg.to, canNotDrawAnswer);
			}
			functionCounts.dalleCount++;
		}
		else if (msg.body.toLowerCase().startsWith('!txt')) {
			const query = msg.body.slice(5).trim();
			try {
				const gptText = await getFreeGpt(query);
				await client.sendMessage(msg.to, gptText);
			} catch (error) {
				console.error('Error fetching GPT response:', error);
			}
			functionCounts.txtCount++;
		}
		/*	HELP AND INFO HANDLING
		*/
		else if (msg.body.toLowerCase().startsWith('!hello')) {
			client.sendMessage(msg.to, helloCommandResponse);
			functionCounts.menuCount++;
		}
		else if (msg.body.toLowerCase().startsWith('!hola')) {
			client.sendMessage(msg.to, holaCommandResponse);
			functionCounts.menuCount++;
		}
		else if (msg.body.toLowerCase().startsWith('!info')) {
			client.sendMessage(msg.to, infoCommandResponse);
			functionCounts.infoCount++;
		}
		else if (msg.body.toLowerCase().startsWith('!ping')) {
			rl.prompt();
			functionCounts.pingCount++;
			await client.sendMessage(msg.to, pingSuccessful);
		}
    //}
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
