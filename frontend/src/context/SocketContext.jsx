import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";

const serverUrl = (import.meta.env.VITE_SERVER_URL !== undefined && import.meta.env.VITE_SERVER_URL !== "")
  ? import.meta.env.VITE_SERVER_URL
  : (import.meta.env.MODE === 'production' ? "" : "http://localhost:8000");

const SocketContext = createContext({ socket: null, isConnected: false });

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { userData } = useSelector(state => state.user || {});

  useEffect(() => {
    const socketInstance = io(serverUrl || undefined, { withCredentials: true });
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      setIsConnected(true);
      if (userData?._id) {
        socketInstance.emit("identity", { userId: userData._id });
      }
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("connect_error", () => {
      setIsConnected(false);
    });

    if (userData?._id && socketInstance.connected) {
      socketInstance.emit("identity", { userId: userData._id });
    }

    return () => {
      socketInstance.disconnect();
    };
  }, [userData?._id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext;
