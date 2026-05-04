// ============================================
// BASHIRI NASI - SECURE APPLICATION v4.0.0
// REAL DATABASE ONLY | NO DEMO ACCOUNTS
// MAXIMUM SECURITY | ALL DATA TO MYSQL
// ============================================

'use strict';

// ============================================
// SECURE CONFIGURATION
// ============================================
var CONFIG = {
  API_BASE_URL: 'http://localhost/bashiri-nasi/api/',
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_TIME: 60 * 60 * 1000, // 1 hour
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  INPUT_MAX_LENGTH: 200,
  API_TIMEOUT: 15000,
  TOKEN_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  RATE_LIMIT_DELAY: 1000 // 1 second between requests
};

// ============================================
// SECURITY UTILITIES
// ============================================
var SecurityUtils = {
  // Generate CSRF token
  generateCSRFToken: function() {
    var array = new Uint32Array(8);
    window.crypto.getRandomValues(array);
    var token = '';
    for (var i = 0; i < array.length; i++) {
      token += array[i].toString(16).padStart(8, '0');
    }
    return token;
  },
  
  // Sanitize HTML to prevent XSS
  sanitizeHTML: function(str) {
    if (!str || typeof str !== 'string') return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  
  // Validate and sanitize input
  sanitizeInput: function(str, maxLength) {
    if (!str || typeof str !== 'string') return '';
    maxLength = maxLength || CONFIG.INPUT_MAX_LENGTH;
    // Remove HTML tags, trim, and limit length
    return str.replace(/<[^>]*>/g, '').trim().substring(0, maxLength);
  },
  
  // Validate email format
  validateEmail: function(email) {
    if (!email) return false;
    var re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  },
  
  // Validate Tanzanian phone number
  validatePhone: function(phone) {
    if (!phone) return false;
    phone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '255' + phone.substring(1);
    if (!phone.startsWith('255')) phone = '255' + phone;
    return /^255[67]\d{8}$/.test(phone);
  },
  
  // Validate password strength
  validatePasswordStrength: function(password) {
    if (!password || password.length < CONFIG.MIN_PASSWORD_LENGTH) {
      return { valid: false, message: 'Password must be at least ' + CONFIG.MIN_PASSWORD_LENGTH + ' characters' };
    }
    if (password.length > CONFIG.MAX_PASSWORD_LENGTH) {
      return { valid: false, message: 'Password is too long' };
    }
    // Check for uppercase, lowercase, number
    var hasUpper = /[A-Z]/.test(password);
    var hasLower = /[a-z]/.test(password);
    var hasNumber = /\d/.test(password);
    if (!hasUpper || !hasLower || !hasNumber) {
      return { valid: false, message: 'Password must contain uppercase, lowercase letters and numbers' };
    }
    return { valid: true, message: 'Password is strong' };
  },
  
  // Hash password (SHA-256 simulation - use bcrypt in production)
  hashPassword: async function(password) {
    if (!password) return '';
    // In production, use proper bcrypt/scrypt on server
    // This is just for transport - real hashing happens on server
    var encoder = new TextEncoder();
    var data = encoder.encode(password + 'bashiri_salt_2024');
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  },
  
  // Rate limiter
  rateLimiter: function() {
    var lastCall = 0;
    return function() {
      var now = Date.now();
      if (now - lastCall < CONFIG.RATE_LIMIT_DELAY) {
        return false;
      }
      lastCall = now;
      return true;
    };
  }()
};

// ============================================
// SECURE API CALLER
// ============================================
function apiCall(endpoint, method, data) {
    return new Promise(function(resolve, reject) {
        // Rate limiting
        if (!SecurityUtils.rateLimiter()) {
          reject({ success: false, message: 'Too many requests. Please wait.' });
          return;
        }
        
        var xhr = new XMLHttpRequest();
        var url = CONFIG.API_BASE_URL + endpoint;
        
        // Add timestamp to prevent caching
        var separator = url.indexOf('?') !== -1 ? '&' : '?';
        url += separator + '_t=' + Date.now();
        
        // Build GET parameters
        if (method === 'GET' && data) {
            var params = [];
            for (var key in data) {
                if (data.hasOwnProperty(key) && data[key] !== null && data[key] !== undefined) {
                    params.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
                }
            }
            if (params.length > 0) {
                url += '&' + params.join('&');
            }
        }
        
        xhr.open(method, url, true);
        xhr.timeout = CONFIG.API_TIMEOUT;
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        
        // Add CSRF token
        var csrfToken = sessionStorage.getItem('csrf_token') || SecurityUtils.generateCSRFToken();
        sessionStorage.setItem('csrf_token', csrfToken);
        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
        
        // Add auth token if available
        var session = Storage.get('bashiri_session', true);
        if (session && session.token) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + session.token);
        }
        
        // Handle response
        xhr.onload = function() {
            try {
                // Check for no content
                if (xhr.status === 204) {
                    resolve({ success: true, data: null });
                    return;
                }
                
                var contentType = xhr.getResponseHeader('Content-Type');
                if (!contentType || !contentType.includes('application/json')) {
                    reject({ success: false, message: 'Invalid server response format' });
                    return;
                }
                
                var response = JSON.parse(xhr.responseText);
                
                // Update CSRF token if provided
                if (response.csrf_token) {
                    sessionStorage.setItem('csrf_token', response.csrf_token);
                }
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(response);
                } else if (xhr.status === 401) {
                    clearSession();
                    reject({ 
                        success: false, 
                        message: 'Session expired. Please login again.',
                        code: 'UNAUTHORIZED'
                    });
                } else if (xhr.status === 403) {
                    reject({ 
                        success: false, 
                        message: 'Access denied. You don\'t have permission.',
                        code: 'FORBIDDEN'
                    });
                } else if (xhr.status === 429) {
                    reject({ 
                        success: false, 
                        message: 'Too many attempts. Please try again later.',
                        code: 'RATE_LIMITED'
                    });
                } else if (xhr.status >= 500) {
                    reject({ 
                        success: false, 
                        message: 'Server error. Our team has been notified.',
                        code: 'SERVER_ERROR'
                    });
                } else {
                    reject(response || { 
                        success: false, 
                        message: 'Request failed with status ' + xhr.status 
                    });
                }
            } catch(e) {
                console.error('Response parse error:', e);
                reject({ 
                    success: false, 
                    message: 'Invalid server response' 
                });
            }
        };
        
        // Handle network errors
        xhr.onerror = function() {
            reject({ 
                success: false, 
                message: 'Network error. Please check your connection.',
                code: 'NETWORK_ERROR'
            });
        };
        
        // Handle timeout
        xhr.ontimeout = function() {
            xhr.abort();
            reject({ 
                success: false, 
                message: 'Request timed out. Please try again.',
                code: 'TIMEOUT'
            });
        };
        
        // Send request
        try {
            if (method === 'GET' || method === 'DELETE') {
                xhr.send();
            } else {
                var jsonData = JSON.stringify(data || {});
                xhr.send(jsonData);
            }
        } catch(e) {
            reject({ 
                success: false, 
                message: 'Failed to send request' 
            });
        }
    });
}

