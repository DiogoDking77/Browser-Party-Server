const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente do .env
dotenv.config();

const Cliente = require('./models/client');
const { createRoom, joinRoom, leaveRoom, getRoomsList, getPlayersInRoom, getRoomData } = require('./controllers/roomController');
const { updateRoomsList } = require('./utils/socketHelpers');

const app = express();

const clientUrl = process.env.CLIENT_URL || 'https://browser-party-client.onrender.com';

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: clientUrl,
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

      io.to(roomName).emit('updateRoomData', getRoomData(roomName, users));
      
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

        io.to(roomName).emit('updateRoomData', getRoomData(roomName, users));

        socket.emit('updateRoomData', getRoomData(roomName, users));

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
  

      io.to(roomName).emit('updateRoomData', getRoomData(roomName, users));
  
      socket.emit('leftRoom', { roomName });
    } else {
      socket.emit('error', result.message);
    }
  });

  socket.on('sendMessage', ({ userName, roomName, message }) => {
    io.to(roomName).emit('message', { userName, message });
  });

  socket.on('adminStartGame', (roomName) => {
    io.to(roomName).emit('startGame');
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
  
    // Verifica todas as salas
    const rooms = getRoomsList();
    for (const room of rooms) {
      if (room.players && room.players.includes(socket.id)) {
        // Emite a mensagem de saída
        io.to(room.name).emit('message', {
          userName: 'System',
          message: `${username} has left the room.`,
          isSystem: true,
        });
  
        leaveRoom(room.name, socket);  // Remove o jogador da sala
      }
    }
  
    // Remove o usuário da lista de usuários
    users.delete(socket.id);
  
    // Atualiza a lista de salas
    updateRoomsList(io);
    console.log('User disconnected:', socket.id);
  });
  
});

server.listen(3000, () => console.log('Servidor a correr, ligado a ' + clientUrl));
