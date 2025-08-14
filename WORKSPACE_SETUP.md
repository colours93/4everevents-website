# 🚀 Google Workspace Integration Setup Guide

**Complete step-by-step guide to connect your booking system with Google Workspace**

## 🔑 **Step 1: Google Cloud Console Setup**

### 1.1 Create/Access Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Note your Project ID

### 1.2 Enable Required APIs
Enable these APIs in your Google Cloud Console:
```
✅ Google Calendar API
✅ Gmail API  
✅ Google Sheets API (optional)
✅ Google Drive API (optional)
```

**How to enable:**
1. Go to "APIs & Services" → "Library"
2. Search for each API and click "Enable"

### 1.3 Create OAuth2 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   ```
   http://localhost:3001/auth/google/callback
   ```
5. Save your Client ID and Client Secret

## 🔧 **Step 2: Configure Your Booking System**

### 2.1 Update Environment Variables
Edit `backend/.env` with your real credentials:

```env
# Replace these with your actual Google credentials
GOOGLE_CLIENT_ID=your-actual-client-id-from-google-console
GOOGLE_CLIENT_SECRET=your-actual-client-secret-from-google-console
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Update with your business email
BUSINESS_EMAIL=your-actual-business@gmail.com
GMAIL_USER=your-actual-business@gmail.com
```

### 2.2 Get Google Refresh Token
```bash
cd backend/
npm run auth:setup
```

This will:
1. Open Google OAuth flow in your browser
2. Request permission for Calendar and Gmail access
3. Generate a refresh token
4. Automatically update your .env file

## 🧪 **Step 3: Test Your Integration**

### 3.1 Test Google API Connection
```bash
cd backend/
npm run test:security
```

Expected output:
```
✅ OAuth2 configuration valid
✅ Calendar API connected (X calendars)
✅ Gmail API connected (your-email@gmail.com)
✅ All security tests PASSED
```

### 3.2 Start Your Booking System
```bash
# Terminal 1: Start backend
cd backend/
npm run dev

# Terminal 2: Start frontend (new terminal)
cd ../
python -m http.server 3000
```

### 3.3 Test Complete Booking Flow
1. Open http://localhost:3000
2. Navigate to booking section
3. Fill out booking form
4. Check that:
   - Calendar event is created in your Google Calendar
   - Confirmation email is sent via Gmail
   - Booking is saved to database

## 🔍 **Troubleshooting Common Issues**

### Issue: "Invalid Client" Error
**Solution:** Double-check your Google Client ID and Secret in .env file

### Issue: "Insufficient Permissions" 
**Solution:** Re-run `npm run auth:setup` to get fresh permissions

### Issue: "API Not Enabled"
**Solution:** Ensure Calendar API and Gmail API are enabled in Google Cloud Console

### Issue: "CORS Error"
**Solution:** Check that frontend URL matches FRONTEND_URL in .env

### Issue: "Booking Form Not Submitting"
**Solution:** 
1. Check browser console for JavaScript errors
2. Verify backend is running on port 3001
3. Test API health: `curl http://localhost:3001/health`

## 📋 **Quick Verification Checklist**

- [ ] Google Cloud project created
- [ ] Calendar API and Gmail API enabled
- [ ] OAuth2 credentials created with correct redirect URI
- [ ] .env file updated with real credentials (no placeholders)
- [ ] `npm run auth:setup` completed successfully
- [ ] `npm run test:security` passes all tests
- [ ] Backend server running on port 3001
- [ ] Frontend accessible on port 3000
- [ ] Booking form connects to real API (not mocks)

## 🎯 **Success Criteria**

When everything is working correctly:

1. **Form Submission**: Booking form submits without errors
2. **Calendar Integration**: Events appear in your Google Calendar automatically
3. **Email Notifications**: Confirmation emails sent via your Gmail account
4. **Database Storage**: Bookings saved to SQLite database
5. **Error Handling**: Graceful fallbacks when APIs are unavailable

## 🔗 **Additional Resources**

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2)

---

**Need Help?** Run `node debug-booking.js` for detailed diagnostics of your setup.