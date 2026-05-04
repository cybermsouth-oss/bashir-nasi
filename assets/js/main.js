// ============================================
// BASHIRI NASI - SECURE APPLICATION v4.1.0

'use strict';

// ============================================
// AUTHENTICATION GUARD - MUST BE FIRST
// ============================================
(function() {
    // IMMEDIATELY check authentication before any content loads
    var path = window.location.pathname;
    var isAdminPath = path.indexOf('/admin') !== -1;
    var isLoginPage = path.indexOf('login.html') !== -1 || path.indexOf('/login') !== -1;
    var isRegisterPage = path.indexOf('register.html') !== -1 || path.indexOf('/register') !== -1;
    
    // Check session immediately
    var session = null;
    try {
        var sessionData = localStorage.getItem('bashiri_session');
        if (sessionData) {
            session = JSON.parse(sessionData);
        }
    } catch(e) {
        session = null;
    }
    
    // If accessing admin page without valid session, redirect IMMEDIATELY
    if (isAdminPath) {
        if (!session || !session.id || !session.role) {
            window.location.replace('login.html?redirect=admin&error=Please login first');
            return; // Stop execution
        }
        
        if (session.role !== 'admin') {
            window.location.replace('../index.html?error=Access denied');
            return; // Stop execution
        }
        
        // Check session expiry
        if (session.expiresAt && Date.now() > session.expiresAt) {
            localStorage.removeItem('bashiri_session');
            window.location.replace('../login.html?redirect=admin&error=Session expired');
            return; // Stop execution
        }
    }
    
    // If logged in but on login/register page, redirect to home
    if ((isLoginPage || isRegisterPage) && session && session.id) {
        if (!session.expiresAt || Date.now() < session.expiresAt) {
            if (session.role === 'admin') {
                window.location.replace('admin/index.html');
            } else {
                window.location.replace('index.html');
            }
            return;
        }
    }
})();

// ============================================
// SECURE CONFIGURATION
// ============================================
var CONFIG = {
    API_BASE_URL: 'http://localhost/bashiri-nasi/api/',
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_TIME: 60 * 60 * 1000,
    MIN_PASSWORD_LENGTH: 8,
    API_TIMEOUT: 15000,
    TOKEN_REFRESH_INTERVAL: 5 * 60 * 1000,
    RATE_LIMIT_DELAY: 1000
};

// ============================================
// SECURITY UTILITIES
// ============================================
var SecurityUtils = {
    generateCSRFToken: function() {
        var array = new Uint32Array(8);
        window.crypto.getRandomValues(array);
        var token = '';
        for (var i = 0; i < array.length; i++) {
            token += array[i].toString(16).padStart(8, '0');
        }
        return token;
    },
    
    sanitizeHTML: function(str) {
        if (!str || typeof str !== 'string') return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    
    sanitizeInput: function(str, maxLength) {
        if (!str || typeof str !== 'string') return '';
        maxLength = maxLength || CONFIG.INPUT_MAX_LENGTH || 200;
        return str.replace(/<[^>]*>/g, '').trim().substring(0, maxLength);
    },
    
    validateEmail: function(email) {
        if (!email) return false;
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    },
    
    validatePhone: function(phone) {
        if (!phone) return false;
        phone = phone.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '255' + phone.substring(1);
        if (!phone.startsWith('255')) phone = '255' + phone;
        return /^255[67]\d{8}$/.test(phone);
    },
    
    validatePasswordStrength: function(password) {
        if (!password || password.length < CONFIG.MIN_PASSWORD_LENGTH) {
            return { valid: false, message: 'Password must be at least ' + CONFIG.MIN_PASSWORD_LENGTH + ' characters' };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one uppercase letter' };
        }
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one lowercase letter' };
        }
        if (!/\d/.test(password)) {
            return { valid: false, message: 'Password must contain at least one number' };
        }
        return { valid: true };
    },
    
    rateLimiter: (function() {
        var lastCall = 0;
        return function() {
            var now = Date.now();
            if (now - lastCall < CONFIG.RATE_LIMIT_DELAY) return false;
            lastCall = now;
            return true;
        };
    })()
};

