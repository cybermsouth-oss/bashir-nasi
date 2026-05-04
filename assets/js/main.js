// ============================================
// BASHIRI NASI - LOCAL STORAGE MODE v5.0
// ============================================
'use strict';

var CONFIG = {
    API_BASE_URL: '',
    USE_LOCAL_STORAGE: true,
    SESSION_TIMEOUT: 30 * 60 * 1000,
    MIN_PASSWORD_LENGTH: 6,
    INPUT_MAX_LENGTH: 200
};

// Database
function getDB() {
    var db = localStorage.getItem('bashiri_db');
    if (!db) {
        var defaultDB = {
            users: [{
                id: 'admin_001',
                name: 'Administrator',
                phone: '255712345678',
                email: 'admin@bashiri.com',
                password: 'Admin@123',
                role: 'admin',
                bio: 'System Administrator',
                is_active: true,
                createdAt: new Date().toISOString()
            }],
            tips: [],
            purchases: [],
            follows: []
        };
        localStorage.setItem('bashiri_db', JSON.stringify(defaultDB));
        return defaultDB;
    }
    return JSON.parse(db);
}

function saveDB(db) {
    localStorage.setItem('bashiri_db', JSON.stringify(db));
}

// API Call
function apiCall(endpoint, method, data) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            var db = getDB();
            
            if (endpoint.indexOf('auth.php?action=login') !== -1) {
                var user = db.users.find(function(u) {
                    var p = data.phone && u.phone === data.phone;
                    var e = data.email && u.email && u.email.toLowerCase() === data.email.toLowerCase();
                    return (p || e) && u.password === data.password;
                });
                if (user) {
                    var token = 'tok_' + Date.now();
                    user.token = token;
                    user.lastLogin = new Date().toISOString();
                    saveDB(db);
                    resolve({
                        success: true,
                        user: { id: user.id, name: user.name, phone: user.phone, email: user.email || '', role: user.role, bio: user.bio || '', token: token }
                    });
                } else {
                    resolve({ success: false, message: 'Invalid credentials' });
                }
            } else if (endpoint.indexOf('auth.php?action=register') !== -1) {
                var exists = db.users.find(function(u) {
                    return u.phone === data.phone || (data.email && u.email === data.email);
                });
                if (exists) {
                    resolve({ success: false, message: 'Phone or email already registered' });
                } else {
                    db.users.push({
                        id: 'usr_' + Date.now(),
                        name: data.name,
                        phone: data.phone,
                        email: data.email || '',
                        password: data.password,
                        role: 'user',
                        bio: '',
                        is_active: true,
                        createdAt: new Date().toISOString()
                    });
                    saveDB(db);
                    resolve({ success: true, message: 'Registration successful!' });
                }
            } else if (endpoint.indexOf('users.php') !== -1 && method === 'GET') {
                var role = '';
                if (endpoint.indexOf('role=') !== -1) {
                    role = endpoint.split('role=')[1].split('&')[0];
                }
                var users = db.users.filter(function(u) { return role ? u.role === role : true; }).map(function(u) {
                    return { id: u.id, name: u.name, phone: u.phone, email: u.email, role: u.role, bio: u.bio, is_active: u.is_active, created_at: u.createdAt };
                });
                resolve({ success: true, data: users });
            } else if (endpoint === 'tips.php' && method === 'GET') {
                var tips = db.tips.map(function(t) {
                    var tipster = db.users.find(function(u) { return u.id === t.tipster_id; });
                    return { id: t.id, tipster_id: t.tipster_id, tipster_name: tipster ? tipster.name : 'Unknown', platform: t.platform, code: t.code, odds: t.odds, price: t.price, result: t.result || 'pending', purchased: t.purchased || 0, status: t.status || 'active', created_at: t.createdAt };
                });
                resolve({ success: true, data: tips });
            } else if (endpoint === 'tips.php' && method === 'POST') {
                db.tips.push({ id: 'tip_' + Date.now(), tipster_id: data.tipster_id, platform: data.platform, code: data.bet_code, odds: data.odds, price: data.price, result: 'pending', purchased: 0, status: 'active', createdAt: new Date().toISOString() });
                saveDB(db);
                resolve({ success: true, message: 'Tip uploaded!' });
            } else if (endpoint === 'purchases.php' && method === 'GET') {
                var uid = '';
                if (endpoint.indexOf('user_id=') !== -1) { uid = endpoint.split('user_id=')[1].split('&')[0]; }
                var purchases = db.purchases.filter(function(p) { return uid ? p.user_id === uid : true; });
                resolve({ success: true, data: purchases });
            } else if (endpoint === 'purchases.php' && method === 'POST') {
                db.purchases.push({ id: 'pur_' + Date.now(), user_id: data.user_id, tip_id: data.tip_id, amount: data.amount, status: 'paid', paid_at: new Date().toISOString(), created_at: new Date().toISOString() });
                var tip = db.tips.find(function(t) { return t.id === data.tip_id; });
                if (tip) tip.purchased = (tip.purchased || 0) + 1;
                saveDB(db);
                resolve({ success: true, message: 'Purchased!' });
            } else if (endpoint === 'follows.php' && method === 'POST') {
                db.follows.push({ id: 'fol_' + Date.now(), user_id: data.user_id, tipster_id: data.tipster_id, created_at: new Date().toISOString() });
                saveDB(db);
                resolve({ success: true, message: 'Following!' });
            } else {
                resolve({ success: true, data: [] });
            }
        }, 100);
    });
}

