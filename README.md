# FraudShield AI - Real-Time Fraud Detection Dashboard

A real-time e-commerce transaction monitoring system with AI-powered fraud detection using OpenAI, built with React,Express.js, Node.js, and MongoDB.

## Overview

FraudShield AI is a web dashboard that monitors e-commerce transactions in real-time, analyzes patterns using AI, and flags suspicious activity with intelligent anomaly detection. The system provides instant alerts for high-risk transactions and maintains historical data for trend analysis.

## Key Features

- Real-Time Transaction Monitoring - Live data stream via WebSockets with instant updates
- AI-Powered Fraud Detection - OpenAI integration for intelligent risk scoring
- Interactive Analytics Dashboard - Live charts, graphs, and statistics
- High-Risk Alerts - Instant notifications for suspicious transactions
- Secure Authentication - JWT-based auth with role-based access control
- Historical Analysis - MongoDB-powered trend analysis and reporting
- Role-Based Access - Admin and Viewer roles with different permissions
- Data Export - Export transaction data in JSON/CSV formats

## Tech Stack

### Frontend
- React.js - UI framework
- Redux Toolkit - State management
- Chart.js - Data visualization
- Socket.io Client - Real-time WebSocket communication
- CSS - Styling
- Axios - HTTP client

### Backend
- Node.js - Runtime environment
- Express.js - Web framework
- Socket.io - WebSocket server
- MongoDB Atlas - Cloud database
- Mongoose - ODM for MongoDB
- JWT - Authentication
- bcrypt - Password hashing

### AI/ML
- OpenAI API - GPT-4 for fraud pattern analysis
- Faker.js - Mock transaction data generation

### DevOps
- Docker & Docker Compose - Containerization
- Nodemon - Development auto-reload

## Project Structure

```
fraud-detection-dashboard/
├── backend/                   # Node.js backend API
│   ├── db-scripts/           # Database scripts
│   │   ├── generate-sample-transactions.js
│   │   └── setup-database.js
│   ├── node_modules/
│   ├── src/
│   │   ├── config/          # Configuration files (OpenAI, MongoDB)
│   │   ├── middleware/      # Authentication & authorization
│   │   ├── models/          # Mongoose models (Transaction, User)
│   │   ├── routes/          # API routes (auth, transactions)
│   │   ├── services/        # Business logic (fraud detection, generators)
│   │   └── sockets/         # WebSocket handlers
│   ├── .env                  # Environment variables
│   ├── app.js               # Express app configuration
│   ├── Dockerfile           # Backend Docker configuration
│   ├── package.json
│   ├── package-lock.json
│   └── server.js            # Entry point
│
├── frontend/                 # React frontend application
│   ├── node_modules/
│   ├── public/              # Static files
│   ├── src/
│   │   ├── app/            # App initialization
│   │   ├── components/     # Reusable React components
│   │   ├── features/       # Feature modules (auth, transactions)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service layer
│   │   ├── utils/          # Utility functions
│   │   ├── App.css
│   │   ├── App.js          # Main App component
│   │   ├── index.css
│   │   └── index.js        # Entry point
│   ├── .env                 # Environment variables
│   ├── dockerfile           # Frontend Docker configuration
│   ├── package.json
│   ├── package-lock.json
│   └── package.json.bak
│
├── docker-compose.yml        # Docker orchestration
└── README.md                # This file
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- OpenAI API key
- Docker & Docker Compose (optional)

### Installation

#### Option 1: Manual Setup (Recommended for Development)

1. Clone the repository
   ```bash
   git clone https://github.com/pandu200524/Real-Time-Fraud-Detection-Dashboard.git
   cd fraud-detection-dashboard
   ```

2. Backend Setup
   ```bash
   cd backend
   npm install
   ```

3. Create .env file in backend directory
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/fraud_dashboard?retryWrites=true&w=majority
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   OPENAI_API_KEY=your-openai-api-key-here
   NODE_ENV=development
   ```

4. Frontend Setup
   ```bash
   cd ../frontend
   npm install
   ```

5. Create .env file in frontend directory
   ```env
   REACT_APP_API_URL=http://localhost:5000
   REACT_APP_WS_URL=ws://localhost:5000
   ```

6. Start the application
   
   Terminal 1 - Backend:
   ```bash
   cd backend
   npm run dev
   ```

   Terminal 2 - Frontend:
   ```bash
   cd frontend
   npm start
   ```

7. Access the application
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

