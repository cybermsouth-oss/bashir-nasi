// ============================================
// BASHIRI NASI - COMPLETE APPLICATION v3.0.1
// FULLY FIXED - ALL DATA TO MYSQL
// LOGIN ERROR FIXED - PROPER API HANDLING
// ============================================

'use strict';

// ============================================
// CONFIGURATION
// ============================================
var CONFIG = {
  DB_MODE: 'api',
  API_BASE_URL: 'http://localhost/bashiri-nasi/api/',
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_TIME: 60 * 60 * 1000, // 1 hour
  MAX_PASSWORD_LENGTH: 128,
  MIN_PASSWORD_LENGTH: 6,
  INPUT_MAX_LENGTH: 200,
  API_TIMEOUT: 15000 // 15 seconds timeout
};

// ============================================
// API CALLER FUNCTION - FULLY FIXED
// ============================================
function apiCall(endpoint, method, data) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        var url = CONFIG.API_BASE_URL + endpoint;
        
        // Build GET parameters
        if (method === 'GET' && data) {
            var params = [];
            for (var key in data) {
                if (data.hasOwnProperty(key) && data[key] !== null && data[key] !== undefined) {
                    params.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
                }
            }
            if (params.length > 0) {
                url += '?' + params.join('&');
            }
        }
        
        xhr.open(method, url, true);
        xhr.timeout = CONFIG.API_TIMEOUT;
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        // Add auth token if available
        var session = localStorage.getItem('bashiri_session');
        if (session) {
            try {
                var sessionData = JSON.parse(session);
                if (sessionData && sessionData.token) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + sessionData.token);
                }
            } catch(e) {
                console.error('Session parse error:', e);
            }
        }
        
        // Handle response
        xhr.onload = function() {
            try {
                if (xhr.status === 0) {
                    reject({ 
                        success: false, 
                        message: 'Network error. Please check your connection.' 
                    });
                    return;
                }
                
                var response = JSON.parse(xhr.responseText);
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(response);
                } else if (xhr.status === 401) {
                    // Unauthorized - clear session
                    clearSession();
                    reject({ 
                        success: false, 
                        message: 'Session expired. Please login again.',
                        unauthorized: true 
                    });
                } else if (xhr.status === 500) {
                    reject({ 
                        success: false, 
                        message: 'Server error. Please try again later.',
                        serverError: true 
                    });
                } else {
                    reject(response || { 
                        success: false, 
                        message: 'Server error (Status: ' + xhr.status + ')' 
                    });
                }
            } catch(e) {
                console.error('Response parse error:', e, xhr.responseText);
                reject({ 
                    success: false, 
                    message: 'Invalid server response. Please try again.' 
                });
            }
        };
        
        // Handle network errors
        xhr.onerror = function() {
            console.error('Network error for:', url);
            reject({ 
                success: false, 
                message: 'Network error. Please check your internet connection and try again.',
                networkError: true 
            });
        };
        
        // Handle timeout
        xhr.ontimeout = function() {
            console.error('Request timeout for:', url);
            reject({ 
                success: false, 
                message: 'Request timed out. Server might be slow. Please try again.',
                timeout: true 
            });
        };
        
        // Send request
        try {
            if (method === 'GET') {
                xhr.send();
            } else {
                xhr.send(JSON.stringify(data || {}));
            }
        } catch(e) {
            console.error('Send error:', e);
            reject({ 
                success: false, 
                message: 'Failed to send request. Please try again.' 
            });
        }
    });
}

// ============================================
// PASSWORD HASHING (Simple for demo, use bcrypt in production)
// ============================================
function hashPassword(password) {
    if (!password) return '';
    var h = '';
    for (var i = 0; i < password.length; i++) {
        h += String.fromCharCode(password.charCodeAt(i) + 7);
    }
    return h;
}

function verifyPassword(inputPassword, storedHash) {
    if (!inputPassword || !storedHash) return false;
    var h = '';
    for (var i = 0; i < inputPassword.length; i++) {
        h += String.fromCharCode(inputPassword.charCodeAt(i) + 7);
    }
    return h === storedHash;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================
function validatePhone(phone) {
    if (!phone) return false;
    phone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '255' + phone.substring(1);
    if (!phone.startsWith('255')) phone = '255' + phone;
    return /^255[67]\d{8}$/.test(phone);
}

function validateEmail(email) {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeInput(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim().substring(0, CONFIG.INPUT_MAX_LENGTH);
}

function escapeHTML(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// FORMATTING HELPERS
// ============================================
function fmt(n) {
    var a = Number(n);
    if (isNaN(a) || a < 0) return 'TZS 0';
    return 'TZS ' + a.toLocaleString('en-TZ');
}

function fdate(d) {
    if (!d) return 'N/A';
    try {
        return new Date(d).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch(e) {
        return 'N/A';
    }
}

function $(id) {
    return id ? document.getElementById(id) : null;
}

function getBadge(result) {
    if (result === 'won') return { class: 'badge-success', text: '🏆 WON' };
    if (result === 'lost') return { class: 'badge-danger', text: '❌ LOST' };
    return { class: 'badge-warning', text: '⏳ PENDING' };
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
// TOAST NOTIFICATION SYSTEM
// ============================================
function toast(msg, type) {
    msg = String(msg);
    type = ['success', 'error', 'info', 'warning'].indexOf(type) !== -1 ? type : 'info';
    
    var container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }
    
    // Remove old toasts if more than 3
    while (container.children.length >= 3) {
        var firstChild = container.firstChild;
        if (firstChild) {
            firstChild.style.opacity = '0';
            setTimeout(function(child) {
                if (child && child.parentNode) {
                    child.remove();
                }
            }, 300, firstChild);
        }
    }
    
    var el = document.createElement('div');
    var bc = type === 'error' ? '#EF4444' : 
             type === 'info' ? '#3B82F6' : 
             type === 'warning' ? '#F59E0B' : '#10B981';
    
    var icon = type === 'error' ? '❌' : 
               type === 'info' ? 'ℹ️' : 
               type === 'warning' ? '⚠️' : '✅';
    
    el.style.cssText = 'padding:12px 18px;border-radius:10px;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.15);margin-top:8px;font-size:0.9rem;border-left:4px solid ' + bc + ';min-width:250px;max-width:400px;transition:opacity 0.3s ease;display:flex;align-items:center;gap:10px;';
    el.innerHTML = '<span style="font-size:1.2rem;">' + icon + '</span><span>' + msg + '</span>';
    container.appendChild(el);
    
    // Remove after 4 seconds
    setTimeout(function() {
        if (el && el.parentNode) {
            el.style.opacity = '0';
            setTimeout(function() {
                if (el && el.parentNode) {
                    el.remove();
                }
            }, 300);
        }
    }, 4000);
}

// ============================================
// DARK MODE
// ============================================
function initDarkMode() {
    var saved = localStorage.getItem('bashiri_theme');
    var btn = document.getElementById('darkModeToggle');
    
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (btn) btn.innerHTML = '<i class="fas fa-sun"></i>';
    } else if (btn) {
        btn.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function toggleDarkMode() {
    var cur = document.documentElement.getAttribute('data-theme');
    var next = cur === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('bashiri_theme', next);
    
    var btn = document.getElementById('darkModeToggle');
    if (btn) {
        btn.innerHTML = next === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
}

// ============================================
// SESSION MANAGEMENT
// ============================================
var currentUser = null;
var sessionTimeout = null;

function restoreSession() {
    try {
        var s = localStorage.getItem('bashiri_session');
        if (!s) return;
        
        var session = JSON.parse(s);
        if (!session.id || !session.role) {
            clearSession();
            return;
        }
        
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
        
        resetSessionTimer();
    } catch(e) {
        console.error('Session restore error:', e);
        clearSession();
    }
}

function saveSession(user) {
    currentUser = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        bio: user.bio || ''
    };
    
    var sessionData = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        bio: user.bio || '',
        token: user.token || '',
        createdAt: Date.now(),
        expiresAt: Date.now() + CONFIG.SESSION_TIMEOUT
    };
    
    localStorage.setItem('bashiri_session', JSON.stringify(sessionData));
    resetSessionTimer();
}

function clearSession() {
    currentUser = null;
    localStorage.removeItem('bashiri_session');
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
    }
}

function resetSessionTimer() {
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
    }
    
    sessionTimeout = setTimeout(function() {
        clearSession();
        toast('Session expired. Please login again.', 'info');
        setTimeout(function() {
            window.location.href = 'index.html';
        }, 1000);
    }, CONFIG.SESSION_TIMEOUT);
}

// ============================================
// NAVIGATION UPDATES
// ============================================
function updateNav() {
    var nav = $('navLinks');
    if (!nav) return;
    
    if (currentUser) {
        var icons = {
            admin: '👑',
            tipster: '🎯',
            user: '👤'
        };
        
        var h = '<span style="font-size:0.85rem;font-weight:500;color:var(--text-primary);">' + 
                (icons[currentUser.role] || '') + ' ' + 
                escapeHTML(currentUser.name) + '</span>';
        
        // Admin panel link
        if (currentUser.role === 'admin') {
            h += ' <a href="admin/" class="btn btn-outline btn-sm"><i class="fas fa-shield-alt"></i> Admin</a>';
        }
        
        // Logout button
        h += ' <button class="btn btn-outline btn-sm" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>';
        
        nav.innerHTML = h;
    } else {
        nav.innerHTML = '<a href="login.html" class="btn btn-outline btn-sm">Login</a> ' +
                       '<a href="register.html" class="btn btn-primary btn-sm">Register</a>';
    }
}

function logout() {
    try {
        // Call logout API if available
        apiCall('auth.php?action=logout', 'POST', { 
            user_id: currentUser ? currentUser.id : null 
        }).catch(function() {
            // Ignore logout API errors
        });
    } catch(e) {
        console.error('Logout API error:', e);
    }
    
    clearSession();
    toast('Logged out successfully', 'success');
    
    setTimeout(function() {
        window.location.href = 'index.html';
    }, 500);
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    initDarkMode();
    restoreSession();
    routePage();
    
    // Add dark mode toggle click handler
    var darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) {
        darkToggle.addEventListener('click', toggleDarkMode);
    }
}

// ============================================
// PAGE ROUTING
// ============================================
function routePage() {
    updateNav();
    
    var path = window.location.pathname;
    
    if (path.indexOf('/admin/') !== -1 || path.indexOf('/admin') !== -1) {
        initAdmin();
    } else if (path.indexOf('login.html') !== -1 || path.indexOf('/login') !== -1) {
        setupLogin();
    } else if (path.indexOf('register.html') !== -1 || path.indexOf('/register') !== -1) {
        setupRegister();
    } else {
        setupHome();
    }
}

// ============================================
// LOGIN - FULLY FIXED
// ============================================
function setupLogin() {
    updateNav();
    
    var form = $('loginForm');
    if (!form) return;
    
    // Remove any existing submit handlers
    var newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get input values
        var phoneInput = $('phone');
        var passwordInput = $('password');
        
        if (!phoneInput || !passwordInput) {
            toast('Form elements not found. Please refresh the page.', 'error');
            return;
        }
        
        var phone = sanitizeInput(phoneInput.value).trim();
        var password = passwordInput.value;
        
        // Validation
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
        
        // Show loading state
        var submitBtn = newForm.querySelector('button[type="submit"]');
        var originalBtnText = '';
        if (submitBtn) {
            originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitBtn.disabled = true;
        }
        
        // Determine if input is email or phone
        var isEmail = phone.indexOf('@') !== -1;
        var requestData = {
            password: password
        };
        
        if (isEmail) {
            requestData.email = phone;
        } else {
            requestData.phone = phone;
        }
        
        // Make API call
        apiCall('auth.php?action=login', 'POST', requestData)
            .then(function(response) {
                // Reset button
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }
                
                if (response.success) {
                    toast('Welcome back, ' + escapeHTML(response.user.name) + '! 🎉', 'success');
                    
                    // Save session
                    saveSession(response.user);
                    
                    // Redirect based on role
                    setTimeout(function() {
                        if (response.user.role === 'admin') {
                            window.location.href = 'admin/index.html';
                        } else if (response.user.role === 'tipster') {
                            window.location.href = 'index.html#tipster';
                        } else {
                            window.location.href = 'index.html';
                        }
                    }, 800);
                } else {
                    toast(response.message || 'Invalid credentials. Please try again.', 'error');
                }
            })
            .catch(function(error) {
                // Reset button
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }
                
                console.error('Login error:', error);
                
                // Handle specific error cases
                if (error.networkError) {
                    toast('Cannot connect to server. Using demo mode...', 'warning');
                    // Fallback to demo login
                    handleDemoLogin(phone, password, submitBtn, originalBtnText);
                } else if (error.timeout) {
                    toast('Server is taking too long. Please try again.', 'error');
                } else if (error.unauthorized) {
                    toast('Invalid credentials. Please check your phone and password.', 'error');
                } else {
                    toast(error.message || 'Login failed. Please try again.', 'error');
                }
            });
    });
}

