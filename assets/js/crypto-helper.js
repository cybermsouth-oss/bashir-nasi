// ============================================
// BASHIRI NASI - CRYPTO SECURITY MODULE
// MUST BE LOADED BEFORE main.js
// SHA-256 Hashing | AES Encryption | CSRF Protection | Audit Logging
// ============================================

// ============================================
// ENCRYPTION CONFIGURATION
// ============================================
var SECURITY_CONFIG = {
  ENCRYPTION_KEY: 'BashiriNasi@2025!TZ#Secure#Key$%^&*()',
  SESSION_TIMEOUT: 30 * 60 * 1000,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_TIME: 60 * 60 * 1000,
  MAX_PASSWORD_LENGTH: 128,
  MIN_PASSWORD_LENGTH: 8,
  CSRF_TOKEN_LENGTH: 64,
  AUDIT_LOG_MAX: 1000,
  INPUT_MAX_LENGTH: 200
};

// ============================================
// AUDIT LOGGING (DEFINED FIRST SO IT'S AVAILABLE)
// ============================================
function auditLog(action, details, severity) {
  severity = severity || 'info';
  
  var logEntry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    user: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.phone : 'anonymous',
    role: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.role : 'guest',
    action: action,
    details: details || '',
    severity: severity,
    userAgent: navigator.userAgent.substring(0, 200),
    pageUrl: window.location.href.substring(0, 200)
  };
  
  try {
    var logs = JSON.parse(sessionStorage.getItem('bashiri_audit_logs') || '[]');
    logs.push(logEntry);
    
    if (logs.length > SECURITY_CONFIG.AUDIT_LOG_MAX) {
      logs = logs.slice(-SECURITY_CONFIG.AUDIT_LOG_MAX);
    }
    
    sessionStorage.setItem('bashiri_audit_logs', JSON.stringify(logs));
  } catch(e) {
    console.error('Audit logging error:', e);
  }
  
  // Console logging in development
  if (window.location.protocol === 'file:' || window.location.hostname === 'localhost') {
    console.log('📝 AUDIT [' + severity.toUpperCase() + ']:', action, '-', details || '');
  }
}

// ============================================
// STRONG PASSWORD HASHING (SHA-256 + Salt + HMAC)
// ============================================
function hashPassword(password) {
  if (!password || password.length > SECURITY_CONFIG.MAX_PASSWORD_LENGTH) {
    console.error('Invalid password length');
    return null;
  }
  
  // Generate cryptographically strong random salt
  var salt = CryptoJS.lib.WordArray.random(32).toString();
  
  // Hash with SHA-256
  var hash = CryptoJS.SHA256(password + salt).toString();
  
  // Store salt and hash together
  var combinedHash = salt + ':' + hash;
  
  // Add HMAC for integrity verification
  var hmac = CryptoJS.HmacSHA256(combinedHash, SECURITY_CONFIG.ENCRYPTION_KEY).toString();
  
  return combinedHash + ':' + hmac;
}

function verifyPassword(inputPassword, storedHash) {
  if (!inputPassword || !storedHash) return false;
  
  try {
    var parts = storedHash.split(':');
    
    // New format: salt:hash:hmac (3 parts)
    if (parts.length === 3) {
      var salt = parts[0];
      var originalHash = parts[1];
      var originalHmac = parts[2];
      
      // Verify HMAC integrity first
      var combinedCheck = salt + ':' + originalHash;
      var hmacCheck = CryptoJS.HmacSHA256(combinedCheck, SECURITY_CONFIG.ENCRYPTION_KEY).toString();
      
      if (hmacCheck !== originalHmac) {
        console.error('⚠️ Password hash tampering detected!');
        auditLog('PASSWORD_TAMPER', 'Hash integrity check failed', 'critical');
        return false;
      }
      
      // Verify actual password
      var inputHash = CryptoJS.SHA256(inputPassword + salt).toString();
      return inputHash === originalHash;
    }
    
    // Legacy support for old Caesar cipher
    if (parts.length === 1) {
      return verifyOldPassword(inputPassword, storedHash);
    }
    
    return false;
    
  } catch(e) {
    console.error('Password verification error:', e);
    return false;
  }
}

