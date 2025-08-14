/**
 * 4everevents Booking System - Express.js Backend
 * Secure implementation using Google APIs with OAuth2 (2024 standards)
 * No third-party dependencies - Direct Google API integration only
 */

const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { google } = require('googleapis');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

require('dotenv').config();

/**
 * Lightweight structured logger (JSON lines). Avoids new deps; can be replaced with winston/pino.
 */
function structuredLog(level, message, meta = {}) {
  const out = Object.assign({
    timestamp: new Date().toISOString(),
    level,
    message
  }, meta);
  try {
    console.log(JSON.stringify(out));
  } catch (e) {
    console.log(level, message, meta);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use((req, res, next) => {
  const incomingHeaderRequestId = req.get('x-request-id');
  const requestId = incomingHeaderRequestId || (crypto.randomUUID && crypto.randomUUID()) || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const startedAt = Date.now();
  res.setHeader('x-request-id', requestId);
  res.locals.requestId = requestId;

  const allowed = new Set([
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    // Common local servers
    'http://localhost:3006',
    'http://127.0.0.1:3006',
    // VS Code Live Preview defaults
    'http://localhost:3002',
    'http://127.0.0.1:3002'
  ]);
  const origin = req.headers.origin;
  const corsOptions = {
    origin: (originVal, cb) => {
      // Allow no origin (curl) and 'null' origin (file:// in browsers)
      if (!originVal || originVal === 'null') {
        console.log(`🌐 [${requestId}] CORS: ${originVal ? 'null' : 'no'} origin → allow`);
        return cb(null, true);
      }
      if (allowed.has(originVal)) {
        console.log(`🌐 [${requestId}] CORS allow: ${originVal}`);
        return cb(null, true);
      }
      console.warn(`🌐 [${requestId}] CORS block: ${originVal}`);
      return cb(null, false);
    },
    credentials: true
  };
  console.log(`➡️  [${requestId}] ${req.method} ${req.originalUrl} from ${origin || 'no-origin'}`);
  // Handle Private Network Access preflight (Chrome PNA)
  if (
    req.method === 'OPTIONS' &&
    String(req.headers['access-control-request-private-network']).toLowerCase() === 'true'
  ) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  res.on('finish', () => {
    const ms = Date.now() - startedAt;
    console.log(`⬅️  [${requestId}] ${res.statusCode} ${req.method} ${req.originalUrl} ${ms}ms`);
  });
  return cors(corsOptions)(req, res, next);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./bookings.db');

// Initialize database tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id TEXT UNIQUE NOT NULL,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      event_date DATE NOT NULL,
      event_time TIME NOT NULL,
      event_type TEXT NOT NULL,
      location TEXT NOT NULL,
      message TEXT,
      duration INTEGER DEFAULT 120,
      status TEXT DEFAULT 'confirmed',
      calendar_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_available BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Audit logs table for booking attempts and validation failures
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT,
      event TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Google APIs setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Email functions using Gmail API (no nodemailer dependency)
async function sendGmailMessage(to, subject, htmlBody, fromName = '4everevents Photography') {
  try {
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `From: ${fromName} <${process.env.GMAIL_USER}>`,
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('✅ Email sent via Gmail API:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('❌ Gmail API error:', error);
    throw error;
  }
}

// Utility functions
function generateBookingId() {
  const prefix = '4EV';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Validation middleware
const validateBooking = [
  body('clientName').trim().isLength({ min: 2 }).escape(),
  body('clientEmail').isEmail().normalizeEmail(),
  body('clientPhone').trim().isLength({ min: 10 }),
  body('eventDate').isISO8601().toDate(),
  body('eventTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('eventType').isIn(['consultation', 'engagement', 'wedding', 'followup']),
  body('location').trim().isLength({ min: 3 }).escape(),
  body('message').optional().trim().escape(),
  body('duration').optional().isInt({ min: 30, max: 720 })
];

// API Routes

/**
 * GET /api/availability
 * Get available time slots for a specific date
 */
app.get('/api/availability/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { duration = 120 } = req.query;

    // Get existing calendar events for the day (attempt; fallback to empty on failure)
    let existingEvents = [];
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const calendarResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });
      existingEvents = calendarResponse.data.items || [];
      console.log(`✅ Found ${existingEvents.length} existing events for ${date}`);
    } catch (calendarError) {
      console.error('⚠️ Calendar availability check failed:', calendarError.message);
      console.log('📝 Proceeding with empty events (all time slots appear available)');
    }

    // Calculate available slots (9 AM - 6 PM, 30-minute intervals)
    const availableSlots = [];
    const workingHours = { start: 9, end: 18 };
    
    for (let hour = workingHours.start; hour < workingHours.end; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart.getTime() + parseInt(duration) * 60000);
        
        // Check if slot conflicts with existing events
        const hasConflict = existingEvents.some(event => {
          const eventStart = new Date(event.start.dateTime || event.start.date);
          const eventEnd = new Date(event.end.dateTime || event.end.date);
          return (slotStart < eventEnd && slotEnd > eventStart);
        });
        
        if (!hasConflict && slotEnd.getHours() <= workingHours.end) {
          availableSlots.push({
            time: slotStart.toTimeString().slice(0, 5),
            available: true,
            datetime: slotStart.toISOString()
          });
        }
      }
    }

    res.json({
      success: true,
      date: date,
      available_slots: availableSlots,
      duration_minutes: parseInt(duration)
    });

  } catch (error) {
    console.error('Error getting availability:', error);
    res.status(500).json({ success: false, error: 'Failed to get availability' });
  }
});