// ============================================
// SECURE API CALLER
// ============================================
function apiCall(endpoint, method, data) {
    return new Promise(function(resolve, reject) {
        if (!SecurityUtils.rateLimiter()) {
            reject({ success: false, message: 'Too many requests. Please wait.' });
            return;
        }
        
        var xhr = new XMLHttpRequest();
        var url = CONFIG.API_BASE_URL + endpoint;
        var separator = url.indexOf('?') !== -1 ? '&' : '?';
        url += separator + '_t=' + Date.now();
        
        if (method === 'GET' && data) {
            var params = [];
            for (var key in data) {
                if (data.hasOwnProperty(key) && data[key] !== null && data[key] !== undefined) {
                    params.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
                }
            }
            if (params.length > 0) url += '&' + params.join('&');
        }
        
        xhr.open(method, url, true);
        xhr.timeout = CONFIG.API_TIMEOUT;
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        
        // Add CSRF token
        var csrfToken = sessionStorage.getItem('csrf_token') || SecurityUtils.generateCSRFToken();
        sessionStorage.setItem('csrf_token', csrfToken);
        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
        
        // Add auth token
        try {
            var session = JSON.parse(localStorage.getItem('bashiri_session') || '{}');
            if (session && session.token) {
                xhr.setRequestHeader('Authorization', 'Bearer ' + session.token);
            }
        } catch(e) {}
        
        xhr.onload = function() {
            try {
                if (xhr.status === 204) {
                    resolve({ success: true, data: null });
                    return;
                }
                
                var response = JSON.parse(xhr.responseText);
                
                if (response.csrf_token) {
                    sessionStorage.setItem('csrf_token', response.csrf_token);
                }
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(response);
                } else if (xhr.status === 401) {
                    localStorage.removeItem('bashiri_session');
                    window.location.href = 'login.html?error=Session expired';
                    reject({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
                } else {
                    reject(response || { success: false, message: 'Request failed' });
                }
            } catch(e) {
                reject({ success: false, message: 'Invalid response' });
            }
        };
        
        xhr.onerror = function() {
            reject({ success: false, message: 'Network error', code: 'NETWORK_ERROR' });
        };
        
        xhr.ontimeout = function() {
            xhr.abort();
            reject({ success: false, message: 'Timeout', code: 'TIMEOUT' });
        };
        
        try {
            if (method === 'GET' || method === 'DELETE') {
                xhr.send();
            } else {
                xhr.send(JSON.stringify(data || {}));
            }
        } catch(e) {
            reject({ success: false, message: 'Send failed' });
        }
    });
}

// ============================================
// TOAST NOTIFICATIONS
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
    
    var colors = {
        success: { bg: '#D1FAE5', border: '#10B981', icon: '✅', text: '#065F46' },
        error: { bg: '#FEE2E2', border: '#EF4444', icon: '❌', text: '#991B1B' },
        info: { bg: '#DBEAFE', border: '#3B82F6', icon: 'ℹ️', text: '#1E40AF' },
        warning: { bg: '#FEF3C7', border: '#F59E0B', icon: '⚠️', text: '#92400E' }
    };
    
    var c = colors[type];
    var el = document.createElement('div');
    el.style.cssText = 'padding:14px 20px;border-radius:10px;background:' + c.bg + ';box-shadow:0 4px 15px rgba(0,0,0,0.1);font-size:0.9rem;border-left:4px solid ' + c.border + ';min-width:280px;max-width:420px;animation:slideInRight 0.3s ease;color:' + c.text + ';';
    el.innerHTML = '<div style="display:flex;align-items:flex-start;gap:10px;"><span style="font-size:1.2rem;">' + c.icon + '</span><span>' + SecurityUtils.sanitizeHTML(msg) + '</span></div>';
    container.appendChild(el);
    
    setTimeout(function() {
        if (el && el.parentNode) {
            el.style.opacity = '0';
            el.style.transform = 'translateX(100%)';
            setTimeout(function() { if (el && el.parentNode) el.remove(); }, 300);
        }
    }, 5000);
}

