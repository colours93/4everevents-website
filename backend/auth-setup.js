#!/usr/bin/env node

/**
 * Google OAuth2 Token Setup for 4everevents Booking System
 * Helps get the refresh token needed for Google APIs
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

require('dotenv').config();

// 2025 OAuth2 Scopes (covers tests and app features)
// - calendar: full calendar access (required for calendarList.list in tests and events.list/insert)
// - gmail.send: send email confirmations/notifications
// - gmail.readonly: used by test to read profile
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly'
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function getGoogleAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    console.error('❌ Missing Google OAuth2 credentials in .env file');
    console.log('Please run: npm run setup first');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('\n🔐 Google OAuth2 Setup for 4everevents Booking System\n');
  console.log('🌐 Open this URL in your browser:');
  console.log(`\n${authUrl}\n`);
  console.log('📋 Follow these steps:');
  console.log('1. Sign in with your business Google account');
  console.log('2. Grant permissions for Calendar, Gmail, and Sheets');
  console.log('3. Copy the authorization code from the redirect URL\n');

  const code = await question('🔑 Enter the authorization code: ');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('\n✅ Successfully obtained tokens!');
    console.log('📝 Refresh Token:', tokens.refresh_token);

    // Update .env file with refresh token
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent = envContent.replace(
      /GOOGLE_REFRESH_TOKEN=.*/,
      `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
    );
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ .env file updated with refresh token');
    console.log('\n🎉 Google API authentication is now configured!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm run test:google (to test the integration)');
    console.log('2. Run: npm run dev (to start the booking system)');

  } catch (error) {
    console.error('❌ Error getting tokens:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('- Make sure you copied the full authorization code');
    console.log('- Check your Google Cloud Console OAuth2 setup');
    console.log('- Verify redirect URI matches your Google Console settings');
  }

  rl.close();
}

// Test Google API connection
async function testGoogleConnection() {
  console.log('\n🧪 Testing Google API connections...\n');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ Missing Google credentials. Run: npm run auth:setup');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    // Test Calendar API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarResponse = await calendar.calendarList.list();
    console.log('✅ Calendar API: Connected');
    console.log(`   Found ${calendarResponse.data.items.length} calendars`);

    // Test Gmail API
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log('✅ Gmail API: Connected');
    console.log(`   Email: ${profile.data.emailAddress}`);

    // Test Sheets API (if enabled)
    if (process.env.GOOGLE_SHEETS_ID) {
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      const sheetResponse = await sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID
      });
      console.log('✅ Sheets API: Connected');
      console.log(`   Sheet: ${sheetResponse.data.properties.title}`);
    } else {
      console.log('ℹ️  Sheets API: Not configured');
    }

    console.log('\n🎉 All Google APIs are working correctly!');
    console.log('Your booking system is ready to handle bookings.');

  } catch (error) {
    console.error('❌ Google API test failed:', error.message);
    console.log('\n🔧 Common issues:');
    console.log('- Refresh token may be expired (re-run auth:setup)');
    console.log('- APIs may not be enabled in Google Cloud Console');
    console.log('- Check your Google account permissions');
  }
}

// Handle command line arguments
const command = process.argv[2];

if (command === 'test') {
  testGoogleConnection();
} else {
  getGoogleAuth();
}