// ============================================
// DEMO LOGIN FALLBACK
// ============================================
function handleDemoLogin(phone, password, submitBtn, originalBtnText) {
    // Demo credentials
    var demoUsers = [
        { phone: 'admin@bashiri.com', email: 'admin@bashiri.com', password: 'admin123', role: 'admin', name: 'Administrator', id: 'demo-admin-001' },
        { phone: 'user@bashiri.com', email: 'user@bashiri.com', password: 'user123', role: 'user', name: 'Demo User', id: 'demo-user-001' },
        { phone: 'demo@bashiri.com', email: 'demo@bashiri.com', password: 'demo123', role: 'user', name: 'Demo Account', id: 'demo-user-002' },
        { phone: '255712345678', email: '', password: 'user123', role: 'user', name: 'Phone User', id: 'demo-user-003' }
    ];
    
    var isEmail = phone.indexOf('@') !== -1;
    var found = null;
    
    for (var i = 0; i < demoUsers.length; i++) {
        var match = isEmail ? 
            demoUsers[i].email.toLowerCase() === phone.toLowerCase() :
            demoUsers[i].phone === phone;
        
        if (match && demoUsers[i].password === password) {
            found = demoUsers[i];
            break;
        }
    }
    
    if (found) {
        toast('Demo login successful! Welcome ' + found.name, 'success');
        saveSession({
            id: found.id,
            name: found.name,
            phone: found.phone,
            email: found.email,
            role: found.role,
            bio: 'Demo Account',
            token: 'demo-token-' + Date.now()
        });
        
        setTimeout(function() {
            if (found.role === 'admin') {
                window.location.href = 'admin/index.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 800);
    } else {
        toast('Demo credentials:\nEmail: demo@bashiri.com\nPassword: demo123', 'info');
        if (submitBtn) {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    }
}

// ============================================
// REGISTER - FULLY FIXED
// ============================================
function setupRegister() {
    updateNav();
    
    var form = $('registerForm');
    if (!form) return;
    
    var newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var nameInput = $('fullName');
        var phoneInput = $('phone');
        var passwordInput = $('password');
        var confirmInput = $('confirmPassword');
        
        if (!nameInput || !phoneInput || !passwordInput) {
            toast('Form elements not found', 'error');
            return;
        }
        
        var name = sanitizeInput(nameInput.value).trim();
        var phone = sanitizeInput(phoneInput.value).trim();
        var password = passwordInput.value;
        var confirmPassword = confirmInput ? confirmInput.value : '';
        
        // Validation
        if (!name || name.length < 2) {
            toast('Please enter your full name (minimum 2 characters)', 'error');
            nameInput.focus();
            return;
        }
        
        if (!phone) {
            toast('Please enter your phone number or email', 'error');
            phoneInput.focus();
            return;
        }
        
        var isEmail = phone.indexOf('@') !== -1;
        if (isEmail && !validateEmail(phone)) {
            toast('Please enter a valid email address', 'error');
            phoneInput.focus();
            return;
        }
        
        if (!isEmail && !validatePhone(phone)) {
            toast('Please enter a valid Tanzanian phone number (e.g., 0712345678)', 'error');
            phoneInput.focus();
            return;
        }
        
        if (!password || password.length < 6) {
            toast('Password must be at least 6 characters', 'error');
            passwordInput.focus();
            return;
        }
        
        if (confirmInput && password !== confirmPassword) {
            toast('Passwords do not match', 'error');
            confirmInput.focus();
            return;
        }
        
        // Show loading
        var submitBtn = newForm.querySelector('button[type="submit"]');
        var originalBtnText = '';
        if (submitBtn) {
            originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
            submitBtn.disabled = true;
        }
        
        // Prepare request
        var requestData = {
            name: name,
            password: password
        };
        
        if (isEmail) {
            requestData.email = phone;
        } else {
            requestData.phone = phone;
        }
        
        apiCall('auth.php?action=register', 'POST', requestData)
            .then(function(response) {
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
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
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }
                
                console.error('Registration error:', error);
                
                if (error.networkError) {
                    toast('Cannot connect to server. Your MySQL API must be running.\n\nDemo: Use demo@bashiri.com / demo123 to login', 'info');
                } else {
                    toast(error.message || 'Registration failed. Please try again.', 'error');
                }
            });
    });
}

// ============================================
// HOME PAGE SETUP
// ============================================
function setupHome() {
    showDashboard();
    
    // Load tips
    apiCall('tips.php?action=all', 'GET')
        .then(function(response) {
            if (response.success) {
                var tips = response.data || [];
                var won = tips.filter(function(t) { return t.result === 'won'; }).length;
                var lost = tips.filter(function(t) { return t.result === 'lost'; }).length;
                var total = tips.length;
                var winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;
                
                setStats(won, lost, total, winRate);
                loadRecentTips(tips);
            } else {
                setStats(0, 0, 0, 0);
                loadRecentTips([]);
            }
        })
        .catch(function(error) {
            console.error('Error loading tips:', error);
            setStats(0, 0, 0, 0);
            loadRecentTips([]);
        });
}

function setStats(won, lost, total, winRate) {
    var elements = {
        'wonCount': won,
        'lostCount': lost,
        'totalBets': total,
        'winRate': winRate + '%'
    };
    
    for (var id in elements) {
        var el = $(id);
        if (el) {
            el.textContent = elements[id];
        }
    }
}

function loadRecentTips(tips) {
    var container = $('recentBetSlips');
    if (!container) return;
    
    var recent = tips.slice(-6).reverse();
    
    if (recent.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--text-secondary);"><i class="fas fa-inbox" style="font-size:3rem;margin-bottom:16px;display:block;"></i><h4>No Tips Available Yet</h4><p>Check back later for betting tips from our experts.</p></div>';
        return;
    }
    
    var isLoggedIn = (currentUser !== null);
    var h = '';
    
    for (var i = 0; i < recent.length; i++) {
        var tip = recent[i];
        var platform = escapeHTML((tip.platform || 'Unknown').toUpperCase());
        var badge = getBadge(tip.result);
        var icon = getPlatformIcon(tip.platform);
        var isPending = (tip.result === 'pending');
        var borderColor = isPending ? '#F59E0B' : (tip.result === 'won' ? '#10B981' : '#EF4444');
        var headerBg = isPending ? 
            'linear-gradient(135deg, #F59E0B, #D97706)' : 
            (tip.result === 'won' ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #DC2626, #991B1B)');
        
        h += '<div class="bet-slip-card" style="border-left:4px solid ' + borderColor + ';">';
        h += '<div class="bet-slip-header" style="background:' + headerBg + ';">';
        h += '<span>' + icon + ' ' + platform + '</span>';
        h += '<span class="badge ' + badge.class + '">' + badge.text + '</span>';
        h += '</div>';
        h += '<div class="bet-slip-body">';
        
        if (!isLoggedIn) {
            h += '<div class="bet-code">🔒 ●●●●●●●●</div>';
            h += '<a href="login.html" class="btn btn-primary btn-sm btn-block">Login to View Tips</a>';
        } else if (isPending) {
            h += '<div style="text-align:center;padding:15px;background:#FFFBEB;border-radius:10px;border:1px dashed #F59E0B;">';
            h += '<div style="font-size:0.8rem;color:#D97706;">Match Not Complete</div>';
            h += '<div style="font-size:1.5rem;font-weight:900;color:#F59E0B;">Odds: ' + (tip.odds || 'N/A') + '</div>';
            h += '<button class="btn btn-warning btn-sm" style="margin-top:8px;" onclick="buyTip(\'' + tip.id + '\',' + (tip.price || 0) + ')">';
            h += '🔓 Unlock ' + fmt(tip.price || 0) + '</button>';
            h += '</div>';
        } else {
            h += '<div class="bet-code" style="border:2px solid ' + borderColor + ';">';
            h += '🔓 ' + escapeHTML(tip.code || '●●●●●●●●');
            h += '</div>';
        }
        
        h += '<div style="display:flex;justify-content:space-between;margin-top:8px;">';
        h += '<span>Odds: <strong>' + (tip.odds || 'N/A') + '</strong></span>';
        h += '<span style="font-weight:700;color:#059669;">' + fmt(tip.price || 0) + '</span>';
        h += '</div>';
        
        h += '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">';
        h += escapeHTML(tip.tipster_name || 'Expert Tipster') + ' | ' + (tip.purchased || 0) + ' sold';
        h += '</div>';
        
        h += '</div></div>';
    }
    
    container.innerHTML = h;
}

function showDashboard() {
    var home = $('homepageContent');
    var user = $('userSection');
    var tipster = $('tipsterSection');
    
    if (!home || !user || !tipster) return;
    
    if (currentUser && currentUser.role === 'tipster') {
        home.style.display = 'none';
        user.style.display = 'none';
        tipster.style.display = 'block';
        
        var displayName = $('tipsterDisplayName');
        if (displayName) displayName.textContent = currentUser.name || 'Tipster';
        
        setupTipsterSidebar();
        loadTipsterDashboard();
    } else if (currentUser && currentUser.role === 'user') {
        home.style.display = 'none';
        tipster.style.display = 'none';
        user.style.display = 'block';
        
        var userName = $('userDisplayName');
        if (userName) userName.textContent = currentUser.name || 'Bettor';
        
        setupUserSidebar();
        loadUserDashboard();
    } else {
        home.style.display = 'block';
        user.style.display = 'none';
        tipster.style.display = 'none';
    }
}

// ============================================
// USER DASHBOARD FUNCTIONS
// ============================================
function setupUserSidebar() {
    var sidebarItems = document.querySelectorAll('[data-tab]');
    
    sidebarItems.forEach(function(item) {
        item.addEventListener('click', function() {
            var tab = this.getAttribute('data-tab');
            
            // Update active states
            sidebarItems.forEach(function(i) {
                i.classList.remove('active');
            });
            this.classList.add('active');
            
            // Hide all tab contents
            var tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(function(c) {
                c.style.display = 'none';
            });
            
            // Show selected tab
            var tabElement = $(tab + 'Tab');
            if (tabElement) {
                tabElement.style.display = 'block';
                loadUserTabContent(tab);
            }
        });
    });
}

function loadUserTabContent(tab) {
    switch(tab) {
        case 'overview':
            loadUserOverview();
            break;
        case 'tips':
            loadUserTipsTab();
            break;
        case 'tipsters':
            loadUserTipstersTab();
            break;
        case 'followed':
            loadUserFollowedTab();
            break;
        case 'purchases':
            loadUserPurchasesTab();
            break;
    }
}

function loadUserDashboard() {
    loadUserOverview();
}

function loadUserOverview() {
    if (!currentUser) return;
    
    // Load user purchases
    apiCall('purchases.php?user_id=' + currentUser.id, 'GET')
        .then(function(response) {
            var purchases = response.success ? (response.data || []) : [];
            var paidPurchases = purchases.filter(function(p) { 
                return p.status === 'paid'; 
            });
            
            var totalSpent = 0;
            for (var i = 0; i < paidPurchases.length; i++) {
                totalSpent += (paidPurchases[i].amount || 0);
            }
            
            // Load tips count
            apiCall('tips.php?action=all', 'GET')
                .then(function(tipResponse) {
                    var tips = tipResponse.success ? (tipResponse.data || []) : [];
                    var activeTips = tips.filter(function(t) { 
                        return t.status === 'active' || t.result === 'pending'; 
                    });
                    
                    var statsContainer = $('userStats');
                    if (statsContainer) {
                        statsContainer.innerHTML = 
                            '<div class="stat-card">' +
                            '<div class="stat-number">' + paidPurchases.length + '</div>' +
                            '<div class="stat-label">Tips Purchased</div>' +
                            '</div>' +
                            '<div class="stat-card">' +
                            '<div class="stat-number">' + fmt(totalSpent) + '</div>' +
                            '<div class="stat-label">Total Spent</div>' +
                            '</div>' +
                            '<div class="stat-card">' +
                            '<div class="stat-number">' + activeTips.length + '</div>' +
                            '<div class="stat-label">Available Tips</div>' +
                            '</div>' +
                            '<div class="stat-card">' +
                            '<div class="stat-number">' + (currentUser.bio || 'New') + '</div>' +
                            '<div class="stat-label">Member Status</div>' +
                            '</div>';
                    }
                })
                .catch(function() {
                    // Handle error silently
                });
        })
        .catch(function() {
            // Handle error silently
        });
}

function loadUserTipsTab() {
    if (!currentUser) return;
    
    var container = $('allAvailableTips');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading tips...</div>';
    
    apiCall('tips.php?action=all', 'GET')
        .then(function(response) {
            var tips = response.success ? (response.data || []) : [];
            var activeTips = tips.filter(function(t) { 
                return t.status === 'active' || t.result === 'pending'; 
            });
            
            if (activeTips.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">No tips available at the moment.</div>';
                return;
            }
            
            // Load purchases to check if already bought
            apiCall('purchases.php?user_id=' + currentUser.id, 'GET')
                .then(function(purchaseResponse) {
                    var purchases = purchaseResponse.success ? (purchaseResponse.data || []) : [];
                    var purchasedTipIds = purchases
                        .filter(function(p) { return p.status === 'paid'; })
                        .map(function(p) { return p.tip_id; });
                    
                    var h = '';
                    for (var i = 0; i < activeTips.length; i++) {
                        var tip = activeTips[i];
                        var bought = purchasedTipIds.indexOf(tip.id) !== -1;
                        
                        h += renderTipCard(tip, bought);
                    }
                    container.innerHTML = h;
                })
                .catch(function() {
                    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">Error loading tips. Please try again.</div>';
                });
        })
        .catch(function() {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">Error loading tips. Please try again.</div>';
        });
}

function renderTipCard(tip, bought) {
    var icon = getPlatformIcon(tip.platform);
    var badge = getBadge(tip.result);
    var isPending = (tip.result === 'pending');
    var borderColor = isPending ? '#F59E0B' : (tip.result === 'won' ? '#10B981' : '#EF4444');
    var headerBg = isPending ? 
        'linear-gradient(135deg, #F59E0B, #D97706)' : 
        (tip.result === 'won' ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #DC2626, #991B1B)');
    
    var h = '<div class="bet-slip-card" style="border-left:4px solid ' + borderColor + ';">';
    h += '<div class="bet-slip-header" style="background:' + headerBg + ';">';
    h += '<span>' + icon + ' ' + escapeHTML((tip.platform || 'Unknown').toUpperCase()) + '</span>';
    h += '<span class="badge ' + badge.class + '">' + badge.text + '</span>';
    h += '</div>';
    h += '<div class="bet-slip-body">';
    
    if (bought) {
        h += '<div class="bet-code" style="color:#059669;border:2px solid #10B981;">';
        h += '🔓 ' + escapeHTML(tip.code || '●●●●●●●●');
        h += '</div>';
    } else {
        h += '<div class="bet-code">🔒 ●●●●●●●●</div>';
    }
    
    h += '<div style="display:flex;justify-content:space-between;margin-top:8px;">';
    h += '<span>Odds: <strong>' + (tip.odds || 'N/A') + '</strong></span>';
    h += '<span style="font-weight:700;">' + fmt(tip.price || 0) + '</span>';
    h += '</div>';
    
    h += '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">';
    h += escapeHTML(tip.tipster_name || 'Expert') + ' | Sold: ' + (tip.purchased || 0);
    h += '</div>';
    
    if (!bought) {
        h += '<button class="btn btn-primary btn-block" style="margin-top:8px;" ';
        h += 'onclick="buyTip(\'' + tip.id + '\',' + (tip.price || 0) + ')">';
        h += '🔓 Unlock ' + fmt(tip.price || 0) + '</button>';
    } else {
        h += '<div style="margin-top:8px;padding:10px;background:var(--success-soft);border-radius:8px;text-align:center;color:var(--success);">';
        h += '✅ Already Purchased</div>';
    }
    
    h += '</div></div>';
    
    return h;
}

function loadUserTipstersTab() {
    if (!currentUser) return;
    
    var container = $('tipstersGrid');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:30px;">Loading tipsters...</div>';
    
    apiCall('users.php?role=tipster', 'GET')
        .then(function(response) {
            var tipsters = response.success ? (response.data || []) : [];
            
            if (tipsters.length === 0) {
                container.innerHTML = '<p style="text-align:center;padding:40px;">No tipsters available yet.</p>';
                return;
            }
            
            apiCall('tips.php?action=all', 'GET')
                .then(function(tipResponse) {
                    var tips = tipResponse.success ? (tipResponse.data || []) : [];
                    var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;">';
                    
                    for (var i = 0; i < tipsters.length; i++) {
                        var tp = tipsters[i];
                        var tipsterTips = tips.filter(function(t) { return t.tipster_id === tp.id; });
                        var won = tipsterTips.filter(function(t) { return t.result === 'won'; }).length;
                        var winRate = tipsterTips.length > 0 ? Math.round((won / tipsterTips.length) * 100) : 0;
                        
                        h += '<div class="card" style="text-align:center;">';
                        h += '<div style="width:60px;height:60px;background:var(--gradient-primary);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:1.5rem;font-weight:700;margin:0 auto 12px;">';
                        h += (tp.name || 'T').charAt(0).toUpperCase();
                        h += '</div>';
                        h += '<h4>' + escapeHTML(tp.name) + '</h4>';
                        h += '<p style="font-size:0.85rem;">' + escapeHTML(tp.bio || 'Professional Tipster') + '</p>';
                        h += '<div style="margin:8px 0;">' + tipsterTips.length + ' Tips | ' + winRate + '% Win Rate</div>';
                        h += '<button class="btn btn-outline btn-sm" onclick="followTipster(\'' + tp.id + '\')">';
                        h += '<i class="fas fa-star"></i> Follow</button>';
                        h += '</div>';
                    }
                    
                    h += '</div>';
                    container.innerHTML = h;
                });
        })
        .catch(function() {
            container.innerHTML = '<p style="text-align:center;">Error loading tipsters.</p>';
        });
}

function loadUserFollowedTab() {
    if (!currentUser) return;
    
    var container = $('followedTips');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:30px;">Loading...</div>';
    
    apiCall('follows.php?user_id=' + currentUser.id, 'GET')
        .then(function(followResponse) {
            var follows = followResponse.success ? (followResponse.data || []) : [];
            
            if (follows.length === 0) {
                container.innerHTML = '<p style="text-align:center;padding:40px;">You are not following any tipsters yet.</p>';
                return;
            }
            
            var followedIds = follows.map(function(f) { return f.tipster_id; });
            
            apiCall('tips.php?action=all', 'GET')
                .then(function(tipResponse) {
                    var tips = tipResponse.success ? (tipResponse.data || []) : [];
                    var followedTips = tips.filter(function(t) {
                        return followedIds.indexOf(t.tipster_id) !== -1;
                    });
                    
                    if (followedTips.length === 0) {
                        container.innerHTML = '<p style="text-align:center;padding:40px;">No tips from followed tipsters.</p>';
                        return;
                    }
                    
                    apiCall('purchases.php?user_id=' + currentUser.id, 'GET')
                        .then(function(purchaseResponse) {
                            var purchases = purchaseResponse.success ? (purchaseResponse.data || []) : [];
                            var purchasedIds = purchases
                                .filter(function(p) { return p.status === 'paid'; })
                                .map(function(p) { return p.tip_id; });
                            
                            var h = '';
                            for (var i = 0; i < followedTips.length; i++) {
                                var tip = followedTips[i];
                                var bought = purchasedIds.indexOf(tip.id) !== -1;
                                h += renderTipCard(tip, bought);
                            }
                            container.innerHTML = h;
                        });
                });
        })
        .catch(function() {
            container.innerHTML = '<p style="text-align:center;">Error loading followed tips.</p>';
        });
}

function loadUserPurchasesTab() {
    if (!currentUser) return;
    
    var container = $('myPurchases');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:30px;">Loading purchases...</div>';
    
    apiCall('purchases.php?user_id=' + currentUser.id, 'GET')
        .then(function(response) {
            var purchases = response.success ? (response.data || []) : [];
            var paidPurchases = purchases.filter(function(p) { return p.status === 'paid'; });
            
            if (paidPurchases.length === 0) {
                container.innerHTML = '<p style="text-align:center;padding:40px;">No purchases yet.</p>';
                return;
            }
            
            apiCall('tips.php?action=all', 'GET')
                .then(function(tipResponse) {
                    var tips = tipResponse.success ? (tipResponse.data || []) : [];
                    var h = '';
                    
                    for (var i = paidPurchases.length - 1; i >= 0; i--) {
                        var purchase = paidPurchases[i];
                        var tip = tips.find(function(t) { return t.id === purchase.tip_id; });
                        
                        if (tip) {
                            h += '<div class="bet-slip-card" style="border-left:4px solid #10B981;">';
                            h += '<div class="bet-slip-header" style="background:var(--gradient-primary);">';
                            h += '<span>' + getPlatformIcon(tip.platform) + ' ' + escapeHTML((tip.platform || 'Unknown').toUpperCase()) + '</span>';
                            h += '<span class="badge badge-success">✅ PURCHASED</span>';
                            h += '</div>';
                            h += '<div class="bet-slip-body">';
                            h += '<div class="bet-code" style="color:#059669;border:2px solid #10B981;">';
                            h += '🔓 ' + escapeHTML(tip.code || '●●●●●●●●');
                            h += '</div>';
                            h += '<div style="display:flex;justify-content:space-between;margin-top:8px;">';
                            h += '<span>Odds: ' + (tip.odds || 'N/A') + '</span>';
                            h += '<span>' + fmt(purchase.amount) + '</span>';
                            h += '</div>';
                            h += '</div></div>';
                        }
                    }
                    
                    container.innerHTML = h || '<p style="text-align:center;">No purchases found.</p>';
                });
        })
        .catch(function() {
            container.innerHTML = '<p style="text-align:center;">Error loading purchases.</p>';
        });
}

// ============================================
// BUY TIP FUNCTION
// ============================================
function buyTip(tipId, amount) {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    if (!confirm('Purchase this tip for ' + fmt(amount) + '?')) {
        return;
    }
    
    apiCall('purchases.php', 'POST', {
        user_id: currentUser.id,
        tip_id: tipId,
        amount: amount
    })
    .then(function(response) {
        if (response.success) {
            toast('✅ Tip unlocked successfully!', 'success');
            
            // Refresh current view
            if (currentUser.role === 'user') {
                loadUserTipsTab();
                loadUserPurchasesTab();
                loadUserOverview();
            }
            
            // Reload page after short delay
            setTimeout(function() {
                location.reload();
            }, 1500);
        } else {
            toast(response.message || 'Purchase failed', 'error');
        }
    })
    .catch(function(error) {
        toast('Purchase failed. Please try again.', 'error');
        console.error('Buy tip error:', error);
    });
}

// ============================================
// FOLLOW TIPSTER
// ============================================
function followTipster(tipsterId) {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    apiCall('follows.php', 'POST', {
        user_id: currentUser.id,
        tipster_id: tipsterId
    })
    .then(function(response) {
        if (response.success) {
            toast('✅ Now following this tipster!', 'success');
        } else {
            toast(response.message || 'Already following', 'info');
        }
    })
    .catch(function() {
        toast('Error following tipster', 'error');
    });
}

// ============================================
// TIPSTER DASHBOARD
// ============================================
function setupTipsterSidebar() {
    var sidebarItems = document.querySelectorAll('[data-tab-tipster]');
    
    sidebarItems.forEach(function(item) {
        item.addEventListener('click', function() {
            var tab = this.getAttribute('data-tab-tipster');
            
            sidebarItems.forEach(function(i) {
                i.classList.remove('active');
            });
            this.classList.add('active');
            
            var tabContents = document.querySelectorAll('.tipster-tab-content');
            tabContents.forEach(function(c) {
                c.style.display = 'none';
            });
            
            var tabId = 'tipster' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Tab';
            var tabElement = $(tabId);
            if (tabElement) {
                tabElement.style.display = 'block';
                loadTipsterTabContent(tab);
            }
        });
    });
    
    // Show overview by default
    var overview = $('tipsterOverviewTab');
    if (overview) overview.style.display = 'block';
}

function loadTipsterTabContent(tab) {
    switch(tab) {
        case 'overview':
            loadTipsterOverview();
            break;
        case 'upload':
            setupTipsterUploadForm();
            break;
        case 'mytips':
            loadTipsterMyTips();
            break;
        case 'sales':
            loadTipsterSales();
            break;
    }
}

function loadTipsterDashboard() {
    loadTipsterOverview();
}

function loadTipsterOverview() {
    if (!currentUser) return;
    
    // Update tipster info card
    var infoCard = $('tipsterInfoCard');
    if (infoCard) {
        infoCard.innerHTML = 
            '<div style="display:flex;align-items:center;gap:16px;">' +
            '<div style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:1.8rem;">' +
            (currentUser.name || 'T').charAt(0).toUpperCase() +
            '</div>' +
            '<div>' +
            '<h2 style="color:white;margin:0;">' + escapeHTML(currentUser.name) + '</h2>' +
            '<p style="color:rgba(255,255,255,0.8);margin:0;">' + escapeHTML(currentUser.bio || 'Professional Tipster') + '</p>' +
            '</div></div>';
    }
    
    // Load tipster stats
    apiCall('tips.php?action=tipster&tipster_id=' + currentUser.id, 'GET')
        .then(function(response) {
            var myTips = response.success ? (response.data || []) : [];
            
            var totalSold = 0;
            var totalRevenue = 0;
            for (var i = 0; i < myTips.length; i++) {
                totalSold += (myTips[i].purchased || 0);
                totalRevenue += (myTips[i].purchased || 0) * (myTips[i].price || 0);
            }
            
            var won = myTips.filter(function(t) { return t.result === 'won'; }).length;
            var lost = myTips.filter(function(t) { return t.result === 'lost'; }).length;
            var winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;
            
            var statsContainer = $('tipsterStats');
            if (statsContainer) {
                statsContainer.innerHTML = 
                    '<div class="stat-card"><div class="stat-number">' + myTips.length + '</div><div class="stat-label">My Tips</div></div>' +
                    '<div class="stat-card"><div class="stat-number">' + totalSold + '</div><div class="stat-label">Total Sold</div></div>' +
                    '<div class="stat-card"><div class="stat-number">' + fmt(totalRevenue) + '</div><div class="stat-label">Revenue</div></div>' +
                    '<div class="stat-card"><div class="stat-number">' + winRate + '%</div><div class="stat-label">Win Rate</div></div>';
            }
        })
        .catch(function(error) {
            console.error('Error loading tipster overview:', error);
        });
}

function setupTipsterUploadForm() {
    var form = $('uploadTipForm');
    if (!form) return;
    
    var newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var platform = sanitizeInput($('tipPlatform').value);
        var code = sanitizeInput($('tipCode').value);
        var odds = parseFloat($('tipOdds').value);
        var price = parseInt($('tipPrice').value);
        
        if (!platform) {
            toast('Please select a platform', 'error');
            return;
        }
        
        if (!code || code.length < 3) {
            toast('Please enter a valid bet code', 'error');
            return;
        }
        
        if (!odds || odds <= 1) {
            toast('Odds must be greater than 1.00', 'error');
            return;
        }
        
        if (!price || price < 1000) {
            toast('Minimum price is TZS 1,000', 'error');
            return;
        }
        
        var submitBtn = newForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        }
        
        apiCall('tips.php', 'POST', {
            tipster_id: currentUser.id,
            platform: platform,
            bet_code: code,
            odds: odds,
            price: price,
            result: 'pending'
        })
        .then(function(response) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Upload Tip';
            }
            
            if (response.success) {
                toast('✅ Tip uploaded successfully!', 'success');
                
                // Reset form
                $('tipPlatform').value = '';
                $('tipCode').value = '';
                $('tipOdds').value = '';
                $('tipPrice').value = '';
                
                // Refresh data
                loadTipsterOverview();
                loadTipsterMyTips();
            } else {
                toast(response.message || 'Upload failed', 'error');
            }
        })
        .catch(function(error) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Upload Tip';
            }
            
            toast('Upload failed. Please try again.', 'error');
            console.error('Upload error:', error);
        });
    });
}