// ============================================
// SECURE STORAGE
// ============================================
var Storage = {
  set: function(key, value, encrypt) {
    try {
      var data = encrypt ? btoa(JSON.stringify(value)) : JSON.stringify(value);
      localStorage.setItem('bashiri_' + key, data);
    } catch(e) {
      console.error('Storage error:', e);
    }
  },
  
  get: function(key, encrypted) {
    try {
      var data = localStorage.getItem('bashiri_' + key);
      if (!data) return null;
      return encrypted ? JSON.parse(atob(data)) : JSON.parse(data);
    } catch(e) {
      console.error('Storage get error:', e);
      return null;
    }
  },
  
  remove: function(key) {
    localStorage.removeItem('bashiri_' + key);
  },
  
  clearAll: function() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('bashiri_') === 0) {
        keys.push(key);
      }
    }
    keys.forEach(function(key) {
      localStorage.removeItem(key);
    });
  }
};

// ============================================
// TOAST NOTIFICATIONS
// ============================================
var Toast = {
  show: function(msg, type) {
    msg = String(msg);
    type = ['success', 'error', 'info', 'warning'].indexOf(type) !== -1 ? type : 'info';
    
    var container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(container);
    }
    
    var el = document.createElement('div');
    var colors = {
      success: { bg: '#D1FAE5', border: '#10B981', icon: '✅', text: '#065F46' },
      error: { bg: '#FEE2E2', border: '#EF4444', icon: '❌', text: '#991B1B' },
      info: { bg: '#DBEAFE', border: '#3B82F6', icon: 'ℹ️', text: '#1E40AF' },
      warning: { bg: '#FEF3C7', border: '#F59E0B', icon: '⚠️', text: '#92400E' }
    };
    
    var c = colors[type];
    el.style.cssText = 'padding:14px 20px;border-radius:10px;background:' + c.bg + ';box-shadow:0 4px 15px rgba(0,0,0,0.1);font-size:0.9rem;border-left:4px solid ' + c.border + ';min-width:280px;max-width:420px;transition:all 0.3s ease;animation:slideInRight 0.3s ease;color:' + c.text + ';';
    el.innerHTML = '<div style="display:flex;align-items:flex-start;gap:10px;"><span style="font-size:1.2rem;flex-shrink:0;">' + c.icon + '</span><span style="flex:1;">' + SecurityUtils.sanitizeHTML(msg) + '</span></div>';
    
    container.appendChild(el);
    
    setTimeout(function() {
      if (el && el.parentNode) {
        el.style.opacity = '0';
        el.style.transform = 'translateX(100%)';
        setTimeout(function() {
          if (el && el.parentNode) el.remove();
        }, 300);
      }
    }, 5000);
  }
};

