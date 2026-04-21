import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { login as loginApi, register as registerApi, getMe, googleLogin as googleLoginApi } from "../services/api";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    location?: string
  ) => Promise<void>;
  googleLogin: (params: { credential?: string; accessToken?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [loading, setLoading] = useState(true);

  // Run once on mount to restore session from localStorage.
  // login() and register() set user directly — no need to re-call getMe().
  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (stored) {
      getMe()
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem("token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginApi({ email, password });
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    location?: string
  ) => {
    const res = await registerApi({ name, email, password, location });
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const googleLogin = async (params: { credential?: string; accessToken?: string }) => {
    const res = await googleLoginApi(params);
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, googleLogin, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