function loadTipsterMyTips() {
    if (!currentUser) return;
    
    var container = $('myTipsList');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:30px;">Loading your tips...</div>';
    
    apiCall('tips.php?action=tipster&tipster_id=' + currentUser.id, 'GET')
        .then(function(response) {
            var myTips = response.success ? (response.data || []) : [];
            
            if (myTips.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:40px;">You haven\'t uploaded any tips yet.</div>';
                return;
            }
            
            myTips.reverse();
            var h = '';
            
            for (var i = 0; i < myTips.length; i++) {
                var tip = myTips[i];
                var isPending = tip.result === 'pending';
                var borderColor = isPending ? '#F59E0B' : (tip.result === 'won' ? '#10B981' : '#EF4444');
                var headerBg = isPending ? 
                    'linear-gradient(135deg, #F59E0B, #D97706)' : 
                    (tip.result === 'won' ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #DC2626, #991B1B)');
                var badge = getBadge(tip.result);
                
                h += '<div class="bet-slip-card" style="border-left:4px solid ' + borderColor + ';">';
                h += '<div class="bet-slip-header" style="background:' + headerBg + ';">';
                h += '<span>' + getPlatformIcon(tip.platform) + ' ' + escapeHTML((tip.platform || '').toUpperCase()) + '</span>';
                h += '<span class="badge ' + badge.class + '">' + badge.text + '</span>';
                h += '</div>';
                h += '<div class="bet-slip-body">';
                h += '<div class="bet-code">' + escapeHTML(tip.code || 'N/A') + '</div>';
                h += '<div style="display:flex;justify-content:space-between;margin-top:8px;">';
                h += '<span>Odds: ' + (tip.odds || 'N/A') + '</span>';
                h += '<span>Price: ' + fmt(tip.price || 0) + '</span>';
                h += '</div>';
                h += '<div style="font-size:0.75rem;color:var(--text-muted);">Sold: ' + (tip.purchased || 0) + '</div>';
                
                if (isPending) {
                    h += '<div style="margin-top:10px;display:flex;gap:8px;">';
                    h += '<button class="btn btn-success btn-sm" style="flex:1;" onclick="updateTipResult(\'' + tip.id + '\',\'won\')">🏆 Won</button>';
                    h += '<button class="btn btn-danger btn-sm" style="flex:1;" onclick="updateTipResult(\'' + tip.id + '\',\'lost\')">❌ Lost</button>';
                    h += '</div>';
                } else {
                    var resultBg = tip.result === 'won' ? '#D1FAE5' : '#FEE2E2';
                    var resultText = tip.result === 'won' ? '✅ Won' : '❌ Lost';
                    h += '<div style="margin-top:10px;padding:8px;background:' + resultBg + ';border-radius:6px;text-align:center;">' + resultText + '</div>';
                }
                
                h += '</div></div>';
            }
            
            container.innerHTML = h;
        })
        .catch(function() {
            container.innerHTML = '<p style="text-align:center;">Error loading tips.</p>';
        });
}

function updateTipResult(tipId, newResult) {
    if (!currentUser || currentUser.role !== 'tipster') {
        toast('Unauthorized', 'error');
        return;
    }
    
    if (!confirm('Update result to ' + newResult.toUpperCase() + '?')) {
        return;
    }
    
    apiCall('tips.php', 'PUT', {
        tip_id: tipId,
        result: newResult
    })
    .then(function(response) {
        if (response.success) {
            toast('✅ Result updated!', 'success');
            loadTipsterOverview();
            loadTipsterMyTips();
        } else {
            toast(response.message || 'Update failed', 'error');
        }
    })
    .catch(function() {
        toast('Update failed. Please try again.', 'error');
    });
}

function loadTipsterSales() {
    if (!currentUser) return;
    
    var container = $('salesHistory');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:30px;">Loading sales...</div>';
    
    apiCall('tips.php?action=tipster&tipster_id=' + currentUser.id, 'GET')
        .then(function(tipResponse) {
            var myTips = tipResponse.success ? (tipResponse.data || []) : [];
            var myTipIds = myTips.map(function(t) { return t.id; });
            
            apiCall('purchases.php', 'GET')
                .then(function(purchaseResponse) {
                    var allPurchases = purchaseResponse.success ? (purchaseResponse.data || []) : [];
                    var mySales = allPurchases.filter(function(p) {
                        return myTipIds.indexOf(p.tip_id) !== -1 && p.status === 'paid';
                    });
                    
                    if (mySales.length === 0) {
                        container.innerHTML = '<p style="text-align:center;padding:40px;">No sales yet.</p>';
                        return;
                    }
                    
                    var totalRevenue = 0;
                    for (var i = 0; i < mySales.length; i++) {
                        totalRevenue += (mySales[i].amount || 0);
                    }
                    
                    var h = '<div style="text-align:center;padding:16px;background:var(--primary-soft);border-radius:12px;margin-bottom:16px;">';
                    h += '<div style="font-size:2rem;font-weight:800;color:var(--primary-dark);">' + fmt(totalRevenue) + '</div>';
                    h += '<div style="font-size:0.9rem;color:var(--text-secondary);">Total from ' + mySales.length + ' sales</div>';
                    h += '</div>';
                    
                    apiCall('users.php', 'GET')
                        .then(function(userResponse) {
                            var users = userResponse.success ? (userResponse.data || []) : [];
                            
                            for (var s = 0; s < mySales.length; s++) {
                                var sale = mySales[s];
                                var buyer = users.find(function(u) { return u.id === sale.user_id; });
                                var buyerName = buyer ? (buyer.name || buyer.phone) : 'Unknown';
                                
                                var tip = myTips.find(function(t) { return t.id === sale.tip_id; });
                                
                                h += '<div class="card" style="padding:12px;margin-bottom:8px;">';
                                h += '<div style="display:flex;justify-content:space-between;align-items:center;">';
                                h += '<div>';
                                h += '<div style="font-weight:600;">' + escapeHTML(buyerName) + '</div>';
                                h += '<div style="font-size:0.75rem;color:var(--text-muted);">' + escapeHTML(tip ? (tip.code || 'N/A') : 'N/A') + '</div>';
                                h += '<div style="font-size:0.7rem;color:var(--text-muted);">' + fdate(sale.paid_at || sale.created_at) + '</div>';
                                h += '</div>';
                                h += '<div style="font-weight:700;color:var(--success);font-size:1.1rem;">' + fmt(sale.amount) + '</div>';
                                h += '</div></div>';
                            }
                            
                            container.innerHTML = h;
                        });
                });
        })
        .catch(function() {
            container.innerHTML = '<p style="text-align:center;">Error loading sales.</p>';
        });
}

// ============================================
// ADMIN FUNCTIONS
// ============================================
function initAdmin() {
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = '../login.html';
        return;
    }
    
    updateNav();
    
    var adminName = $('adminName');
    if (adminName) adminName.textContent = currentUser.name || 'Administrator';
    
    setupAdminSidebar();
    setupAddTipsterForm();
    loadAdminData();
}

