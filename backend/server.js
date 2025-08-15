require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const twilio = require('twilio');
const mysql = require('mysql2/promise');
const { router: authRouter, initializeAdmin } = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(bodyParser.json());

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// MySQL pool (handles empty password)
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sms_app'
});

// Make db available to routes
app.locals.db = db;

// Test MySQL connection
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ MySQL connected!');
    
    // Initialize database schema
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await connection.execute(statement);
        }
      }
      console.log('✅ Database schema initialized!');
    }
    
    // Initialize admin user
    await initializeAdmin(db);
    
    connection.release();
  } catch (err) {
    console.error('❌ MySQL connection error:', err.message);
  }
})();

// Auth routes
app.use('/api/auth', authRouter);

// Hardcoded Twilio number
const TWILIO_NUMBER = process.env.TWILIO_NUMBER || '+1234567890';

// Send SMS (now requires authentication)
app.post('/send-sms', authenticateToken, async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'Missing fields' });

  try {
    // Use user's phone number as sender
    const senderNumber = req.user.phone_number || TWILIO_NUMBER;
    
    const sms = await client.messages.create({
      body: message,
      from: senderNumber,
      to
    });

    await db.execute(
      'INSERT INTO messages (user_id, to_number, message, direction) VALUES (?, ?, ?, ?)',
      [req.user.id, to, message, 'outgoing']
    );

    res.json({ success: true, sid: sms.sid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Get message history (now requires authentication)
app.get('/messages', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM messages WHERE user_id=? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Webhook for incoming messages
app.post('/webhook/sms', async (req, res) => {
  const { From, To, Body } = req.body;
  
  try {
    // Find user by phone number
    const [users] = await db.execute('SELECT id FROM users WHERE phone_number = ?', [To]);
    
    if (users.length > 0) {
      await db.execute(
        'INSERT INTO messages (user_id, from_number, to_number, message, direction) VALUES (?, ?, ?, ?, ?)',
        [users[0].id, From, To, Body, 'incoming']
      );
    }
    
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
