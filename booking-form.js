// Legacy mock removed; using integrated bookingForm below
/* function bookingForm(){
  return {
    currentStep: 1,
    totalSteps: 4,
    formData: {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      referralSource: '',
      eventType: '',
      eventDate: '',
      eventTime: '',
      location: '',
      message: '',
      duration: 60
    },
    errors: {},
    availableSlots: [],
    isLoading: false,
    isSubmitting: false,
    showAvailability: false,
    showSuccess: false,
    bookingId: null,
    minDate: new Date().toISOString().split('T')[0],
    eventTypes: {
      wedding: { label: 'Wedding', price: '$4200', duration: 360, description: 'Full day coverage' },
      engagement: { label: 'Engagement', price: '$450', duration: 90, description: 'Couples session' },
      portrait: { label: 'Editorial Portraits', price: '$350', duration: 60, description: 'In-studio or on-location' },
      film: { label: 'Cinematic Film', price: '$2200', duration: 240, description: 'Short film & highlights' }
    },
    init(){
      // Restore state from localStorage optionally
      const saved = localStorage.getItem('bookingFormDraft');
      if (saved) {
        try { Object.assign(this.formData, JSON.parse(saved)); } catch(e){}
      }
    },
    getProgressPercentage(){
      return (this.currentStep / this.totalSteps) * 100;
    },
    selectEventType(key){
      this.formData.eventType = key;
      this.formData.duration = this.eventTypes[key].duration || 60;
      this.errors.eventType = null;
    },
    async loadAvailability(){
      if (!this.formData.eventDate) return;
      this.isLoading = true; 
      this.showAvailability = false; 
      this.availableSlots = [];
      
      try {
        // Use real API through BookingSystem
        const bookingSystem = new BookingSystem();
        const result = await bookingSystem.getAvailableSlots(this.formData.eventDate, this.formData.duration);
        
        if (result.success) {
          this.availableSlots = result.available_slots || [];
        } else {
          console.error('Failed to load availability:', result.error);
          // Fallback to mock data if API fails
          const base = new Date(this.formData.eventDate + 'T09:00:00');
          const slots = [];
          for (let i=0;i<8;i++){ 
            const t = new Date(base.getTime() + i*45*60000); 
            slots.push({ time: t.toISOString() }); 
          }
          this.availableSlots = slots;
        }
      } catch (error) {
        console.error('Error loading availability:', error);
        // Fallback to mock data
        const base = new Date(this.formData.eventDate + 'T09:00:00');
        const slots = [];
        for (let i=0;i<8;i++){ 
          const t = new Date(base.getTime() + i*45*60000); 
          slots.push({ time: t.toISOString() }); 
        }
        this.availableSlots = slots;
      }
      
      this.isLoading = false; 
      this.showAvailability = true;
    },
    formatTime(iso){
      const d = new Date(iso); return d.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });
    },
    formatDate(iso){ const d = new Date(iso); return d.toLocaleDateString(); },
    selectTimeSlot(slot){ this.formData.eventTime = slot.time; this.errors.eventTime = null; },
    nextStep(){
      if (this.validateStep(this.currentStep)){
        if (this.currentStep < this.totalSteps) this.currentStep++;
        this.saveDraft();
      }
    },
    prevStep(){ if (this.currentStep>1) this.currentStep--; },
    validateStep(step){
      this.errors = {};
      if (step===1){
        if (!this.formData.clientName) this.errors.clientName = 'Please enter your name.';
        if (!this.formData.clientEmail || !/.+@.+\..+/.test(this.formData.clientEmail)) this.errors.clientEmail = 'Enter a valid email.';
        if (!this.formData.clientPhone) this.errors.clientPhone = 'Enter a phone number.';
        return Object.keys(this.errors).length===0;
      }
      if (step===2){
        if (!this.formData.eventType) this.errors.eventType = 'Choose a session type.';
        if (!this.formData.eventDate) this.errors.eventDate = 'Select a preferred date.';
        if (!this.formData.location) this.errors.location = 'Provide a location or venue.';
        return Object.keys(this.errors).length===0;
      }
      if (step===3){
        if (!this.formData.eventTime) this.errors.eventTime = 'Pick a time slot.';
        return Object.keys(this.errors).length===0;
      }
      return true;
    },
    submitBooking(){
      if (!this.validateStep(this.currentStep)) return;
      this.isSubmitting = true; this.errors.submit = null;
      // Mock submit to booking-api.js
      setTimeout(()=>{
        this.isSubmitting = false; this.showSuccess = true; this.bookingId = 'BK-' + Math.random().toString(36).slice(2,9).toUpperCase();
        localStorage.removeItem('bookingFormDraft');
      }, 900 + Math.random()*800);
    },
    resetForm(){
      this.currentStep = 1; this.formData = { clientName:'', clientEmail:'', clientPhone:'', referralSource:'', eventType:'', eventDate:'', eventTime:'', location:'', message:'', duration:60 }; this.showSuccess=false; this.bookingId=null; this.availableSlots=[];
    },
    saveDraft(){
      try { localStorage.setItem('bookingFormDraft', JSON.stringify(this.formData)); } catch(e){}
    }
  };
}

// Expose for direct testing
if (typeof window !== 'undefined') window.bookingForm = bookingForm; */