function setupAdminSidebar() {
    var sidebarItems = document.querySelectorAll('[data-admin-tab]');
    
    sidebarItems.forEach(function(item) {
        item.addEventListener('click', function() {
            var tab = this.getAttribute('data-admin-tab');
            
            sidebarItems.forEach(function(i) {
                i.classList.remove('active');
            });
            this.classList.add('active');
            
            var tabContents = document.querySelectorAll('.admin-tab-content');
            tabContents.forEach(function(c) {
                c.style.display = 'none';
            });
            
            var tabId = 'admin' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Tab';
            var tabElement = $(tabId);
            if (tabElement) {
                tabElement.style.display = 'block';
                loadAdminTabData(tab);
            }
        });
    });
}

function loadAdminTabData(tab) {
    switch(tab) {
        case 'overview':
            loadOverviewData();
            loadRecentActivity();
            break;
        case 'users':
            loadUsersTable();
            break;
        case 'tipsters':
            loadTipstersTable();
            break;
        case 'tips':
            loadTipsTable();
            break;
        case 'transactions':
            loadTransactionsTable();
            break;
        case 'settings':
            loadSettingsData();
            break;
    }
}

function loadOverviewData() {
    Promise.all([
        apiCall('users.php', 'GET'),
        apiCall('tips.php?action=all', 'GET'),
        apiCall('purchases.php', 'GET')
    ]).then(function(results) {
        var users = results[0].success ? (results[0].data || []) : [];
        var tips = results[1].success ? (results[1].data || []) : [];
        var purchases = results[2].success ? (results[2].data || []) : [];
        
        var totalUsers = users.filter(function(u) { return u.role === 'user'; }).length;
        var totalTipsters = users.filter(function(u) { return u.role === 'tipster'; }).length;
        var paidPurchases = purchases.filter(function(p) { return p.status === 'paid'; });
        
        var totalRevenue = 0;
        for (var i = 0; i < paidPurchases.length; i++) {
            totalRevenue += (paidPurchases[i].amount || 0);
        }
        
        var pendingTips = tips.filter(function(t) { return t.result === 'pending'; }).length;
        
        var statsContainer = $('adminStats');
        if (statsContainer) {
            statsContainer.innerHTML = 
                '<div class="stat-card"><div class="stat-number">' + totalUsers + '</div><div class="stat-label">Users</div></div>' +
                '<div class="stat-card"><div class="stat-number">' + totalTipsters + '</div><div class="stat-label">Tipsters</div></div>' +
                '<div class="stat-card"><div class="stat-number">' + tips.length + '</div><div class="stat-label">Total Tips</div></div>' +
                '<div class="stat-card"><div class="stat-number">' + paidPurchases.length + '</div><div class="stat-label">Sales</div></div>' +
                '<div class="stat-card"><div class="stat-number">' + fmt(totalRevenue) + '</div><div class="stat-label">Revenue</div></div>' +
                '<div class="stat-card"><div class="stat-number">' + pendingTips + '</div><div class="stat-label">Pending</div></div>';
        }
        
        updateSidebarBadges();
    }).catch(function(error) {
        console.error('Error loading overview:', error);
    });
}

