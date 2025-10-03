/* CONFIG.JS
CONTIENE TODAS LAS VARIABLES MODIFICABLES QUE PUEDAN SER NECESARIAS PARA LA EJECUCIÓN
*/
module.exports = {
	/*	FILL YOUR OWN DATA SECTION
	*/
	/*	List of authorized user IDs.
		MX:
		Cuando se activa en la MESSAGE HANDLING SECTION:
		Lista de contactos a los que le gustaría habilitar el servicio.
		52 1 es el prefijo para números de México.
		@c.us es un sufijo obligatorio para todo número para ser reconocido por WhatsApp.
		POR DEFECTO, SE OTORGA SERVICIO A TODOS LOS USUARIOS.
	*/
	authorizedIDs : ['5219999999999@c.us','5218888888888@c.us'],
	// IDs of groups and contacts you send console directives to / accept console directives from.
	listenerIDs : ['5219999999999@c.us','5218888888888@c.us'], // List of IDs to listen to
	// Your OpenAI API key:
	openaiApiKey : 'YOUR-KEY-HERE',
	// Your Bing Search V7 API key:
	bingSearchApiKey : 'YOUR-KEY-HERE',
	// Folder you'd like to save your Downloaded media to:
	// No modificar a menos de que sepas lo que haces.
	DOWNLOADS_FOLDER : '..\\downloads',
	qrimagePath : '..\\downloads\\qr.png',
	csvLogfilePath : '..\\logs\\logfile.csv',
	// MAX Tokens per GPT response:
	// Deprecated, as it is for GPT responses only (!gpt).
	// When available, refer better to the !txt command.
	maxTokens : 500,
	
	
	/* DEFAULT AND HELP MESSAGE STRINGS
	*/
	helloCommandResponse : `*Hello!* I am C Star, an automated virtual assistant, also known as a chatbot.\n\n` +
	`To interact with me, simply write one of these commands followed by what you want to know or find:\n\n` +
	`- *!txt* SOMETHING\n  Receive an automatic written response about SOMETHING.\n\n` +
	`- *!vid* SOMETHING\n  I will send you a link to a video related to SOMETHING.\n\n` +
	`- *!img* SOMETHING\n  You will get an image about SOMETHING.\n\n` +
	`- *!info* \n  This chatbot is part of my thesis project. If you are interested in learning more about why I created it, in Spanish, write *!info*.`,

	holaCommandResponse : `*¡Hola!* Soy C Star, un asistente virtual automatizado, también conocido como chatbot.\n\n` +
	`Para interactuar conmigo, simplemente escribe uno de estos comandos seguido de lo que quieras saber o encontrar:\n\n` +
	`- *!txt* ALGO\n  Recibe una respuesta a ALGO. Toma un minuto.\n\n` +
	`- *!vid* ALGO\n  Te enviaré un enlace a un video relacionado con ALGO.\n\n` +
	`- *!img* ALGO\n  Obtendrás una imagen acerca de ALGO.\n\n`
	 + `- *!wiki* *!wikien* *!wikifr* *!wikide* *...* ALGO\n  Obtén el contenido de un artículo de Wikipedia sobre ALGO en cualquier idioma disponible. Por defecto, en español.\n\n`
	 + `- *!dalle* ALGO\n  Dibujaré una imagen creativa y artística de ALGO.\n\n`
	 + `- *!info* \n  Este chatbot es parte de mi proyecto de tesis. Si te interesa saber más sobre por qué lo creé, escribe *!info*`,

	infoCommandResponse : `AHORRA DATOS NAVEGANDO EN WHATSAPP.\n\n` +
	`Este proyecto busca abordar el desafío del acceso a la educación a través del Internet, entendiendo que tanto la educación como el acceso a Internet son derechos humanos fundamentales.\n\n` +
	`Organismos internacionales, incluida la ONU, han reconocido el acceso a Internet como un derecho humano esencial que debe ser garantizado con calidad y asequibilidad: es un derecho que facilita otros derechos como la educación, la asociación y la privacidad.\n\n` +
	`Sin embargo, en muchos países, incluido el nuestro, los costos de la telefonía móvil son elevados y el acceso a Internet no está garantizado para todos. Los planes de datos limitados y las tarifas elevadas representan un obstáculo significativo, limitando el acceso a información y recursos educativos en línea.\n\n` +
	`Mi proyecto presenta una solución innovadora a este problema: el uso de un chatbot accesible a través de redes sociales. Este chatbot permite a los usuarios realizar consultas similares a las que harían en un navegador web y recibir respuestas a través de mensajes, reduciendo significativamente el consumo de datos. `
	+ `Al operar dentro de las plataformas de mensajería, los usuarios pueden acceder a información vital sin incurrir en cargos adicionales de datos, haciendo que la búsqueda de conocimiento sea más asequible y accesible.\n\n` +
	`Este enfoque no sólo promueve el derecho a la educación sino también democratiza el acceso a la información, permitiendo a más personas ejercer sus derechos humanos en un mundo cada vez más digital.`,

	noQueryVid : "En el silencio encontramos las respuestas más profundas, \n\n" +
	"sin embargo, para descubrirlas, primero debemos formular la pregunta. \n\n" +
	"Por favor, ingresa tu término de búsqueda después de '!vid' para que pueda proporcionarte el video que necesitas.",

	noQueryImg : "En el silencio encontramos las respuestas más profundas, \n\n" +
	"sin embargo, para descubrirlas, primero debemos formular la pregunta. \n\n" +
	"Por favor, ingresa tu término de búsqueda después de '!img' para que pueda proporcionarte la imagen que necesitas.",

	noQueryTxt : "En el silencio encontramos las respuestas más profundas, \n\n" +
	"sin embargo, para descubrirlas, primero debemos formular la pregunta. \n\n" +
	"Por favor, ingresa tu término de búsqueda después de '!txt' para que pueda proporcionarte la respuesta que buscas.",

	writingYourAnswer : "Escribiendo tu respuesta. Esto tomará un minuto.",
	drawingYourAnswer : "Dibujando tu respuesta. Esto tomará un minuto.",
	canNotDrawAnswer : "Lo siento. No puedo dibujar esa imagen."
};