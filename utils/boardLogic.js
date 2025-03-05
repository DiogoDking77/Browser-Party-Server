const boardData = require('../data/boardData.json');

// Função para encontrar a próxima posição baseada na direção atual
const findNextPosition = (currentSquare, direction) => {
    let nextCol = currentSquare.col;
    let nextRow = currentSquare.row;

    switch (direction) {
        case 'right':
            nextCol++;
            break;
        case 'left':
            nextCol--;
            break;
        case 'up':
            nextRow--;
            break;
        case 'down':
            nextRow++;
            break;
    }

    // Encontra o próximo quadrado válido
    return boardData.gameSquares.find(square => 
        square.col === nextCol && 
        square.row === nextRow
    );
};

// Função para calcular o caminho completo do peão
const calculatePawnPath = (currentPosition, diceNumber) => {
    const path = [];
    let currentSquare = currentPosition;
    
    // Encontra a posição atual no tabuleiro
    let currentGameSquare = boardData.gameSquares.find(square => 
        square.col === currentPosition.col && 
        square.row === currentPosition.row
    );

    if (!currentGameSquare) {
        return { success: false, message: 'Posição inicial inválida' };
    }

    // Adiciona a posição inicial ao caminho
    path.push(currentGameSquare);

    // Calcula o caminho para cada movimento do dado
    for (let i = 0; i < diceNumber; i++) {
        // Pega a primeira direção disponível (conforme especificado)
        const direction = currentGameSquare.directions[0];
        
        // Encontra a próxima posição
        const nextSquare = findNextPosition(currentGameSquare, direction);
        
        if (!nextSquare) {
            return { 
                success: false, 
                message: 'Caminho inválido - não foi possível encontrar a próxima posição',
                path 
            };
        }

        // Atualiza a posição atual
        currentGameSquare = nextSquare;
        path.push(currentGameSquare);
    }

    return { 
        success: true, 
        path,
        finalPosition: {
            col: currentGameSquare.col,
            row: currentGameSquare.row
        }
    };
};

module.exports = {
    calculatePawnPath
}; 