function loadRecentActivity() {
    var container = $('recentActivity');
    if (!container) return;
    
    Promise.all([
        apiCall('users.php', 'GET'),
        apiCall('tips.php?action=all', 'GET'),
        apiCall('purchases.php', 'GET')
    ]).then(function(results) {
        var users = results[0].success ? (results[0].data || []) : [];
        var tips = results[1].success ? (results[1].data || []) : [];
        var purchases = results[2].success ? (results[2].data || []) : [];
        
        var activities = [];
        
        // User registrations
        for (var i = 0; i < users.length; i++) {
            if (users[i].created_at) {
                activities.push({
                    icon: '👤',
                    text: '<strong>' + escapeHTML(users[i].name || 'User') + '</strong> registered (' + escapeHTML(users[i].role) + ')',
                    time: users[i].created_at
                });
            }
        }
        
        // Tips uploaded
        for (var j = 0; j < tips.length; j++) {
            if (tips[j].created_at) {
                activities.push({
                    icon: '📋',
                    text: 'New tip: <strong>' + escapeHTML(tips[j].code || 'N/A') + '</strong> - ' + escapeHTML(tips[j].platform || ''),
                    time: tips[j].created_at
                });
            }
        }
        
        // Purchases
        for (var k = 0; k < purchases.length; k++) {
            var buyer = users.find(function(u) { return u.id === purchases[k].user_id; });
            var buyerName = buyer ? (buyer.name || buyer.phone) : 'Unknown';
            
            activities.push({
                icon: '💰',
                text: '<strong>' + escapeHTML(buyerName) + '</strong> purchased tip for ' + fmt(purchases[k].amount),
                time: purchases[k].paid_at || purchases[k].created_at
            });
        }
        
        // Sort by time (newest first)
        activities.sort(function(a, b) {
            return new Date(b.time) - new Date(a.time);
        });
        
        // Show last 15
        var recent = activities.slice(0, 15);
        
        if (recent.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">No activity yet.</div>';
            return;
        }
        
        var h = '';
        for (var a = 0; a < recent.length; a++) {
            var act = recent[a];
            var timeAgo = getTimeAgo(act.time);
            
            h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color);">';
            h += '<span style="font-size:1.2rem;">' + act.icon + '</span>';
            h += '<span style="flex:1;font-size:0.85rem;">' + act.text + '</span>';
            h += '<span style="font-size:0.7rem;color:var(--text-muted);">' + timeAgo + '</span>';
            h += '</div>';
        }
        
        container.innerHTML = h;
    }).catch(function(error) {
        console.error('Error loading activities:', error);
        container.innerHTML = '<p>Error loading activities.</p>';
    });
}

