const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// État du jeu
let gameState = {
  targetNumber: null,
  mode: 'random', // 'random' ou 'manual'
  isGameActive: false,
  attempts: [],
  players: {},
  hostId: null,
  maxAttempts: 30
};

// Fonctions utilitaires
function generateRandomNumber() {
  return Math.floor(Math.random() * 9999).toString().padStart(4, '0');
}

function validateNumber(number) {
  return /^\d{4}$/.test(number) && number >= '0001' && number <= '9999';
}

function compareNumbers(guess, target) {
  const guessArray = guess.split('');
  const targetArray = target.split('');
  
  let correctPosition = 0;
  let correctNumber = 0;
  
  // Compter les chiffres à la bonne position
  for (let i = 0; i < 4; i++) {
    if (guessArray[i] === targetArray[i]) {
      correctPosition++;
      guessArray[i] = 'X'; // Marquer comme utilisé
      targetArray[i] = 'Y'; // Marquer comme utilisé
    }
  }
  
  // Compter les chiffres corrects mais mal placés
  for (let i = 0; i < 4; i++) {
    if (guessArray[i] !== 'X') {
      const index = targetArray.indexOf(guessArray[i]);
      if (index !== -1) {
        correctNumber++;
        targetArray[index] = 'Z'; // Marquer comme utilisé
      }
    }
  }
  
  return { correctPosition, correctNumber };
}

function resetGame() {
  gameState.targetNumber = null;
  gameState.isGameActive = false;
  gameState.attempts = [];
  gameState.mode = 'random';
}

// Connexions Socket.IO
io.on('connection', (socket) => {
  console.log('Nouvel utilisateur connecté:', socket.id);
  
  // Ajouter le joueur
  socket.on('join-game', (playerName) => {
    gameState.players[socket.id] = {
      name: playerName || `Joueur ${Object.keys(gameState.players).length + 1}`,
      id: socket.id,
      score: 0
    };
    
    // Si c'est le premier joueur, il devient l'hôte
    if (!gameState.hostId) {
      gameState.hostId = socket.id;
      socket.emit('host-status', true);
    }
    
    // Envoyer l'état du jeu au nouveau joueur
    socket.emit('game-state', {
      ...gameState,
      targetNumber: undefined // Ne pas révéler le nombre cible
    });
    
    // Notifier tous les joueurs
    io.emit('player-joined', {
      player: gameState.players[socket.id],
      players: gameState.players
    });
  });
  
  // Démarrer une nouvelle partie (seulement l'hôte)
  socket.on('start-game', (data) => {
    if (socket.id !== gameState.hostId) {
      socket.emit('error', 'Seul l\'hôte peut démarrer une partie');
      return;
    }
    
    resetGame();
    gameState.mode = data.mode;
    
    if (data.mode === 'random') {
      gameState.targetNumber = generateRandomNumber();
      gameState.isGameActive = true;
      
      io.emit('game-started', {
        mode: 'random',
        message: 'Une nouvelle partie a commencé ! Le nombre a été généré aléatoirement.'
      });
    } else if (data.mode === 'manual') {
      if (!validateNumber(data.customNumber)) {
        socket.emit('error', 'Le nombre doit être entre 0001 et 9999');
        return;
      }
      
      gameState.targetNumber = data.customNumber;
      gameState.isGameActive = true;
      
      io.emit('game-started', {
        mode: 'manual',
        message: 'Une nouvelle partie a commencé ! Le nombre a été défini par l\'hôte.'
      });
    }
  });
  
  // Faire une proposition
  socket.on('make-guess', (guess) => {
    if (!gameState.isGameActive) {
      socket.emit('error', 'Aucune partie en cours');
      return;
    }
    
    if (!validateNumber(guess)) {
      socket.emit('error', 'Le nombre doit être entre 0001 et 9999');
      return;
    }
    
    const player = gameState.players[socket.id];
    if (!player) {
      socket.emit('error', 'Joueur non trouvé');
      return;
    }
    
    // Calculer le résultat
    const result = compareNumbers(guess, gameState.targetNumber);
    
    const attempt = {
      id: Date.now(),
      playerName: player.name,
      playerId: socket.id,
      guess: guess,
      result: result,
      timestamp: new Date().toLocaleTimeString()
    };
    
    gameState.attempts.push(attempt);
    
    // Vérifier si le joueur a gagné
    const isWin = result.correctPosition === 4;
    const isGameOver = isWin || gameState.attempts.length >= gameState.maxAttempts;
    
    if (isWin) {
      gameState.players[socket.id].score++;
      io.emit('game-won', {
        winner: player.name,
        targetNumber: gameState.targetNumber,
        attempts: gameState.attempts.length
      });
      gameState.isGameActive = false;
    } else if (isGameOver) {
      io.emit('game-over', {
        targetNumber: gameState.targetNumber,
        message: 'Nombre maximum de tentatives atteint !'
      });
      gameState.isGameActive = false;
    }
    
    // Envoyer la nouvelle tentative à tous les joueurs
    io.emit('new-attempt', attempt);
    
    // Envoyer l'état mis à jour
    io.emit('game-state-update', {
      isGameActive: gameState.isGameActive,
      attemptsCount: gameState.attempts.length,
      maxAttempts: gameState.maxAttempts,
      players: gameState.players
    });
  });
  
  // Message de chat
  socket.on('chat-message', (message) => {
    const player = gameState.players[socket.id];
    if (player && message.trim()) {
      io.emit('chat-message', {
        playerName: player.name,
        message: message.trim(),
        timestamp: new Date().toLocaleTimeString()
      });
    }
  });
  
  // Déconnexion
  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté:', socket.id);
    
    // Supprimer le joueur
    delete gameState.players[socket.id];
    
    // Si l'hôte se déconnecte, assigner un nouvel hôte
    if (gameState.hostId === socket.id) {
      const remainingPlayers = Object.keys(gameState.players);
      if (remainingPlayers.length > 0) {
        gameState.hostId = remainingPlayers[0];
        io.to(gameState.hostId).emit('host-status', true);
      } else {
        gameState.hostId = null;
        resetGame();
      }
    }
    
    // Notifier les autres joueurs
    io.emit('player-left', {
      playerId: socket.id,
      players: gameState.players
    });
  });
});

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
