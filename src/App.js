import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API = 'http://localhost:5000';

function App() {
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API}/messages`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
      setStatus('Failed to fetch messages');
    }
  };

  // Send SMS
  const sendSMS = async () => {
    if (!to || !message) return;
    try {
      await fetch(`${API}/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message })
      });
      setMessage('');
      setStatus('Message sent successfully');
      setTimeout(() => setStatus(''), 3000);
      setShowNewMessageDialog(false); // Close dialog after sending
      fetchMessages();
    } catch (err) {
      console.error(err);
      setStatus('Failed to send SMS');
    }
  };

  // Open new message dialog
  const openNewMessage = () => {
    setShowNewMessageDialog(true);
    setTo('');
    setMessage('');
    setSelectedConversation(null);
  };

  // Close new message dialog
  const closeNewMessage = () => {
    setShowNewMessageDialog(false);
    setTo('');
    setMessage('');
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  // Handle key press in textarea
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendSMS();
    }
  };

  // Group messages by conversation
  const conversations = messages.reduce((acc, msg) => {
    const key = msg.direction === 'outgoing' ? msg.to : msg.from;
    if (!acc[key]) acc[key] = [];
    acc[key].push(msg);
    return acc;
  }, {});

  // Format phone number
  const formatPhoneNumber = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return number;
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Poll for new messages
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Adjust textarea height when message changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <svg viewBox="0 0 24 24" className="logo-icon">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            <span className="logo-text">Voice</span>
          </div>
          <button 
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
        </div>

        <div className="sidebar-nav">
          <button className="nav-item active">
            <svg viewBox="0 0 24 24" className="nav-icon">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            <span className="nav-text">Messages</span>
          </button>
          <button className="nav-item">
            <svg viewBox="0 0 24 24" className="nav-icon">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
            <span className="nav-text">Voicemail</span>
          </button>
          <button className="nav-item">
            <svg viewBox="0 0 24 24" className="nav-icon">
              <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-6h2.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5H4V9h2.5c.28 0 .5-.22.5-.5S6.78 8 6.5 8H4c0-1.11.89-2 2-2h8c1.11 0 2 .89 2 2v10c0 1.11-.89 2-2 2H6c-1.11 0-2-.89-2-2z"/>
            </svg>
            <span className="nav-text">Contacts</span>
          </button>
        </div>

        {/* Conversations list */}
        <div className="conversations">
          <div className="conversations-header">
            <span className="conversations-title">Recent</span>
            <button className="new-message-btn" onClick={openNewMessage}>
              <svg viewBox="0 0 24 24" className="new-message-icon">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M3 12l2-2 4 4 12-12" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div className="conversations-list">
            {Object.entries(conversations).map(([number, msgs]) => {
              const lastMessage = msgs[msgs.length - 1];
              return (
                <div 
                  key={number}
                  className={`conversation-item ${selectedConversation === number ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedConversation(number);
                    setTo(number);
                  }}
                >
                  <div className="conversation-avatar">
                    {formatPhoneNumber(number).charAt(0)}
                  </div>
                  <div className="conversation-content">
                    <div className="conversation-header">
                      <span className="conversation-name">{formatPhoneNumber(number)}</span>
                      <span className="conversation-time">{formatTime(lastMessage.created_at)}</span>
                    </div>
                    <div className="conversation-preview">
                      {lastMessage.message.length > 50 
                        ? lastMessage.message.substring(0, 50) + '...'
                        : lastMessage.message
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* New Message Dialog */}
        {showNewMessageDialog && (
          <div className="dialog-overlay" onClick={closeNewMessage}>
            <div className="new-message-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-header">
                <h3>New Message</h3>
                <button className="close-btn" onClick={closeNewMessage}>
                  <svg viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
              
              <div className="dialog-content">
                <div className="form-group">
                  <label htmlFor="recipient-number">Phone Number</label>
                  <input
                    id="recipient-number"
                    type="tel"
                    placeholder="Enter phone number (e.g., +1234567890)"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="dialog-input"
                    autoFocus
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="message-text">Message</label>
                  <textarea
                    id="message-text"
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="dialog-textarea"
                    rows={4}
                  />
                </div>
                
                <div className="dialog-actions">
                  <button className="cancel-btn" onClick={closeNewMessage}>
                    Cancel
                  </button>
                  <button 
                    className="send-dialog-btn"
                    onClick={sendSMS}
                    disabled={!message.trim() || !to.trim()}
                  >
                    <svg viewBox="0 0 24 24" className="send-icon">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Theme toggle */}
        <div className="sidebar-footer">
          <button 
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
          >
            <svg viewBox="0 0 24 24" className="theme-icon">
              {darkMode ? (
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
              ) : (
                <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
              )}
            </svg>
            <span className="theme-text">{darkMode ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="main-content">
        <div className="chat-header">
          <div className="chat-header-info">
            <h2 className="chat-title">
              {selectedConversation ? formatPhoneNumber(selectedConversation) : 'Messages'}
            </h2>
            <span className="chat-subtitle">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="chat-actions">
            <button className="action-btn" onClick={openNewMessage} title="New Message">
              <svg viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"/>
                <path d="M3 17l6-6-6-6"/>
                <path d="M11 21H3l8-8 8 8h-8z"/>
                <path d="M14 3L3 14l18-2L14 3z" fill="currentColor"/>
              </svg>
            </button>
            <button className="action-btn">
              <svg viewBox="0 0 24 24">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
            </button>
            <button className="action-btn">
              <svg viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" className="empty-icon">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
              <h3>No messages yet</h3>
              <p>Start a conversation by sending your first message</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg, index) => {
                const isOutgoing = msg.direction === 'outgoing';
                const showAvatar = index === 0 || 
                  messages[index - 1].direction !== msg.direction ||
                  (new Date(msg.created_at) - new Date(messages[index - 1].created_at)) > 300000;
                
                return (
                  <div
                    key={index}
                    className={`message-group ${isOutgoing ? 'outgoing' : 'incoming'}`}
                  >
                    {showAvatar && !isOutgoing && (
                      <div className="message-avatar">
                        {formatPhoneNumber(msg.from).charAt(0)}
                      </div>
                    )}
                    <div className="message-content">
                      <div className={`message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                        <div className="message-text">{msg.message}</div>
                        <div className="message-time">{formatTime(msg.created_at)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="composer">
          <div className="composer-header">
            <input
              type="tel"
              placeholder="Enter phone number..."
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="recipient-input"
            />
          </div>
          <div className="composer-body">
            <div className="message-input-container">
              <textarea
                ref={textareaRef}
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="message-input"
                rows={1}
              />
              <button 
                className={`send-btn ${message.trim() ? 'active' : ''}`}
                onClick={sendSMS}
                disabled={!message.trim() || !to}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className={`status-message ${status.includes('success') ? 'success' : 'error'}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;