import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, setToken } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const data = await apiRequest("/api/auth/me");
        setUser(data.user);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = (token, userData) => {
    setToken(token);
    setUser(userData);
  };

  const logout = () => {
    setToken("");
    setUser(null);
  };

  const updateAvatar = async (avatarData) => {
    const data = await apiRequest("/api/auth/avatar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(avatarData)
    });
    setUser(data.user);
    return data.user;
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, setUser, updateAvatar }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
