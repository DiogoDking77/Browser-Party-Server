const updateRoomsList = (io) => {
    const roomInfo = [];
    const { getRoomsList } = require('../controllers/roomController');
    const rooms = getRoomsList();
    io.emit('roomsList', rooms); // Emite a lista de salas para todos os clientes
  };
  
  module.exports = {
    updateRoomsList,
  };
  