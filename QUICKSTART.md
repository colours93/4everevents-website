# 🚀 4everevents Booking System - Secure Quick Start

Get your secure Google API booking system running in 5 minutes! 
**No third-party dependencies - Direct Google APIs only (2024 security standards)**

## ⚡ Quick Setup

### 1. Install Dependencies
```bash
cd backend/
npm install
```

### 2. Environment Setup
```bash
npm run setup
```
This interactive script will help you configure:
- Business email and phone
- Google OAuth2 credentials 
- Optional features (SMS, Sheets)

### 3. Google API Authentication
```bash
npm run auth:setup
```
This will:
- Open Google OAuth flow in your browser
- Get the necessary refresh token
- Update your .env file automatically

### 4. Test Security & APIs
```bash
npm run test:security
```
Comprehensive security validation:
- OAuth2 configuration 
- Google Calendar API (minimal scopes)
- Gmail API (send only)
- Token management security

### 5. Start the System
```bash
# Backend (in backend/ directory)
npm run dev

# Frontend (in root directory)
python -m http.server 3000
```

## 🎯 Your booking system is now live at:
- **Website**: http://localhost:3000
- **API**: http://localhost:3001/api

## 🔧 What's Included

### ✅ Core Features
- Multi-step booking form with validation
- Real-time availability checking
- Google Calendar integration
- Automated email confirmations
- Mobile-responsive design

### ✅ Secure Google API Integration (2024)
- **OAuth2 Security** - Minimal scopes (calendar.events + gmail.send only)
- **Calendar Events** - Direct Google Calendar API integration
- **Gmail API** - Secure email sending without SMTP dependencies
- **Rate Limiting** - Built-in API protection
- **Token Security** - Automatic refresh with security buffer

## 📱 Testing Your Booking System

1. **Open**: http://localhost:3000
2. **Navigate** to the booking section
3. **Fill out** the booking form
4. **Check** your Google Calendar for the event
5. **Verify** email confirmations were sent

## 🚨 Need Help?

### Common Issues
- **"Google API Error"** → Run `npm run auth:setup` again
- **"CORS Error"** → Check frontend URL in .env matches your dev server
- **"Database Error"** → Backend will auto-create SQLite database

### Support
- Email: hello@4everevents.example
- Documentation: [README.md](./README.md)

---

**🎉 You're ready to accept bookings!**