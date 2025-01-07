const { createRoom, joinRoom, leaveRoom, getRoomData, getRoomsList } = require('../controllers/roomController');
const { updateRoomsList } = require('../utils/socketHelpers');

module.exports = (io, socket, users) => {
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

  socket.on('getRooms', () => {
    socket.emit('roomsList', getRoomsList());
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
};
