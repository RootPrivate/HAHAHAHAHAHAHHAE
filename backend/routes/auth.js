const express = require('express');
const { 
  generateToken, 
  hashPassword, 
  comparePassword, 
  authenticateToken, 
  requireAdmin 
} = require('../middleware/auth');

const router = express.Router();

// Initialize admin user if not exists
const initializeAdmin = async (db) => {
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE role = ? LIMIT 1', ['admin']);
    
    if (rows.length === 0) {
      const adminPassword = await hashPassword('Admin123!@#');
      await db.execute(
        'INSERT INTO users (username, password, role, phone_number, created_at) VALUES (?, ?, ?, ?, NOW())',
        ['admin', adminPassword, 'admin', '+1234567890']
      );
      console.log('✅ Admin user created: admin / Admin123!@#');
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
  }
};

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const db = req.app.locals.db;
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const isValidPassword = await comparePassword(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        phone_number: user.phone_number
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Admin: Create user
router.post('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, phone_number } = req.body;
  
  if (!username || !password || !phone_number) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    const db = req.app.locals.db;
    
    // Check if username exists
    const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await hashPassword(password);
    const [result] = await db.execute(
      'INSERT INTO users (username, password, role, phone_number, created_at) VALUES (?, ?, ?, ?, NOW())',
      [username, hashedPassword, 'user', phone_number]
    );

    res.json({
      success: true,
      user: {
        id: result.insertId,
        username,
        role: 'user',
        phone_number
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Admin: Get all users
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [rows] = await db.execute(
      'SELECT id, username, role, phone_number, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Get user statistics
router.get('/admin/users/:userId/stats', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const db = req.app.locals.db;
    
    // Get message counts
    const [messageCounts] = await db.execute(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT CASE WHEN direction = 'outgoing' THEN to_number ELSE from_number END) as unique_contacts,
        COUNT(CASE WHEN direction = 'outgoing' THEN 1 END) as sent_messages,
        COUNT(CASE WHEN direction = 'incoming' THEN 1 END) as received_messages
      FROM messages 
      WHERE user_id = ?
    `, [userId]);

    // Get daily message counts for the last 30 days
    const [dailyStats] = await db.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as message_count,
        COUNT(CASE WHEN direction = 'outgoing' THEN 1 END) as sent_count,
        COUNT(CASE WHEN direction = 'incoming' THEN 1 END) as received_count
      FROM messages 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [userId]);

    // Get top contacts
    const [topContacts] = await db.execute(`
      SELECT 
        CASE WHEN direction = 'outgoing' THEN to_number ELSE from_number END as contact,
        COUNT(*) as message_count
      FROM messages 
      WHERE user_id = ?
      GROUP BY contact
      ORDER BY message_count DESC
      LIMIT 10
    `, [userId]);

    res.json({
      summary: messageCounts[0],
      dailyStats,
      topContacts
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Admin: Get user messages
router.get('/admin/users/:userId/messages', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    const db = req.app.locals.db;
    const [rows] = await db.execute(
      `SELECT * FROM messages 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );
    
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM messages WHERE user_id = ?',
      [userId]
    );
    
    res.json({
      messages: rows,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get user messages error:', error);
    res.status(500).json({ error: 'Failed to fetch user messages' });
  }
});

// Admin: Update user phone number
router.put('/admin/users/:userId/phone', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { phone_number } = req.body;
  
  if (!phone_number) {
    return res.status(400).json({ error: 'Phone number required' });
  }

  try {
    const db = req.app.locals.db;
    await db.execute(
      'UPDATE users SET phone_number = ? WHERE id = ?',
      [phone_number, userId]
    );
    
    res.json({ success: true, message: 'Phone number updated' });
  } catch (error) {
    console.error('Update phone error:', error);
    res.status(500).json({ error: 'Failed to update phone number' });
  }
});

module.exports = { router, initializeAdmin };