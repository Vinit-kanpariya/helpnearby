import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  socket: Socket | null;
  online: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  online: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (user && token) {
      const s = io(import.meta.env.VITE_API_URL || "/", {
        auth: { token },
      });

      s.on("connect", () => {
        setOnline(true);
        s.emit("join", user._id);
      });

      s.on("disconnect", () => setOnline(false));

      setSocket(s);

      return () => {
        s.disconnect();
      };
    } else {
      socket?.disconnect();
      setSocket(null);
      setOnline(false);
    }
  }, [user, token]);

  return (
    <SocketContext.Provider value={{ socket, online }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