#### Option 2: Docker Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/fraud-detection-dashboard.git
   cd fraud-detection-dashboard
   ```

2. Create .env files (same as manual setup above)

3. Start with Docker Compose
   ```bash
   docker-compose up -d
   ```

4. Access the application
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MongoDB: localhost:27017

5. Stop the application
   ```bash
   docker-compose down
   ```

## Default Users

The system comes with two pre-configured user accounts:

Admin Account
- Email: admin@fraud.com
- Password: admin123
- Permissions: Full access (view, review, export)

Viewer Account
- Email: viewer@fraud.com
- Password: viewer123
- Permissions: Read-only access (sensitive data masked)

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - User login

### Transactions
- GET /api/transactions - Get all transactions (paginated)
- GET /api/transactions/stats - Get statistics
- GET /api/transactions/:id - Get single transaction
- PATCH /api/transactions/:id/review - Mark as reviewed (admin only)
- POST /api/transactions/export - Export data (admin only)

### WebSocket Events
- connection - Client connects
- disconnect - Client disconnects
- newTransaction - New transaction created
- highRiskAlert - High-risk transaction detected
- transactionReviewed - Transaction marked as reviewed

## Features Breakdown

### 1. Real-Time Transaction Stream
- Generates mock transactions every 3 seconds
- Live WebSocket updates to all connected clients
- No page refresh required

### 2. AI Fraud Detection
- OpenAI GPT-4 analyzes each transaction
- Considers factors: amount, location, velocity, merchant patterns
- Assigns risk score (0-100) with detailed reasoning
- Flags transactions above 70 as high-risk

### 3. Interactive Dashboard
- Stats Cards: Total transactions, high-risk count, avg risk score, total amount
- Live Transaction Table: Real-time updates with risk indicators
- Risk Distribution Chart: Visual breakdown by risk level
- Hourly Pattern Chart: Transaction trends by hour
- Alert System: Pop-up notifications for high-risk transactions

### 4. Security Features
- JWT token-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Protected API routes
- Secure WebSocket connections

### 5. Data Management
- MongoDB Atlas cloud database
- Automatic cleanup (keeps latest 100 transactions)
- Historical data for trend analysis
- Export functionality (JSON/CSV)

## Testing

### Manual Testing

1. Login Test
   - Navigate to http://localhost:3000
   - Login with admin credentials
   - Verify dashboard loads

2. Real-Time Updates Test
   - Keep dashboard open
   - Watch transactions appear every 3 seconds
   - Verify charts update automatically

3. High-Risk Alert Test
   - Wait for a high-risk transaction (orange/red)
   - Verify alert notification appears
   - Check transaction details

4. Role-Based Access Test
   - Login as admin: Can see all data, review transactions
   - Login as viewer: Sensitive data masked, read-only

5. WebSocket Connection Test
   - Open browser console (F12)
   - Check for "WebSocket Connected" message
   - Verify real-time updates work

## Configuration

### Environment Variables

Backend (.env)
```env
PORT=5000                          # API server port
MONGODB_URI=mongodb+srv://...      # MongoDB connection string
JWT_SECRET=your-secret-key         # JWT signing key
OPENAI_API_KEY=sk-...              # OpenAI API key
NODE_ENV=development               # Environment mode
```

Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000    # Backend API URL
REACT_APP_WS_URL=ws://localhost:5000       # WebSocket URL
```

### Customization

Transaction Generation Interval:
Edit backend/src/sockets/transaction.socket.js:
```javascript
const GENERATION_INTERVAL = 3000; // milliseconds
```

Risk Score Threshold:
Edit backend/src/services/fraud.service.js:
```javascript
const HIGH_RISK_THRESHOLD = 70; // score above this is flagged
```

Max Stored Transactions:
Edit backend/src/services/fraud.service.js:
```javascript
await this.cleanupOldTransactions(100); // keep latest 100
```

## Troubleshooting

### Common Issues

1. Backend won't start - "Port already in use"
```bash
# Windows
taskkill /IM node.exe /F


```

2. MongoDB connection error
- Verify MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for development)
- Check connection string format
- Ensure database user has read/write permissions

3. Frontend can't connect to backend
- Verify backend is running on port 5000
- Check CORS settings in backend
- Verify .env file URLs are correct

4. WebSocket disconnects frequently
- Check network stability
- Verify Socket.io versions match (client & server)
- Check browser console for errors

5. OpenAI API errors
- Verify API key is valid
- Check OpenAI account has credits
- Review API rate limits

## Performance

- Transaction Generation: 1 transaction per 3 seconds
- WebSocket Latency: under 50ms
- AI Analysis Time: 1-3 seconds per transaction
- Database Query Time: under 100ms
- Frontend Update Time: Real-time (under 10ms)

## Security Considerations

Production Security Checklist:
- Change default user passwords
- Use strong JWT secret (minimum 32 characters)
- Enable MongoDB IP whitelist
- Set NODE_ENV=production
- Enable HTTPS/WSS for encrypted connections
- Configure CORS to allow only trusted domains
- Implement rate limiting on API endpoints
- Enable MongoDB connection encryption (SSL/TLS)
- Regular security audits and dependency updates
- Store sensitive keys in environment variables, never in code

Current Security Features:
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens expire after 24 hours
- Role-based access control enforced on all protected routes
- Input validation on all API endpoints
- MongoDB connection uses SSL/TLS
- Environment variables for all sensitive data

## Deployment

### Recommended Hosting

- Frontend: Vercel, Netlify, or AWS S3 + CloudFront
- Backend: Heroku, Railway, AWS EC2, or DigitalOcean
- Database: MongoDB Atlas (already cloud-based)

### Production Checklist

- Change default user passwords
- Use strong JWT secret
- Enable MongoDB IP whitelist
- Set NODE_ENV=production
- Enable HTTPS/WSS
- Configure CORS properly
- Set up monitoring/logging
- Configure rate limiting
- Set up automated backups

## Future Enhancements

- Machine learning model training on historical data
- Email notifications for high-risk transactions
- Advanced filtering and search capabilities
- Custom rule engine for fraud detection
- Multi-factor authentication
- Transaction dispute resolution workflow
- Integration with real payment gateways
- Mobile app version
- Advanced analytics and reporting dashboards
- Automated testing suite with Jest and Cypress

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (git checkout -b feature/AmazingFeature)
3. Commit your changes (git commit -m 'Add some AmazingFeature')
4. Push to the branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Revanth Vangapandu
- GitHub: [pandu20024](https://github.com/pandu200524)
- LinkedIn: [Revanth Vangapandu](https://www.linkedin.com/in/revanth-vangapandu-4355511a7/)

## Acknowledgments

- OpenAI for GPT-4 API
- MongoDB Atlas for database hosting
- React.js and Node.js communities
- Chart.js for visualization library
- Socket.io for WebSocket implementation

## Support

For issues and questions:
- Create an issue on GitHub
- Email: vrevanth200524@gmail.com