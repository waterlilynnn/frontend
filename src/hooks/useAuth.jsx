import { createContext, useContext, useState, useEffect } from 'react';
import API from '../config/api';

const AuthContext = createContext(null);

const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const payload = decodeJwt(token);
        if (payload && payload.exp * 1000 > Date.now()) {
          setUser(JSON.parse(storedUser));
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const tokenRes = await API.post('/login', { email, password });
      const { access_token } = tokenRes.data;

      const payload = decodeJwt(access_token);
      if (!payload || !payload.sub) {
        throw new Error('Invalid token received');
      }

      let formattedUser;

      try {
        const usersRes = await API.get('/users', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const userData = usersRes.data.find(u => u.id === parseInt(payload.sub));

        if (userData) {
          formattedUser = {
            id:         userData.id,
            email:      userData.email,
            full_name:  userData.full_name,
            role:       userData.role.toLowerCase(),
            is_active:  userData.is_active,
          };
        }
      } catch {
        // fallback — build minimal user from JWT payload
      }

      if (!formattedUser) {
        formattedUser = {
          id:        parseInt(payload.sub),
          email:     email,
          full_name: email.split('@')[0],
          role:      (payload.role || 'staff').toLowerCase(),
          is_active: true,
        };
      }

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(formattedUser));
      setUser(formattedUser);

      // BUG FIX: The `needsPasswordChange` flag was checked in App.jsx to show
      // the forced-change modal, but nothing ever SET it — the modal could never
      // appear.  We now set it when the backend indicates the user is logging in
      // for the first time (login_attempts === 0 on the JWT payload, if present)
      // OR when a custom claim `force_password_change` is present.
      // Admins who create staff accounts can also include this in the token.
      if (payload.force_password_change || payload.login_attempts === 0) {
        localStorage.setItem('needsPasswordChange', 'true');
      }

      return { success: true, user: formattedUser };
    } catch (error) {
      const errMsg =
        error.response?.data?.detail ||
        error.message ||
        'Login failed';
      return { success: false, error: errMsg };
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await API.post('/users/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('needsPasswordChange');
    setUser(null);
    window.location.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, login, logout }}>
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