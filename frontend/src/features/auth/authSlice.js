import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Direct Render URL - CHANGE TO YOUR ACTUAL BACKEND URL
const API_URL = process.env.REACT_APP_API_URL || 'https://real-time-fraud-detection-dashboard.onrender.com';

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // SIMPLE axios call - no special headers
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        { email, password },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
          // NO withCredentials
        }
      );
      
      const { token, user } = response.data;
      
      if (token) {
        localStorage.setItem('token', token);
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return { token, user };
    } catch (error) {
      console.error('Login error details:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.error || 
                           error.response.data?.message || 
                           'Login failed. Please check credentials.';
        return rejectWithValue(errorMessage);
      } else if (error.request) {
        console.error('No response from server. Check:', API_URL);
        return rejectWithValue('Cannot connect to server. Please check your connection.');
      } else {
        return rejectWithValue('An unexpected error occurred: ' + error.message);
      }
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return null;
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload || 'Login failed';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { clearError, setUser, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
