import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { bakalariService } from '../services/bakalariService';

interface AuthContextType {
  user: any | null;
  login: (username: string, password: string) => Promise<any>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('bakalari_token');
    if (token) {
      // Try to get user info to verify token
      bakalariService.getUserInfo()
        .then(userData => {
          if (userData) {
            const mappedUser = {
              name: userData.FullUserName || userData.name || 'Student',
              fullName: userData.FullName || userData.FullUserName,
              class: userData.Class?.Abbrev,
              className: userData.Class?.Name,
              userType: userData.UserType,
              uid: userData.UserUID
            };
            setUser(mappedUser);
          }
        })
        .catch(() => {
          localStorage.removeItem('bakalari_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const data = await bakalariService.login(username, password);
    localStorage.setItem('bakalari_token', data.access_token);
    const userData = await bakalariService.getUserInfo();
    
    // Map API user data to our user object
    const mappedUser = {
      name: userData?.FullUserName || userData?.name || 'Student',
      fullName: userData?.FullName || userData?.FullUserName,
      class: userData?.Class?.Abbrev,
      className: userData?.Class?.Name,
      userType: userData?.UserType,
      uid: userData?.UserUID
    };
    
    setUser(mappedUser);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('bakalari_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading: loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
