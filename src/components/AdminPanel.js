import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import './AdminPanel.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement);

const AdminPanel = ({ token, onLogout }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [userMessages, setUserMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', phone_number: '' });

  const apiCall = async (url, options = {}) => {
    const response = await fetch(`http://localhost:5000${url}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/api/auth/admin/users');
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (userId) => {
    try {
      setLoading(true);
      const data = await apiCall(`/api/auth/admin/users/${userId}/stats`);
      setUserStats(data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserMessages = async (userId) => {
    try {
      setLoading(true);
      const data = await apiCall(`/api/auth/admin/users/${userId}/messages`);
      setUserMessages(data.messages);
    } catch (error) {
      console.error('Error fetching user messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    try {
      setLoading(true);
      await apiCall('/api/auth/admin/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      setNewUser({ username: '', password: '', phone_number: '' });
      setShowCreateUser(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserPhone = async (userId, phoneNumber) => {
    try {
      await apiCall(`/api/auth/admin/users/${userId}/phone`, {
        method: 'PUT',
        body: JSON.stringify({ phone_number: phoneNumber }),
      });
      fetchUsers();
    } catch (error) {
      console.error('Error updating phone:', error);
    }
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    setActiveTab('user-details');
    fetchUserStats(user.id);
    fetchUserMessages(user.id);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const renderUsersTab = () => (
    <div className="admin-content">
      <div className="admin-header">
        <h2>User Management</h2>
        <button className="create-user-btn" onClick={() => setShowCreateUser(true)}>
          <svg viewBox="0 0 24 24" className="btn-icon">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Create User
        </button>
      </div>

      <div className="users-grid">
        {users.map(user => (
          <div key={user.id} className="user-card" onClick={() => selectUser(user)}>
            <div className="user-avatar">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <h3>{user.username}</h3>
              <p>{user.phone_number}</p>
              <span className={`user-role ${user.role}`}>{user.role}</span>
            </div>
            <div className="user-actions">
              <svg viewBox="0 0 24 24" className="action-icon">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
        ))}
      </div>

      {showCreateUser && (
        <div className="modal-overlay" onClick={() => setShowCreateUser(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New User</h3>
              <button className="close-btn" onClick={() => setShowCreateUser(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Enter password"
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={newUser.phone_number}
                  onChange={(e) => setNewUser({...newUser, phone_number: e.target.value})}
                  placeholder="+1234567890"
                />
              </div>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowCreateUser(false)}>Cancel</button>
                <button className="create-btn" onClick={createUser} disabled={loading}>
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderUserDetailsTab = () => {
    if (!selectedUser || !userStats) return <div>Loading...</div>;

    const chartData = {
      labels: userStats.dailyStats.map(stat => new Date(stat.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Messages Sent',
          data: userStats.dailyStats.map(stat => stat.sent_count),
          borderColor: '#1a73e8',
          backgroundColor: 'rgba(26, 115, 232, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Messages Received',
          data: userStats.dailyStats.map(stat => stat.received_count),
          borderColor: '#34a853',
          backgroundColor: 'rgba(52, 168, 83, 0.1)',
          tension: 0.4,
        },
      ],
    };

    const contactsData = {
      labels: userStats.topContacts.map(contact => contact.contact),
      datasets: [
        {
          label: 'Messages',
          data: userStats.topContacts.map(contact => contact.message_count),
          backgroundColor: [
            '#1a73e8', '#34a853', '#ea4335', '#fbbc04', '#9aa0a6',
            '#ff6d01', '#9c27b0', '#00bcd4', '#4caf50', '#ff9800'
          ],
        },
      ],
    };

    return (
      <div className="admin-content">
        <div className="admin-header">
          <button className="back-btn" onClick={() => setActiveTab('users')}>
            <svg viewBox="0 0 24 24" className="btn-icon">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            Back to Users
          </button>
          <h2>{selectedUser.username} - Details</h2>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Messages</h3>
            <div className="stat-value">{userStats.summary.total_messages}</div>
          </div>
          <div className="stat-card">
            <h3>Unique Contacts</h3>
            <div className="stat-value">{userStats.summary.unique_contacts}</div>
          </div>
          <div className="stat-card">
            <h3>Messages Sent</h3>
            <div className="stat-value">{userStats.summary.sent_messages}</div>
          </div>
          <div className="stat-card">
            <h3>Messages Received</h3>
            <div className="stat-value">{userStats.summary.received_messages}</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3>Daily Activity (Last 30 Days)</h3>
            <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
          <div className="chart-card">
            <h3>Top Contacts</h3>
            <Bar data={contactsData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="messages-section">
          <h3>Recent Messages</h3>
          <div className="messages-list">
            {userMessages.slice(0, 20).map(message => (
              <div key={message.id} className={`message-item ${message.direction}`}>
                <div className="message-header">
                  <span className="message-contact">
                    {message.direction === 'outgoing' ? `To: ${message.to_number}` : `From: ${message.from_number}`}
                  </span>
                  <span className="message-time">
                    {new Date(message.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="message-text">{message.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => (
    <div className="admin-content">
      <div className="admin-header">
        <h2>Settings</h2>
      </div>
      <div className="settings-grid">
        <div className="setting-card">
          <h3>Twilio Configuration</h3>
          <p>Manage Twilio API settings and phone numbers</p>
          <button className="setting-btn">Configure Twilio</button>
        </div>
        <div className="setting-card">
          <h3>System Settings</h3>
          <p>General system configuration and preferences</p>
          <button className="setting-btn">System Config</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-panel">
      <div className="admin-sidebar">
        <div className="admin-logo">
          <svg viewBox="0 0 24 24" className="logo-icon">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>Admin Panel</span>
        </div>
        
        <nav className="admin-nav">
          <button 
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <svg viewBox="0 0 24 24" className="nav-icon">
              <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-6h2.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5H4V9h2.5c.28 0 .5-.22.5-.5S6.78 8 6.5 8H4c0-1.11.89-2 2-2h8c1.11 0 2 .89 2 2v10c0 1.11-.89 2-2 2H6c-1.11 0-2-.89-2-2z"/>
            </svg>
            Users
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <svg viewBox="0 0 24 24" className="nav-icon">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
            Settings
          </button>
        </nav>

        <div className="admin-footer">
          <button className="logout-btn" onClick={onLogout}>
            <svg viewBox="0 0 24 24" className="nav-icon">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            Logout
          </button>
        </div>
      </div>

      <div className="admin-main">
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'user-details' && renderUserDetailsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>
    </div>
  );
};

export default AdminPanel;