/**
 * 4everevents Booking Form - Alpine.js Component
 * Interactive booking form with real-time availability and validation
 */

function bookingForm() {
  return {
    // Form data
    formData: {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      eventDate: '',
      eventTime: '',
      eventType: 'consultation',
      location: '',
      message: '',
      duration: 60,
      guests: 1
    },

    // UI state
    currentStep: 1,
    totalSteps: 4,
    isLoading: false,
    isSubmitting: false,
    showSuccess: false,
    showAvailability: false,
    displayBookingCode: '',
    
    // Availability data
    availableSlots: [],
    selectedDate: '',
    
    // Guarded defaults so bindings never reference undefined values
    minDate: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
    bookingId: null,
    
    // Validation
    errors: {},
    
    // Booking system
    bookingSystem: null,

    // Event types with pricing and duration
    eventTypes: {
      consultation: {
        label: 'Initial Consultation',
        duration: 60,
        price: 'Free',
        description: 'Get to know each other and discuss your vision'
      },
      engagement: {
        label: 'Engagement Session',
        duration: 180,
        price: '$495',
        description: 'Romantic engagement photography session'
      },
      wedding: {
        label: 'Wedding Photography',
        duration: 600,
        price: 'Custom',
        description: 'Full wedding day coverage'
      },
      followup: {
        label: 'Follow-up Meeting',
        duration: 30,
        price: 'Free',
        description: 'Post-session planning and review'
      }
    },

    async init() {
      console.log('Initializing booking form...');
      this.bookingSystem = new BookingSystem();
      await this.bookingSystem.initialize();
      
      // Set minimum date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.minDate = tomorrow.toISOString().split('T')[0];

      // Expose a global hard-advance for troubleshooting/UI fallback
      try {
        window.__booking = this;
        window.forceNextStep = () => {
          try {
            const c = window.__booking; if (!c) return;
            c.currentStep = Math.min(c.totalSteps, c.currentStep + 1);
          } catch (_) {}
        };
        window.forcePrevStep = () => {
          try {
            const c = window.__booking; if (!c) return;
            c.currentStep = Math.max(1, c.currentStep - 1);
          } catch (_) {}
        };
      } catch (_) {}
    },

    // Form navigation
    nextStep() {
      if (this.validateCurrentStep()) {
        if (this.currentStep === 2) {
          this.loadAvailability();
        }
        this.currentStep++;
      }
    },

    prevStep() {
      if (this.currentStep > 1) {
        this.currentStep--;
      }
    },

    // Validation
    validateCurrentStep() {
      this.errors = {};
      
      switch (this.currentStep) {
        case 1:
          return this.validatePersonalInfo();
        case 2:
          return this.validateEventDetails();
        case 3:
          return this.validateTimeSelection();
        default:
          return true;
      }
    },

    validatePersonalInfo() {
      let isValid = true;
      
      if (!this.formData.clientName.trim()) {
        this.errors.clientName = 'Name is required';
        isValid = false;
      }
      
      if (!this.formData.clientEmail.trim()) {
        this.errors.clientEmail = 'Email is required';
        isValid = false;
      } else if (!this.isValidEmail(this.formData.clientEmail)) {
        this.errors.clientEmail = 'Please enter a valid email';
        isValid = false;
      }
      
      if (!this.formData.clientPhone.trim()) {
        this.errors.clientPhone = 'Phone number is required';
        isValid = false;
      }
      
      return isValid;
    },

    validateEventDetails() {
      let isValid = true;
      
      if (!this.formData.eventDate) {
        this.errors.eventDate = 'Event date is required';
        isValid = false;
      } else {
        // Prevent malformed/ancient dates like 0002/0020/0202
        const year = Number(String(this.formData.eventDate).slice(0, 4));
        if (!Number.isFinite(year) || year < 2020 || year > 2100) {
          this.errors.eventDate = 'Please select a valid date';
          isValid = false;
        }
      }
      
      if (!this.formData.eventType) {
        this.errors.eventType = 'Please select an event type';
        isValid = false;
      }
      
      if (!this.formData.location.trim()) {
        this.errors.location = 'Location is required';
        isValid = false;
      }
      
      return isValid;
    },

    validateTimeSelection() {
      if (!this.formData.eventTime) {
        this.errors.eventTime = 'Please select a time slot';
        return false;
      }
      return true;
    },

    isValidEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    },

    // Event type selection
    selectEventType(type) {
      this.formData.eventType = type;
      this.formData.duration = this.eventTypes[type].duration;
    },

    // Availability loading
    async loadAvailability() {
      if (!this.formData.eventDate) return;
      // Early guard for invalid year values which we saw in logs (0002, 0020, 0202)
      const year = Number(String(this.formData.eventDate).slice(0, 4));
      if (!Number.isFinite(year) || year < 2020 || year > 2100) {
        this.errors.eventDate = 'Please select a valid date';
        this.availableSlots = [];
        this.showAvailability = false;
        return;
      }
      
      this.isLoading = true;
      this.showAvailability = false;
      
      try {
        const response = await this.bookingSystem.getAvailableSlots(
          this.formData.eventDate,
          this.formData.duration
        );
        
        if (response.success) {
          this.availableSlots = response.available_slots;
          this.selectedDate = response.date;
          this.showAvailability = true;
          this.errors.availability = null;
        } else {
          console.warn('Availability API returned unsuccessful. Falling back to local slot calculation.');
          // Fallback: compute optimistic local slots within business hours
          this.availableSlots = this.bookingSystem.calculateAvailableSlots(
            [],
            this.formData.eventDate,
            this.formData.duration
          );
          this.selectedDate = this.formData.eventDate;
          this.showAvailability = true;
          this.errors.availability = null;
        }
      } catch (error) {
        console.error('Error loading availability:', error);
        // Network or server failure — fallback to local slots so users can proceed
        this.availableSlots = this.bookingSystem.calculateAvailableSlots(
          [],
          this.formData.eventDate,
          this.formData.duration
        );
        this.selectedDate = this.formData.eventDate;
        this.showAvailability = true;
        this.errors.availability = null;
      } finally {
        this.isLoading = false;
      }
    },

    // Time slot selection
    selectTimeSlot(slot) {
      this.formData.eventTime = slot.time;
      this.selectedSlot = slot;
    },

    // Form submission
    async submitBooking() {
      if (!this.validateCurrentStep()) return;
      
      this.isSubmitting = true;
      
      try {
        console.log('Submitting booking:', this.formData);
        const response = await this.bookingSystem.createBooking({
          ...this.formData,
          duration: this.formData.duration
        });
        
        console.log('Booking response:', response);
        
        if (response.success) {
          this.showSuccess = true;
          this.bookingId = response.booking_id;
          this.displayBookingCode = String(this.bookingId || '').split('-').slice(-1)[0] || this.bookingId;
          this.currentStep = this.totalSteps + 1; // Success step
          
          // Track analytics event
          if (typeof gtag !== 'undefined') {
            gtag('event', 'booking_completed', {
              event_category: 'engagement',
              event_label: this.formData.eventType,
              value: 1
            });
          }

          // Cinematic celebration orchestration
          this.runCinematicConfirmation();
        } else {
          // Surface server-side validation errors clearly
          if (Array.isArray(response.errors) && response.errors.length) {
            const first = response.errors[0];
            this.errors.submit = `Please fix: ${first.param} — ${first.msg}`;
          } else {
            this.errors.submit = response.error || 'Booking failed. Please try again.';
          }
        }
      } catch (error) {
        console.error('Booking submission error:', error);
        this.errors.submit = 'Unable to connect to booking system. Please check if the backend server is running.';
      } finally {
        this.isSubmitting = false;
      }
    },

    // Orchestrate cinematic confirmation
    runCinematicConfirmation() {
      // Confetti burst
      try {
        if (window.confetti) {
          window.confetti({ particleCount: 200, spread: 80, origin: { y: 0.28 } });
          setTimeout(() => window.confetti({ particleCount: 120, spread: 70, origin: { y: 0.2 } }), 300);
        }
      } catch (_) {}

      // Anime.js pop for the check badge
      try {
        const el = document.getElementById('confirm-check');
        if (el && window.anime) {
          anime({ targets: el, scale: [0.6, 1], rotate: [8, 0], easing: 'easeOutElastic(1, .5)', duration: 900 });
        }
      } catch (_) {}

      // Lottie fallback if lottie container exists and lib present
      try {
        const lottieHost = document.getElementById('confirm-lottie');
        if (lottieHost && window.lottie) {
          lottieHost.style.display = 'block';
          const anim = lottie.loadAnimation({
            container: lottieHost,
            renderer: 'svg',
            loop: false,
            autoplay: true,
            path: 'https://assets10.lottiefiles.com/packages/lf20_jbrw3hcz.json' // checkmark celebration
          });
          anim.addEventListener('complete', () => setTimeout(() => { try { anim.destroy(); lottieHost.style.display = 'none'; } catch(_){} }, 600));
        }
      } catch (_) {}

      // Mo.js burst accent
      try {
        if (window.mojs) {
          const burst = new mojs.Burst({
            left: 0, top: 0,
            count: 12,
            radius: { 20: 80 },
            children: { shape: 'circle', fill: '#40e0d0', duration: 900, easing: 'quad.out' }
          });
          const target = document.getElementById('confirm-check');
          if (target) {
            const rect = target.getBoundingClientRect();
            const x = rect.left + rect.width / 2 + window.scrollX;
            const y = rect.top + rect.height / 2 + window.scrollY;
            burst.tune({ x, y }).replay();
          }
        }
      } catch (_) {}

      // tsParticles subtle celebratory particles background
      try {
        if (window.tsParticles) {
          const host = document.getElementById('confirm-particles');
          if (host) {
            tsParticles.load(host, {
              background: { color: { value: 'transparent' } },
              fullScreen: { enable: false },
              particles: {
                number: { value: 24, density: { enable: true, area: 800 } },
                color: { value: ['#40e0d0', '#00a9a5', '#e6fff9'] },
                opacity: { value: 0.35 },
                size: { value: { min: 1, max: 3 } },
                move: { enable: true, speed: 1.2 },
              },
              interactivity: { events: { onHover: { enable: true, mode: 'repulse' } }, modes: { repulse: { distance: 80 } } }
            });
          }
        }
      } catch (_) {}

      // Vanta fog background for cinematic depth
      try {
        if (window.VANTA && window.THREE) {
          const el = document.getElementById('confirm-bg');
          if (el) {
            this._vanta = window.VANTA.FOG({
              el,
              THREE: window.THREE,
              highlightColor: 0x40e0d0,
              midtoneColor: 0x0ba9a5,
              lowlightColor: 0x0b0f10,
              baseColor: 0x060709,
              blurFactor: 0.55,
              speed: 0.8,
              zoom: 1.1
            });
          }
        }
      } catch (_) {}
    },

    // Cleanup cinematic background
    _cleanupCinematic() {
      try { if (this._vanta && this._vanta.destroy) { this._vanta.destroy(); this._vanta = null; } } catch(_){}
      try {
        const host = document.getElementById('confirm-particles');
        if (host && host._tsParticles) {
          host._tsParticles.destroy();
        }
        if (window.tsParticles && host) {
          tsParticles.dom().forEach(i => i.destroy());
        }
      } catch(_){}
    },

    // Utility methods
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },

    formatTime(timeString) {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    },

    getProgressPercentage() {
      return (this.currentStep / this.totalSteps) * 100;
    },

    // Calendar helpers
    openGoogleCalendar() {
      try {
        const start = this._eventStart();
        const end = new Date(start.getTime() + (Number(this.formData.duration || 60) * 60000));
        const toG = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
        const params = new URLSearchParams({
          action: 'TEMPLATE',
          text: `4everevents — ${this.formData.eventType || 'Session'}`,
          dates: `${toG(start)}/${toG(end)}`,
          details: `Booking ${this.bookingId}\nName: ${this.formData.clientName}\nEmail: ${this.formData.clientEmail}\nPhone: ${this.formData.clientPhone}\nMessage: ${this.formData.message || ''}`,
          location: this.formData.location || ''
        });
        window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener');
      } catch (_) {}
    },

    downloadICS() {
      try {
        const start = this._eventStart();
        const end = new Date(start.getTime() + (Number(this.formData.duration || 60) * 60000));
        const dt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
        const uid = this.bookingId || (Date.now()+Math.random()).toString(36);
        const ics = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//4everevents//Booking//EN',
          'BEGIN:VEVENT',
          `UID:${uid}@4everevents`,
          `DTSTAMP:${dt(new Date())}`,
          `DTSTART:${dt(start)}`,
          `DTEND:${dt(end)}`,
          `SUMMARY:4everevents — ${this.formData.eventType || 'Session'}`,
          `DESCRIPTION:Booking ${this.bookingId}\\n${(this.formData.message||'').replace(/\n/g,'\\n')}`,
          `LOCATION:${(this.formData.location||'').replace(/,/g,'\\,')}`,
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\r\n');
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${uid}.ics`; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } catch (_) {}
    },

    _eventStart() {
      const [h, m] = String(this.formData.eventTime || '00:00').split(':').map(Number);
      const d = new Date(this.formData.eventDate + 'T00:00:00');
      d.setHours(h || 0, m || 0, 0, 0);
      return d;
    },

    resetForm() {
      this.formData = {
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        eventDate: '',
        eventTime: '',
        eventType: 'consultation',
        location: '',
        message: '',
        duration: 60,
        guests: 1
      };
      this.currentStep = 1;
      this.showSuccess = false;
      this.errors = {};
      this.availableSlots = [];
      this._cleanupCinematic();
    }
  }
}

// Ensure the Alpine component uses the latest definition
if (typeof window !== 'undefined') window.bookingForm = bookingForm;