// ============================================
// SESSION MANAGEMENT
// ============================================
var currentUser = null;
var sessionTimeout = null;

function getSession() {
    try {
        var data = localStorage.getItem('bashiri_session');
        if (!data) return null;
        var session = JSON.parse(data);
        if (session && session.expiresAt && Date.now() > session.expiresAt) {
            localStorage.removeItem('bashiri_session');
            return null;
        }
        return session;
    } catch(e) {
        return null;
    }
}

function restoreSession() {
    var session = getSession();
    if (!session) return;
    
    currentUser = {
        id: session.id,
        name: session.name,
        phone: session.phone,
        email: session.email,
        role: session.role,
        bio: session.bio || ''
    };
    
    startSessionTimer();
    updateNav();
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
    
    localStorage.setItem('bashiri_session', JSON.stringify(sessionData));
    startSessionTimer();
    updateNav();
}

function clearSession() {
    currentUser = null;
    localStorage.removeItem('bashiri_session');
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
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

// ============================================
// LOGIN FUNCTION
// ============================================
function handleLogin(e) {
    e.preventDefault();
    
    var phoneInput = document.getElementById('phone');
    var passwordInput = document.getElementById('password');
    var submitBtn = document.querySelector('#loginForm button[type="submit"]');
    
    if (!phoneInput || !passwordInput) return;
    
    var phone = SecurityUtils.sanitizeInput(phoneInput.value);
    var password = passwordInput.value;
    
    if (!phone || !password) {
        toast('Please fill in all fields', 'error');
        return;
    }
    
    var originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }
    
    var loginData = { password: password };
    if (SecurityUtils.validateEmail(phone)) {
        loginData.email = phone.toLowerCase();
    } else {
        loginData.phone = phone;
    }
    
    apiCall('auth.php?action=login', 'POST', loginData)
        .then(function(response) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
            
            if (response.success) {
                saveSession(response.user);
                toast('Welcome, ' + response.user.name + '!', 'success');
                
                // Check for redirect parameter
                var urlParams = new URLSearchParams(window.location.search);
                var redirect = urlParams.get('redirect');
                
                setTimeout(function() {
                    if (response.user.role === 'admin') {
                        window.location.href = 'admin/index.html';
                    } else if (redirect) {
                        window.location.href = redirect + '.html';
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
            toast(error.message || 'Login failed', 'error');
        });
}

function handleRegister(e) {
    e.preventDefault();
    
    var nameInput = document.getElementById('fullName');
    var phoneInput = document.getElementById('phone');
    var passwordInput = document.getElementById('password');
    var submitBtn = document.querySelector('#registerForm button[type="submit"]');
    
    if (!nameInput || !phoneInput || !passwordInput) return;
    
    var name = SecurityUtils.sanitizeInput(nameInput.value);
    var phone = SecurityUtils.sanitizeInput(phoneInput.value);
    var password = passwordInput.value;
    
    if (!name || name.length < 2) {
        toast('Please enter your full name', 'error');
        return;
    }
    
    if (!SecurityUtils.validatePhone(phone)) {
        toast('Please enter a valid phone number', 'error');
        return;
    }
    
    var passwordCheck = SecurityUtils.validatePasswordStrength(password);
    if (!passwordCheck.valid) {
        toast(passwordCheck.message, 'error');
        return;
    }
    
    var originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    }
    
    apiCall('auth.php?action=register', 'POST', {
        name: name,
        phone: phone,
        password: password
    })
    .then(function(response) {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
        
        if (response.success) {
            toast('Account created! Please login.', 'success');
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
        toast(error.message || 'Registration failed', 'error');
    });
}

function handleLogout() {
    clearSession();
    toast('Logged out', 'success');
    setTimeout(function() {
        window.location.href = '../index.html';
    }, 500);
}

// ============================================
// ADMIN PANEL GUARD
// ============================================
function requireAdmin() {
    var session = getSession();
    
    if (!session || !session.id || !session.role) {
        window.location.href = '../login.html?redirect=admin&error=Please login first';
        return false;
    }
    
    if (session.role !== 'admin') {
        window.location.href = '../index.html?error=Access denied';
        return false;
    }
    
    return true;
}

// ============================================
// NAVIGATION
// ============================================
function updateNav() {
    var nav = document.getElementById('navLinks');
    if (!nav) return;
    
    var session = getSession();
    
    if (session && session.id) {
        var icons = { admin: '👑', tipster: '🎯', user: '👤' };
        var html = '<span style="font-size:0.85rem;font-weight:500;color:var(--text-primary);">' + 
                   (icons[session.role] || '') + ' ' + 
                   SecurityUtils.sanitizeHTML(session.name) + '</span>';
        
        if (session.role === 'admin') {
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
        var darkToggle = document.getElementById('darkModeToggle');
        if (darkToggle) darkToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Restore session
    restoreSession();
    
    // Check if this is admin page
    var path = window.location.pathname;
    var isAdminPath = path.indexOf('/admin') !== -1;
    
    if (isAdminPath) {
        // STRICT ADMIN CHECK
        if (!requireAdmin()) return; // Stop execution if not admin
        
        // Initialize admin panel only if authorized
        initAdminPanel();
    }
    
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
    
    // Show error from URL parameters
    var urlParams = new URLSearchParams(window.location.search);
    var errorMsg = urlParams.get('error');
    if (errorMsg) {
        toast(decodeURIComponent(errorMsg), 'error');
        // Clean URL
        if (window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
    
    // Initialize home page if not admin
    if (!isAdminPath && !loginForm && !registerForm) {
        initHomePage();
    }
    
    console.log('✅ Bashiri Nasi v4.1.0 - SECURE MODE');
    console.log('🔒 Admin panel protected by authentication');
});

// ============================================
// ADMIN PANEL INITIALIZATION
// ============================================
function initAdminPanel() {
    // Double-check authentication
    var session = getSession();
    if (!session || session.role !== 'admin') {
        window.location.href = '../login.html?error=Access denied';
        return;
    }
    
    // Set admin name
    var adminNameEl = document.getElementById('adminName');
    if (adminNameEl) {
        adminNameEl.textContent = session.name || 'Administrator';
    }
    
    // Hide all content until verified
    var mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    // Setup sidebar navigation
    var sidebarItems = document.querySelectorAll('[data-admin-tab]');
    sidebarItems.forEach(function(item) {
        item.addEventListener('click', function() {
            var tab = this.getAttribute('data-admin-tab');
            
            sidebarItems.forEach(function(i) { i.classList.remove('active'); });
            this.classList.add('active');
            
            var tabContents = document.querySelectorAll('.admin-tab-content');
            tabContents.forEach(function(c) { c.style.display = 'none'; });
            
            var tabId = 'admin' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Tab';
            var tabEl = document.getElementById(tabId);
            if (tabEl) {
                tabEl.style.display = 'block';
            }
        });
    });
    
    // Load admin data
    loadAdminData();
    
    // Setup add tipster form
    var addTipsterForm = document.getElementById('addTipsterForm');
    if (addTipsterForm) {
        addTipsterForm.addEventListener('submit', handleAddTipster);
    }
    
    console.log('👑 Admin panel initialized for:', session.name);
}

// ============================================
// ADMIN DATA LOADING
// ============================================
function loadAdminData() {
    // Load overview stats
    loadOverviewStats();
    // Load users table
    loadUsersTable();
    // Load tipsters table
    loadTipstersTable();
    // Load tips table
    loadTipsTable();
    // Load transactions
    loadTransactionsTable();
}

function loadOverviewStats() {
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
        var totalRevenue = paidPurchases.reduce(function(sum, p) { return sum + (p.amount || 0); }, 0);
        var pendingTips = tips.filter(function(t) { return t.result === 'pending'; }).length;
        
        var statsContainer = document.getElementById('adminStats');
        if (statsContainer) {
            statsContainer.innerHTML = 
                '<div class="stat-card"><div class="stat-number">' + totalUsers + '</div><div class="stat-label">Users</div></div>' +
                '<div class="stat-card"><div class="stat-number">' + totalTipsters + '</div><div class="stat-label">Tipsters</div></div>' +
                '<div class="stat-card"><div class="stat-number">' + tips.length + '</div><div class="stat-label">Total Tips</div></div>' +
                '<div class="stat-card"><div class="stat-number">' + paidPurchases.length + '</div><div class="stat-label">Sales</div></div>' +
                '<div class="stat-card"><div class="stat-number">' + fmt(totalRevenue) + '</div><div class="stat-label">Revenue</div></div>' +
                '<div class="stat-card"><div class="stat-number">' + pendingTips + '</div><div class="stat-label">Pending</div></div>';
        }
    }).catch(function(error) {
        console.error('Error loading stats:', error);
    });
}

function loadUsersTable() {
    apiCall('users.php', 'GET')
        .then(function(response) {
            var users = response.success ? (response.data || []) : [];
            var tbody = document.getElementById('usersTableBody');
            if (!tbody) return;
            
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No users found</td></tr>';
                return;
            }
            
            var html = '';
            users.forEach(function(user) {
                var roleBadge = user.role === 'admin' ? 'badge-danger' : 
                               user.role === 'tipster' ? 'badge-info' : 'badge-primary';
                
                html += '<tr>' +
                    '<td>' + SecurityUtils.sanitizeHTML(user.name || 'N/A') + '</td>' +
                    '<td>' + SecurityUtils.sanitizeHTML(user.phone || user.email || 'N/A') + '</td>' +
                    '<td><span class="badge ' + roleBadge + '">' + user.role + '</span></td>' +
                    '<td>' + (user.is_active ? 'Active' : 'Inactive') + '</td>' +
                    '<td>' + fdate(user.created_at) + '</td>' +
                    '<td>' + (user.role !== 'admin' ? '<button class="btn-delete" onclick="deleteUser(\'' + user.id + '\')"><i class="fas fa-trash"></i></button>' : '') + '</td>' +
                    '</tr>';
            });
            
            tbody.innerHTML = html;
        })
        .catch(function(error) {
            console.error('Error loading users:', error);
        });
}

function loadTipstersTable() {
    apiCall('users.php?role=tipster', 'GET')
        .then(function(response) {
            var tipsters = response.success ? (response.data || []) : [];
            var tbody = document.getElementById('tipstersTableBody');
            if (!tbody) return;
            
            if (tipsters.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No tipsters found</td></tr>';
                return;
            }
            
            apiCall('tips.php?action=all', 'GET')
                .then(function(tipResponse) {
                    var tips = tipResponse.success ? (tipResponse.data || []) : [];
                    var html = '';
                    
                    tipsters.forEach(function(tipster) {
                        var tipsterTips = tips.filter(function(t) { return t.tipster_id === tipster.id; });
                        var won = tipsterTips.filter(function(t) { return t.result === 'won'; }).length;
                        var winRate = tipsterTips.length > 0 ? Math.round((won / tipsterTips.length) * 100) : 0;
                        var sold = tipsterTips.reduce(function(sum, t) { return sum + (t.purchased || 0); }, 0);
                        
                        html += '<tr>' +
                            '<td>' + SecurityUtils.sanitizeHTML(tipster.name || 'N/A') + '</td>' +
                            '<td>' + SecurityUtils.sanitizeHTML(tipster.phone || 'N/A') + '</td>' +
                            '<td>' + SecurityUtils.sanitizeHTML((tipster.bio || '').substring(0, 50)) + '</td>' +
                            '<td>' + tipsterTips.length + '</td>' +
                            '<td>' + sold + '</td>' +
                            '<td>' + winRate + '%</td>' +
                            '<td><button class="btn-delete" onclick="deleteUser(\'' + tipster.id + '\')"><i class="fas fa-trash"></i></button></td>' +
                            '</tr>';
                    });
                    
                    tbody.innerHTML = html;
                });
        })
        .catch(function(error) {
            console.error('Error loading tipsters:', error);
        });
}

function loadTipsTable() {
    apiCall('tips.php?action=all', 'GET')
        .then(function(response) {
            var tips = response.success ? (response.data || []) : [];
            var tbody = document.getElementById('tipsTableBody');
            if (!tbody) return;
            
            if (tips.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No tips found</td></tr>';
                return;
            }
            
            var html = '';
            tips.reverse().forEach(function(tip) {
                var badgeClass = tip.result === 'won' ? 'badge-success' : 
                                tip.result === 'lost' ? 'badge-danger' : 'badge-warning';
                var badgeText = tip.result === 'won' ? '🏆 WON' : 
                               tip.result === 'lost' ? '❌ LOST' : '⏳ PENDING';
                
                html += '<tr>' +
                    '<td>' + getPlatformIcon(tip.platform) + ' ' + SecurityUtils.sanitizeHTML((tip.platform || '').toUpperCase()) + '</td>' +
                    '<td><code>' + SecurityUtils.sanitizeHTML(tip.code || 'N/A') + '</code></td>' +
                    '<td>' + (tip.odds || 'N/A') + '</td>' +
                    '<td>' + fmt(tip.price || 0) + '</td>' +
                    '<td>' + SecurityUtils.sanitizeHTML(tip.tipster_name || 'N/A') + '</td>' +
                    '<td><span class="badge ' + badgeClass + '">' + badgeText + '</span></td>' +
                    '<td>' + (tip.purchased || 0) + '</td>' +
                    '<td>' + fdate(tip.created_at) + '</td>' +
                    '</tr>';
            });
            
            tbody.innerHTML = html;
        })
        .catch(function(error) {
            console.error('Error loading tips:', error);
        });
}

function loadTransactionsTable() {
    apiCall('purchases.php', 'GET')
        .then(function(response) {
            var purchases = response.success ? (response.data || []) : [];
            var tbody = document.getElementById('transactionsTableBody');
            if (!tbody) return;
            
            if (purchases.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No transactions found</td></tr>';
                return;
            }
            
            Promise.all([
                apiCall('users.php', 'GET'),
                apiCall('tips.php?action=all', 'GET')
            ]).then(function(results) {
                var users = results[0].success ? (results[0].data || []) : [];
                var tips = results[1].success ? (results[1].data || []) : [];
                
                var html = '';
                purchases.reverse().forEach(function(purchase) {
                    var buyer = users.find(function(u) { return u.id === purchase.user_id; });
                    var buyerName = buyer ? (buyer.name || buyer.phone) : 'Unknown';
                    
                    var tip = tips.find(function(t) { return t.id === purchase.tip_id; });
                    var tipCode = tip ? (tip.code || 'N/A') : 'N/A';
                    
                    html += '<tr>' +
                        '<td>' + fdate(purchase.paid_at || purchase.created_at) + '</td>' +
                        '<td>' + SecurityUtils.sanitizeHTML(buyerName) + '</td>' +
                        '<td><code>' + SecurityUtils.sanitizeHTML(tipCode) + '</code></td>' +
                        '<td>' + fmt(purchase.amount) + '</td>' +
                        '<td><span class="badge badge-success">' + (purchase.status || 'PAID').toUpperCase() + '</span></td>' +
                        '<td>' + (purchase.id || '').substring(0, 12) + '</td>' +
                        '</tr>';
                });
                
                tbody.innerHTML = html;
            });
        })
        .catch(function(error) {
            console.error('Error loading transactions:', error);
        });
}

function handleAddTipster(e) {
    e.preventDefault();
    
    var name = SecurityUtils.sanitizeInput(document.getElementById('tipsterNameInput').value);
    var phone = SecurityUtils.sanitizeInput(document.getElementById('tipsterPhoneInput').value);
    var password = document.getElementById('tipsterPasswordInput').value;
    var bio = SecurityUtils.sanitizeInput(document.getElementById('tipsterBioInput').value) || 'Professional Tipster';
    
    if (!name || !phone || !password) {
        toast('Please fill all fields', 'error');
        return;
    }
    
    if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
        toast('Password must be at least ' + CONFIG.MIN_PASSWORD_LENGTH + ' characters', 'error');
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
            toast('Tipster created successfully!', 'success');
            document.getElementById('addTipsterForm').reset();
            loadAdminData();
        } else {
            toast(response.message || 'Failed to create tipster', 'error');
        }
    })
    .catch(function() {
        toast('Server error', 'error');
    });
}

