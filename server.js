require("dotenv").config();
const express = require("express");
const fileUpload = require("express-fileupload");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

const app = express();
app.use(
	fileUpload({
		limits: { fileSize: 50 * 1024 * 1024 }, // Limitar a 50MB
	})
);
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*", // Cambia esto según tu frontend
		methods: ["GET", "POST"],
	},
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());

server.listen(PORT, "0.0.0.0", () => {
	console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});

app.get("/", (req, res) => {
	res.send("Servidor Socket.io en ejecución 🚀");
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.post("/api/upload", function (req, res) {
	console.log("ENTRO");
	let sampleFile;
	let uploadPath;
	console.log(req.files);

	if (!req.files || Object.keys(req.files).length === 0) {
		return res.status(400).send("No files were uploaded.");
	}

	// The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
	sampleFile = req.files.sampleFile;
	uploadPath = __dirname + "/uploads/" + sampleFile.name;
	url = "/uploads/" + sampleFile.name;

	// Use the mv() method to place the file somewhere on your server
	sampleFile.mv(uploadPath, function (err) {
		if (err) return res.status(500).send(err);

		res.send({ url });
	});
});

const partidos = {}; // Almacén en memoria de los partidos

// 📌 Endpoint para crear un nuevo partido
app.get("/api/nuevo-partido", express.json(), (req, res) => {
	const idPartido = uuidv4();

	partidos[idPartido] = {
		idPartido,
		jugador1: "",
		jugador2: "",
		parejaJugador1: "",
		parejaJugador2: "",
		jugador1Equipo: "",
		jugador2Equipo: "",
		resultadoEquipo1: "0",
		resultadoEquipo2: "0",
		escudoEquipo1: null,
		escudoEquipo2: null,
		saqueActual: "jugador1",
		categoria: "Selecciona Categoría",
		setIndex: 0,
		saqueInicial: "jugador1",
		nombreTorneo: "BFTV",
		dobles: false,
		liga: false,
		puntuacion: [
			{ jugador1: 0, jugador2: 0 },
			{ jugador1: 0, jugador2: 0 },
			{ jugador1: 0, jugador2: 0 },
			{ jugador1: 0, jugador2: 0 },
			{ jugador1: 0, jugador2: 0 },
		],
	};

	console.log(`✅ Partido creado: ${idPartido}`);
	res.json({ idPartido }); // Devolver el ID del partido al frontend
});

// Manejo de conexiones Socket.io
io.on("connection", (socket) => {
	console.log(`Cliente conectado: ${socket.id}`);
	// Unirse a un partido creado y mandar información a clientes
	socket.on("unirsePartido", ({ idPartido }) => {
		if (!partidos[idPartido]) {
			socket.emit("errorNotFound", { mensaje: "❌ Partido no encontrado" });
			return;
		}

		socket.join(idPartido);
		socket.emit("infoPartido", partidos[idPartido]);
	});

	// Actualiza el resultado y lo manda a los clientes
	socket.on("actualizaPartido", ({ idPartido, partido }) => {
		if (!partidos[idPartido]) return;

		partidos[idPartido] = partido;
		io.to(idPartido).emit("infoPartido", partidos[idPartido]);
	});

	// Desconexión de cliente
	socket.on("disconnect", () => {
		console.log(`Cliente desconectado: ${socket.id}`);
	});
});

// Iniciar servidor
server.listen(PORT, "0.0.0.0", () => {
	console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
