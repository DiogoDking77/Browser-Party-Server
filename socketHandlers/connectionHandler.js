const Cliente = require('../models/client');
const roomEvents = require('./roomEvents');
const gameEvents = require('./gameEvents');
const { updateRoomsList } = require('../utils/socketHelpers');

const users = new Map();

const handleConnection = (io, socket) => {
  console.log('User connected:', socket.id);
  const client = new Cliente(socket.id);
  users.set(socket.id, client);

  // Evento de definir username e avatar
  socket.on('setUsername', ({ name, avatar }, callback) => {
    if ([...users.values()].some(user => user.username === name)) {
      callback({ success: false, message: 'Username is already taken' });
    } else {
      client.setUsername(name);
      client.avatar = avatar;
      callback({ success: true, message: 'Username set successfully' });
      console.log(`${name} has joined with socket ID: ${socket.id} and avatar: ${avatar}`);
    }
  });

  // Delegar eventos de sala
  roomEvents(io, socket, users);

  // Delegar eventos de jogo
  gameEvents(io, socket, users);

  socket.on('disconnect', () => {
    const username = users.get(socket.id)?.username || 'Unknown Player';
    const rooms = [...io.sockets.adapter.rooms];
    
    rooms.forEach(([roomName, room]) => {
      if (room.has(socket.id)) {
        io.to(roomName).emit('message', {
          userName: 'System',
          message: `${username} has left the room.`,
          isSystem: true,
        });
      }
    });

    users.delete(socket.id);
    updateRoomsList(io);
    console.log('User disconnected:', socket.id);
  });
};

module.exports = handleConnection;
