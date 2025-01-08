const { getRoomByName, getPlayersInRoom, getRoomData, updatePlayerTurn} = require('../controllers/roomController');

module.exports = (io, socket, users) => {
  socket.on('sendMessage', ({ userName, roomName, message }) => {
    io.to(roomName).emit('message', { userName, message });
  });

  socket.on('getPlayersInRoom', (roomName, callback) => {
    const result = getPlayersInRoom(roomName, users);
    callback(result);
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
    const rollResult = Math.floor(Math.random() * 6) + 1;
    io.to(roomName).emit('DiceRoll', { username, rollResult });
    callback({ success: true, rollResult });
  });

  socket.on('triggerMiniGame', ({ roomName, miniGameType }) => {
    console.log('Mini-game event triggered:', miniGameType);  // Verifique se este log aparece
    io.to(roomName).emit('miniGameEventTime', { miniGameType });
  });

  socket.on('updatePlayerTurn', (roomName) => {
    const result = updatePlayerTurn(roomName, users, io);
    
    if (result.success) {
        io.to(roomName).emit('updateRoomData', getRoomData(roomName, users));
        io.to(roomName).emit('miniGameEvent', { isMinigameEvent: result.randomMinigame !== null })
        console.log(result.randomMinigame)
        if(result.randomMinigame){
          io.to(roomName).emit('message', {
            userName: 'System',
            message: `New Round. It will be ${result.currentPlayerTurn.username}'s turn after the next Minigame: ${result.randomMinigame}.`,
            isSystem: true,
            isMinigameEvent: result.randomMinigame !== null
          });
        } else {
          io.to(roomName).emit('message', {
            userName: 'System',
            message: `It's now ${result.currentPlayerTurn.username}'s turn.`,
            isSystem: true,
        });
        } 
    } else {
        socket.emit('error', result.message);
    }
  });
};
