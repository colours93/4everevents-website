#!/usr/bin/env node

/**
 * Comprehensive Booking System Diagnostics
 * Identifies and fixes integration issues with Google Workspace
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 4everevents Booking System Diagnostics\n');

// Test 1: Environment Configuration
console.log('1️⃣ Checking Environment Configuration...');
const envPath = path.join(__dirname, 'backend', '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
    console.log('❌ Missing .env file');
    console.log('📋 Solution: Run `npm run setup` in backend/ directory');
} else {
    console.log('✅ .env file exists');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check for placeholder values
    const placeholders = [
        'your-google-client-id-here',
        'your-google-client-secret-here', 
        'your-refresh-token-here'
    ];
    
    const hasPlaceholders = placeholders.some(placeholder => envContent.includes(placeholder));
    
    if (hasPlaceholders) {
        console.log('⚠️  Environment file contains placeholder values');
        console.log('📋 You need to configure your Google OAuth2 credentials');
    } else {
        console.log('✅ Environment file appears configured');
    }
}

// Test 2: Server Status
console.log('\n2️⃣ Checking Server Status...');
async function testAPI() {
    try {
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
            console.log('✅ Backend API is responding');
            return true;
        } else {
            console.log('❌ Backend API returned error:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Backend API is not running');
        console.log('📋 Solution: Run `npm run dev` in backend/ directory');
        return false;
    }
}

// Test 3: Frontend Integration
console.log('\n3️⃣ Checking Frontend Integration...');
const bookingFormPath = path.join(__dirname, 'booking-form.js');
if (fs.existsSync(bookingFormPath)) {
    const bookingFormContent = fs.readFileSync(bookingFormPath, 'utf8');
    
    if (bookingFormContent.includes('Mock API call') || bookingFormContent.includes('setTimeout')) {
        console.log('❌ Frontend is using mock data instead of real API');
        console.log('📋 Solution: Update booking-form.js to use BookingSystem API client');
    } else {
        console.log('✅ Frontend appears to be using real API calls');
    }
} else {
    console.log('❌ booking-form.js not found');
}

// Test 4: Google Integration
console.log('\n4️⃣ Checking Google Integration...');
if (envExists) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasGoogleConfig = envContent.includes('GOOGLE_CLIENT_ID=') && 
                           !envContent.includes('your-google-client-id-here');
    
    if (hasGoogleConfig) {
        console.log('✅ Google credentials configured');
        console.log('📋 Run `npm run test:security` to verify Google API connection');
    } else {
        console.log('❌ Google credentials not configured');
        console.log('📋 Solution: Run `npm run auth:setup` after configuring credentials');
    }
} else {
    console.log('❌ Cannot check Google integration without .env file');
}

// Test 5: Database
console.log('\n5️⃣ Checking Database...');
const dbPath = path.join(__dirname, 'backend', 'bookings.db');
if (fs.existsSync(dbPath)) {
    console.log('✅ SQLite database exists');
} else {
    console.log('ℹ️  Database will be created automatically when server starts');
}

console.log('\n📊 Diagnostic Summary:');
console.log('='.repeat(50));

// Solutions
console.log('\n🛠️  Required Actions:');
console.log('1. Configure Google OAuth2 credentials in .env file');
console.log('2. Run `npm run auth:setup` to get refresh token');
console.log('3. Start backend server: `npm run dev`');
console.log('4. Update frontend to use real API instead of mocks');
console.log('5. Test complete integration with `npm run test:security`');

console.log('\n📋 Quick Setup Commands:');
console.log('cd backend/');
console.log('npm run setup    # Interactive configuration');
console.log('npm run auth:setup  # Google OAuth2 setup');
console.log('npm run dev      # Start the server');

// Run API test if possible
testAPI().then(apiWorking => {
    if (apiWorking) {
        console.log('\n✅ Basic API connectivity confirmed');
    } else {
        console.log('\n❌ API connectivity issues detected');
    }
    
    console.log('\n🔗 Next Steps:');
    console.log('1. Set up your Google Cloud Console OAuth2 credentials');
    console.log('2. Update the .env file with real values');
    console.log('3. Run the booking system setup scripts');
    console.log('4. Test the complete booking flow');
});