import React from "react";
import { useNotifications } from "../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import { FaCheckDouble, FaTrashCan, FaBell, FaChevronRight } from "react-icons/fa6";

export default function NotificationDropdown({ onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const navigate = useNavigate();

  const handleItemClick = (n) => {
    markAsRead(n.id);
    if (n.orderId) {
      navigate(`/track-order/${n.orderId}`);
      if (onClose) onClose();
    }
  };

  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="absolute right-0 top-12 w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200/90 z-[99999] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-100 bg-stone-50/70">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm text-stone-900">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-[#ff5200] text-white text-
            [10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-stone-500 hover:text-stone-900 text-xs font-bold transition flex items-center gap-1"
              title="Mark all as read"
            >
              <FaCheckDouble size={11} />
              <span className="text-[11px]">Read all</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="text-stone-400 hover:text-red-600 text-xs transition p-1"
              title="Clear all"
            >
              <FaTrashCan size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-stone-100">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-stone-400 space-y-2">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-300">
              <FaBell size={18} />
            </div>
            <p className="text-xs font-semibold">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`p-3.5 hover:bg-orange-50/40 cursor-pointer transition flex items-start gap-3 ${
                !n.read ? "bg-amber-50/30" : "bg-white"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-orange-100 text-[#ff5200] flex items-center justify-center text-sm shrink-0 mt-0.5">
                {n.status === "preparing"
                  ? "🍳"
                  : n.status === "out of delivery"
                  ? "🛵"
                  : n.status === "delivered"
                  ? "🎉"
                  : n.type === "cancellation" || n.status === "cancelled"
                  ? "⚠️"
                  : "🔔"}
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-stone-900 truncate">{n.title}</h4>
                  <span className="text-[10px] text-stone-400 shrink-0">{formatTime(n.timestamp)}</span>
                </div>
                <p className="text-[11px] text-stone-600 line-clamp-2 mt-0.5">{n.message}</p>
              </div>

              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-[#ff5200] shrink-0 self-center" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