/**
 * POST /api/bookings
 * Create a new booking
 */
app.post('/api/bookings', validateBooking, async (req, res) => {
  try {
    // Check validation errors
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      const issues = validation.array().map((err) => ({
        param: err.path || err.param || 'unknown',
        msg: err.msg || 'Invalid value'
      }));
      console.warn(`🧪 [${res.locals.requestId || 'no-id'}] Validation failed`, issues);
      // Write audit log (non-blocking)
      try {
        const stmt = db.prepare('INSERT INTO audit_logs (request_id, event, details) VALUES (?, ?, ?)');
        stmt.run(res.locals.requestId || null, 'validation_failed', JSON.stringify(issues));
        stmt.finalize();
      } catch (e) {
        console.error('Failed to write audit log:', e.message || e);
      }
      structuredLog('warn', 'validation_failed', { requestId: res.locals.requestId, issues });
      return res.status(400).json({ success: false, errors: issues });
    }

    const {
      clientName,
      clientEmail,
      clientPhone,
      eventDate,
      eventTime,
      eventType,
      location,
      message,
      duration = 120
    } = req.body;

    const bookingId = generateBookingId();

    // Create calendar event
    console.log('Creating event for:', { eventDate, eventTime, duration });
    const dateStr = eventDate instanceof Date ? eventDate.toISOString().split('T')[0] : eventDate;
    const eventStart = new Date(`${dateStr}T${eventTime}:00`);
    console.log('Event start:', eventStart);
    
    if (isNaN(eventStart.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid date/time format' 
      });
    }
    
    const eventEnd = new Date(eventStart.getTime() + duration * 60000);

    const eventTypes = {
      consultation: {
        title: '4everevents - Initial Consultation',
        description: 'Wedding photography consultation and planning session'
      },
      engagement: {
        title: '4everevents - Engagement Session',
        description: 'Engagement photography session'
      },
      wedding: {
        title: '4everevents - Wedding Photography',
        description: 'Wedding day photography coverage'
      },
      followup: {
        title: '4everevents - Follow-up Call',
        description: 'Post-session follow-up and planning'
      }
    };

    const eventConfig = eventTypes[eventType];
    let calendarEventId = null;
    try {
      const calendarEvent = await calendar.events.insert({
        calendarId: 'primary',
        resource: {
          summary: `${eventConfig.title} - ${clientName}`,
          description: `${eventConfig.description}\n\nClient: ${clientName}\nEmail: ${clientEmail}\nPhone: ${clientPhone}\nLocation: ${location}\n\nMessage: ${message}\n\nBooking ID: ${bookingId}`,
          start: {
            dateTime: eventStart.toISOString(),
            timeZone: 'America/Los_Angeles'
          },
          end: {
            dateTime: eventEnd.toISOString(),
            timeZone: 'America/Los_Angeles'
          },
          attendees: [
            { email: clientEmail, displayName: clientName },
            { email: process.env.BUSINESS_EMAIL }
          ],
          location: location,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 60 }
            ]
          }
        }
      });
      calendarEventId = calendarEvent.data.id;
      console.log('✅ Calendar event created:', calendarEventId);
    } catch (calendarError) {
      console.error('⚠️ Calendar integration failed:', calendarError.message);
      console.log('📝 Booking will proceed without calendar integration');
    }

    // Save to database
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO bookings (booking_id, client_name, client_email, client_phone, 
         event_date, event_time, event_type, location, message, duration, calendar_event_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bookingId, clientName, clientEmail, clientPhone, eventDate, eventTime, 
         eventType, location, message, duration, calendarEventId],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Audit: successful booking created
    try {
      const audit = db.prepare('INSERT INTO audit_logs (request_id, event, details) VALUES (?, ?, ?)');
      audit.run(res.locals.requestId || null, 'booking_created', JSON.stringify({ bookingId, clientEmail }));
      audit.finalize();
    } catch (e) {
      console.error('Failed to write audit log (booking_created):', e.message || e);
    }
    structuredLog('info', 'booking_created', { requestId: res.locals.requestId, bookingId });

    // Send confirmation email (attempt; ignore failures)
    try {
      await sendConfirmationEmail({
        clientName,
        clientEmail,
        eventDate,
        eventTime,
        eventType,
        location,
        bookingId
      });
      console.log('✅ Confirmation email sent');
    } catch (emailError) {
      console.error('⚠️ Email sending failed:', emailError.message);
      console.log('📝 Booking completed without email notification');
    }

    // Send notification to business (attempt; ignore failures)
    try {
      await sendBusinessNotification({
        clientName,
        clientEmail,
        clientPhone,
        eventDate,
        eventTime,
        eventType,
        location,
        message,
        bookingId
      });
      console.log('✅ Business notification sent');
    } catch (emailError) {
      console.error('⚠️ Business notification failed:', emailError.message);
      console.log('📝 Booking completed without business notification');
    }

    res.json({
      success: true,
      booking_id: bookingId,
      calendar_event_id: calendarEventId,
      message: 'Booking confirmed successfully!'
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, error: 'Failed to create booking' });
  }
});

