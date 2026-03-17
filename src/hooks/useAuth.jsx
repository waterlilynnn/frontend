import { createContext, useContext, useState, useEffect } from 'react';
import API from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await API.post('/login', { email, password });
      const { access_token } = response.data;
      const userResponse = await API.get(`/debug/check-user/${email}`);
      const userData = userResponse.data;

      if (!userData || userData.error) {
        throw new Error('User not found');
      }

      // Format user data to match expected structure
      const formattedUser = {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        is_active: userData.is_active
      };

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(formattedUser));
      setUser(formattedUser);

      return { success: true, user: formattedUser };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Login failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};