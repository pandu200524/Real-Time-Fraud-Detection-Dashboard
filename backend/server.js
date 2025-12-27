require('dotenv').config();
const app = require('./app');
const http = require('http');
const { initSocket, setFraudService } = require('./src/sockets/socket');
const FraudDetectionService = require('./src/services/fraud.service');

const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
const io = initSocket(server);

// Initialize fraud detection service
const fraudService = new FraudDetectionService(io);

// Pass fraud service reference to socket module
setFraudService(fraudService);

// Store io instance globally
app.set('io', io);
app.set('fraudService', fraudService); // Add this line

// Clean up old transactions on startup
setTimeout(async () => {
  try {
    await fraudService.cleanupOldTransactions();
    console.log(' Database cleanup complete');
    
    // Get current stats
    const stats = await fraudService.getStats();
    console.log(` Current: ${stats.totalTransactions} transactions, ${stats.highRiskTransactions} flagged`);
  } catch (error) {
    console.error('Startup error:', error.message);
  }
}, 2000);

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(' Fraud Detection API Started');
  console.log('='.repeat(50));
  console.log(` REST API: http://localhost:${PORT}`);
  console.log(` WebSocket: ws://localhost:${PORT}`);
  console.log(` Max Transactions: ${fraudService.MAX_TRANSACTIONS || 'unlimited'}`);
  console.log(` Generation: User-based (starts when users connect)`);
  console.log('='.repeat(50));
  console.log(' Login with:');
  console.log('    admin@fraud.com / admin123 (Admin)');
  console.log('    viewer@fraud.com / viewer123 (Viewer)');
  console.log('='.repeat(50));
});