/**
 * GET /api/bookings
 * Get all bookings (admin endpoint)
 */
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM bookings ORDER BY event_date DESC, event_time DESC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error('Error getting bookings:', error);
    res.status(500).json({ success: false, error: 'Failed to get bookings' });
  }
});

/**
 * GET /api/audit-logs
 * Return recent audit logs (last 200 entries)
 */
app.get('/api/audit-logs', async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit || '100', 10) || 100);
    const logs = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, request_id, event, details, created_at FROM audit_logs ORDER BY id DESC LIMIT ?',
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to get audit logs' });
  }
});

/**
 * OAuth callback helper (for setup flow)
 * Displays the authorization code so you can copy/paste it back to the CLI.
 */
app.get('/auth/google/callback', async (req, res) => {
  try {
    const error = req.query.error;
    if (error) {
      return res.status(400).send(
        `<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 24px;">
          <h2>Google Auth Error</h2>
          <p>${String(error)}</p>
        </body></html>`
      );
    }

    const code = req.query.code;
    if (!code) {
      return res.status(400).send(
        `<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 24px;">
          <h2>Missing authorization code</h2>
          <p>No <code>code</code> parameter found in the callback.</p>
        </body></html>`
      );
    }

    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return res.status(400).send(
        `<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 24px;">
          <h2>No refresh token returned</h2>
          <p>Re-run the flow with <code>access_type=offline</code> and <code>prompt=consent</code>. Try again.</p>
        </body></html>`
      );
    }

    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
      if (/^GOOGLE_REFRESH_TOKEN=.*/m.test(envContent)) {
        envContent = envContent.replace(/^GOOGLE_REFRESH_TOKEN=.*/m, `GOOGLE_REFRESH_TOKEN=${refreshToken}`);
      } else {
        envContent += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
    } catch (e) {
      return res.status(500).send(
        `<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 24px;">
          <h2>Failed to write .env</h2>
          <p>${String(e.message || e)}</p>
        </body></html>`
      );
    }

    oauth2Client.setCredentials({ refresh_token: refreshToken });

    res.status(200).send(
      `<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 24px;">
        <h2>Google Workspace Connected ✅</h2>
        <p>Your refresh token has been saved to <code>.env</code>.</p>
        <p>You can close this tab.</p>
      </body></html>`
    );
  } catch (e) {
    res.status(500).send(
      `<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 24px;">
        <h2>Token exchange failed</h2>
        <pre style="padding: 12px; background: #0f1720; color: #eaf7f7; border-radius: 8px; white-space: pre-wrap;">${String(e.message || e)}</pre>
      </body></html>`
    );
  }
});

