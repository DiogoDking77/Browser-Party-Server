const { getRoomByName, createRoom, joinRoom, leaveRoom, getRoomsList, getPlayersInRoom, getRoomData, updatePlayerTurn } = require('./roomController');
const { updateRoomsList } = require('../utils/socketHelpers');
const Cliente = require('../models/client');

class SocketController {
  constructor() {
    this.users = new Map();
  }

  handleConnection(socket, io) {
    console.log('User connected:', socket.id);
    const client = new Cliente(socket.id);
    this.users.set(socket.id, client);

    this.setupEventHandlers(socket, io);
  }

  setupEventHandlers(socket, io) {
    socket.on('setUsername', ({ name, avatar }, callback) => this.handleSetUsername(socket, name, avatar, callback));
    socket.on('getRooms', () => this.handleGetRooms(socket));
    socket.on('getPlayersInRoom', (roomName, callback) => this.handleGetPlayersInRoom(roomName, callback));
    socket.on('createRoom', (roomName) => this.handleCreateRoom(socket, io, roomName));
    socket.on('joinRoom', (roomName) => this.handleJoinRoom(socket, io, roomName));
    socket.on('leaveRoom', (roomName) => this.handleLeaveRoom(socket, io, roomName));
    socket.on('sendMessage', ({ userName, roomName, message }) => this.handleSendMessage(io, roomName, userName, message));
    socket.on('adminStartGame', (roomName) => this.handleAdminStartGame(socket, io, roomName));
    socket.on('rollTheDice', ({ roomName, username }, callback) => this.handleRollTheDice(io, roomName, username, callback));
    socket.on('updatePlayerTurn', (roomName) => this.handleUpdatePlayerTurn(socket, io, roomName));
    socket.on('disconnect', () => this.handleDisconnect(socket, io));
  }

  handleSetUsername(socket, name, avatar, callback) {
    if ([...this.users.values()].some(user => user.username === name)) {
      callback({ success: false, message: 'Username is already taken' });
    } else {
      const client = this.users.get(socket.id);
      client.setUsername(name);
      client.avatar = avatar;
      callback({ success: true, message: 'Username set successfully' });
      console.log(`${name} has joined the server with socket ID: ${socket.id}`);
      console.log(`${name} has joined with avatar ${avatar}`);
    }
  }

  handleGetRooms(socket) {
    socket.emit('roomsList', getRoomsList());
  }

  handleGetPlayersInRoom(roomName, callback) {
    const result = getPlayersInRoom(roomName, this.users);
    callback(result);
  }

  handleCreateRoom(socket, io, roomName) {
    const result = createRoom(roomName, socket, this.users);
    if (result.success) {
      socket.join(roomName);
      socket.emit('roomJoined', roomName);
      updateRoomsList(io);
      io.to(roomName).emit('updateRoomData', getRoomData(roomName, this.users));
    } else {
      socket.emit('roomExists', result.message);
    }
  }

  handleJoinRoom(socket, io, roomName) {
    const result = joinRoom(roomName, socket, this.users);
    if (result.success) {
      const username = this.users.get(socket.id)?.username || 'Unknown Player';

      socket.join(roomName);
      socket.emit('roomJoined', roomName);
      io.to(roomName).emit('updateRoomData', getRoomData(roomName, this.users));
      socket.emit('updateRoomData', getRoomData(roomName, this.users));

      io.to(roomName).emit('message', {
        userName: 'System',
        message: `${username} has entered the room.`,
        isSystem: true,
      });

      updateRoomsList(io);
    } else {
      socket.emit(result.success ? 'roomJoined' : 'roomFull', result.message);
    }
  }

  handleLeaveRoom(socket, io, roomName) {
    const result = leaveRoom(roomName, socket, this.users);
    if (result.success) {
      updateRoomsList(io);
      io.to(roomName).emit('updateRoomData', getRoomData(roomName, this.users));
      socket.emit('leftRoom', { roomName });
    } else {
      socket.emit('error', result.message);
    }
  }

  handleSendMessage(io, roomName, userName, message) {
    io.to(roomName).emit('message', { userName, message });
  }

  handleAdminStartGame(socket, io, roomName) {
    const room = getRoomByName(roomName);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.currentPlayersIds.length !== 4) {
      socket.emit('error', 'Room must have exactly 4 players to start the game.');
      return;
    }

    room.playerTurnOrder = room.playerTurnOrder.sort(() => Math.random() - 0.5);
    room.startGame(this.users);

    io.to(roomName).emit('startGame', {
      currentPlayerTurn: room.currentPlayerTurn,
      playerTurnOrder: room.playerTurnOrder,
    });
    io.to(roomName).emit('updateRoomData', getRoomData(roomName, this.users));
  }

  handleRollTheDice(io, roomName, username, callback) {
    const rollResult = Math.floor(Math.random() * 6) + 1;
    console.log(`${username} rolled a ${rollResult} in room ${roomName}`);
    io.to(roomName).emit('DiceRoll', { username, rollResult });
    callback({ success: true, rollResult });
  }

  handleUpdatePlayerTurn(socket, io, roomName) {
    const result = updatePlayerTurn(roomName, this.users);
    if (result.success) {
      io.to(roomName).emit('updateRoomData', getRoomData(roomName, this.users));
      io.to(roomName).emit('message', {
        userName: 'System',
        message: `It's now ${result.currentPlayerTurn.username}'s turn.`,
        isSystem: true,
      });
    } else {
      socket.emit('error', result.message);
    }
  }

  handleDisconnect(socket, io) {
    const username = this.users.get(socket.id)?.username || 'Unknown Player';
    const rooms = getRoomsList();
    
    for (const room of rooms) {
      if (room.players && room.players.includes(socket.id)) {
        io.to(room.name).emit('message', {
          userName: 'System',
          message: `${username} has left the room.`,
          isSystem: true,
        });
        leaveRoom(room.name, socket);
      }
    }

    this.users.delete(socket.id);
    updateRoomsList(io);
    console.log('User disconnected:', socket.id);
  }
}

module.exports = new SocketController(); 