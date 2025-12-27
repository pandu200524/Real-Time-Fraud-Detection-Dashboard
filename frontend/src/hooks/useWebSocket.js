import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { 
  addLiveTransaction, 
  setConnectionStatus 
} from '../features/transactions/transactionSlice';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

let socket = null;

// Helper function to mask transaction data based on user role
const maskTransactionForRole = (transaction, userRole) => {
  if (userRole !== 'viewer') {
    return transaction; // Admin sees full data
  }

  // Viewer sees masked data
  return {
    ...transaction,
    customer: {
      ...transaction.customer,
      name: 'Anonymous Customer',
      email: undefined, // Remove email completely
    }
  };
};

export const useWebSocket = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user) {
      console.log(' No user logged in, skipping WebSocket connection');
      return;
    }

    // Initialize socket connection with user role
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      auth: {
        role: user.role, // Pass user role to backend
        userId: user.userId,
        token: localStorage.getItem('token')
      }
    });

    socket.on('connect', () => {
      console.log(' WebSocket connected');
      console.log(' User role:', user.role);
      dispatch(setConnectionStatus('connected'));
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      dispatch(setConnectionStatus('disconnected'));
    });

    socket.on('welcome', (data) => {
      console.log('Welcome message:', data.message);
    });

    socket.on('newTransaction', (transaction) => {
      console.log('New transaction received:', transaction.transactionId);
      console.log('Amount:', transaction.amount, 'Risk:', transaction.riskScore);
      console.log('Original customer name:', transaction.customer?.name);
      
      // Mask data based on user role before dispatching
      const maskedTransaction = maskTransactionForRole(transaction, user.role);
      
      console.log('Dispatching customer name:', maskedTransaction.customer?.name);
      dispatch(addLiveTransaction(maskedTransaction));
    });

    socket.on('highRiskAlert', (alert) => {
      console.log('High-risk alert:', alert);
      // You can add toast notifications here if needed
    });

    socket.on('transactionReviewed', (data) => {
      console.log('Transaction reviewed:', data.transactionId);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      dispatch(setConnectionStatus('disconnected'));
    });

    return () => {
      if (socket) {
        console.log('Disconnecting WebSocket');
        socket.disconnect();
        socket = null;
      }
    };
  }, [dispatch, user]);

  return socket;
};

export default useWebSocket;