/**
 * Email functions
 */
async function sendConfirmationEmail(bookingData) {
  const { clientName, clientEmail, eventDate, eventTime, eventType, location, bookingId } = bookingData;
  
  const emailHtml = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #0b0f10, #0e1417); color: #eef7f7; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #40e0d0; font-family: 'Playfair Display', serif; font-size: 32px; margin: 0;">4everevents ♾️</h1>
        <p style="color: #00a9a5; margin: 5px 0;">Luxury Wedding Photography</p>
      </div>
      
      <h2 style="color: #40e0d0; border-bottom: 2px solid #00a9a5; padding-bottom: 10px;">Booking Confirmed!</h2>
      
      <p>Dear ${clientName},</p>
      
      <p>Thank you for choosing 4everevents for your special moments! Your ${eventType} session has been confirmed.</p>
      
      <div style="background: rgba(64, 224, 208, 0.1); padding: 20px; border-radius: 12px; border-left: 4px solid #40e0d0; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #40e0d0;">Booking Details</h3>
        <p><strong>Booking ID:</strong> ${bookingId}</p>
        <p><strong>Date:</strong> ${formatDate(eventDate)}</p>
        <p><strong>Time:</strong> ${eventTime}</p>
        <p><strong>Session Type:</strong> ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}</p>
        <p><strong>Location:</strong> ${location}</p>
      </div>
      
      <h3 style="color: #40e0d0;">What's Next?</h3>
      <ul style="line-height: 1.6;">
        <li>You'll receive a calendar invitation shortly</li>
        <li>We'll send you a preparation guide 1 week before your session</li>
        <li>Feel free to reply to this email with any questions</li>
      </ul>
      
      <div style="background: rgba(0, 169, 165, 0.1); padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Need to reschedule?</strong> No problem! Just reply to this email or call us at +1 (234) 567-890</p>
      </div>
      
      <p>We're excited to capture your beautiful moments!</p>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(64, 224, 208, 0.2);">
        <p style="color: #00a9a5; margin: 0;">Timeless stories, artfully told.</p>
        <p style="font-size: 14px; color: rgba(238, 247, 247, 0.7);">4everevents Photography | hello@4everevents.example</p>
      </div>
    </div>
  `;

  await sendGmailMessage(
    clientEmail,
    `🎉 Booking Confirmed - ${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Session | 4everevents`,
    emailHtml
  );
}

async function sendBusinessNotification(bookingData) {
  const { clientName, clientEmail, clientPhone, eventDate, eventTime, eventType, location, message, bookingId } = bookingData;
  
  const emailHtml = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #00a9a5;">🎉 New Booking Received!</h2>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #40e0d0;">
        <h3>Client Information</h3>
        <p><strong>Name:</strong> ${clientName}</p>
        <p><strong>Email:</strong> ${clientEmail}</p>
        <p><strong>Phone:</strong> ${clientPhone}</p>
        
        <h3>Session Details</h3>
        <p><strong>Booking ID:</strong> ${bookingId}</p>
        <p><strong>Type:</strong> ${eventType}</p>
        <p><strong>Date:</strong> ${formatDate(eventDate)}</p>
        <p><strong>Time:</strong> ${eventTime}</p>
        <p><strong>Location:</strong> ${location}</p>
        
        <h3>Client Message</h3>
        <p style="background: white; padding: 15px; border-radius: 8px; font-style: italic;">${message || 'No message provided'}</p>
      </div>
    </div>
  `;

  await sendGmailMessage(
    process.env.BUSINESS_EMAIL,
    `📅 New Booking: ${clientName} - ${eventType} on ${formatDate(eventDate)}`,
    emailHtml,
    '4everevents Booking System'
  );
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 4everevents Booking API running on port ${PORT}`);
});

module.exports = app;