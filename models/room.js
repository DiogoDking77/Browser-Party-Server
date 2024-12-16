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
      this.playerTurnOrder = []; // Novo atributo para armazenar a ordem de turno
      this.availableColors = ['red', 'blue', 'yellow', 'green'];
  }

  // Adiciona um jogador à sala
  addPlayer(playerId, users) {
      if (this.currentPlayersIds.length === 0) {
          this.adminPlayerId = playerId;
      }
      this.currentPlayersIds.push(playerId);

      // Atualizar a ordem de turno
      this.playerTurnOrder.push(playerId);

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
      }

      // Remover jogador da ordem de turno
      const turnIndex = this.playerTurnOrder.indexOf(playerId);
      if (turnIndex !== -1) {
          this.playerTurnOrder.splice(turnIndex, 1);
      }

      // Recuperar a cor do jogador ao sair da sala
      const client = users.get(playerId);
      if (client && client.clientColor) {
          this.availableColors.push(client.clientColor);
          client.leaveRoom();
      }

      // Verificar se o admin saiu
      if (playerId === this.adminPlayerId && this.currentPlayersIds.length > 0) {
          this.adminPlayerId = this.currentPlayersIds[0]; // Define o próximo jogador como admin
      }

      // Se não há mais jogadores, redefine o admin
      if (this.currentPlayersIds.length === 0) {
          this.adminPlayerId = null;
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
      this.playerTurnOrder = [...this.currentPlayersIds]; // Inicializar a ordem de turno
      this.currentPlayerTurn = this.playerTurnOrder[0]; // Primeiro jogador da ordem inicia o turno
  }

  // Atualiza o próximo jogador no turno
  nextTurn() {
      if (this.playerTurnOrder.length > 0) {
          // Atualizar para o próximo jogador
          const currentIndex = this.playerTurnOrder.indexOf(this.currentPlayerTurn);
          const nextIndex = (currentIndex + 1) % this.playerTurnOrder.length;
          this.currentPlayerTurn = this.playerTurnOrder[nextIndex];
      }
  }

  // Termina a partida
  endGame() {
      this.isOngoing = false;
      this.currentRound = null;
      this.currentPlayersIdsRank = null;
      this.currentPlayerTurn = null;
      this.playerTurnOrder = [];
  }
}

module.exports = Room;
