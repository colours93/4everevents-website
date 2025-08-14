# 4everevents Booking System

A secure booking system for wedding photography services using direct Google API integration and 2024 OAuth2 security standards.

## 🏗️ Architecture Overview

### Secure Architecture (2024)
```
Frontend (Alpine.js) → Backend API (Express.js) → Google APIs (OAuth2)
                                  ↓
                             SQLite Database
```

**Security Features:**
- Direct Google API integration (no third-party dependencies)
- Minimal OAuth2 scopes (calendar.events + gmail.send only)
- Rate limiting and input validation
- Secure token management with refresh buffer

## 🚀 Features

### Core Booking System
- **Multi-step booking form** with real-time validation
- **Calendar integration** with Google Calendar
- **Automated email notifications** for clients and business
- **Real-time availability checking**
- **Booking management dashboard**
- **Mobile-responsive design**

### Google API Integration (2024 Security Standards)
- **Calendar Events** - Automatic event creation with OAuth2 scopes
- **Gmail API** - Direct email sending without SMTP dependencies  
- **Security First** - Minimal required permissions only
- **Rate Limiting** - Built-in API call protection
- **Token Management** - Automatic refresh with security buffer

## 📁 Project Structure

```
4everevents-website/
├── frontend/
│   ├── index2.html              # Main website with booking form
│   ├── booking-form.js          # Alpine.js booking component
│   ├── booking-api.js           # Frontend API client (secure)
│   └── styles/                  # CSS and styling
├── backend/
│   ├── server.js                # Express.js API server (OAuth2)
│   ├── auth-setup.js            # Google OAuth2 setup script
│   ├── setup.js                 # Interactive configuration
│   ├── package.json             # Dependencies (security-focused)
│   └── .env.example             # Environment variables template
└── README.md                    # This file
```

## 🚀 Quick Start

**New to the project?** Check out [QUICKSTART.md](./QUICKSTART.md) for a 5-minute setup guide!

### Automated Setup (Recommended)

```bash
cd backend/
npm install
npm run setup    # Interactive configuration
npm run auth:setup  # Google API authentication
npm run test:google # Verify everything works
npm run dev     # Start the server
```

### Manual Setup

1. **Backend Setup**:
   ```bash
   cd backend/
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Google API Setup**:
   - Enable Calendar API and Gmail API in Google Cloud Console
   - Create OAuth2 credentials
   - Run `npm run auth:setup` to get refresh token

3. **Start Development**:
   ```bash
   # Backend
   npm run dev
   
   # Frontend (from root directory)
   python -m http.server 3000
   ```

## 🔐 Security & Authentication

Google OAuth2 implementation following 2024 security standards:

### OAuth2 Scopes (Minimal Permissions)
- `calendar.events` - Create calendar events only
- `gmail.send` - Send emails only (no read access)

### Security Features
1. **Minimal Scopes** - Only request necessary permissions
2. **Token Security** - Secure refresh token management
3. **Rate Limiting** - API call protection and abuse prevention
4. **Input Validation** - Server-side validation for all inputs
5. **CORS Protection** - Secure cross-origin requests

### Authentication Flow

```javascript
// Secure OAuth2 flow with minimal scopes
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});
```

## 📊 Database Schema

### Bookings Table
```sql
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  booking_id TEXT UNIQUE,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 Frontend Integration

The booking form integrates seamlessly with your existing website:

### Alpine.js Component
```html
<div x-data="bookingForm()" x-init="init()">
  <!-- Multi-step booking form -->
</div>
```

### Key Features
- **Progressive enhancement** - Works without JavaScript
- **Real-time validation** - Immediate feedback
- **Tailwind CSS styling** - Matches your design system
- **Mobile responsive** - Perfect on all devices

## 🔐 Security Features

- **Rate limiting** - Prevents abuse
- **Input validation** - Server-side validation
- **CORS protection** - Secure cross-origin requests
- **Helmet.js** - Security headers
- **Environment isolation** - Secure credential management

## 📈 Analytics & Tracking

### Built-in Tracking
- Booking conversion rates
- Popular time slots
- Client source tracking
- Event type analytics

### Google Sheets Integration
Automatic tracking spreadsheet with:
- Client information
- Booking details
- Follow-up scheduling
- Revenue tracking

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)
```bash
# Frontend
vercel --prod

# Backend  
cd backend/
vercel --prod
```

### Option 2: Traditional Hosting
- Frontend: Any static hosting (Netlify, GitHub Pages)
- Backend: Railway, Render, or VPS

### Option 3: Self-hosted
- Docker containers provided
- PM2 process management
- Nginx configuration included

## 🔧 Customization

### Event Types
Modify `backend/server.js` to add/remove session types:

```javascript
const eventTypes = {
  consultation: { duration: 60, title: 'Consultation' },
  engagement: { duration: 180, title: 'Engagement Session' },
  wedding: { duration: 600, title: 'Wedding Day' },
  // Add your custom types here
};
```

### Email Templates
Customize email templates in the `sendConfirmationEmail` function.

### Working Hours
Adjust availability in `calculateAvailableSlots`:

```javascript
const workingHours = { start: 9, end: 18 }; // 9 AM - 6 PM
```

## 🐛 Troubleshooting

### Common Issues

1. **Google API Errors**
   - Check OAuth2 credentials
   - Verify API permissions
   - Ensure refresh token is valid

2. **Email Delivery Issues**
   - Verify Gmail API permissions
   - Check SPAM folders  
   - Ensure OAuth2 scopes include gmail.send
   - Test Gmail API connection with auth-setup.js

3. **Database Issues**
   - SQLite database auto-creates on first run
   - Check file permissions in backend directory
   - Verify DATABASE_URL in .env

### Debug Mode
```bash
DEBUG=booking:* npm run dev
```

## 📞 Support

For technical support or customization requests:
- Email: hello@4everevents.example
- Documentation: [Link to docs]
- Issues: [GitHub Issues]

## 📄 License

MIT License - See LICENSE file for details.

---

**Built with ❤️ for 4everevents Wedding Photography**