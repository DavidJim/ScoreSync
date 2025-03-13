require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Cambia esto según tu frontend
    methods: ['GET'],
  },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor Socket.io en ejecución 🚀');
});

const partidos = {}; // Almacén en memoria de los partidos

// 📌 Endpoint para crear un nuevo partido
app.get('/api/nuevo-partido', (req, res) => {
  const idPartido = uuidv4();

  partidos[idPartido] = {
    idPartido,
    dobles: false,
    infoLiga: {
      equipoLocal: '',
      equipoVisitante: '',
      marcadorEquipoLocal: 0,
      marcadorEquipoVisitante: 0,
      ronda: 'Dobles Mixto',
    },
    infoPartido: {
      jugador1: '',
      jugador2: '',
      parejaJugador1: '',
      parejaJugador2: '',
      colorJugador1: '#ffffff',
      colorJugador2: '#ffffff',
      escudoJugador1: '',
      escudoJugador2: '',
    },
    partnersPartido: [],
    resultadoPartido: [],
  };

  console.log(`✅ Partido creado: ${idPartido}`);
  res.json({ idPartido }); // Devolver el ID del partido al frontend
});

// Manejo de conexiones Socket.io
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  // Unirse a un partido creado y mandar información a clientes
  socket.on('unirsePartido', ({ idPartido }) => {
    console.log(partidos);
    console.log('Me llega.... ', idPartido);
    if (!partidos[idPartido]) {
      console.log('error', { mensaje: '❌ Partido no encontrado' });
      socket.emit('error', { mensaje: '❌ Partido no encontrado' });
      return;
    }

    socket.join(idPartido);
    socket.emit('infoPartido', partidos[idPartido]);
  });

  // Actualiza el resultado y lo manda a los clientes
  socket.on('actualizaResultado', ({ idPartido, resultadoPartido }) => {
    if (!partidos[idPartido]) return;

    partidos[idPartido].resultadoPartido = resultadoPartido;
    io.to(idPartido).emit('resultadoPartidoActualizado', resultadoPartido);
  });

  // Actualiza la información del partido y la manda a los clientes
  socket.on('actualizaInformacionPartido', ({ idPartido, infoPartido }) => {
    if (!partidos[idPartido]) return;

    partidos[idPartido].infoPartido = {
      ...[idPartido].infoPartido,
      ...infoPartido,
    };
    io.to(idPartido).emit('infoPartidoActualizado', [idPartido].infoPartido);
  });

  // Actualiza la información de partners del partido y la manda a los clientes
  socket.on('actualizaPartnersPartido', ({ idPartido, partnersPartido }) => {
    if (!partidos[idPartido]) return;

    partidos[idPartido].partnersPartido = partnersPartido;
    io.to(idPartido).emit('infoPartnersActualizado', partnersPartido);
  });

  // Actualiza la modalidad del partido y la manda a los clientes
  socket.on('actualizaModalidadPartido', ({ idPartido, dobles }) => {
    if (!partidos[idPartido]) return;

    partidos[idPartido].dobles = dobles;
    io.to(idPartido).emit('infoModalidadActualizada', dobles);
  });

  // Actualiza la información si es un partido de liga y la manda a los clientes
  socket.on('actualizaInfoLiga', ({ idPartido, infoLiga }) => {
    if (!partidos[idPartido]) return;

    partidos[idPartido].infoLiga = {
      ...partidos[idPartido].infoLiga,
      ...infoLiga,
    };
    io.to(idPartido).emit('infoLigaActualizada', [idPartido].infoLiga);
  });

  // Desconexión de cliente
  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