function getTimeAgo(d) {
    if (!d) return '';
    var seconds = Math.floor((new Date() - new Date(d)) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    return Math.floor(seconds / 86400) + ' days ago';
}

function updateSidebarBadges() {
    Promise.all([
        apiCall('users.php', 'GET'),
        apiCall('tips.php?action=all', 'GET'),
        apiCall('purchases.php', 'GET')
    ]).then(function(results) {
        var users = results[0].success ? (results[0].data || []) : [];
        var tips = results[1].success ? (results[1].data || []) : [];
        var purchases = results[2].success ? (results[2].data || []) : [];
        
        var userCount = users.filter(function(u) { return u.role === 'user'; }).length;
        var tipsterCount = users.filter(function(u) { return u.role === 'tipster'; }).length;
        var paidPurchases = purchases.filter(function(p) { return p.status === 'paid'; });
        
        var badges = {
            'usersCountBadge': userCount,
            'tipstersCountBadge': tipsterCount,
            'tipsCountBadge': tips.length,
            'transactionsCountBadge': paidPurchases.length
        };
        
        for (var id in badges) {
            var el = $(id);
            if (el) {
                el.textContent = badges[id];
            }
        }
    }).catch(function(error) {
        console.error('Error updating badges:', error);
    });
}

function loadUsersTable() {
    apiCall('users.php', 'GET')
        .then(function(response) {
            var users = response.success ? (response.data || []) : [];
            var tbody = $('usersTableBody');
            if (!tbody) return;
            
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">No users found.</td></tr>';
                return;
            }
            
            var h = '';
            for (var i = 0; i < users.length; i++) {
                var u = users[i];
                var roleBadge = u.role === 'admin' ? 'badge-danger' : 
                               u.role === 'tipster' ? 'badge-info' : 'badge-primary';
                
                h += '<tr>';
                h += '<td>' + escapeHTML(u.name || 'N/A') + '</td>';
                h += '<td>' + escapeHTML(u.phone || u.email || 'N/A') + '</td>';
                h += '<td><span class="badge ' + roleBadge + '">' + escapeHTML(u.role) + '</span></td>';
                h += '<td>' + (u.is_active == 1 ? 'Active' : 'Inactive') + '</td>';
                h += '<td>' + fdate(u.created_at) + '</td>';
                h += '<td>' + (u.role !== 'admin' ? 
                    '<button class="btn-delete" onclick="removeUser(\'' + u.id + '\')"><i class="fas fa-trash"></i></button>' : 
                    '') + '</td>';
                h += '</tr>';
            }
            
            tbody.innerHTML = h;
        }).catch(function(error) {
            console.error('Error loading users:', error);
        });
}

