const { Server } = require('socket.io');

let io;
let fraudService = null;

const initSocket = (server) => {
  // Create Socket.IO server with CORS for Vercel
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://real-time-fraud-detection-dashboard-pandu200524s-projects.vercel.app',
        /\.vercel\.app$/ // Allow all Vercel preview deployments
      ],
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io',
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Store globally
  global.io = io;

  io.on('connection', (socket) => {
    console.log(' Client connected:', socket.id);

    socket.emit('welcome', {
      message: 'Connected to Fraud Detection WebSocket',
    });

    // Start transaction generation when a client connects
    if (fraudService && !fraudService.isGenerating) {
      fraudService.startTransactionGeneration(3000);
      console.log(' Transaction generation started');
    }

    socket.on('disconnect', () => {
      console.log(' Client disconnected:', socket.id);
      
      // Stop generation if no clients connected
      if (io.engine.clientsCount === 0 && fraudService) {
        fraudService.stopTransactionGeneration();
        console.log('💤 Transaction generation stopped (no clients)');
      }
    });

    // Handle stats request
    socket.on('requestStats', async () => {
      if (fraudService) {
        try {
          const stats = await fraudService.getStats();
          socket.emit('stats', stats);
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log(' Socket.IO initialized with CORS');
  return io;
};

const setFraudService = (service) => {
  fraudService = service;
  console.log(' Fraud service injected into socket layer');
};

const emitTransaction = (transaction) => {
  if (!io) {
    console.warn(' Socket.IO not initialized');
    return;
  }

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
  getIO
};
