const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {};

function generateCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on('connection', (socket) => {

  socket.on('createRoom', () => {
    const roomCode = generateCode();
    rooms[roomCode] = { host: socket.id, players: [] };
    socket.join(roomCode);
    socket.emit('roomCreated', roomCode);
  });

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit('errorMsg', 'INVALID ROOM CODE');
      return;
    }
    
    room.players.push({ id: socket.id, name: playerName });
    socket.join(roomCode);
    
    socket.emit('joinSuccess', { roomCode, playerName });
    io.to(room.host).emit('updatePlayerList', room.players.map(p => p.name));
  });

  socket.on('startGame', ({ roomCode }) => {
    io.to(roomCode).emit('gameStarted');
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      const index = room.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        io.to(room.host).emit('updatePlayerList', room.players.map(p => p.name));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));