// Toast
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
        success: { bg: '#D1FAE5', border: '#10B981', icon: '✅' },
        error: { bg: '#FEE2E2', border: '#EF4444', icon: '❌' },
        info: { bg: '#DBEAFE', border: '#3B82F6', icon: 'ℹ️' }
    };
    var c = colors[type] || colors.info;
    var el = document.createElement('div');
    el.style.cssText = 'padding:12px 18px;border-radius:10px;background:' + c.bg + ';box-shadow:0 4px 15px rgba(0,0,0,0.1);font-size:0.9rem;border-left:4px solid ' + c.border + ';min-width:200px;';
    el.textContent = c.icon + ' ' + msg;
    container.appendChild(el);
    setTimeout(function() { if (el.parentNode) el.remove(); }, 5000);
}

// Session
var currentUser = null;

function getSession() {
    try {
        var d = localStorage.getItem('bashiri_session');
        if (!d) return null;
        var s = JSON.parse(d);
        if (s.expiresAt && Date.now() > s.expiresAt) { localStorage.removeItem('bashiri_session'); return null; }
        return s;
    } catch(e) { return null; }
}

function saveSession(user) {
    currentUser = user;
    localStorage.setItem('bashiri_session', JSON.stringify({
        id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, bio: user.bio || '', token: user.token,
        createdAt: Date.now(), expiresAt: Date.now() + CONFIG.SESSION_TIMEOUT
    }));
    updateNav();
}

function clearSession() {
    currentUser = null;
    localStorage.removeItem('bashiri_session');
    updateNav();
}

function restoreSession() {
    var s = getSession();
    if (s) { currentUser = { id: s.id, name: s.name, phone: s.phone, email: s.email, role: s.role, bio: s.bio || '' }; updateNav(); }
}

// Escape HTML
function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

