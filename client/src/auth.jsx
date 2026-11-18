import { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  const simpan = (u) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); };

  const login = async (email, password) => {
    const d = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', d.token);
    simpan(d.user);
    return d.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const refresh = async () => {
    try { const d = await api.get('/auth/me'); simpan(d.user); } catch { logout(); }
  };

  useEffect(() => { if (localStorage.getItem('token')) refresh(); }, []);

  return <Ctx.Provider value={{ user, login, logout, refresh }}>{children}</Ctx.Provider>;
}
