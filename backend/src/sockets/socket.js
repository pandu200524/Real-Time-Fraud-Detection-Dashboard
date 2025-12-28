const { Server } = require('socket.io');

let io;
let fraudService = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', 
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io',
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  global.io = io;

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.emit('welcome', {
      message: 'Connected to Fraud Detection WebSocket',
    });

    if (fraudService && !fraudService.isGenerating) {
      fraudService.startTransactionGeneration(3000);
      console.log('Transaction generation started');
    }

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      if (io.engine.clientsCount === 0 && fraudService) {
        fraudService.stopTransactionGeneration();
        console.log('Transaction generation stopped (no clients)');
      }
    });

    socket.on('requestStats', async () => {
      if (!fraudService) return;

      try {
        const stats = await fraudService.getStats();
        socket.emit('stats', stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('Socket.IO initialized (CORS open)');
  return io;
};

const setFraudService = (service) => {
  fraudService = service;
  console.log('Fraud service injected into socket layer');
};

const emitTransaction = (transaction) => {
  if (!io) return;

  io.emit('newTransaction', transaction);

  if (transaction.isFlagged && transaction.riskScore >= 70) {
    io.emit('highRiskAlert', transaction);
  }
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = {
  initSocket,
  setFraudService,
  emitTransaction,
  getIO,
};
