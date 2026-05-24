import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "../types";

export interface ActingAsEmployee {
  employeeId: string;
  name: string;
  companyName: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isLoading: boolean;
  actingAs: ActingAsEmployee | null;
  setActingAs: (emp: ActingAsEmployee | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingAs, setActingAs] = useState<ActingAsEmployee | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("fms_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    setActingAs(null);
    localStorage.setItem("fms_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setActingAs(null);
    localStorage.removeItem("fms_user");
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem("fms_user", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading, actingAs, setActingAs }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
