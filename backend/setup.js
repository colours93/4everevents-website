#!/usr/bin/env node

/**
 * 4everevents Booking System Setup Script
 * Helps configure Google APIs and environment variables
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
  console.log('\n🎉 Welcome to 4everevents Booking System Setup!\n');
  
  // Check if .env already exists
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await question('📋 .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled. Edit .env manually if needed.');
      rl.close();
      return;
    }
  }

  console.log('📝 Let\'s configure your environment variables...\n');

  // Basic Configuration
  const businessEmail = await question('📧 Business email (hello@4everevents.example): ') || 'hello@4everevents.example';
  const businessPhone = await question('📱 Business phone (+1234567890): ') || '+1234567890';
  const timezone = await question('🌍 Timezone (America/Los_Angeles): ') || 'America/Los_Angeles';

  // Google OAuth2 Configuration
  console.log('\n🔐 Google OAuth2 Setup:');
  console.log('1. Go to https://console.cloud.google.com/');
  console.log('2. Create/select a project');
  console.log('3. Enable Calendar API and Gmail API');
  console.log('4. Create OAuth2 credentials\n');

  const clientId = await question('Google Client ID: ');
  const clientSecret = await question('Google Client Secret: ');
  
  console.log('\n📋 For the refresh token, run: npm run auth:setup after completing this setup\n');

  // Optional Features
  console.log('🔧 Optional Features:');
  const enableSheets = await question('Enable Google Sheets tracking? (y/N): ');
  const sheetsId = enableSheets.toLowerCase() === 'y' ? await question('Google Sheets ID: ') : '';

  const enableSMS = await question('Enable SMS notifications? (y/N): ');
  let twilioSid = '', twilioToken = '', twilioPhone = '';
  if (enableSMS.toLowerCase() === 'y') {
    twilioSid = await question('Twilio Account SID: ');
    twilioToken = await question('Twilio Auth Token: ');
    twilioPhone = await question('Twilio Phone Number: ');
  }

  // Generate JWT secret
  const jwtSecret = require('crypto').randomBytes(32).toString('hex');
  const sessionSecret = require('crypto').randomBytes(32).toString('hex');

  // Create .env file
  const envContent = `# 4everevents Booking System Environment Variables

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Business Configuration
BUSINESS_EMAIL=${businessEmail}
BUSINESS_PHONE=${businessPhone}
BUSINESS_TIMEZONE=${timezone}

# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=${clientId}
GOOGLE_CLIENT_SECRET=${clientSecret}
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
GOOGLE_REFRESH_TOKEN=your-refresh-token-here

# Gmail Configuration
GMAIL_USER=${businessEmail}

# Database Configuration
DATABASE_URL=./bookings.db

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d

# Security
SESSION_SECRET=${sessionSecret}

${enableSheets.toLowerCase() === 'y' ? `# Google Sheets Integration
GOOGLE_SHEETS_ID=${sheetsId}` : '# Google Sheets Integration (disabled)'}

${enableSMS.toLowerCase() === 'y' ? `# SMS Notifications
SMS_NOTIFICATIONS_ENABLED=true
TWILIO_ACCOUNT_SID=${twilioSid}
TWILIO_AUTH_TOKEN=${twilioToken}
TWILIO_PHONE_NUMBER=${twilioPhone}` : '# SMS Notifications (disabled)'}

# Security Configuration (2024 OAuth2 Standards)
GOOGLE_API_RATE_LIMIT=100
GOOGLE_TOKEN_REFRESH_BUFFER=300

# Monitoring & Analytics
GOOGLE_ANALYTICS_ID=GA4-measurement-id
`;

  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ .env file created successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Run: npm install');
  console.log('2. Run: npm run auth:setup (to get Google refresh token)');
  console.log('3. Run: npm run dev (to start the server)');
  console.log('4. Open: http://localhost:3000 (frontend)');
  console.log('\n🎉 Your booking system is ready to go!');

  rl.close();
}

// Handle script execution
if (require.main === module) {
  setup().catch(console.error);
}

module.exports = { setup };