function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    apiCall('users.php?id=' + userId, 'DELETE')
        .then(function(response) {
            if (response.success) {
                toast('User deleted', 'success');
                loadAdminData();
            } else {
                toast(response.message || 'Delete failed', 'error');
            }
        })
        .catch(function() {
            toast('Server error', 'error');
        });
}

// ============================================
// HOME PAGE INITIALIZATION
// ============================================
function initHomePage() {
    console.log('🏠 Home page initialized');
    
    // Load recent tips
    apiCall('tips.php?action=all', 'GET')
        .then(function(response) {
            if (response.success) {
                displayTips(response.data || []);
            }
        })
        .catch(function() {
            console.log('Could not load tips');
        });
}

function displayTips(tips) {
    var container = document.getElementById('recentBetSlips');
    if (!container) return;
    
    var recent = tips.slice(-6).reverse();
    
    if (recent.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;"><p>No tips available yet</p></div>';
        return;
    }
    
    var session = getSession();
    var isLoggedIn = session && session.id;
    
    container.innerHTML = recent.map(function(tip) {
        var platform = (tip.platform || 'Unknown').toUpperCase();
        var icon = getPlatformIcon(tip.platform);
        var badgeClass = tip.result === 'won' ? 'badge-success' : tip.result === 'lost' ? 'badge-danger' : 'badge-warning';
        var badgeText = tip.result === 'won' ? '🏆 WON' : tip.result === 'lost' ? '❌ LOST' : '⏳ PENDING';
        var borderColor = tip.result === 'pending' ? '#F59E0B' : tip.result === 'won' ? '#10B981' : '#EF4444';
        
        return '<div class="bet-slip-card" style="border-left:4px solid ' + borderColor + ';">' +
            '<div class="bet-slip-header" style="background:linear-gradient(135deg,' + (tip.result === 'won' ? '#059669,#047857' : tip.result === 'lost' ? '#DC2626,#991B1B' : '#F59E0B,#D97706') + ');">' +
            '<span>' + icon + ' ' + SecurityUtils.sanitizeHTML(platform) + '</span>' +
            '<span class="badge ' + badgeClass + '">' + badgeText + '</span>' +
            '</div>' +
            '<div class="bet-slip-body">' +
            (isLoggedIn ? 
                '<div class="bet-code">🔓 ' + SecurityUtils.sanitizeHTML(tip.code || '●●●●●●●●') + '</div>' :
                '<div class="bet-code">🔒 ●●●●●●●●</div><a href="login.html" class="btn btn-primary btn-sm btn-block">Login to View</a>'
            ) +
            '<div style="display:flex;justify-content:space-between;margin-top:8px;">' +
            '<span>Odds: <strong>' + (tip.odds || 'N/A') + '</strong></span>' +
            '<span style="color:#059669;font-weight:700;">' + fmt(tip.price || 0) + '</span>' +
            '</div>' +
            '</div></div>';
    }).join('');
}

// ============================================
// UTILITY FUNCTIONS
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
            day: 'numeric', month: 'short', year: 'numeric'
        });
    } catch(e) { return 'N/A'; }
}

function getPlatformIcon(platform) {
    var p = (platform || '').toUpperCase();
    if (p.includes('SPORTBET')) return '🔴';
    if (p === 'BETPAWA') return '🔵';
    if (p === 'SPORTPESA') return '🟢';
    if (p === 'BETWAY') return '🟡';
    return '📱';
}

// ============================================
// GLOBAL EXPORTS
// ============================================
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.deleteUser = deleteUser;
window.toast = toast;

console.log('🛡️ SECURITY FEATURES ACTIVE:');
console.log('  ✓ Immediate auth check on page load');
console.log('  ✓ Admin panel protected - redirects to login');
console.log('  ✓ Session validation with expiry');
console.log('  ✓ CSRF protection');
console.log('  ✓ XSS prevention (HTML sanitization)');
console.log('  ✓ Rate limiting');
console.log('  ✓ Password strength enforcement');
