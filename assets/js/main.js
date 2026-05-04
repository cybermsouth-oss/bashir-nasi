// ============================================
// BASHIRI NASI - COMPLETE APPLICATION v5.0.0
// LOCAL STORAGE MODE - Works on GitHub Pages
// No Server Required | Full Authentication
// ============================================

'use strict';

// ============================================
// AUTHENTICATION GUARD - MUST BE FIRST
// ============================================
(function() {
    var path = window.location.pathname;
    var isAdminPath = path.indexOf('/admin') !== -1;
    var isLoginPage = path.indexOf('login.html') !== -1 || path.indexOf('/login') !== -1;
    var isRegisterPage = path.indexOf('register.html') !== -1 || path.indexOf('/register') !== -1;
    
    var session = null;
    try {
        var sessionData = localStorage.getItem('bashiri_session');
        if (sessionData) {
            session = JSON.parse(sessionData);
        }
    } catch(e) {
        session = null;
    }
    
    if (isAdminPath) {
        if (!session || !session.id || !session.role) {
            window.location.replace('../login.html?redirect=admin&error=Please login first');
            return;
        }
        
        if (session.role !== 'admin') {
            window.location.replace('../index.html?error=Access denied');
            return;
        }
        
        if (session.expiresAt && Date.now() > session.expiresAt) {
            localStorage.removeItem('bashiri_session');
            window.location.replace('../login.html?redirect=admin&error=Session expired');
            return;
        }
    }
    
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
// CONFIGURATION
// ============================================
var CONFIG = {
    API_BASE_URL: '',
    USE_LOCAL_STORAGE: true,
    SESSION_TIMEOUT: 30 * 60 * 1000,
    MAX_LOGIN_ATTEMPTS: 5,
    MIN_PASSWORD_LENGTH: 6,
    API_TIMEOUT: 15000,
    RATE_LIMIT_DELAY: 500,
    INPUT_MAX_LENGTH: 200
};

// ============================================
// LOCAL DATABASE
// ============================================
function getLocalDB() {
    var db = localStorage.getItem('bashiri_db');
    if (!db) {
        // Initialize with admin account
        var defaultDB = {
            users: [
                {
                    id: 'admin_001',
                    name: 'Administrator',
                    phone: '255712345678',
                    email: 'admin@bashiri.com',
                    password: 'Admin@123',
                    role: 'admin',
                    bio: 'System Administrator',
                    is_active: true,
                    token: '',
                    createdAt: new Date().toISOString()
                }
            ],
            tips: [],
            purchases: [],
            follows: []
        };
        localStorage.setItem('bashiri_db', JSON.stringify(defaultDB));
        return defaultDB;
    }
    try {
        return JSON.parse(db);
    } catch(e) {
        return { users: [], tips: [], purchases: [], follows: [] };
    }
}

function saveLocalDB(db) {
    localStorage.setItem('bashiri_db', JSON.stringify(db));
}

// ============================================
// API CALLER (LOCAL STORAGE MODE)
// ============================================
function apiCall(endpoint, method, data) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            try {
                var db = getLocalDB();
                var response = null;
                
                // ============ LOGIN ============
                if (endpoint.includes('auth.php?action=login') && method === 'POST') {
                    var user = db.users.find(function(u) {
                        var phoneMatch = data.phone && u.phone === data.phone;
                        var emailMatch = data.email && u.email && u.email.toLowerCase() === data.email.toLowerCase();
                        return (phoneMatch || emailMatch) && u.password === data.password;
                    });
                    
                    if (user) {
                        var token = 'tok_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        user.token = token;
                        user.lastLogin = new Date().toISOString();
                        saveLocalDB(db);
                        
                        response = {
                            success: true,
                            message: 'Login successful',
                            user: {
                                id: user.id,
                                name: user.name,
                                phone: user.phone,
                                email: user.email || '',
                                role: user.role,
                                bio: user.bio || '',
                                token: token
                            }
                        };
                    } else {
                        response = { 
                            success: false, 
                            message: 'Invalid credentials. Please check your phone/email and password.' 
                        };
                    }
                }
                
                // ============ REGISTER ============
                else if (endpoint.includes('auth.php?action=register') && method === 'POST') {
                    var exists = db.users.find(function(u) {
                        return u.phone === data.phone || (data.email && u.email === data.email);
                    });
                    
                    if (exists) {
                        response = { 
                            success: false, 
                            message: 'Phone number or email already registered.' 
                        };
                    } else {
                        var newUser = {
                            id: 'usr_' + Date.now(),
                            name: data.name,
                            phone: data.phone,
                            email: data.email || '',
                            password: data.password,
                            role: 'user',
                            bio: '',
                            is_active: true,
                            token: '',
                            createdAt: new Date().toISOString()
                        };
                        db.users.push(newUser);
                        saveLocalDB(db);
                        
                        response = {
                            success: true,
                            message: 'Registration successful! You can now login.'
                        };
                    }
                }
                
                // ============ LOGOUT ============
                else if (endpoint.includes('auth.php?action=logout') && method === 'POST') {
                    if (data && data.user_id) {
                        var logoutUser = db.users.find(function(u) { return u.id === data.user_id; });
                        if (logoutUser) logoutUser.token = '';
                        saveLocalDB(db);
                    }
                    response = { success: true, message: 'Logged out' };
                }
                
                // ============ GET USERS ============
                else if (endpoint.includes('users.php') && method === 'GET') {
                    var roleFilter = '';
                    if (endpoint.includes('role=')) {
                        roleFilter = endpoint.split('role=')[1];
                        if (roleFilter.includes('&')) roleFilter = roleFilter.split('&')[0];
                    }
                    
                    var users = db.users.filter(function(u) {
                        return roleFilter ? u.role === roleFilter : true;
                    }).map(function(u) {
                        return {
                            id: u.id,
                            name: u.name,
                            phone: u.phone,
                            email: u.email,
                            role: u.role,
                            bio: u.bio,
                            is_active: u.is_active,
                            created_at: u.createdAt
                        };
                    });
                    
                    response = { success: true, data: users };
                }
                
                // ============ CREATE USER (ADMIN) ============
                else if (endpoint === 'users.php' && method === 'POST') {
                    var newId = 'usr_' + Date.now();
                    db.users.push({
                        id: newId,
                        name: data.name,
                        phone: data.phone,
                        email: data.email || '',
                        password: data.password,
                        role: data.role || 'tipster',
                        bio: data.bio || '',
                        is_active: true,
                        token: '',
                        createdAt: new Date().toISOString()
                    });
                    saveLocalDB(db);
                    
                    response = {
                        success: true,
                        message: 'User created successfully',
                        user: { id: newId, name: data.name, phone: data.phone, role: data.role }
                    };
                }
                
                // ============ DELETE USER ============
                else if (endpoint.includes('users.php?id=') && method === 'DELETE') {
                    var uid = endpoint.split('id=')[1];
                    var userToDelete = db.users.find(function(u) { return u.id === uid; });
                    
                    if (userToDelete && userToDelete.role === 'admin') {
                        response = { success: false, message: 'Cannot delete admin user' };
                    } else {
                        db.users = db.users.filter(function(u) { return u.id !== uid; });
                        db.tips = db.tips.filter(function(t) { return t.tipster_id !== uid; });
                        db.purchases = db.purchases.filter(function(p) { return p.user_id !== uid; });
                        saveLocalDB(db);
                        response = { success: true, message: 'User deleted' };
                    }
                }
                
                // ============ GET TIPS ============
                else if (endpoint.includes('tips.php') && method === 'GET') {
                    var tipsterFilter = '';
                    if (endpoint.includes('tipster_id=')) {
                        tipsterFilter = endpoint.split('tipster_id=')[1];
                        if (tipsterFilter.includes('&')) tipsterFilter = tipsterFilter.split('&')[0];
                    }
                    
                    var tips = db.tips.filter(function(t) {
                        return tipsterFilter ? t.tipster_id === tipsterFilter : true;
                    }).map(function(t) {
                        var tipster = db.users.find(function(u) { return u.id === t.tipster_id; });
                        return {
                            id: t.id,
                            tipster_id: t.tipster_id,
                            tipster_name: tipster ? tipster.name : 'Unknown',
                            platform: t.platform,
                            code: t.code,
                            odds: t.odds,
                            price: t.price,
                            result: t.result || 'pending',
                            purchased: t.purchased || 0,
                            status: t.status || 'active',
                            created_at: t.createdAt
                        };
                    });
                    
                    response = { success: true, data: tips };
                }
                
                // ============ CREATE TIP ============
                else if (endpoint === 'tips.php' && method === 'POST') {
                    var newTip = {
                        id: 'tip_' + Date.now(),
                        tipster_id: data.tipster_id,
                        platform: data.platform,
                        code: data.bet_code,
                        odds: data.odds,
                        price: data.price,
                        result: 'pending',
                        purchased: 0,
                        status: 'active',
                        createdAt: new Date().toISOString()
                    };
                    db.tips.push(newTip);
                    saveLocalDB(db);
                    
                    response = { success: true, message: 'Tip uploaded successfully!' };
                }
                
                // ============ UPDATE TIP ============
                else if (endpoint === 'tips.php' && method === 'PUT') {
                    var tip = db.tips.find(function(t) { return t.id === data.tip_id; });
                    if (tip) {
                        tip.result = data.result;
                        saveLocalDB(db);
                        response = { success: true, message: 'Tip updated!' };
                    } else {
                        response = { success: false, message: 'Tip not found' };
                    }
                }
                
                // ============ GET PURCHASES ============
                else if (endpoint.includes('purchases.php') && method === 'GET') {
                    var userIdFilter = '';
                    if (endpoint.includes('user_id=')) {
                        userIdFilter = endpoint.split('user_id=')[1];
                        if (userIdFilter.includes('&')) userIdFilter = userIdFilter.split('&')[0];
                    }
                    
                    var purchases = db.purchases.filter(function(p) {
                        return userIdFilter ? p.user_id === userIdFilter : true;
                    });
                    
                    response = { success: true, data: purchases };
                }
                
                // ============ CREATE PURCHASE ============
                else if (endpoint === 'purchases.php' && method === 'POST') {
                    // Check if already purchased
                    var alreadyPurchased = db.purchases.find(function(p) {
                        return p.user_id === data.user_id && p.tip_id === data.tip_id && p.status === 'paid';
                    });
                    
                    if (alreadyPurchased) {
                        response = { success: false, message: 'Already purchased this tip' };
                    } else {
                        var purchase = {
                            id: 'pur_' + Date.now(),
                            user_id: data.user_id,
                            tip_id: data.tip_id,
                            amount: data.amount,
                            status: 'paid',
                            paid_at: new Date().toISOString(),
                            created_at: new Date().toISOString()
                        };
                        db.purchases.push(purchase);
                        
                        var tipToUpdate = db.tips.find(function(t) { return t.id === data.tip_id; });
                        if (tipToUpdate) {
                            tipToUpdate.purchased = (tipToUpdate.purchased || 0) + 1;
                        }
                        
                        saveLocalDB(db);
                        response = { success: true, message: 'Purchase successful! Tip unlocked.' };
                    }
                }
                
                // ============ GET FOLLOWS ============
                else if (endpoint.includes('follows.php') && method === 'GET') {
                    var followUserId = '';
                    if (endpoint.includes('user_id=')) {
                        followUserId = endpoint.split('user_id=')[1];
                        if (followUserId.includes('&')) followUserId = followUserId.split('&')[0];
                    }
                    
                    var follows = db.follows.filter(function(f) {
                        return followUserId ? f.user_id === followUserId : true;
                    });
                    
                    response = { success: true, data: follows };
                }
                
                // ============ CREATE FOLLOW ============
                else if (endpoint === 'follows.php' && method === 'POST') {
                    var alreadyFollowing = db.follows.find(function(f) {
                        return f.user_id === data.user_id && f.tipster_id === data.tipster_id;
                    });
                    
                    if (alreadyFollowing) {
                        response = { success: false, message: 'Already following this tipster' };
                    } else {
                        db.follows.push({
                            id: 'fol_' + Date.now(),
                            user_id: data.user_id,
                            tipster_id: data.tipster_id,
                            created_at: new Date().toISOString()
                        });
                        saveLocalDB(db);
                        response = { success: true, message: 'Now following!' };
                    }
                }
                
                // ============ ADMIN CLEAR ALL ============
                else if (endpoint.includes('admin.php?action=clear_all') && method === 'POST') {
                    db.tips = [];
                    db.purchases = [];
                    db.follows = [];
                    db.users = db.users.filter(function(u) { return u.role === 'admin'; });
                    saveLocalDB(db);
                    response = { success: true, message: 'All data cleared!' };
                }
                
                // ============ DEFAULT ============
                else {
                    response = { success: true, data: [] };
                }
                
                resolve(response);
                
            } catch(e) {
                reject({ success: false, message: 'Error: ' + e.message });
            }
        }, 200);
    });
}

