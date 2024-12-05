const Room = require('../models/room');
const rooms = new Map();

const createRoom = (roomName, socket, users) => {
  if (rooms.has(roomName)) {
      return { success: false, message: 'Room already exists' };
  }

  const room = new Room(roomName);
  room.addPlayer(socket.id, users); // Adicionar o criador da sala com atribuição de cor
  rooms.set(roomName, room);

  console.log('Room Created:', roomName);
  console.log('Initial Player:', socket.id);

  socket.emit('roomCreated', { roomName });
  return { success: true, message: 'Room created', room };
};

const getRoomData = (roomName, users) => {
  const room = rooms.get(roomName);
  if (!room) {
    return { success: false, message: 'Room not found', roomData: null };
  }

  const players = room.currentPlayersIds.map(playerId => {
    const user = users.get(playerId);
    return {
      id: playerId,
      username: user ? user.username : 'Unknown Player',
      avatar: user ? user.avatar : null,
      clientColor: user ? user.clientColor : 'gray',
      nCoins: user ? user.nCoins : 0,
      nDiamonds: user ? user.nDiamonds : 0,
      nMiniGamesWon: user ? user.nMiniGamesWon : 0,
    };
  });

  const roomData = {
    roomId: room.id,
    adminPlayer: room.getAdminPlayer(users), // Retorna os dados do admin
    isOngoing: room.isOngoing,
    currentRound: room.currentRound,
    players,
  };

  return { success: true, message: 'Room data retrieved successfully', roomData };
};

  
const joinRoom = (roomName, socket, users) => {
  const room = rooms.get(roomName);
  if (!room) {
      return { success: false, message: 'Room not found' };
  }

  if (room.currentPlayersIds.includes(socket.id)) {
      return { success: false, message: 'Player already in the room' };
  }

  if (room.currentPlayersIds.length >= 4) {
      return { success: false, message: 'Room is full' };
  }

  room.addPlayer(socket.id, users); // Atribuir cor ao novo jogador
  return { success: true, message: 'Joined room', room };
};
  
const leaveRoom = (roomName, socket, users) => {
  const room = rooms.get(roomName);
  if (!room) {
      return { success: false, message: 'Room not found' };
  }

  room.removePlayer(socket.id, users); // Liberar a cor do jogador ao sair

  // Notificar a sala que o jogador saiu
  const username = users.get(socket.id)?.username || 'Unknown Player';
  socket.to(roomName).emit('message', {
      userName: 'System',
      message: `${username} has left the room.`,
      isSystem: true,
  });

  if (room.currentPlayersIds.length === 0) {
      rooms.delete(roomName);
  }

  socket.leave(roomName);
  return { success: true, message: 'Player left the room' };
};
  
const getRoomsList = () => {
  const roomInfo = [];
  rooms.forEach((room, roomName) => {
    roomInfo.push({ name: roomName, playerCount: room.currentPlayersIds.length });
  });
  return roomInfo;
};

const getPlayersInRoom = (roomName, users) => {
  const room = rooms.get(roomName);
  if (!room) {
    return { success: false, message: 'Room not found', players: [] };
  }

  const players = room.currentPlayersIds.map(playerId => {
    const user = users.get(playerId);
    if (user) {
      return {
        id: playerId,
        username: user.username,
        avatar: user?.avatar || null,
        clientColor: user.clientColor,
        currentRoomId: user.currentRoomId,
        nCoins: user.nCoins,
        nDiamonds: user.nDiamonds,
        nMiniGamesWon: user.nMiniGamesWon,
        currentUnit: user.currentUnit,
        magicCards: user.magicCards
      };
    }
    return {
      id: playerId,
      username: 'Unknown Player',
      clientColor: 'gray'
    };
  });

  return { success: true, message: 'Players retrieved successfully', players };
};



module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomsList,
  rooms,
  getPlayersInRoom, // Adicione esta exportação
  getRoomData
};
