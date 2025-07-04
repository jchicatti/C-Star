/* CONFIG.JS
CONTIENE TODAS LAS VARIABLES MODIFICABLES QUE PUEDAN SER NECESARIAS PARA LA EJECUCIÓN
*/
module.exports = {
	/*	FILL YOUR OWN DATA SECTION
	*/
	DOWNLOADS_FOLDER : '..\\media',
	qrimagePath : '..\\media\\qr.png',
	csvLogfilePath : '..\\logs\\logfile.csv',
	//MAX Tokens per GPT response:
	maxTokens : 500,
	contextDelimiter : `Se breve, claro y amigable. Usa bullets, listas, analogías y lo necesario. `
	+ `Usa un tono casual, tu publico son jovenes mexicanos. `
	+ `Eres mi asesor personal para finanzas y economia, si la pregunta no es sobre esos temas, házmelo saber. Aquí está la pregunta:\n`,
	/*
	contextDelimiter : `Intenta responder en 200 palabras o menos como máximo si es posible. Si no te alcanza, házme saber que tienes un espacio limitado y mejor pregunte algo más específico.`
	+ `Usa un tono casual. Tu publico es joven.\n`
	+ `Importante: si la pregunta no es de finanzas o economia personal, dime que no puedes responderla. Aquí está la pregunta:\n`,
	*/
	/*
	contextDelimiter : `Intenta responder en 200 palabras o menos como máximo si es posible. Si no te alcanza, házme saber que tienes un espacio limitado y mejor pregunte algo más específico.`
	+ `Usa bullets, listas, analogías y lo que necesites. Usa un tono casual, se amable y neutral. Tu publico es joven.\n`
	+ `Importante: si la pregunta no es de finanzas o economia personal, dime que no puedes responderla. Aquí está la pregunta:\n`,
	*/
	
	/* DEFAULT AND HELP MESSAGE STRINGS
	*/
	helloCommandResponse : `*Hello!* I am C Star, an automated virtual assistant, also known as a chatbot.\n\n` +
	`To interact with me, simply write one of these commands followed by what you want to know or find:\n\n` +
	`- *!txt* SOMETHING\n  Receive an automatic written response about SOMETHING.\n\n` +
	`- *!vid* SOMETHING\n  I will send you a link to a video related to SOMETHING.\n\n` +
	`- *!img* SOMETHING\n  You will get an image about SOMETHING.\n\n` +
	`- *!info* \n  This chatbot is part of my thesis project. If you are interested in learning more about why I created it, in Spanish, write *!info*.`,

	holaCommandResponse : `*¡Hola!* Estoy aquí para ayudarte.\n\n`
	+ `Puedo responder tus preguntas, simplemente di mi nombre antes, por ejemplo:\n\n`
	+ `*rico* cómo puedo ahorrar más?`,
	
	//+ `*!buzon* COMENTARIO\n  Envía un comentario, queja o sugerencia al buzón de desarrollo.\n\n`
	//+ `*!info* \n  Este chatbot es parte de mi proyecto de tesis. Si te interesa saber más sobre por qué lo creé, escribe *!info*\n\n`,
	/*
	infoCommandResponse : `AHORRA DATOS NAVEGANDO EN WHATSAPP Y USA GPT-4 GRATIS.\n\n` +
	`Este proyecto busca abordar el desafío del acceso a la educación a través del Internet, entendiendo que tanto la educación como el acceso a Internet son derechos humanos fundamentales.\n\n` +
	`Organismos internacionales, incluida la ONU, han reconocido el acceso a Internet como un derecho humano esencial que debe ser garantizado con calidad y asequibilidad: es un derecho que facilita otros derechos como la educación, la asociación y la privacidad.\n\n` +
	`Sin embargo, en muchos países, incluido el nuestro, los costos de la telefonía móvil son elevados y el acceso a Internet no está garantizado para todos. Los planes de datos limitados y las tarifas elevadas representan un obstáculo significativo, limitando el acceso a información y recursos educativos en línea.\n\n` +
	`Mi proyecto presenta una solución innovadora a este problema: el uso de un chatbot accesible a través de redes sociales. Este chatbot permite a los usuarios realizar consultas similares a las que harían en un navegador web y recibir respuestas a través de mensajes, reduciendo significativamente el consumo de datos. `
	+ `Al operar dentro de las plataformas de mensajería, los usuarios pueden acceder a información vital sin incurrir en cargos adicionales de datos, haciendo que la búsqueda de conocimiento sea más asequible y accesible.\n\n` +
	`Este enfoque no sólo promueve el derecho a la educación sino también democratiza el acceso a la información, permitiendo a más personas ejercer sus derechos humanos en un mundo cada vez más digital.`,
	*/
	infoCommandResponse : `Usa GPT-4 gratis y ahorra datos navegando con Whatsapp. Los paquetes de telefonía suelen incluir datos ilimitados para redes sociales.\n\n` +
	`Este proyecto busca abordar el desafío del acceso a la educación a través del Internet, entendiendo que tanto la educación como el acceso a Internet son derechos humanos fundamentales.\n\n` +
	`Organismos internacionales, incluida la ONU, han reconocido el acceso a Internet como un derecho humano esencial que debe ser garantizado con calidad y asequibilidad: es un derecho que facilita otros derechos como la educación, la asociación y la privacidad.\n\n` +
	`Sin embargo, en muchos países, incluido el nuestro, los costos de la telefonía móvil son elevados y el acceso a Internet no está garantizado para todos. Los planes de datos limitados y las tarifas elevadas representan un obstáculo significativo, limitando el acceso a información y recursos educativos en línea.\n\n` +
	`Este proyecto presenta una solución innovadora a este problema: el uso de un chatbot accesible a través de redes sociales. Este chatbot permite a los usuarios realizar consultas similares a las que harían en un navegador web y recibir respuestas a través de mensajes, reduciendo significativamente el consumo de datos. `
	+ `Al operar dentro de las plataformas de mensajería, los usuarios pueden acceder a información vital sin incurrir en cargos adicionales de datos, haciendo que la búsqueda de conocimiento sea más asequible y accesible.\n\n` +
	`Este enfoque no sólo promueve el derecho a la educación sino también democratiza el acceso a la información, permitiendo a más personas ejercer sus derechos humanos en un mundo cada vez más digital.`,
	
	noQueryVid : "En el silencio encontramos las respuestas más profundas, \n\n" +
	"sin embargo, para descubrirlas, primero debemos formular la pregunta. \n\n" +
	"Por favor, ingresa tu término de búsqueda después de '!vid' para que pueda proporcionarte el video que necesitas.",

	noQueryImg : "En el silencio encontramos las respuestas más profundas, \n\n" +
	"sin embargo, para descubrirlas, primero debemos formular la pregunta. \n\n" +
	"Por favor, ingresa tu término de búsqueda después de '!img' para que pueda proporcionarte la imagen que necesitas.",

	noQueryTxt : "En el silencio encontramos las respuestas más profundas, \n" +
	"sin embargo, para descubrirlas, primero debemos formular la pregunta. \n\n" +
	"Por favor, escribe tu duda después de *rico* para que pueda proporcionarte la respuesta que buscas.",

	writingYourAnswer : "Estoy pensando tu respuesta...",
	drawingYourAnswer : "Dibujando tu respuesta. Esto tomará un minuto.",
	canNotDrawAnswer : "Lo siento. No puedo dibujar esa imagen.",
	boxCommandResponse : "Comentario enviado exitosamente.",
	pingSuccessful : "Ping successful."
};