// ============================================
// SECURITY UTILITIES
// ============================================
var SecurityUtils = {
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
        return { valid: true };
    }
};

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
            toast(error.message || 'Login failed', 'error');
        });
}

// ============================================
// REGISTER FUNCTION
// ============================================
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
        toast('Please enter your full name (minimum 2 characters)', 'error');
        nameInput.focus();
        return;
    }
    
    if (!phone) {
        toast('Please enter your phone number', 'error');
        phoneInput.focus();
        return;
    }
    
    if (!SecurityUtils.validatePhone(phone) && !SecurityUtils.validateEmail(phone)) {
        toast('Please enter a valid phone number (e.g., 0712345678)', 'error');
        phoneInput.focus();
        return;
    }
    
    if (!password || password.length < CONFIG.MIN_PASSWORD_LENGTH) {
        toast('Password must be at least ' + CONFIG.MIN_PASSWORD_LENGTH + ' characters', 'error');
        passwordInput.focus();
        return;
    }
    
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
    
    if (SecurityUtils.validateEmail(phone)) {
        registerData.email = phone.toLowerCase();
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
            toast(error.message || 'Registration failed', 'error');
        });
}

// ============================================
// LOGOUT FUNCTION
// ============================================
function handleLogout() {
    clearSession();
    toast('Logged out successfully', 'success');
    setTimeout(function() {
        window.location.href = 'index.html';
    }, 500);
}

