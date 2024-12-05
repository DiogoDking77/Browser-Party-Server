// models/rooms.js
class Room {
    constructor(id) {
      this.id = id;
      this.currentPlayersIds = [];
      this.adminPlayerId = null;
      this.isOngoing = false;
      this.currentRound = null;
      this.currentPlayersIdsRank = null;
      this.currentPlayerTurn = null;
      this.availableColors = ['red', 'blue', 'yellow', 'green'];
    }
  
    // Adiciona um jogador à sala
    addPlayer(playerId, users) {
      if (this.currentPlayersIds.length === 0) {
        this.adminPlayerId = playerId;
      }
      this.currentPlayersIds.push(playerId);
  
      // Atribuir cor ao jogador
      const client = users.get(playerId);
      if (client && this.availableColors.length > 0) {
        client.joinRoom(this.id, this.availableColors);
      }
    }
  
    // Remove um jogador da sala
    removePlayer(playerId, users) {
      const index = this.currentPlayersIds.indexOf(playerId);
      if (index !== -1) {
        this.currentPlayersIds.splice(index, 1);
  
        // Recuperar a cor do jogador ao sair da sala
        const client = users.get(playerId);
        if (client && client.clientColor) {
          this.availableColors.push(client.clientColor);
          client.leaveRoom();
        }
      }
  
      // Verificar se o admin saiu
      if (playerId === this.adminPlayerId && this.currentPlayersIds.length > 0) {
        this.adminPlayerId = this.currentPlayersIds[0];
      }
    }
  
    // Retornar os dados do administrador
    getAdminPlayer(users) {
      const admin = users.get(this.adminPlayerId);
      return admin
        ? {
            id: admin.id,
            username: admin.username,
            clientColor: admin.clientColor,
            nCoins: admin.nCoins,
            nDiamonds: admin.nDiamonds,
            nMiniGamesWon: admin.nMiniGamesWon,
          }
        : null;
    }
  
    // Inicia a partida
    startGame() {
      this.isOngoing = true;
      this.currentRound = 1;
      this.currentPlayersIdsRank = [...this.currentPlayersIds];
      this.currentPlayerTurn = this.currentPlayersIds[0];
    }
  
    // Termina a partida
    endGame() {
      this.isOngoing = false;
      this.currentRound = null;
      this.currentPlayersIdsRank = null;
      this.currentPlayerTurn = null;
    }
  }
  
  module.exports = Room;
  