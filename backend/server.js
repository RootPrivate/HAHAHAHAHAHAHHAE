require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const twilio = require('twilio');
const mysql = require('mysql2/promise');

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

// Test MySQL connection
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ MySQL connected!');
    connection.release();
  } catch (err) {
    console.error('❌ MySQL connection error:', err.message);
  }
})();

// Hardcoded Twilio number
const TWILIO_NUMBER = process.env.TWILIO_NUMBER || '+1234567890';

// Send SMS
app.post('/send-sms', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'Missing fields' });

  try {
    const sms = await client.messages.create({
      body: message,
      from: TWILIO_NUMBER,
      to
    });

    await db.execute(
      'INSERT INTO messages (user_id, to_number, message, direction) VALUES (?, ?, ?, ?)',
      [1, to, message, 'outgoing'] // user_id=1 since no login
    );

    res.json({ success: true, sid: sms.sid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Get message history
app.get('/messages', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM messages WHERE user_id=? ORDER BY created_at DESC',
      [1] // user_id=1
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