function loadTipstersTable() {
    apiCall('users.php?role=tipster', 'GET')
        .then(function(response) {
            var tipsters = response.success ? (response.data || []) : [];
            var tbody = $('tipstersTableBody');
            if (!tbody) return;
            
            if (tipsters.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No tipsters found.</td></tr>';
                return;
            }
            
            apiCall('tips.php?action=all', 'GET')
                .then(function(tipResponse) {
                    var tips = tipResponse.success ? (tipResponse.data || []) : [];
                    var h = '';
                    
                    for (var i = 0; i < tipsters.length; i++) {
                        var tp = tipsters[i];
                        var tipsterTips = tips.filter(function(t) { return t.tipster_id === tp.id; });
                        var won = tipsterTips.filter(function(t) { return t.result === 'won'; }).length;
                        var sold = 0;
                        for (var s = 0; s < tipsterTips.length; s++) {
                            sold += (tipsterTips[s].purchased || 0);
                        }
                        var winRate = tipsterTips.length > 0 ? Math.round((won / tipsterTips.length) * 100) : 0;
                        
                        h += '<tr>';
                        h += '<td>' + escapeHTML(tp.name || 'N/A') + '</td>';
                        h += '<td>' + escapeHTML(tp.phone || 'N/A') + '</td>';
                        h += '<td>' + escapeHTML((tp.bio || '').substring(0, 50)) + '</td>';
                        h += '<td>' + tipsterTips.length + '</td>';
                        h += '<td>' + sold + '</td>';
                        h += '<td>' + winRate + '%</td>';
                        h += '<td><button class="btn-delete" onclick="removeUser(\'' + tp.id + '\')"><i class="fas fa-trash"></i></button></td>';
                        h += '</tr>';
                    }
                    
                    tbody.innerHTML = h;
                });
        }).catch(function(error) {
            console.error('Error loading tipsters:', error);
        });
}

function loadTipsTable() {
    apiCall('tips.php?action=all', 'GET')
        .then(function(response) {
            var tips = response.success ? (response.data || []) : [];
            var tbody = $('tipsTableBody');
            if (!tbody) return;
            
            if (tips.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">No tips found.</td></tr>';
                return;
            }
            
            var h = '';
            for (var i = tips.length - 1; i >= 0; i--) {
                var t = tips[i];
                var badge = getBadge(t.result);
                
                h += '<tr>';
                h += '<td>' + getPlatformIcon(t.platform) + ' ' + escapeHTML((t.platform || '').toUpperCase()) + '</td>';
                h += '<td><code>' + escapeHTML(t.code || 'N/A') + '</code></td>';
                h += '<td>' + (t.odds || 'N/A') + '</td>';
                h += '<td>' + fmt(t.price || 0) + '</td>';
                h += '<td>' + escapeHTML(t.tipster_name || 'N/A') + '</td>';
                h += '<td><span class="badge ' + badge.class + '">' + badge.text + '</span></td>';
                h += '<td>' + (t.purchased || 0) + '</td>';
                h += '<td>' + fdate(t.created_at) + '</td>';
                h += '</tr>';
            }
            
            tbody.innerHTML = h;
        }).catch(function(error) {
            console.error('Error loading tips:', error);
        });
}

