const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), {
    headers: { 'Content-Type': 'text/html' }
  });
});

const rooms = {};

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function fetchAIQuestion() {
  try {
    const res = await fetch('https://opentdb.com/api.php?amount=1&type=multiple');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const q = data.results[0];
      const clean = (str) => str.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&deg;/g, '°');
      return {
        question: clean(q.question),
        answer: clean(q.correct_answer),
        houseLies: q.incorrect_answers.map(clean)
      };
    }
  } catch (err) {}
  return {
    question: "In 1912, an Olympic athlete was forced to forfeit his medals after playing professional ____.",
    answer: "Baseball",
    houseLies: ["Cricket", "Lacrosse", "Basketball"]
  };
}

io.on('connection', (socket) => {
  socket.on('createRoom', () => {
    const code = generateRoomCode();
    rooms[code] = {
      hostId: socket.id,
      players: {},
      state: 'LOBBY',
      currentQuestion: null,
      options: [],
      votes: {}
    };
    socket.join(code);
    socket.emit('roomCreated', { roomCode: code });
  });

  socket.on('joinRoom', ({ roomCode, name }) => {
    const cleanCode = roomCode ? roomCode.toUpperCase() : '';
    const room = rooms[cleanCode];
    if (!room) return socket.emit('errorMsg', 'Room not found.');
    if (room.state !== 'LOBBY') return socket.emit('errorMsg', 'Game already in progress.');

    room.players[socket.id] = { name, score: 0, currentLie: '' };
    socket.join(cleanCode);
    socket.emit('joinedSuccess', { roomCode: cleanCode, name });
    io.to(room.hostId).emit('updatePlayers', Object.values(room.players));
  });

  socket.on('startRound', async (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;
    room.state = 'SUBMITTING';
    room.votes = {};
    Object.values(room.players).forEach(p => p.currentLie = '');

    const qData = await fetchAIQuestion();
    room.currentQuestion = qData;

    io.to(roomCode).emit('newRound', { question: qData.question });
  });

  socket.on('submitLie', ({ roomCode, lie }) => {
    const room = rooms[roomCode];
    if (!room || !room.players[socket.id]) return;

    room.players[socket.id].currentLie = lie.trim();
    
    const playerList = Object.values(room.players);
    const allSubmitted = playerList.length > 0 && playerList.every(p => p.currentLie.length > 0);

    if (allSubmitted) {
      room.state = 'VOTING';
      const rawOptions = [{ text: room.currentQuestion.answer, isCorrect: true, author: 'TRUTH' }];
      Object.entries(room.players).forEach(([id, p]) => {
        rawOptions.push({ text: p.currentLie, isCorrect: false, author: id });
      });
      if (room.currentQuestion.houseLies && room.currentQuestion.houseLies[0]) {
        rawOptions.push({ text: room.currentQuestion.houseLies[0], isCorrect: false, author: 'HOUSE' });
      }

      room.options = rawOptions.sort(() => Math.random() - 0.5);
      io.to(roomCode).emit('startVoting', {
        question: room.currentQuestion.question,
        options: room.options.map(o => o.text)
      });
    }
  });

  socket.on('submitVote', ({ roomCode, optionIndex }) => {
    const room = rooms[roomCode];
    if (!room || !room.players[socket.id]) return;

    room.votes[socket.id] = optionIndex;
    const playerList = Object.keys(room.players);
    const allVoted = playerList.length > 0 && playerList.every(id => room.votes[id] !== undefined);

    if (allVoted) {
      room.state = 'REVEAL';
      Object.entries(room.votes).forEach(([voterId, chosenIdx]) => {
        const chosenOption = room.options[chosenIdx];
        if (!chosenOption) return;
        if (chosenOption.isCorrect) {
          room.players[voterId].score += 1000;
        } else if (chosenOption.author !== 'HOUSE' && chosenOption.author !== voterId) {
          if (room.players[chosenOption.author]) {
            room.players[chosenOption.author].score += 500;
          }
        }
      });

      io.to(roomCode).emit('showReveal', {
        truth: room.currentQuestion.answer,
        options: room.options,
        votes: room.votes,
        players: room.players
      });
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));