// Legacy support for old Caesar cipher passwords
function verifyOldPassword(inputPassword, storedPassword) {
  var hash = '';
  for (var i = 0; i < inputPassword.length; i++) {
    hash += String.fromCharCode(inputPassword.charCodeAt(i) + 7);
  }
  return hash === storedPassword;
}

// ============================================
// PASSWORD STRENGTH VALIDATION
// ============================================
function validatePasswordStrength(password) {
  var errors = [];
  
  if (password.length < SECURITY_CONFIG.MIN_PASSWORD_LENGTH) {
    errors.push('At least ' + SECURITY_CONFIG.MIN_PASSWORD_LENGTH + ' characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('At least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('At least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    strength: calculatePasswordStrength(password)
  };
}

function calculatePasswordStrength(password) {
  var score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 16) score++;
  
  if (score <= 2) return 'Weak';
  if (score <= 4) return 'Fair';
  if (score <= 6) return 'Strong';
  return 'Very Strong';
}

// ============================================
// AES ENCRYPTION FOR LOCALSTORAGE
// ============================================
function encryptData(data) {
  try {
    var jsonStr = JSON.stringify(data);
    var encrypted = CryptoJS.AES.encrypt(jsonStr, SECURITY_CONFIG.ENCRYPTION_KEY).toString();
    return encrypted;
  } catch(e) {
    console.error('Encryption error:', e);
    return null;
  }
}

function decryptData(encryptedData) {
  try {
    var bytes = CryptoJS.AES.decrypt(encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY);
    var decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;
    return JSON.parse(decrypted);
  } catch(e) {
    console.error('Decryption error:', e);
    return null;
  }
}

// ============================================
// CSRF TOKEN GENERATION
// ============================================
function generateCSRFToken() {
  var timestamp = Date.now().toString();
  var random = CryptoJS.lib.WordArray.random(16).toString();
  var fingerprint = navigator.userAgent + navigator.language + screen.width;
  
  var token = CryptoJS.SHA256(timestamp + random + fingerprint).toString();
  
  sessionStorage.setItem('bashiri_csrf_token', token);
  sessionStorage.setItem('bashiri_csrf_time', timestamp);
  
  return token;
}

function validateCSRFToken(token) {
  if (!token) return false;
  
  var storedToken = sessionStorage.getItem('bashiri_csrf_token');
  var storedTime = sessionStorage.getItem('bashiri_csrf_time');
  
  if (!storedToken || !storedTime) return false;
  if (token !== storedToken) return false;
  
  var now = Date.now();
  var tokenAge = now - parseInt(storedTime);
  if (tokenAge > 3600000) {
    sessionStorage.removeItem('bashiri_csrf_token');
    sessionStorage.removeItem('bashiri_csrf_time');
    return false;
  }
  
  return true;
}

// ============================================
// INPUT SANITIZATION
// ============================================
function sanitizeInput(str) {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .trim()
    .substring(0, SECURITY_CONFIG.INPUT_MAX_LENGTH);
}

function escapeHTML(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// SECURE COMPARISON (CONSTANT-TIME)
// ============================================
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  
  var result = 0;
  for (var i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ============================================
// PHONE VALIDATION
// ============================================
function validatePhone(phone) {
  if (!phone) return false;
  phone = phone.replace(/\D/g, '');
  
  if (phone.startsWith('0')) {
    phone = '255' + phone.substring(1);
  }
  
  return /^255[67]\d{8}$/.test(phone);
}

console.log('✅ Crypto Security Module Loaded');
console.log('   - SHA-256 Password Hashing');
console.log('   - AES-256 Data Encryption');
console.log('   - CSRF Protection');
console.log('   - XSS Prevention');
console.log('   - Audit Logging');
console.log('   - Secure Comparisons');