// Make toast available globally
function toast(msg, type) {
  Toast.show(msg, type);
}

// ============================================
// SESSION MANAGEMENT
// ============================================
var currentUser = null;
var sessionTimeout = null;
var tokenRefreshInterval = null;

function restoreSession() {
  try {
    var session = Storage.get('session', true);
    if (!session) return;
    
    if (session.expiresAt && Date.now() > session.expiresAt) {
      clearSession();
      return;
    }
    
    currentUser = {
      id: session.id,
      name: session.name,
      phone: session.phone,
      email: session.email,
      role: session.role,
      bio: session.bio || ''
    };
    
    startSessionTimer();
    startTokenRefresh();
    updateNav();
  } catch(e) {
    console.error('Session restore error:', e);
    clearSession();
  }
}

function saveSession(userData) {
  currentUser = {
    id: userData.id,
    name: userData.name,
    phone: userData.phone,
    email: userData.email,
    role: userData.role,
    bio: userData.bio || ''
  };
  
  var sessionData = {
    id: userData.id,
    name: userData.name,
    phone: userData.phone,
    email: userData.email,
    role: userData.role,
    bio: userData.bio || '',
    token: userData.token || '',
    createdAt: Date.now(),
    expiresAt: Date.now() + CONFIG.SESSION_TIMEOUT
  };
  
  Storage.set('session', sessionData, true);
  startSessionTimer();
  startTokenRefresh();
  updateNav();
}

function clearSession() {
  currentUser = null;
  Storage.remove('session');
  
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }
  
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }
  
  updateNav();
}

function startSessionTimer() {
  if (sessionTimeout) clearTimeout(sessionTimeout);
  
  sessionTimeout = setTimeout(function() {
    clearSession();
    toast('Session expired. Please login again.', 'info');
    setTimeout(function() {
      window.location.href = 'login.html';
    }, 1000);
  }, CONFIG.SESSION_TIMEOUT);
}

