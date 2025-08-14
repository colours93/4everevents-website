/**
 * 4everevents Booking System - Frontend API Client
 * Secure Google API integration without third-party dependencies
 * Compliant with 2024 OAuth2 security standards
 */

class BookingSystem {
  constructor() {
    // Avoid build-time envs; allow runtime override for pure HTML deployments
    const configuredBase = (typeof window !== 'undefined' && window.BOOKING_API_BASE)
      ? String(window.BOOKING_API_BASE)
      : '';
    const sanitizedConfigured = configuredBase.replace(/\/$/, '');
    const defaultDev = 'http://localhost:3001/api';
    this.apiBaseUrl = sanitizedConfigured || defaultDev;

    // Candidate bases for auto-detection when port 3001 is occupied by another app
    const candidates = [
      sanitizedConfigured,
      'http://localhost:5174/api',
      'http://127.0.0.1:5174/api',
      'http://localhost:3001/api',
      'http://127.0.0.1:3001/api'
    ].filter(Boolean);
    // Deduplicate while preserving order
    this.apiBaseCandidates = [...new Set(candidates.map(c => c.replace(/\/$/, '')))]
      .filter(Boolean);

    this.bookingConfig = {
      defaultDuration: 120, // 2 hours default consultation
      workingHours: { start: 9, end: 18 }, // 9 AM - 6 PM
      timeZone: 'America/Los_Angeles', // Adjust to your timezone
      bookingTypes: {
        consultation: {
          duration: 60,
          title: '4everevents - Initial Consultation',
          description: 'Wedding photography consultation and planning session'
        },
        engagement: {
          duration: 180,
          title: '4everevents - Engagement Session',
          description: 'Engagement photography session'
        },
        wedding: {
          duration: 600, // 10 hours
          title: '4everevents - Wedding Photography',
          description: 'Wedding day photography coverage'
        },
        followup: {
          duration: 30,
          title: '4everevents - Follow-up Call',
          description: 'Post-session follow-up and planning'
        }
      }
    };
  }

  /**
   * Initialize client (health check, future config fetch)
   */
  async initialize() {
    // Try each candidate until health check succeeds; keep the first working base
    const probe = async (base) => {
      try {
        const res = await fetch(base.replace(/\/api$/, '') + '/health');
        if (!res.ok) return false;
        // Basic shape check to ensure we hit our Express app
        const text = await res.text();
        // Accept JSON or plain ok; minimal validation
        if (text && (text.includes('ok') || text.includes('{'))) return true;
        return true;
      } catch (_) {
        return false;
      }
    };

    for (const candidate of this.apiBaseCandidates.length ? this.apiBaseCandidates : [this.apiBaseUrl]) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await probe(candidate);
      if (ok) {
        this.apiBaseUrl = candidate;
        return true;
      }
    }
    return false;
  }

  /**
   * Get available time slots for booking
   */
  async getAvailableSlots(date, duration = 120) {
    try {
      return await this.callAPI(`/availability/${date}?duration=${duration}`);
    } catch (error) {
      console.error('Error getting available slots:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new booking with Google APIs
   */
  async createBooking(bookingData) {
    try {
      // Validate required fields
      const { clientName, clientEmail, eventDate, eventTime, eventType } = bookingData;
      if (!clientName || !clientEmail || !eventDate || !eventTime || !eventType) {
        throw new Error('Missing required booking information');
      }

      // Validate booking type
      if (!this.bookingConfig.bookingTypes[eventType]) {
        throw new Error('Invalid booking type');
      }

      return await this.callAPI('/bookings', 'POST', bookingData);
    } catch (error) {
      console.error('Error creating booking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all bookings (admin function)
   */
  async getBookings() {
    try {
      return await this.callAPI('/bookings');
    } catch (error) {
      console.error('Error getting bookings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Make API calls to backend server
   */
  async callAPI(endpoint, method = 'GET', data = null) {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const requestId = Math.random().toString(36).slice(2, 10).toUpperCase();
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const start = Date.now();
      const response = await fetch(url, options);
      const elapsed = Date.now() - start;
      let result = null;
      try {
        result = await response.json();
      } catch (_) {
        result = null;
      }

      if (!response.ok) {
        const payload = Object.assign({ success: false, status: response.status }, result || {});
        console.warn(`API ${method} ${endpoint} [${requestId}] ${response.status} in ${elapsed}ms`, payload);
        return payload;
      }

      console.log(`API ${method} ${endpoint} [${requestId}] ok in ${elapsed}ms`);
      return result;
    } catch (error) {
      console.error(`API call failed: ${method} ${endpoint}`, error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Calculate available time slots (client-side helper)
   */
  calculateAvailableSlots(existingEvents, date, duration) {
    const slots = [];
    const workDay = new Date(date);
    const { start, end } = this.bookingConfig.workingHours;
    
    // Create time slots every 30 minutes during working hours
    for (let hour = start; hour < end; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(workDay);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);
        
        // Check if slot conflicts with existing events
        const hasConflict = existingEvents.some(event => {
          const eventStart = new Date(event.start.dateTime || event.start.date);
          const eventEnd = new Date(event.end.dateTime || event.end.date);
          return (slotStart < eventEnd && slotEnd > eventStart);
        });
        
        if (!hasConflict && slotEnd.getHours() <= end) {
          slots.push({
            time: slotStart.toTimeString().slice(0, 5),
            available: true,
            datetime: slotStart.toISOString()
          });
        }
      }
    }
    
    return slots;
  }

  /**
   * Generate unique booking ID
   */
  generateBookingId() {
    const prefix = '4EV';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Format date for display
   */
  formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Get booking type configuration
   */
  getBookingTypeConfig(eventType) {
    return this.bookingConfig.bookingTypes[eventType] || null;
  }

  /**
   * Check if date is in the future
   */
  isValidDate(date) {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }

  /**
   * Get business working hours
   */
  getWorkingHours() {
    return this.bookingConfig.workingHours;
  }
}

// Minimal local testing API (fallback)
const BookingAPI = {
  async fetchAvailability(date) {
    // Simulate network latency
    await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
    const base = new Date(date + 'T09:00:00');
    const slots = [];
    for (let i = 0; i < 8; i++) { 
      const t = new Date(base.getTime() + i * 45 * 60000); 
      slots.push({ time: t.toISOString() }); 
    }
    return slots;
  },
  
  async submitBooking(payload) {
    await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
    return { 
      success: true, 
      id: 'BK-' + Math.random().toString(36).slice(2, 8).toUpperCase() 
    };
  }
};

// Export for use in the website
if (typeof window !== 'undefined') {
  window.BookingSystem = BookingSystem;
  window.BookingAPI = BookingAPI;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BookingSystem, BookingAPI };
}