// ============================================
// ADMIN GUARD
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
        nav.innerHTML = '<a href="leaderboard.html" class="btn btn-outline btn-sm">Top Tipsters</a> ' +
                       '<a href="login.html" class="btn btn-outline btn-sm">Login</a> ' +
                       '<a href="register.html" class="btn btn-primary btn-sm">Register</a>';
    }
}

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
// BUY TIP
// ============================================
function buyTip(tipId, amount) {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    if (!confirm('Purchase this tip for ' + fmt(amount) + '?')) return;
    
    apiCall('purchases.php', 'POST', {
        user_id: currentUser.id,
        tip_id: tipId,
        amount: amount
    })
    .then(function(response) {
        if (response.success) {
            toast('✅ Tip unlocked successfully!', 'success');
            setTimeout(function() { location.reload(); }, 1500);
        } else {
            toast(response.message || 'Purchase failed', 'error');
        }
    })
    .catch(function() {
        toast('Purchase failed', 'error');
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
            toast('✅ Now following!', 'success');
        } else {
            toast(response.message || 'Already following', 'info');
        }
    })
    .catch(function() {
        toast('Error following tipster', 'error');
    });
}

// ============================================
// HOME PAGE
// ============================================
function initHomePage() {
    console.log('🏠 Home page initialized');
    
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
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Dark mode
    var savedTheme = localStorage.getItem('bashiri_theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        var darkToggle = document.getElementById('darkModeToggle');
        if (darkToggle) darkToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    restoreSession();
    
    var path = window.location.pathname;
    var isAdminPath = path.indexOf('/admin') !== -1;
    
    if (isAdminPath) {
        if (!requireAdmin()) return;
        initAdminPanel();
    }
    
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    var registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
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
    
    var urlParams = new URLSearchParams(window.location.search);
    var errorMsg = urlParams.get('error');
    if (errorMsg) {
        toast(decodeURIComponent(errorMsg), 'error');
        if (window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
    
    if (!isAdminPath && !loginForm && !registerForm) {
        initHomePage();
    }
    
    console.log('✅ Bashiri Nasi v5.0.0 - LOCAL STORAGE MODE');
    console.log('👑 Default admin: admin@bashiri.com / Admin@123');
});

// ============================================
// ADMIN PANEL
// ============================================
function initAdminPanel() {
    var session = getSession();
    if (!session || session.role !== 'admin') {
        window.location.href = '../login.html?error=Access denied';
        return;
    }
    
    var adminNameEl = document.getElementById('adminName');
    if (adminNameEl) adminNameEl.textContent = session.name || 'Administrator';
    
    console.log('👑 Admin panel initialized');
}

// ============================================
// GLOBAL EXPORTS
// ============================================
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.buyTip = buyTip;
window.followTipster = followTipster;
window.toast = toast;
