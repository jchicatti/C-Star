//lang.js
module.exports = {
	system: {
		initContext : `Responde en máximo 200 tokens (140 palabras). Si la pregunta no lo permite, avísame. Sé conciso y usa un tono casual.`,
	},
	commands: {
		hello : `*Hello!* I am C-Star, an automated virtual assistant, also known as a chatbot.\n\n` +
		`To interact with me, simply write one of these commands followed by what you want to know or find:\n\n` +
		`- *!txt* SOMETHING\n  Receive an automatic written response about SOMETHING.\n\n` +
		`- *!vid* SOMETHING\n  I will send you a link to a video related to SOMETHING.\n\n` +
		`- *!img* SOMETHING\n  You will get an image about SOMETHING.\n\n` +
		`- *!info* \n  This chatbot is part of my thesis project. If you are interested in learning more about why I created it, in Spanish, write *!info*.`,
		hola : `*¡Hola!* Soy C-Star, tu asistente virtual automático.\n\n` +
		`Para interactuar, solo hazme una pregunta. O usa mis comandos especiales:\n\n` +
		`- *wiki* ALGO → Artículo wiki sobre ALGO.\n` +
		`- *vid* ALGO → Enlace a un video de ALGO.\n` +
		`- *img* ALGO → Imagen de ALGO.\n` +
		`- *draw* ALGO → Dibujaré ALGO.\n` +
		`- *info* → Detalles sobre este proyecto (en español).`,
	},
	noQuery: {
		vid : "En el silencio encontramos las respuestas más profundas, \n\n" +
		"sin embargo, para descubrirlas, primero debemos formular la pregunta. \n\n" +
		"Por favor, ingresa tu término de búsqueda después de '!vid' para que pueda proporcionarte el video que necesitas.",
		img : "En el silencio encontramos las respuestas más profundas, \n\n" +
		"sin embargo, para descubrirlas, primero debemos formular la pregunta. \n\n" +
		"Por favor, ingresa tu término de búsqueda después de '!img' para que pueda proporcionarte la imagen que necesitas.",
		txt : "En el silencio encontramos las respuestas más profundas, \n" +
		"sin embargo, para descubrirlas, primero debemos formular la pregunta. \n\n" +
		"Por favor, escribe tu duda después de *rico* para que pueda proporcionarte la respuesta que buscas.",
	},
	writingYourAnswer : "Estoy pensando tu respuesta...",
	drawingYourAnswer : "Dibujando tu respuesta. Esto tomará un minuto.",
	canNotDrawAnswer : "Lo siento. No puedo dibujar esa imagen.",
	boxCommandResponse : "Comentario enviado exitosamente.",
	pingSuccessful : "PONG!"
};