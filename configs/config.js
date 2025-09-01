/* CONFIG.JS
CONTIENE TODAS LAS VARIABLES MODIFICABLES QUE PUEDAN SER NECESARIAS PARA LA EJECUCIÓN
*/
module.exports = {
	/*	FILL YOUR OWN DATA SECTION
	*/
	cmdDelimiter: '@',
	ollamaCmd: 'test',
	mediaFolder : 'media',
	qrimagePath : 'qr.png',
	logsFolder: 'logs',
	logFileName : 'logfile.csv',
	//MAX Tokens per GPT response:
	maxTokens : 200,
	contextDelimiter : `Contesta en máximo 50 palabras: `,
	
	/* DEFAULT AND HELP MESSAGE STRINGS
	*/
	helloCommandResponse : `*Hello!* I am C Star, an automated virtual assistant, also known as a chatbot.\n\n` +
	`To interact with me, simply write one of these commands followed by what you want to know or find:\n\n` +
	`- *@txt* SOMETHING\n  Receive an automatic written response about SOMETHING.\n\n` +
	`- *@vid* SOMETHING\n  I will send you a link to a video related to SOMETHING.\n\n` +
	`- *@img* SOMETHING\n  You will get an image about SOMETHING.\n\n` +
	`- *@info* \n  This chatbot is part of my thesis project. If you are interested in learning more about why I created it, in Spanish, write *!info*.`,

	holaCommandResponse : `*¡Hola!* Estoy aquí para ayudarte.\n\n` +
	`Comandos para Jose Guadalupe: @drive, @ik, @arm, o solo pregúntame algo.`,
	infoCommandResponse : `AHORRA DATOS NAVEGANDO EN WHATSAPP Y USA GPT-4 GRATIS.\n\n` +
	`Este proyecto busca abordar el desafío del acceso a la educación a través del Internet, entendiendo que tanto la educación como el acceso a Internet son derechos humanos fundamentales.\n\n` +
	`Organismos internacionales, incluida la ONU, han reconocido el acceso a Internet como un derecho humano esencial que debe ser garantizado con calidad y asequibilidad: es un derecho que facilita otros derechos como la educación, la asociación y la privacidad.\n\n` +
	`Sin embargo, en muchos países, incluido el nuestro, los costos de la telefonía móvil son elevados y el acceso a Internet no está garantizado para todos. Los planes de datos limitados y las tarifas elevadas representan un obstáculo significativo, limitando el acceso a información y recursos educativos en línea.\n\n` +
	`Mi proyecto presenta una solución innovadora a este problema: el uso de un chatbot accesible a través de redes sociales. Este chatbot permite a los usuarios realizar consultas similares a las que harían en un navegador web y recibir respuestas a través de mensajes, reduciendo significativamente el consumo de datos. `
	+ `Al operar dentro de las plataformas de mensajería, los usuarios pueden acceder a información vital sin incurrir en cargos adicionales de datos, haciendo que la búsqueda de conocimiento sea más asequible y accesible.\n\n` +
	`Este enfoque no sólo promueve el derecho a la educación sino también democratiza el acceso a la información, permitiendo a más personas ejercer sus derechos humanos en un mundo cada vez más digital.`,
	noQueryVid : "En el silencio encontramos las respuestas más profundas, \n\n" +
	"sin embargo, para descubrirlas, primero debemos formular la pregunta. \n\n" +
	"Por favor, ingresa tu término de búsqueda después de '@vid' para que pueda proporcionarte el video que necesitas.",
	noQueryImg : "En el silencio encontramos las respuestas más profundas, \n\n" +
	"sin embargo, para descubrirlas, primero debemos formular la pregunta. \n\n" +
	"Por favor, ingresa tu término de búsqueda después de '@img' para que pueda proporcionarte la imagen que necesitas.",
	noQueryTxt : "En el silencio encontramos las respuestas más profundas, \n" +
	"sin embargo, para descubrirlas, primero debemos formular la pregunta. \n\n" +
	"Por favor, escribe tu duda para que pueda proporcionarte la respuesta que buscas.",
	noQueryDrive: "Este comando simula el movimiento de un robot móvil diferencial (con dos ruedas). Sirve para visualizar la trayectoria que sigue al aplicar una velocidad lineal y una velocidad angular durante un tiempo.\n\nUsos:\n@drive v=0.3 w=0.2 t=10 dt=0.05 ✅\n@drive v0.3 w0.2 t10 dt0.05 ✅\n\nParámetros:\nv [m/s] = velocidad lineal\nw [rad/s] = velocidad angular\nt [s] = tiempo total de simulación\ndt [s] = intervalo de muestreo",
	noQueryArm: "Este comando calcula la cinemática directa de un brazo robótico plano con varios eslabones. Dado un conjunto de longitudes y ángulos de articulación, muestra la posición del extremo del brazo (end effector).\n\nUso:\n@arm n L1..Ln t1..tn [deg|rad]\n\nEjemplos:\n@arm 3 10 6 4 0 90 -45 ✅\n@arm 3 10 6 4 0 1.5708 -0.7854 rad ✅\n\nParámetros:\nn = número de eslabones\nL1..Ln = longitudes de los eslabones\nt1..tn = ángulos de articulación\n[deg|rad] = unidades opcionales de los ángulos",
	noQueryIK: "Este comando resuelve la cinemática inversa de un brazo de 2 eslabones. A partir de las longitudes y de una posición objetivo (x, y), calcula qué ángulos de articulación permiten alcanzar ese punto. Devuelve dos soluciones posibles: codo arriba y codo abajo.\n\nUso:\n@ik L1 L2 x y [deg|rad]\n\nEjemplos:\n@ik 10 6 12 4 ✅\n@ik 0.3 0.25 0.35 0.1 rad ✅\n\nParámetros:\nL1, L2 = longitudes de los eslabones\nx, y [m] = posición objetivo\n[deg|rad] = unidades opcionales de los ángulos",
	noQueryScara: "Este comando calcula la cinemática directa de un robot RRP SCARA (Selective Compliance Assembly Robot Arm). Muestra la posición y orientación del extremo del brazo considerando las dos articulaciones rotacionales del plano XY y el desplazamiento vertical z.\n\nUso:\n@scara L1 L2 θ1 θ2 z [deg|rad]\n\nEjemplo:\n@scara 10 6 30 -20 0.12 ✅\n\nParámetros:\nL1, L2 = longitudes de los eslabones\nθ1, θ2 = ángulos de articulación en el plano XY\nz [m] = altura vertical del extremo\n[deg|rad] = unidades opcionales de los ángulos",
	armBadLengthIdx: "Longitud inválida en L{i}: val={val}. Todas las longitudes deben ser > 0.",
	armBadUnits: "Unidades inválidas: usa 'deg' o 'rad'.",
	errArmBadJSON: "Error interno al procesar datos de arm (JSON).",
	ikUnreachOutside: "Objetivo fuera de alcance: r={r} > rmax={rmax} (exceso {delta}). Ajusta L1/L2 o acerca el objetivo.",
	ikUnreachInside: "Objetivo demasiado cerca del origen: r={r} < rmin={rmin} (faltan {delta}). El brazo no puede plegarse tanto.", 
	ikBadLengths: "Las longitudes deben ser > 0. Valores inválidos: L1={l1}, L2={l2}",
	ikBadUnits: "Unidades inválidas: '{units}'. Usa 'deg' o 'rad'.",
	errIKBadJSON: "Error interno al procesar datos de IK (JSON).",
	driveMissingKey:  "Falta el parámetro {k}. Uso: @drive v.. w.. t.. dt..",
	driveNotNumeric:  "El parámetro {k} debe ser numérico (recibí: '{val}').",
	driveBadToken:    "Token inválido: '{tok}'. Usa pares como v=0.3 o v0.3, etc.",
	driveBadNoEqKey:  "Formato sin '=' no permitido para '{tok}'. Úsalo solo en v,w,t,dt.",
	driveBadT:        "El tiempo total debe ser > 0 (t={t}).",
	driveBadDt:       "El paso de muestreo debe ser > 0 (dt={dt}).",
	driveTooManySteps:"Simulación demasiado larga: steps={steps} (t={t}, dt={dt}). Aumenta dt o reduce t.",
	driveNoMotion:    "v=0 y w=0 ⇒ el robot no se mueve. Ajusta v o w.",
	errDriveBadJSON:  "Error interno al procesar datos de drive (JSON).",
	genericError:	  "Algo salió mal y no pude resolver eso ❌",
	writingYourAnswer : "Estoy pensando tu respuesta...",
	drawingYourAnswer : "Dibujando tu respuesta. Esto tomará un minuto.",
	canNotDrawAnswer : "Lo siento. No puedo dibujar esa imagen.",
	boxCommandResponse : "Comentario enviado exitosamente.",
	pingSuccessful : "Ping successful.",
	errScaraBadNumbers: "Parámetros numéricos inválidos. Usa: L1 L2 θ1 θ2 z [deg|rad]",
	errScaraLens:       "L1 y L2 deben ser > 0 ❌",
	errScaraUnits:      "Unidades inválidas: usa 'deg' o 'rad' ❌",
	errScaraBadJSON:    "Error interno al procesar datos (JSON) ❌",
	errScaraSpawn:      "No se pudo lanzar Python en el sistema ❌",
	errScaraTimeout:    "El cálculo de SCARA tardó demasiado y fue cancelado ⏱️",
};