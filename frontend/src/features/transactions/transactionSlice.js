import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async ({ page = 1, limit = 50 } = {}, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.get(`${API_URL}/api/transactions`, {
        params: { page, limit, sortBy: 'timestamp', sortOrder: 'desc' },
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch transactions');
    }
  }
);

export const fetchStats = createAsyncThunk(
  'transactions/fetchStats',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.get(`${API_URL}/api/transactions/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch statistics');
    }
  }
);

export const markAsReviewed = createAsyncThunk(
  'transactions/markAsReviewed',
  async (transactionId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.patch(
        `${API_URL}/api/transactions/${transactionId}/review`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to mark as reviewed');
    }
  }
);

// Helper function to update stats with live data
const updateStatsWithTransaction = (stats, transaction) => {
  const newStats = { ...stats };
  
  // Update basic counts
  newStats.totalTransactions = (newStats.totalTransactions || 0) + 1;
  newStats.totalAmount = (parseFloat(newStats.totalAmount) || 0) + (transaction.amount || 0);
  
  if (transaction.isFlagged) {
    newStats.highRiskTransactions = (newStats.highRiskTransactions || 0) + 1;
  }
  
  // Recalculate average risk score
  const oldTotal = (newStats.totalTransactions - 1) * (parseFloat(newStats.avgRiskScore) || 0);
  newStats.avgRiskScore = ((oldTotal + (transaction.riskScore || 0)) / newStats.totalTransactions).toFixed(2);
  
  // Update high risk percentage
  newStats.highRiskPercentage = newStats.totalTransactions > 0
    ? ((newStats.highRiskTransactions / newStats.totalTransactions) * 100).toFixed(1)
    : '0';
  
  // Format total amount
  newStats.totalAmount = newStats.totalAmount.toFixed(2);
  
  return newStats;
};

const transactionSlice = createSlice({
  name: 'transactions',
  initialState: {
    transactions: [],
    liveTransactions: [], // Stores recent live transactions (max 20)
    alerts: [], // High-risk alerts
    stats: {
      totalTransactions: 0,
      highRiskTransactions: 0,
      avgRiskScore: '0',
      totalAmount: '0',
      highRiskPercentage: '0',
      riskDistribution: [],
      hourlyPattern: []
    },
    pagination: {
      page: 1,
      limit: 50,
      total: 0,
      pages: 0,
    },
    loading: false,
    error: null,
    connectionStatus: 'disconnected', // 'connected', 'disconnected', 'connecting'
  },
  reducers: {
    addLiveTransaction: (state, action) => {
      const transaction = action.payload;
      
      console.log(' Redux: Adding live transaction:', {
        id: transaction.transactionId,
        amount: transaction.amount,
        risk: transaction.riskScore
      });
      
      // 1. Add to liveTransactions (recent transactions for dashboard)
      state.liveTransactions.unshift({
        ...transaction,
        receivedAt: new Date().toISOString()
      });
      
      // Keep only last 20 live transactions
      if (state.liveTransactions.length > 20) {
        state.liveTransactions = state.liveTransactions.slice(0, 20);
      }
      
      // 2. Add to main transactions list
      const existingIndex = state.transactions.findIndex(t => t._id === transaction._id);
      if (existingIndex === -1) {
        state.transactions.unshift(transaction);
        
        // Keep transactions list manageable (max 200)
        if (state.transactions.length > 200) {
          state.transactions = state.transactions.slice(0, 200);
        }
      }
      
      // 3. Add alert if high risk
      if (transaction.isFlagged && transaction.riskScore >= 70) {
        const alertId = Date.now();
        state.alerts.unshift({
          id: alertId,
          type: 'high-risk',
          severity: transaction.riskScore >= 85 ? 'critical' : 'high',
          message: `High Risk Transaction: $${transaction.amount} at ${transaction.merchant}`,
          transaction: transaction,
          timestamp: new Date().toISOString(),
          isRead: false
        });
        
        console.log(' Added high-risk alert:', alertId);
        
        // Keep only last 10 alerts
        if (state.alerts.length > 10) {
          state.alerts = state.alerts.slice(0, 10);
        }
      }
      
      // 4. Update stats dynamically (incremental updates only)
      state.stats = updateStatsWithTransaction(state.stats, transaction);
    },
    
    clearAlerts: (state) => {
      state.alerts = [];
    },
    
    removeAlert: (state, action) => {
      state.alerts = state.alerts.filter(alert => alert.id !== action.payload);
    },
    
    markAlertAsRead: (state, action) => {
      const alert = state.alerts.find(a => a.id === action.payload);
      if (alert) {
        alert.isRead = true;
      }
    },
    
    updateTransaction: (state, action) => {
      const index = state.transactions.findIndex(t => t._id === action.payload._id);
      if (index !== -1) {
        state.transactions[index] = action.payload;
      }
      
      // Also update in liveTransactions if exists
      const liveIndex = state.liveTransactions.findIndex(t => t._id === action.payload._id);
      if (liveIndex !== -1) {
        state.liveTransactions[liveIndex] = action.payload;
      }
    },
    
    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload;
    },
    
    clearLiveTransactions: (state) => {
      state.liveTransactions = [];
    },
    
    // Reset slice to initial state
    resetTransactions: (state) => {
      state.transactions = [];
      state.liveTransactions = [];
      state.alerts = [];
      state.stats = {
        totalTransactions: 0,
        highRiskTransactions: 0,
        avgRiskScore: '0',
        totalAmount: '0',
        highRiskPercentage: '0',
        riskDistribution: [],
        hourlyPattern: []
      };
      state.pagination = {
        page: 1,
        limit: 50,
        total: 0,
        pages: 0,
      };
      state.loading = false;
      state.error = null;
      state.connectionStatus = 'disconnected';
    },
  },
  
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload.transactions;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.loading = false;
        // Use stats directly from backend - don't compute from local transactions
        // This ensures admin and viewer see the same chart data
        state.stats = {
          totalTransactions: action.payload.totalTransactions || 0,
          highRiskTransactions: action.payload.highRiskTransactions || 0,
          avgRiskScore: action.payload.avgRiskScore || '0',
          totalAmount: action.payload.totalAmount || '0',
          highRiskPercentage: action.payload.highRiskPercentage || '0',
          riskDistribution: action.payload.riskDistribution || [],
          hourlyPattern: action.payload.hourlyPattern || []
        };
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markAsReviewed.fulfilled, (state, action) => {
        const transaction = state.transactions.find(t => t._id === action.payload.transaction._id);
        if (transaction) {
          transaction.isReviewed = true;
          transaction.reviewedAt = action.payload.transaction.reviewedAt;
          transaction.reviewedBy = action.payload.transaction.reviewedBy;
        }
        
        // Also update in liveTransactions
        const liveTransaction = state.liveTransactions.find(t => t._id === action.payload.transaction._id);
        if (liveTransaction) {
          liveTransaction.isReviewed = true;
          liveTransaction.reviewedAt = action.payload.transaction.reviewedAt;
          liveTransaction.reviewedBy = action.payload.transaction.reviewedBy;
        }
      });
  },
});

export const { 
  addLiveTransaction, 
  clearAlerts, 
  removeAlert, 
  markAlertAsRead,
  updateTransaction,
  setConnectionStatus,
  clearLiveTransactions,
  resetTransactions 
} = transactionSlice.actions;

export default transactionSlice.reducer;