function loadTransactionsTable() {
    apiCall('purchases.php', 'GET')
        .then(function(response) {
            var purchases = response.success ? (response.data || []) : [];
            var tbody = $('transactionsTableBody');
            if (!tbody) return;
            
            if (purchases.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">No transactions found.</td></tr>';
                return;
            }
            
            Promise.all([
                apiCall('users.php', 'GET'),
                apiCall('tips.php?action=all', 'GET')
            ]).then(function(results) {
                var users = results[0].success ? (results[0].data || []) : [];
                var tips = results[1].success ? (results[1].data || []) : [];
                var h = '';
                
                for (var i = purchases.length - 1; i >= 0; i--) {
                    var p = purchases[i];
                    var buyer = users.find(function(u) { return u.id === p.user_id; });
                    var buyerName = buyer ? (buyer.name || buyer.phone) : 'Unknown';
                    
                    var tip = tips.find(function(t) { return t.id === p.tip_id; });
                    var tipCode = tip ? (tip.code || 'N/A') : 'N/A';
                    
                    h += '<tr>';
                    h += '<td>' + fdate(p.paid_at || p.created_at) + '</td>';
                    h += '<td>' + escapeHTML(buyerName) + '</td>';
                    h += '<td><code>' + escapeHTML(tipCode) + '</code></td>';
                    h += '<td>' + fmt(p.amount) + '</td>';
                    h += '<td><span class="badge badge-success">' + (p.status || 'PAID').toUpperCase() + '</span></td>';
                    h += '<td>' + (p.id || '').substring(0, 12) + '</td>';
                    h += '</tr>';
                }
                
                tbody.innerHTML = h;
            });
        }).catch(function(error) {
            console.error('Error loading transactions:', error);
        });
}

function loadSettingsData() {
    var totalSize = 0;
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('bashiri_') === 0) {
            totalSize += (localStorage.getItem(key) || '').length;
        }
    }
    
    var el = $('storageUsed');
    if (el) {
        el.textContent = (totalSize / 1024).toFixed(2) + ' KB';
    }
}

function setupAddTipsterForm() {
    var form = $('addTipsterForm');
    if (!form) return;
    
    var newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var name = sanitizeInput($('tipsterNameInput').value);
        var phone = sanitizeInput($('tipsterPhoneInput').value);
        var password = $('tipsterPasswordInput').value;
        var bio = sanitizeInput($('tipsterBioInput').value) || 'Professional Tipster';
        
        if (!name || !phone || !password) {
            showAdminMsg('error', 'Please fill in all required fields');
            return;
        }
        
        if (password.length < 6) {
            showAdminMsg('error', 'Password must be at least 6 characters');
            return;
        }
        
        apiCall('users.php', 'POST', {
            name: name,
            phone: phone,
            password: password,
            role: 'tipster',
            bio: bio
        })
        .then(function(response) {
            if (response.success) {
                showAdminMsg('success', 'Tipster created successfully! Login: ' + phone);
                newForm.reset();
                loadAdminData();
                loadUsersTable();
                loadTipstersTable();
            } else {
                showAdminMsg('error', response.message || 'Failed to create tipster');
            }
        })
        .catch(function() {
            showAdminMsg('error', 'Server error. Please try again.');
        });
    });
}

function showAdminMsg(type, msg) {
    var successEl = $('successMsg');
    var errorEl = $('errorMsg');
    var successText = $('successText');
    var errorText = $('errorText');
    
    if (type === 'success') {
        if (successEl) successEl.style.display = 'block';
        if (errorEl) errorEl.style.display = 'none';
        if (successText) successText.textContent = msg;
        
        setTimeout(function() {
            if (successEl) successEl.style.display = 'none';
        }, 5000);
    } else {
        if (errorEl) errorEl.style.display = 'block';
        if (successEl) successEl.style.display = 'none';
        if (errorText) errorText.textContent = msg;
        
        setTimeout(function() {
            if (errorEl) errorEl.style.display = 'none';
        }, 5000);
    }
}

function loadAdminData() {
    loadOverviewData();
    loadRecentActivity();
    loadUsersTable();
    loadTipstersTable();
    loadTipsTable();
    loadTransactionsTable();
}

function removeUser(id) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    apiCall('users.php?id=' + id, 'DELETE')
        .then(function(response) {
            if (response.success) {
                toast('User deleted successfully', 'success');
                loadAdminData();
            } else {
                toast(response.message || 'Failed to delete user', 'error');
            }
        })
        .catch(function() {
            toast('Server error. Please try again.', 'error');
        });
}

function changeAdminPassword() {
    var currentPwd = $('currentPassword').value;
    var newPwd = $('newPassword').value;
    var confirmPwd = $('confirmPassword').value;
    var msgEl = $('passwordMsg');
    
    if (!currentPwd || !newPwd || !confirmPwd) {
        if (msgEl) msgEl.innerHTML = '<span style="color:#EF4444;">Please fill in all fields</span>';
        return;
    }
    
    if (newPwd !== confirmPwd) {
        if (msgEl) msgEl.innerHTML = '<span style="color:#EF4444;">Passwords do not match</span>';
        return;
    }
    
    if (newPwd.length < 6) {
        if (msgEl) msgEl.innerHTML = '<span style="color:#EF4444;">Password must be at least 6 characters</span>';
        return;
    }
    
    if (!currentUser) {
        if (msgEl) msgEl.innerHTML = '<span style="color:#EF4444;">Not logged in</span>';
        return;
    }
    
    apiCall('users.php?action=change_password', 'POST', {
        user_id: currentUser.id,
        current_password: currentPwd,
        new_password: newPwd
    })
    .then(function(response) {
        if (response.success) {
            if (msgEl) msgEl.innerHTML = '<span style="color:#10B981;">Password updated successfully!</span>';
            // Clear form
            $('currentPassword').value = '';
            $('newPassword').value = '';
            $('confirmPassword').value = '';
        } else {
            if (msgEl) msgEl.innerHTML = '<span style="color:#EF4444;">' + (response.message || 'Failed to update') + '</span>';
        }
    })
    .catch(function() {
        if (msgEl) msgEl.innerHTML = '<span style="color:#EF4444;">Server error</span>';
    });
}

function exportData() {
    Promise.all([
        apiCall('users.php', 'GET'),
        apiCall('tips.php?action=all', 'GET'),
        apiCall('purchases.php', 'GET')
    ]).then(function(results) {
        var data = {
            exportDate: new Date().toISOString(),
            users: results[0].success ? (results[0].data || []) : [],
            tips: results[1].success ? (results[1].data || []) : [],
            purchases: results[2].success ? (results[2].data || []) : []
        };
        
        var jsonStr = JSON.stringify(data, null, 2);
        var blob = new Blob([jsonStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        
        var a = document.createElement('a');
        a.href = url;
        a.download = 'bashiri-nasi-backup-' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast('Data exported successfully!', 'success');
    }).catch(function() {
        toast('Export failed. Please try again.', 'error');
    });
}

function backupData() {
    exportData();
}

function clearAllData() {
    if (!confirm('⚠️ WARNING: This will delete ALL data permanently!\n\nThis includes all users, tips, and transactions.\n\nAre you absolutely sure?')) {
        return;
    }
    
    if (!confirm('FINAL WARNING: Type "DELETE" to confirm:\n\n(Cancel to abort)')) {
        return;
    }
    
    apiCall('admin.php?action=clear_all', 'POST')
        .then(function(response) {
            if (response.success) {
                toast('All data cleared!', 'success');
                setTimeout(function() {
                    location.reload();
                }, 2000);
            } else {
                toast(response.message || 'Failed to clear data', 'error');
            }
        })
        .catch(function() {
            toast('Server error. Please try again.', 'error');
        });
}

function doLogout() {
    clearSession();
    window.location.href = '../index.html';
}

function refreshAll() {
    loadAdminData();
    toast('Data refreshed!', 'success');
}

// ============================================
// GLOBAL EXPORTS
// ============================================
window.toggleDarkMode = toggleDarkMode;
window.logout = logout;
window.buyTip = buyTip;
window.followTipster = followTipster;
window.updateTipResult = updateTipResult;
window.doLogout = doLogout;
window.removeUser = removeUser;
window.refreshAll = refreshAll;
window.exportData = exportData;
window.backupData = backupData;
window.clearAllData = clearAllData;
window.changeAdminPassword = changeAdminPassword;

// ============================================
// INITIALIZATION
// ============================================
console.log('✅ Bashiri Nasi v3.0.1 Ready');
console.log('📦 All data routed to MySQL API at:', CONFIG.API_BASE_URL);
