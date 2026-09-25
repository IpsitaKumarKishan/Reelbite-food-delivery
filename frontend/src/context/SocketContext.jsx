import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";

const serverUrl = import.meta.env.VITE_SERVER_URL !== undefined
  ? import.meta.env.VITE_SERVER_URL
  : "http://localhost:5000";

const SocketContext = createContext({ socket: null });

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { userData } = useSelector(state => state.user || {});

  useEffect(() => {
    const socketInstance = io(serverUrl || undefined, { withCredentials: true });
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      if (userData?._id) {
        socketInstance.emit("identity", { userId: userData._id });
      }
    });

    if (userData?._id) {
      socketInstance.emit("identity", { userId: userData._id });
    }

    return () => {
      socketInstance.disconnect();
    };
  }, [userData?._id]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext;
