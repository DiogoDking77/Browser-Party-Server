class Client {
  constructor(id) {
      this.id = id;
      this.username = null;
      this.currentRoomId = null;
      this.nCoins = null;
      this.nDiamonds = null;
      this.nMiniGamesWon = null;
      this.currentUnit = null;
      this.magicCards = null;
      this.clientColor = null; // Novo atributo para a cor do cliente
  }

  // Definir o nome de usuário
  setUsername(username) {
      this.username = username;
  }

  // Entrar em uma sala
  joinRoom(roomId, availableColors) {
      this.currentRoomId = roomId;
      this.clientColor = availableColors.shift(); // Atribuir a primeira cor disponível
      this.resetGameStats();
  }

  // Sair da sala
  leaveRoom() {
      this.currentRoomId = null;
      this.clientColor = null; // Liberar a cor quando sair da sala
      this.resetGameStats();
  }

  // Resetar os atributos de jogo
  resetGameStats() {
      this.nCoins = null;
      this.nDiamonds = null;
      this.nMiniGamesWon = null;
      this.currentUnit = null;
      this.magicCards = null;
  }
}

module.exports = Client;
