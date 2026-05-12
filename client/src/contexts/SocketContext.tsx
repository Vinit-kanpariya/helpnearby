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

  // Only the userId and token are load-bearing here. Depending on the full
  // `user` object would tear down and rebuild the socket on every profile
  // update (avatar, bio, location), causing duplicate "join" events and
  // dropped real-time messages.
  const userId = user?._id;

  useEffect(() => {
    if (!userId || !token) {
      setOnline(false);
      return;
    }

    const s = io(import.meta.env.VITE_API_URL || "/", {
      auth: { token },
    });

    s.on("connect", () => {
      setOnline(true);
      s.emit("join");
    });
    s.on("disconnect", () => setOnline(false));

    setSocket(s);

    return () => {
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
      setOnline(false);
    };
  }, [userId, token]);

  return (
    <SocketContext.Provider value={{ socket, online }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
