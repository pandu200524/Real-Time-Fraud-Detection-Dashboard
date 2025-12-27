import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setUser, logout } from '../features/auth/authSlice';
import jwt_decode from 'jwt-decode';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser && tokenExpiry) {
        const isExpired = Date.now() >= parseInt(tokenExpiry);
        
        if (!isExpired) {
          try {
            const decoded = jwt_decode(token);
            if (decoded.exp * 1000 > Date.now()) {
              dispatch(setUser(JSON.parse(storedUser)));
            } else {
              dispatch(logout());
            }
          } catch (error) {
            dispatch(logout());
          }
        } else {
          dispatch(logout());
        }
      }
      setLoading(false);
    };

    checkAuth();
    const interval = setInterval(checkAuth, 60000);
    return () => clearInterval(interval);
  }, [dispatch]);

  return { user, isAuthenticated, loading };
};