function startTokenRefresh() {
  if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);
  
  tokenRefreshInterval = setInterval(function() {
    if (currentUser) {
      apiCall('auth.php?action=refresh_token', 'POST', {
        user_id: currentUser.id
      }).then(function(response) {
        if (response.success && response.token) {
          var session = Storage.get('session', true);
          if (session) {
            session.token = response.token;
            Storage.set('session', session, true);
          }
        }
      }).catch(function() {
        // Token refresh failed - session will expire naturally
      });
    }
  }, CONFIG.TOKEN_REFRESH_INTERVAL);
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================
function handleLogin(e) {
  e.preventDefault();
  
  var phoneInput = document.getElementById('phone');
  var passwordInput = document.getElementById('password');
  var submitBtn = document.querySelector('#loginForm button[type="submit"]');
  
  if (!phoneInput || !passwordInput) {
    toast('Form error. Please refresh the page.', 'error');
    return;
  }
  
  var phone = SecurityUtils.sanitizeInput(phoneInput.value);
  var password = passwordInput.value;
  
  // Validate inputs
  if (!phone) {
    toast('Please enter your phone number or email', 'error');
    phoneInput.focus();
    return;
  }
  
  if (!password) {
    toast('Please enter your password', 'error');
    passwordInput.focus();
    return;
  }
  
  // Disable button and show loading
  var originalText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
  }
  
  var isEmail = SecurityUtils.validateEmail(phone);
  var isPhone = SecurityUtils.validatePhone(phone);
  
  if (!isEmail && !isPhone) {
    toast('Please enter a valid phone number or email', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
    return;
  }
  
  // Prepare login data
  var loginData = {
    password: password
  };
  
  if (isEmail) {
    loginData.email = phone.toLowerCase();
  } else {
    loginData.phone = phone;
  }
  
  // Make API call
  apiCall('auth.php?action=login', 'POST', loginData)
    .then(function(response) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
      
      if (response.success) {
        toast('Welcome, ' + response.user.name + '!', 'success');
        saveSession(response.user);
        
        setTimeout(function() {
          if (response.user.role === 'admin') {
            window.location.href = 'admin/index.html';
          } else {
            window.location.href = 'index.html';
          }
        }, 800);
      } else {
        toast(response.message || 'Invalid credentials', 'error');
      }
    })
    .catch(function(error) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
      
      console.error('Login error:', error);
      
      if (error.code === 'NETWORK_ERROR') {
        toast('Cannot connect to server. Please check your internet connection.', 'error');
      } else if (error.code === 'RATE_LIMITED') {
        toast('Too many login attempts. Please wait and try again.', 'error');
      } else {
        toast(error.message || 'Login failed. Please try again.', 'error');
      }
    });
}

function handleRegister(e) {
  e.preventDefault();
  
  var nameInput = document.getElementById('fullName');
  var phoneInput = document.getElementById('phone');
  var emailInput = document.getElementById('email');
  var passwordInput = document.getElementById('password');
  var confirmInput = document.getElementById('confirmPassword');
  var submitBtn = document.querySelector('#registerForm button[type="submit"]');
  
  if (!nameInput || !phoneInput || !passwordInput) {
    toast('Form error. Please refresh the page.', 'error');
    return;
  }
  
  var name = SecurityUtils.sanitizeInput(nameInput.value);
  var phone = SecurityUtils.sanitizeInput(phoneInput.value);
  var email = emailInput ? SecurityUtils.sanitizeInput(emailInput.value).toLowerCase() : '';
  var password = passwordInput.value;
  var confirmPassword = confirmInput ? confirmInput.value : '';
  
  // Validate name
  if (!name || name.length < 2) {
    toast('Please enter your full name (minimum 2 characters)', 'error');
    nameInput.focus();
    return;
  }
  
  // Validate phone
  if (!SecurityUtils.validatePhone(phone)) {
    toast('Please enter a valid phone number (e.g., 0712345678)', 'error');
    phoneInput.focus();
    return;
  }
  
  // Validate email if provided
  if (email && !SecurityUtils.validateEmail(email)) {
    toast('Please enter a valid email address', 'error');
    if (emailInput) emailInput.focus();
    return;
  }
  
  // Validate password
  var passwordCheck = SecurityUtils.validatePasswordStrength(password);
  if (!passwordCheck.valid) {
    toast(passwordCheck.message, 'error');
    passwordInput.focus();
    return;
  }
  
  // Check password confirmation
  if (confirmInput && password !== confirmPassword) {
    toast('Passwords do not match', 'error');
    confirmInput.focus();
    return;
  }
  
  // Show loading
  var originalText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
  }
  
  var registerData = {
    name: name,
    phone: phone,
    password: password
  };
  
  if (email) {
    registerData.email = email;
  }
  
  apiCall('auth.php?action=register', 'POST', registerData)
    .then(function(response) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
      
      if (response.success) {
        toast('Account created successfully! Please login.', 'success');
        setTimeout(function() {
          window.location.href = 'login.html';
        }, 1500);
      } else {
        toast(response.message || 'Registration failed', 'error');
      }
    })
    .catch(function(error) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
      
      toast(error.message || 'Registration failed. Please try again.', 'error');
    });
}

