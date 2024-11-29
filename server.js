const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const Cliente = require('./models/client');
const { createRoom, joinRoom, leaveRoom, getRoomsList, getPlayersInRoom } = require('./controllers/roomController');
const { updateRoomsList } = require('./utils/socketHelpers');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
  },
});

const users = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  const client = new Cliente(socket.id);
  users.set(socket.id, client);

  socket.on('setUsername', (username, callback) => {
    if ([...users.values()].some(user => user.username === username)) {
      callback({ success: false, message: 'Username is already taken' });
    } else {
      client.setUsername(username);
      callback({ success: true, message: 'Username set successfully' });
      console.log(`${username} has joined the server with socket ID: ${socket.id}`);
    }
  });

  socket.on('getRooms', () => {
    socket.emit('roomsList', getRoomsList());
  });

  socket.on('getPlayersInRoom', (roomName, callback) => {
    const result = getPlayersInRoom(roomName, users);
    callback(result);
  });

  socket.on('createRoom', (roomName) => {
    const result = createRoom(roomName, socket, users);
    if (result.success) {
      socket.join(roomName);
      socket.emit('roomJoined', roomName);
      updateRoomsList(io);
    } else {
      socket.emit('roomExists', result.message);
    }
  });

  socket.on('joinRoom', (roomName) => {
    const result = joinRoom(roomName, socket, users);
    if (result.success) {
        const username = users.get(socket.id)?.username || 'Unknown Player';

        socket.join(roomName);
        socket.emit('roomJoined', roomName);

        io.to(roomName).emit('updatePlayers', getPlayersInRoom(roomName, users).players);

        io.to(roomName).emit('message', {
            userName: 'System',
            message: `${username} has entered the room.`,
            isSystem: true,
        });

        updateRoomsList(io);
    } else {
        socket.emit(result.success ? 'roomJoined' : 'roomFull', result.message);
    }
  });
  
  socket.on('leaveRoom', (roomName) => {
    const result = leaveRoom(roomName, socket, users);
    if (result.success) {
      updateRoomsList(io);
  
      io.to(roomName).emit('updatePlayers', getPlayersInRoom(roomName, users).players); // Atualizar todos na sala
  
      socket.emit('leftRoom', { roomName });
    } else {
      socket.emit('error', result.message);
    }
  });

  socket.on('sendMessage', ({ userName, roomName, message }) => {
    io.to(roomName).emit('message', { userName, message });
  });

  socket.on('rollTheDice', ({ roomName, username }, callback) => {
    const rollResult = Math.floor(Math.random() * 6) + 1; // Gera um número entre 1 e 6
    console.log(`${username} rolled a ${rollResult} in room ${roomName}`);

    // Enviar o resultado para todos os players da sala
    io.to(roomName).emit('DiceRoll', { username, rollResult });

    // Confirmar sucesso para o player que fez o roll
    callback({ success: true, rollResult });
  });

  socket.on('disconnect', () => {
    const username = users.get(socket.id)?.username || 'Unknown Player';

    for (const room of getRoomsList()) {
      if (room.players.includes(socket.id)) {
        // Emitir mensagem de saída da sala
        io.to(room.name).emit('message', {
          userName: 'System',
          message: `${username} has left the room.`,
          isSystem: true,
        });

        leaveRoom(room.name, socket);
      }
    }

    users.delete(socket.id);
    updateRoomsList(io);
    console.log('User disconnected:', socket.id);
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
