import { useEffect, useRef, useState, useCallback } from "react";
import socket, { joinUserRoom, sendChatMessage } from "./socket";
import API from "./api";
import { jwtDecode } from "jwt-decode";
import "./App.css";

/* ─── Helpers ─── */
function getInitials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function Tick({ status }) {
  if (!status) return null;
  if (status === "sent")      return <span className="msg-tick sent"  title="Sent">✓</span>;
  if (status === "delivered") return <span className="msg-tick delivered" title="Delivered">✓✓</span>;
  if (status === "seen")      return <span className="msg-tick seen"   title="Seen">✓✓</span>;
  return null;
}

/* ─── Avatar ─── */
function Avatar({ name, color, size = "normal", isOnline }) {
  const cls = size === "small" ? "avatar avatar-sm" : "avatar";
  return (
    <div className={cls} style={{ background: color || "#00d4a8" }}>
      {getInitials(name)}
      {isOnline !== undefined && (
        <span className={`avatar-status ${isOnline ? "online" : "offline"}`} />
      )}
    </div>
  );
}

/* ─── Main Component ─── */
function Dashboard({ setToken }) {
  const [users, setUsers]               = useState([]);
  const [search, setSearch]             = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages]         = useState([]);
  const [text, setText]                 = useState("");
  const [isTyping, setIsTyping]         = useState(false);
  const [onlineUsers, setOnlineUsers]   = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [myInfo, setMyInfo]             = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const selectedRef    = useRef(null);

  const token   = localStorage.getItem("token");
  const decoded = jwtDecode(token);
  const userId  = decoded.id;

  // keep selectedRef in sync so socket callbacks can read it
  useEffect(() => { selectedRef.current = selectedUser; }, [selectedUser]);

  // ── Load users ──
  const fetchUsers = useCallback(async (q = "") => {
    const res = await API.get("/users", { params: q ? { search: q } : {} });
    setUsers(res.data);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Load unread counts ──
  const fetchUnread = useCallback(async () => {
    try {
      const res = await API.get("/users/unread-counts");
      setUnreadCounts(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchUnread(); }, [fetchUnread]);

  // ── Socket setup ──
  useEffect(() => {
    joinUserRoom(userId);

    socket.on("onlineUsers", (list) => setOnlineUsers(list));

    socket.on("receiveMessage", (msg) => {
      const selected = selectedRef.current;
      if (msg.senderId === selected?._id) {
        setMessages((prev) => [...prev, msg]);
        // mark seen immediately
        socket.emit("messageSeen", { messageId: msg._id, senderId: msg.senderId });
      } else {
        // Increment unread badge
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
      }
    });

    socket.on("messageDelivered", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, status: "delivered" } : m))
      );
    });

    socket.on("messageSent", ({ messageId }) => {
      // already handled optimistically
    });

    socket.on("messageSeen", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, status: "seen" } : m))
      );
    });

    socket.on("allMessagesSeen", ({ messageIds }) => {
      const idSet = new Set(messageIds.map(String));
      setMessages((prev) =>
        prev.map((m) => (idSet.has(String(m._id)) ? { ...m, status: "seen" } : m))
      );
    });

    socket.on("typing",     () => setIsTyping(true));
    socket.on("stopTyping", () => setIsTyping(false));

    socket.on("messageDeleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
    });

    return () => socket.off();
  }, [userId]);

  // ── Load chat history ──
  const loadChat = async (user) => {
    setSelectedUser(user);
    setMessages([]);
    setIsTyping(false);

    const res = await API.get(`/messages/${user._id}`);
    setMessages(res.data);

    // Clear unread badge
    setUnreadCounts((prev) => ({ ...prev, [user._id]: 0 }));

    // Mark all as seen
    socket.emit("markAllSeen", { senderId: user._id, receiverId: userId });
  };

  // ── Auto scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Send message ──
  const sendMessage = () => {
    if (!text.trim() || !selectedUser) return;

    const optimistic = {
      _id: `tmp-${Date.now()}`,
      senderId: userId,
      receiverId: selectedUser._id,
      message: text.trim(),
      status: "sent",
      createdAt: new Date().toISOString(),
    };

    sendChatMessage({
      senderId: userId,
      receiverId: selectedUser._id,
      message: text.trim(),
    });

    setMessages((prev) => [...prev, optimistic]);
    setText("");

    socket.emit("stopTyping", { receiverId: selectedUser._id, senderId: userId });
  };

  // ── Typing events ──
  const handleInput = (e) => {
    setText(e.target.value);

    if (!selectedUser) return;
    socket.emit("typing", { receiverId: selectedUser._id, senderId: userId });

    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("stopTyping", { receiverId: selectedUser._id, senderId: userId });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Logout ──
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  // ── Search ──
  const handleSearch = (e) => {
    const q = e.target.value;
    setSearch(q);
    fetchUsers(q);
  };

  // ── Group messages by date ──
  const groupedMessages = messages.reduce((acc, msg) => {
    const dateKey = formatDate(msg.createdAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(msg);
    return acc;
  }, {});

  const isOnline = selectedUser && onlineUsers.includes(selectedUser._id);

  return (
    <div className="app-shell">
      {/* ──────── SIDEBAR ──────── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          {/* Top bar */}
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">💬</div>
              <span className="sidebar-logo-text">NotifyX</span>
            </div>
            <button className="sidebar-logout" onClick={logout}>
              Sign out
            </button>
          </div>

          {/* Search */}
          <div className="sidebar-search">
            <span className="sidebar-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search people…"
              value={search}
              onChange={handleSearch}
            />
          </div>

          <div className="sidebar-section-label">Chats</div>
        </div>

        {/* User list */}
        <div className="user-list">
          {users.length === 0 && (
            <div className="user-list-empty">No users found</div>
          )}
          {users.map((u) => {
            const online = onlineUsers.includes(u._id);
            const badge  = unreadCounts[u._id] || 0;
            return (
              <div
                key={u._id}
                className={`user-item${selectedUser?._id === u._id ? " active" : ""}`}
                onClick={() => loadChat(u)}
              >
                <Avatar
                  name={u.name}
                  color={u.avatarColor}
                  isOnline={online}
                />
                <div className="user-info">
                  <div className="user-name">{u.name}</div>
                  <div className={`user-status-text${online ? " online-text" : ""}`}>
                    {online ? "● Online" : "Offline"}
                  </div>
                </div>
                {badge > 0 && (
                  <span className="unread-badge">{badge}</span>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ──────── CHAT AREA ──────── */}
      <main className="chat-area">
        {!selectedUser ? (
          <div className="no-chat">
            <div className="no-chat-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Pick someone from the sidebar to start chatting</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <Avatar
                name={selectedUser.name}
                color={selectedUser.avatarColor}
                isOnline={isOnline}
              />
              <div className="chat-header-info">
                <div className="chat-header-name">{selectedUser.name}</div>
                <div className={`chat-header-status${isOnline ? " online" : ""}`}>
                  {isTyping
                    ? "typing…"
                    : isOnline
                    ? "Online"
                    : "Offline"}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="messages-area">
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <div key={date}>
                  <div className="date-divider">
                    <span>{date}</span>
                  </div>
                  {msgs.map((m, i) => {
                    const isMe = m.senderId === userId;
                    return (
                      <div key={m._id || i} className={`msg-row ${isMe ? "out" : "in"}`}>
                        {!isMe && (
                          <Avatar
                            name={selectedUser.name}
                            color={selectedUser.avatarColor}
                            size="small"
                          />
                        )}
                        <div className="msg-bubble">
                          {m.message}
                          <div className="msg-meta">
                            <span className="msg-time">{formatTime(m.createdAt)}</span>
                            {isMe && <Tick status={m.status} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="typing-row">
                  <Avatar
                    name={selectedUser.name}
                    color={selectedUser.avatarColor}
                    size="small"
                  />
                  <div className="typing-bubble">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="chat-inputbar">
              <input
                type="text"
                placeholder={`Message ${selectedUser.name}…`}
                value={text}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <button
                className="send-btn"
                onClick={sendMessage}
                disabled={!text.trim()}
                title="Send"
              >
                ➤
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