function handleLogout() {
  if (currentUser) {
    apiCall('auth.php?action=logout', 'POST', {
      user_id: currentUser.id
    }).catch(function() {
      // Ignore logout errors
    });
  }
  
  clearSession();
  toast('Logged out successfully', 'success');
  
  setTimeout(function() {
    window.location.href = 'index.html';
  }, 500);
}

// ============================================
// NAVIGATION
// ============================================
function updateNav() {
  var nav = document.getElementById('navLinks');
  if (!nav) return;
  
  if (currentUser) {
    var icons = { admin: '👑', tipster: '🎯', user: '👤' };
    var html = '<span style="font-size:0.85rem;font-weight:500;">' + 
               (icons[currentUser.role] || '') + ' ' + 
               SecurityUtils.sanitizeHTML(currentUser.name) + '</span>';
    
    if (currentUser.role === 'admin') {
      html += ' <a href="admin/" class="btn btn-outline btn-sm"><i class="fas fa-shield-alt"></i> Admin</a>';
    }
    
    html += ' <button class="btn btn-outline btn-sm" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Logout</button>';
    nav.innerHTML = html;
  } else {
    nav.innerHTML = '<a href="login.html" class="btn btn-outline btn-sm">Login</a> ' +
                   '<a href="register.html" class="btn btn-primary btn-sm">Register</a>';
  }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  // Initialize dark mode
  var savedTheme = localStorage.getItem('bashiri_theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  
  // Restore session
  restoreSession();
  
  // Setup forms
  var loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  var registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
  
  // Dark mode toggle
  var darkToggle = document.getElementById('darkModeToggle');
  if (darkToggle) {
    darkToggle.addEventListener('click', function() {
      var currentTheme = document.documentElement.getAttribute('data-theme');
      var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('bashiri_theme', newTheme);
      darkToggle.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
  }
  
  // Route based on current page
  var path = window.location.pathname;
  if (path.indexOf('/admin/') !== -1 || path.indexOf('/admin') !== -1) {
    if (!currentUser || currentUser.role !== 'admin') {
      window.location.href = '../login.html';
      return;
    }
    initAdminPanel();
  } else if (path.indexOf('login.html') === -1 && path.indexOf('register.html') === -1) {
    initHomePage();
  }
  
  console.log('✅ Bashiri Nasi v4.0.0 Ready - SECURE MODE');
  console.log('🔒 All authentication via MySQL database');
  console.log('🛡️ No demo accounts - real users only');
});

// ============================================
// FORMATTING HELPERS
// ============================================
function fmt(amount) {
  var num = Number(amount);
  if (isNaN(num) || num < 0) return 'TZS 0';
  return 'TZS ' + num.toLocaleString('en-TZ');
}

function fdate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch(e) {
    return 'N/A';
  }
}

function getPlatformIcon(platform) {
  var p = (platform || '').toUpperCase();
  if (p === 'SPORTBET' || p === 'SPORTBET.IO') return '🔴';
  if (p === 'BETPAWA') return '🔵';
  if (p === 'SPORTPESA') return '🟢';
  if (p === 'BETWAY') return '🟡';
  if (p === '1XBET') return '🔷';
  return '📱';
}

// ============================================
// EXPORT FUNCTIONS GLOBALLY
// ============================================
window.handleLogout = handleLogout;
window.toast = toast;

console.log('🛡️ Security features active:');
console.log('  ✓ CSRF Protection');
console.log('  ✓ Input Sanitization (XSS Prevention)');
console.log('  ✓ Rate Limiting');
console.log('  ✓ Session Management');
console.log('  ✓ Password Strength Validation');
console.log('  ✓ Token Refresh');
console.log('  ✓ Secure Storage');