// Navigation
function updateNav() {
    var nav = document.getElementById('navLinks');
    if (!nav) return;
    var s = getSession();
    if (s && s.id) {
        var icons = { admin: '👑', tipster: '🎯', user: '👤' };
        nav.innerHTML = '<span style="font-size:0.85rem;">' + (icons[s.role] || '') + ' ' + esc(s.name) + '</span> ' +
            (s.role === 'admin' ? '<a href="admin/" class="btn btn-outline btn-sm"><i class="fas fa-shield-alt"></i> Admin</a> ' : '') +
            '<button class="btn btn-outline btn-sm" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Logout</button>';
    } else {
        nav.innerHTML = '<a href="leaderboard.html" class="btn btn-outline btn-sm">Top Tipsters</a> ' +
            '<a href="login.html" class="btn btn-outline btn-sm">Login</a> ' +
            '<a href="register.html" class="btn btn-primary btn-sm">Register</a>';
    }
}

// Login
function handleLogin(e) {
    e.preventDefault();
    var phone = document.getElementById('phone').value.trim();
    var password = document.getElementById('password').value;
    var btn = document.querySelector('#loginForm button[type="submit"]');
    
    if (!phone || !password) { toast('Please fill all fields', 'error'); return; }
    
    var orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    var data = { password: password };
    if (phone.indexOf('@') !== -1) { data.email = phone.toLowerCase(); } else { data.phone = phone; }
    
    apiCall('auth.php?action=login', 'POST', data).then(function(r) {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (r.success) {
            saveSession(r.user);
            toast('Welcome, ' + r.user.name + '!', 'success');
            setTimeout(function() {
                window.location.href = r.user.role === 'admin' ? 'admin/index.html' : 'index.html';
            }, 800);
        } else {
            toast(r.message || 'Login failed', 'error');
        }
    }).catch(function() {
        btn.disabled = false;
        btn.innerHTML = orig;
        toast('Login failed', 'error');
    });
}

// Register
function handleRegister(e) {
    e.preventDefault();
    var name = document.getElementById('fullName').value.trim();
    var phone = document.getElementById('phone').value.trim();
    var password = document.getElementById('password').value;
    var btn = document.querySelector('#registerForm button[type="submit"]');
    
    if (!name || !phone || !password) { toast('Please fill all fields', 'error'); return; }
    if (name.length < 2) { toast('Name too short', 'error'); return; }
    if (password.length < 6) { toast('Password must be 6+ characters', 'error'); return; }
    
    var orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    
    apiCall('auth.php?action=register', 'POST', { name: name, phone: phone, password: password }).then(function(r) {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (r.success) {
            toast('Account created! Please login.', 'success');
            setTimeout(function() { window.location.href = 'login.html'; }, 1500);
        } else {
            toast(r.message || 'Registration failed', 'error');
        }
    }).catch(function() {
        btn.disabled = false;
        btn.innerHTML = orig;
        toast('Registration failed', 'error');
    });
}

// Logout
function handleLogout() {
    clearSession();
    toast('Logged out', 'success');
    setTimeout(function() { window.location.href = 'index.html'; }, 500);
}

// Format
function fmt(n) { var a = Number(n); return isNaN(a) ? 'TZS 0' : 'TZS ' + a.toLocaleString('en-TZ'); }
function fdate(d) { if (!d) return 'N/A'; try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch(e) { return 'N/A'; } }
function getPlatformIcon(p) { p = (p || '').toUpperCase(); if (p.includes('SPORTBET')) return '🔴'; if (p === 'BETPAWA') return '🔵'; if (p === 'SPORTPESA') return '🟢'; return '📱'; }

// Init
document.addEventListener('DOMContentLoaded', function() {
    var saved = localStorage.getItem('bashiri_theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    
    restoreSession();
    
    // Admin guard
    var path = window.location.pathname;
    if (path.indexOf('/admin') !== -1) {
        var s = getSession();
        if (!s || !s.id || s.role !== 'admin') {
            window.location.href = '../login.html?error=Access denied';
            return;
        }
    }
    
    var loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    
    var registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
});

// Exports
window.handleLogout = handleLogout;
window.toast = toast;

console.log('✅ Bashiri Nasi v5.0 Ready - Local Storage Mode');
console.log('🔑 Admin: admin@bashiri.com / Admin@123');
