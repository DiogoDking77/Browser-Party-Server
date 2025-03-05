const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { calculatePawnPath } = require('./utils/boardLogic');

// Carregar variáveis de ambiente do .env
dotenv.config();

const Cliente = require('./models/client');
const { getRoomByName, createRoom, joinRoom, leaveRoom, getRoomsList, getPlayersInRoom, getRoomData, updatePlayerTurn} = require('./controllers/roomController');
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

  // Atualizado para receber o objeto { name, avatar }
  socket.on('setUsername', ({ name, avatar }, callback) => {
    if ([...users.values()].some(user => user.username === name)) {
      callback({ success: false, message: 'Username is already taken' });
    } else {
      client.setUsername(name); // Define o nome do usuário
      client.avatar = avatar; // Define o avatar do usuário
      callback({ success: true, message: 'Username set successfully' });
      console.log(`${name} has joined the server with socket ID: ${socket.id}`);
      console.log(`${name} has joined with avatar ${avatar}`);
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
      const room = getRoomByName(roomName);
      if (!room) {
          socket.emit('error', 'Room not found');
          return;
      }

      if (room.currentPlayersIds.length !== 4) {
          socket.emit('error', 'Room must have exactly 4 players to start the game.');
          return;
      }

      // Embaralhar a ordem dos jogadores
      room.playerTurnOrder = room.playerTurnOrder.sort(() => Math.random() - 0.5);

      // Iniciar o jogo e definir o primeiro jogador no turno
      room.startGame(users);

      io.to(roomName).emit('startGame', {
          currentPlayerTurn: room.currentPlayerTurn, // Enviar dados completos do jogador
          playerTurnOrder: room.playerTurnOrder, // Manter a ordem dos IDs
      });
      io.to(roomName).emit('updateRoomData', getRoomData(roomName, users));
  });

  socket.on('rollTheDice', ({ roomName, username }, callback) => {
    const rollResult = Math.floor(Math.random() * 6) + 1; // Gera um número entre 1 e 6
    console.log(`${username} rolled a ${rollResult} in room ${roomName}`);

    // Obter o jogador
    const user = users.get(socket.id);
    if (!user) {
      callback({ success: false, message: 'Jogador não encontrado' });
      return;
    }

    // Usar o currentUnit como posição inicial, ou a posição inicial (0,0) se não houver
    const startPosition = user.currentUnit || { col: 0, row: 0 };

    // Calcular o caminho do peão
    const pathResult = calculatePawnPath(startPosition, rollResult);
    console.log(pathResult);
    
    if (!pathResult.success) {
      callback({ success: false, message: pathResult.message });
      return;
    }

    // Atualizar a posição atual do jogador
    user.updatePosition(pathResult.finalPosition);
    user.currentUnit = pathResult.finalPosition;

    // Enviar o resultado para todos os players da sala
    io.to(roomName).emit('DiceRoll', { 
      username, 
      rollResult,
      path: pathResult.path,
      finalPosition: pathResult.finalPosition
    });

    // Confirmar sucesso para o player que fez o roll
    callback({ 
      success: true, 
      rollResult,
      path: pathResult.path,
      finalPosition: pathResult.finalPosition
    });
  });

  socket.on('updatePlayerTurn', (roomName) => {
      const result = updatePlayerTurn(roomName, users);
    
      if (result.success) {
          io.to(roomName).emit('updateRoomData', getRoomData(roomName, users));
          io.to(roomName).emit('message', {
              userName: 'System',
              message: `It's now ${result.currentPlayerTurn.username}'s turn.`,
              isSystem: true,
          });
      } else {
          socket.emit('error', result.message);
      }
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
