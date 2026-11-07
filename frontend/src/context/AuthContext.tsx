import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import { authApi } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role?: 'admin' | 'customer' }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(user: User): User {
  const role = user?.role?.trim().toLowerCase();
  if (!user?.id || (role !== 'admin' && role !== 'customer')) {
    throw new Error('Invalid user profile');
  }
  return { ...user, role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        const parsed = normalizeUser(JSON.parse(storedUser));
        setToken(storedToken);
        setUser(parsed);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);
    try {
      const { data } = await authApi.me();
      const userData = normalizeUser(data);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setToken(access_token);
    } catch (error) {
      logout();
      throw error;
    }
  };

  const register = async (data: { name: string; email: string; password: string; role?: 'admin' | 'customer' }) => {
    const response = await authApi.register(data);
    const userData = normalizeUser(response.data);
    // Auto-login after registration
    const loginResponse = await authApi.login({ email: data.email, password: data.password });
    const { access_token } = loginResponse.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isLoading,
        isAuthenticated: !!token,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}