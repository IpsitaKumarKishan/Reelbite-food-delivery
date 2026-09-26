import React, { createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "./SocketContext";
import toast from "react-hot-toast";

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearNotifications: () => {},
});

// Synthesizes a subtle audio ping using Web Audio API
const playNotificationChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    // Ignore audio autoplay restrictions
  }
};

export const NotificationProvider = ({ children }) => {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("reelbite_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    try {
      localStorage.setItem("reelbite_notifications", JSON.stringify(notifications.slice(0, 30)));
    } catch (e) {
      console.error("Storage error:", e);
    }
  }, [notifications]);

  const addNotification = (item) => {
    const newNotif = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      read: false,
      ...item,
    };

    setNotifications((prev) => [newNotif, ...prev.slice(0, 25)]);
    playNotificationChime();
  };

  useEffect(() => {
    if (!socket) return;

    // Customer status update listener
    const handleStatusUpdate = (payload) => {
      const { shopName = "Restaurant", status, orderId } = payload;
      let title = "Order Update";
      let message = `Your order from ${shopName} is now ${status}.`;
      let icon = "🔔";

      if (status === "preparing") {
        title = "Kitchen is Preparing Your Food";
        message = `${shopName} has accepted your order and is cooking it fresh!`;
        icon = "🍳";
      } else if (status === "out of delivery") {
        title = "Out for Delivery!";
        message = `Your food from ${shopName} has been picked up and is on the way.`;
        icon = "🛵";
      } else if (status === "delivered") {
        title = "Order Delivered!";
        message = `Your meal from ${shopName} has arrived. Enjoy your meal!`;
        icon = "🎉";
      } else if (status === "cancelled") {
        title = "Order Cancelled";
        message = `Order from ${shopName} was cancelled.`;
        icon = "⚠️";
      }

      toast(message, { icon, duration: 4500 });
      addNotification({ title, message, status, orderId, type: "order_status" });
    };

    // Cancellation & rejection events
    const handleCancelled = (data) => {
      const msg = `Order #${data.orderId?.slice(-6)?.toUpperCase()} has been cancelled.`;
      toast.error(msg, { duration: 4000 });
      addNotification({
        title: "Order Cancelled",
        message: msg,
        orderId: data.orderId,
        type: "cancellation",
      });
    };

    const handleRejected = (data) => {
      const msg = `Restaurant was unable to fulfill your order. Refund initiated.`;
      toast.error(msg, { duration: 5000 });
      addNotification({
        title: "Order Unfulfilled",
        message: msg,
        orderId: data.orderId,
        type: "rejection",
      });
    };

    socket.on("update-status", handleStatusUpdate);
    socket.on("orderCancelled", handleCancelled);
    socket.on("orderRejected", handleRejected);

    return () => {
      socket.off("update-status", handleStatusUpdate);
      socket.off("orderCancelled", handleCancelled);
      socket.off("orderRejected", handleRejected);
    };
  }, [socket]);

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
