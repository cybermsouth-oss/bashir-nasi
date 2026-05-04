// ============================================
// BASHIRI NASI - COMPLETE APPLICATION v3.0.0
// FULLY FIXED - ALL DATA TO MYSQL
// ============================================

'use strict';

// ============================================
// CONFIGURATION
// ============================================
var CONFIG = {
  DB_MODE: 'api',
  API_BASE_URL: 'http://localhost/bashiri-nasi/api/',
  SESSION_TIMEOUT: 30 * 60 * 1000,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_TIME: 60 * 60 * 1000,
  MAX_PASSWORD_LENGTH: 128,
  MIN_PASSWORD_LENGTH: 6,
  INPUT_MAX_LENGTH: 200
};

// ============================================
// API CALLER FUNCTION
// ============================================
function apiCall(endpoint, method, data) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        var url = CONFIG.API_BASE_URL + endpoint;
        if (method === 'GET' && data) {
            var params = [];
            for (var key in data) {
                if (data.hasOwnProperty(key)) params.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
            }
            if (params.length > 0) url += '?' + params.join('&');
        }
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function() {
            try {
                var response = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) resolve(response);
                else reject(response || { success: false, message: 'Server error' });
            } catch(e) { reject({ success: false, message: 'Invalid response' }); }
        };
        xhr.onerror = function() { reject({ success: false, message: 'Network error' }); };
        if (method === 'GET') xhr.send();
        else xhr.send(JSON.stringify(data || {}));
    });
}

// ============================================
// PASSWORD HASHING
// ============================================
function hashPassword(password) {
    if (!password) return '';
    var h = ''; for (var i = 0; i < password.length; i++) h += String.fromCharCode(password.charCodeAt(i) + 7);
    return h;
}

function verifyPassword(inputPassword, storedHash) {
    if (!inputPassword || !storedHash) return false;
    var h = ''; for (var i = 0; i < inputPassword.length; i++) h += String.fromCharCode(inputPassword.charCodeAt(i) + 7);
    return h === storedHash;
}

// ============================================
// VALIDATION
// ============================================
function validatePhone(phone) {
    if (!phone) return false;
    phone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '255' + phone.substring(1);
    return /^255[67]\d{8}$/.test(phone);
}

function sanitizeInput(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim().substring(0, CONFIG.INPUT_MAX_LENGTH);
}

function escapeHTML(str) {
    if (!str) return '';
    var div = document.createElement('div'); div.textContent = str; return div.innerHTML;
}

// ============================================
// HELPERS
// ============================================
function fmt(n) { var a = Number(n); return isNaN(a) || a < 0 ? 'TZS 0' : 'TZS ' + a.toLocaleString('en-TZ'); }
function fdate(d) { if (!d) return 'N/A'; try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch(e) { return 'N/A'; } }
function $(id) { return id ? document.getElementById(id) : null; }
function getBadge(result) {
    if (result === 'won') return { class: 'badge-success', text: '🏆 WON' };
    if (result === 'lost') return { class: 'badge-danger', text: '❌ LOST' };
    return { class: 'badge-warning', text: '⏳ PENDING' };
}
function getPlatformIcon(platform) {
    var p = (platform || '').toUpperCase();
    if (p === 'SPORTBET') return '🔴'; if (p === 'BETPAWA') return '🔵'; if (p === 'SPORTPESA') return '🟢';
    return '📱';
}

// ============================================
// TOAST
// ============================================
function toast(msg, type) {
    msg = String(msg); type = ['success', 'error', 'info', 'warning'].indexOf(type) !== -1 ? type : 'info';
    var container = document.getElementById('toastContainer');
    if (!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;'; document.body.appendChild(container); }
    while (container.children.length >= 3) { if (container.firstChild) container.removeChild(container.firstChild); }
    var el = document.createElement('div');
    var bc = type === 'error' ? '#EF4444' : type === 'info' ? '#3B82F6' : '#10B981';
    el.style.cssText = 'padding:12px 18px;border-radius:10px;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.15);margin-top:8px;font-size:0.9rem;border-left:4px solid ' + bc + ';min-width:200px;';
    el.textContent = msg; container.appendChild(el);
    setTimeout(function() { if (el && el.parentNode) { el.style.opacity = '0'; setTimeout(function() { if (el && el.parentNode) el.remove(); }, 300); } }, 3500);
}

// ============================================
// DARK MODE
// ============================================
function initDarkMode() {
    var saved = localStorage.getItem('bashiri_theme'), btn = document.getElementById('darkModeToggle');
    if (saved === 'dark') { document.documentElement.setAttribute('data-theme', 'dark'); if (btn) btn.innerHTML = '<i class="fas fa-sun"></i>'; }
    else if (btn) btn.innerHTML = '<i class="fas fa-moon"></i>';
}
function toggleDarkMode() {
    var cur = document.documentElement.getAttribute('data-theme'), next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next); localStorage.setItem('bashiri_theme', next);
    var btn = document.getElementById('darkModeToggle'); if (btn) btn.innerHTML = next === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// ============================================
// SESSION
// ============================================
var currentUser = null, sessionTimeout = null;

function restoreSession() {
    try {
        var s = localStorage.getItem('bashiri_session'); if (!s) return;
        var session = JSON.parse(s);
        if (!session.id || !session.role) { clearSession(); return; }
        if (session.expiresAt && Date.now() > session.expiresAt) { clearSession(); return; }
        currentUser = { id: session.id, name: session.name, phone: session.phone, role: session.role, bio: session.bio || '' };
        resetSessionTimer();
    } catch(e) { clearSession(); }
}

function saveSession(user) {
    currentUser = { id: user.id, name: user.name, phone: user.phone, role: user.role, bio: user.bio || '' };
    localStorage.setItem('bashiri_session', JSON.stringify({ id: user.id, name: user.name, phone: user.phone, role: user.role, bio: user.bio || '', createdAt: Date.now(), expiresAt: Date.now() + CONFIG.SESSION_TIMEOUT }));
    resetSessionTimer();
}

function clearSession() { currentUser = null; localStorage.removeItem('bashiri_session'); if (sessionTimeout) { clearTimeout(sessionTimeout); sessionTimeout = null; } }

function resetSessionTimer() {
    if (sessionTimeout) clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(function() { clearSession(); toast('Session expired', 'info'); setTimeout(function() { window.location.href = 'index.html'; }, 1000); }, CONFIG.SESSION_TIMEOUT);
}

// ============================================
// NAVIGATION
// ============================================
function updateNav() {
    var nav = $('navLinks'); if (!nav) return;
    if (currentUser) {
        var icons = { admin: '👑', tipster: '🎯', user: '👤' };
        var h = '<span style="font-size:0.85rem;font-weight:500;">' + (icons[currentUser.role] || '') + ' ' + escapeHTML(currentUser.name) + '</span>';
        if (currentUser.role === 'admin') h += ' <a href="admin/" class="btn btn-outline btn-sm"><i class="fas fa-shield-alt"></i> Admin</a>';
        h += ' <button class="btn btn-outline btn-sm" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>';
        nav.innerHTML = h;
    } else { nav.innerHTML = '<a href="login.html" class="btn btn-outline btn-sm">Login</a> <a href="register.html" class="btn btn-primary btn-sm">Register</a>'; }
}

function logout() { clearSession(); toast('Logged out', 'success'); setTimeout(function() { window.location.href = 'index.html'; }, 500); }

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() { initApp(); });

function initApp() {
    initDarkMode(); restoreSession(); routePage();
}

// ============================================
// ROUTING
// ============================================
function routePage() {
    updateNav(); var path = window.location.pathname;
    if (path.indexOf('/admin/') !== -1) initAdmin();
    else if (path.indexOf('login.html') !== -1) setupLogin();
    else if (path.indexOf('register.html') !== -1) setupRegister();
    else setupHome();
}

// ============================================
// LOGIN
// ============================================
function setupLogin() {
    updateNav(); 
    var form = $('loginForm'); 
    if (!form) return;
    
    form.onsubmit = function(e) {
        e.preventDefault();
        var input = sanitizeInput($('phone').value).toLowerCase().trim();
        var password = $('password').value;
        
        if (!input || !password) { 
            toast('Fill all fields', 'error'); 
            return; 
        }
        
        apiCall('auth.php?action=login', 'POST', { 
            phone: input, 
            password: password 
        })
        .then(function(r) { 
            if (r.success) { 
                saveSession(r.user); 
                toast('Welcome, ' + escapeHTML(r.user.name) + '!', 'success'); 
                setTimeout(function() { 
                    window.location.href = r.user.role === 'admin' ? 'admin/' : 'index.html'; 
                }, 800); 
            } else {
                toast(r.message || 'Login failed', 'error');
            }
        })
        .catch(function(err) { 
            toast('Server error. Please try again.', 'error');
        });
    };
}

// ============================================
// REGISTER
// ============================================
function setupRegister() {
    updateNav(); 
    var form = $('registerForm'); 
    if (!form) return;
    
    form.onsubmit = function(e) {
        e.preventDefault();
        var name = sanitizeInput($('fullName').value);
        var phone = sanitizeInput($('phone').value);
        var password = $('password').value;
        
        if (!name || !phone || !password) { 
            toast('Fill all fields', 'error'); 
            return; 
        }
        if (name.length < 2) { 
            toast('Name too short', 'error'); 
            return; 
        }
        if (!validatePhone(phone)) { 
            toast('Invalid phone number', 'error'); 
            return; 
        }
        if (password.length < 6) { 
            toast('Password 6+ characters', 'error'); 
            return; 
        }
        
        apiCall('auth.php?action=register', 'POST', { 
            name: name, 
            phone: phone, 
            password: password 
        })
        .then(function(r) { 
            if (r.success) { 
                toast('Account created! Login now.', 'success'); 
                setTimeout(function() { 
                    window.location.href = 'login.html'; 
                }, 1500); 
            } else {
                toast(r.message || 'Registration failed', 'error');
            }
        })
        .catch(function(err) { 
            toast('Server error. Please try again.', 'error');
        });
    };
}

// ============================================
// HOME PAGE
// ============================================
function setupHome() {
    // Load tips from API
    apiCall('tips.php?action=all', 'GET')
        .then(function(response) {
            if (response.success) {
                var tips = response.data;
                var w = tips.filter(function(t) { return t.result === 'won'; }).length;
                var l = tips.filter(function(t) { return t.result === 'lost'; }).length;
                setStats(w, l, tips.length, (w+l)>0?Math.round((w/(w+l))*100):0);
                loadRecentTips(tips);
            } else {
                loadRecentTips([]);
            }
        })
        .catch(function() { loadRecentTips([]); });
    
    showDashboard();
}

function setStats(won, lost, total, winRate) { 
    var els = { wonCount: won, lostCount: lost, totalBets: total, winRate: winRate + '%' }; 
    for (var id in els) { var el = $(id); if (el) el.textContent = els[id]; } 
}

function isPurchased(tipId) { 
    if (!currentUser) return false; 
    // Check from API later, for now return false
    return false;
}

function loadRecentTips(tips) {
    var c = $('recentBetSlips'); if (!c) return;
    var recent = tips.slice(-6).reverse();
    if (recent.length === 0) { c.innerHTML = '<div style="text-align:center;padding:50px;"><h4>No Tips Yet</h4></div>'; return; }
    var isLoggedIn = (currentUser !== null), h = '';
    for (var r = 0; r < recent.length; r++) {
        var t = recent[r], platform = escapeHTML((t.platform || 'Unknown').toUpperCase()), badge = getBadge(t.result), icon = getPlatformIcon(platform), isPending = (t.result === 'pending'), borderColor = isPending ? '#F59E0B' : (t.result === 'won' ? '#10B981' : '#EF4444');
        h += '<div class="bet-slip-card" style="border-left:4px solid ' + borderColor + ';">' +
            '<div class="bet-slip-header" style="background:' + (isPending ? 'linear-gradient(135deg,#F59E0B,#D97706)' : t.result === 'won' ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#DC2626,#991B1B)') + ';">' +
            '<span>' + icon + ' ' + platform + '</span><span class="badge ' + badge.class + '">' + badge.text + '</span></div>' +
            '<div class="bet-slip-body">' +
            (!isLoggedIn ? '<div class="bet-code">🔒 ●●●●●●●●</div><a href="login.html" class="btn btn-primary btn-sm">Login to View</a>' :
             isPending ? '<div style="text-align:center;padding:15px;background:#FFFBEB;border-radius:10px;border:1px dashed #F59E0B;"><div style="font-size:0.8rem;color:#D97706;">Match Not Complete</div><div style="font-size:1.5rem;font-weight:900;color:#F59E0B;">Odds: ' + t.odds + '</div><button class="btn btn-primary btn-sm" style="margin-top:8px;background:#F59E0B;" onclick="buyTip(\'' + t.id + '\',' + t.price + ')">🔓 Unlock ' + fmt(t.price) + '</button></div>' :
             '<div class="bet-code">🔒 ●●●●●●●●</div><button class="btn btn-primary btn-sm" onclick="buyTip(\'' + t.id + '\',' + t.price + ')">🔓 Unlock ' + fmt(t.price) + '</button>') +
            '<div style="display:flex;justify-content:space-between;margin-top:8px;"><span>Odds: <strong>' + t.odds + '</strong></span><span style="font-weight:700;color:#059669;">' + fmt(t.price) + '</span></div>' +
            '<div style="font-size:0.75rem;color:#6B7280;margin-top:4px;">' + escapeHTML(t.tipster_name || 'Expert') + ' | ' + (t.purchased || 0) + ' sold</div>' +
            '</div></div>';
    }
    c.innerHTML = h;
}

function showDashboard() {
    var home = $('homepageContent'), user = $('userSection'), tipster = $('tipsterSection'); if (!home || !user || !tipster) return;
    if (currentUser && currentUser.role === 'tipster') { home.style.display = 'none'; user.style.display = 'none'; tipster.style.display = 'block'; var dn = $('tipsterDisplayName'); if (dn) dn.textContent = currentUser.name || 'Tipster'; setupTipsterSidebar(); loadTipsterDashboard(); }
    else if (currentUser && currentUser.role === 'user') { home.style.display = 'none'; tipster.style.display = 'none'; user.style.display = 'block'; var un = $('userDisplayName'); if (un) un.textContent = currentUser.name || 'Bettor'; setupUserSidebar(); loadUserDashboard(); }
    else { home.style.display = 'block'; user.style.display = 'none'; tipster.style.display = 'none'; }
}

// ============================================
// USER DASHBOARD
// ============================================
function setupUserSidebar() { document.querySelectorAll('[data-tab]').forEach(function(item) { item.onclick = function() { var tab = this.getAttribute('data-tab'); document.querySelectorAll('[data-tab]').forEach(function(i) { i.classList.remove('active'); }); this.classList.add('active'); document.querySelectorAll('.tab-content').forEach(function(c) { c.style.display = 'none'; }); var tabEl = $(tab + 'Tab'); if (tabEl) { tabEl.style.display = 'block'; loadUserTabContent(tab); } }; }); }

function loadUserTabContent(tab) { switch(tab) { case 'overview': loadUserOverview(); break; case 'tips': loadUserTipsTab(); break; case 'tipsters': loadUserTipstersTab(); break; case 'followed': loadUserFollowedTab(); break; case 'purchases': loadUserPurchasesTab(); break; } }

function loadUserDashboard() { loadUserOverview(); }

function loadUserOverview() { 
    if (!currentUser) return; 
    apiCall('purchases.php?user_id=' + currentUser.id, 'GET')
        .then(function(purchaseResponse) {
            var purchases = purchaseResponse.success ? purchaseResponse.data : [];
            var paidPurchases = purchases.filter(function(x) { return x.status === 'paid'; });
            var s = 0; for (var i = 0; i < paidPurchases.length; i++) s += paidPurchases[i].amount || 0;
            
            apiCall('tips.php?action=all', 'GET')
                .then(function(tipResponse) {
                    var tips = tipResponse.success ? tipResponse.data : [];
                    var activeTips = tips.filter(function(x) { return x.status === 'active'; });
                    var el = $('userStats'); 
                    if (el) el.innerHTML = '<div class="stat-card"><div class="stat-number">' + paidPurchases.length + '</div><div class="stat-label">Purchased</div></div><div class="stat-card"><div class="stat-number">' + fmt(s) + '</div><div class="stat-label">Total Spent</div></div><div class="stat-card"><div class="stat-number">' + activeTips.length + '</div><div class="stat-label">Available</div></div>';
                });
        });
}

function loadUserTipsTab() {
    if (!currentUser) return;
    apiCall('tips.php?action=all', 'GET')
        .then(function(response) {
            var tips = response.success ? response.data : [];
            var activeTips = tips.filter(function(t) { return t.status === 'active'; });
            var at = $('allAvailableTips'); if (!at) return;
            if (activeTips.length === 0) { at.innerHTML = '<div style="text-align:center;padding:40px;">No Tips Available</div>'; return; }
            
            apiCall('purchases.php?user_id=' + currentUser.id, 'GET')
                .then(function(purchaseResponse) {
                    var purchases = purchaseResponse.success ? purchaseResponse.data : [];
                    var purchasedTipIds = purchases.filter(function(p) { return p.status === 'paid'; }).map(function(p) { return p.tip_id; });
                    
                    var h = '';
                    for (var t = 0; t < activeTips.length; t++) {
                        var tip = activeTips[t];
                        var bought = purchasedTipIds.indexOf(tip.id) !== -1;
                        var icon = getPlatformIcon(tip.platform), badge = getBadge(tip.result), isPending = (tip.result === 'pending'), borderColor = isPending ? '#F59E0B' : (tip.result === 'won' ? '#10B981' : '#EF4444');
                        h += '<div class="bet-slip-card" style="border-left:4px solid ' + borderColor + ';"><div class="bet-slip-header" style="background:' + (isPending ? 'linear-gradient(135deg,#F59E0B,#D97706)' : tip.result === 'won' ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#DC2626,#991B1B)') + ';"><span>' + icon + ' ' + escapeHTML((tip.platform || 'Unknown').toUpperCase()) + '</span><span class="badge ' + badge.class + '">' + badge.text + '</span></div><div class="bet-slip-body">' + (bought ? '<div class="bet-code" style="color:#059669;border:2px solid #10B981;">🔓 ' + escapeHTML(tip.code) + '</div>' : '<div class="bet-code">🔒 ●●●●●●●●</div>') + '<div style="display:flex;justify-content:space-between;margin-top:8px;"><span>Odds: ' + tip.odds + '</span><span>' + fmt(tip.price) + '</span></div><div style="font-size:0.75rem;margin-top:4px;">' + escapeHTML(tip.tipster_name || 'Expert') + ' | Sold: ' + (tip.purchased || 0) + '</div>' + (!bought ? '<button class="btn btn-primary btn-block" style="margin-top:8px;" onclick="buyTip(\'' + tip.id + '\',' + tip.price + ')">🔓 Unlock ' + fmt(tip.price) + '</button>' : '<div style="margin-top:8px;padding:10px;background:#ECFDF5;border-radius:8px;text-align:center;color:#059669;">✅ Purchased</div>') + '</div></div>';
                    }
                    at.innerHTML = h;
                });
        });
}

function loadUserTipstersTab() { 
    if (!currentUser) return; 
    apiCall('users.php?role=tipster', 'GET')
        .then(function(response) {
            var tipsters = response.success ? response.data : [];
            var grid = $('tipstersGrid'); if (!grid) return;
            if (tipsters.length === 0) { grid.innerHTML = '<p>No tipsters yet.</p>'; return; }
            
            apiCall('tips.php?action=all', 'GET')
                .then(function(tipResponse) {
                    var tips = tipResponse.success ? tipResponse.data : [];
                    var h = '';
                    for (var i = 0; i < tipsters.length; i++) {
                        var tp = tipsters[i];
                        var tt = tips.filter(function(t) { return t.tipster_id === tp.id; });
                        var won = tt.filter(function(t) { return t.result === 'won'; }).length;
                        var wr = tt.length > 0 ? Math.round((won / tt.length) * 100) : 0;
                        h += '<div class="card" style="text-align:center;"><div style="width:60px;height:60px;background:linear-gradient(135deg,#059669,#10B981);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:1.5rem;font-weight:700;margin:0 auto 12px;">' + (tp.name || 'T').charAt(0).toUpperCase() + '</div><h4>' + escapeHTML(tp.name) + '</h4><p>' + escapeHTML(tp.bio || 'Tipster') + '</p><div>' + tt.length + ' Tips | ' + wr + '% Win</div><button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="followTipster(\'' + tp.id + '\')"><i class="fas fa-star"></i> Follow</button></div>';
                    }
                    grid.innerHTML = h;
                });
        });
}

function followTipster(tipsterId) { 
    if (!currentUser) { window.location.href = 'login.html'; return; }
    apiCall('follows.php', 'POST', { user_id: currentUser.id, tipster_id: tipsterId })
        .then(function(r) {
            if (r.success) toast('✅ Following!', 'success');
            else toast(r.message || 'Already following', 'info');
        })
        .catch(function() { toast('Error following', 'error'); });
}

function loadUserFollowedTab() { 
    if (!currentUser) return;
    apiCall('follows.php?user_id=' + currentUser.id, 'GET')
        .then(function(followResponse) {
            var follows = followResponse.success ? followResponse.data : [];
            if (follows.length === 0) { 
                var ft = $('followedTips'); 
                if (ft) ft.innerHTML = '<p style="text-align:center;padding:40px;">Not following any tipsters.</p>';
                return;
            }
            var ftIds = follows.map(function(f) { return f.tipster_id; });
            apiCall('tips.php?action=all', 'GET')
                .then(function(tipResponse) {
                    var tips = tipResponse.success ? tipResponse.data : [];
                    var ftips = tips.filter(function(t) { return ftIds.indexOf(t.tipster_id) !== -1; });
                    apiCall('purchases.php?user_id=' + currentUser.id, 'GET')
                        .then(function(purchaseResponse) {
                            var purchases = purchaseResponse.success ? purchaseResponse.data : [];
                            var purchasedTipIds = purchases.filter(function(p) { return p.status === 'paid'; }).map(function(p) { return p.tip_id; });
                            var ftEl = $('followedTips'); if (!ftEl) return;
                            if (ftips.length === 0) { ftEl.innerHTML = '<p style="text-align:center;padding:40px;">No tips from followed tipsters.</p>'; return; }
                            var h = '';
                            for (var t = 0; t < ftips.length; t++) {
                                var tip = ftips[t];
                                var bought = purchasedTipIds.indexOf(tip.id) !== -1;
                                h += '<div class="bet-slip-card"><div class="bet-slip-header"><span>' + getPlatformIcon(tip.platform) + ' ' + escapeHTML((tip.platform || 'Unknown').toUpperCase()) + '</span></div><div class="bet-slip-body">' + (bought ? '<div class="bet-code" style="color:#059669;">🔓 ' + escapeHTML(tip.code) + '</div>' : '<div class="bet-code">🔒 ●●●●●●●●</div>') + '<div><span>Odds: ' + tip.odds + '</span><span>' + fmt(tip.price) + '</span></div>' + (!bought ? '<button class="btn btn-primary btn-block" onclick="buyTip(\'' + tip.id + '\',' + tip.price + ')">🔓 Unlock ' + fmt(tip.price) + '</button>' : '<div style="color:#059669;">✅ Purchased</div>') + '</div></div>';
                            }
                            ftEl.innerHTML = h;
                        });
                });
        });
}

function loadUserPurchasesTab() { 
    if (!currentUser) return;
    apiCall('purchases.php?user_id=' + currentUser.id, 'GET')
        .then(function(response) {
            var purchases = response.success ? response.data : [];
            var paidPurchases = purchases.filter(function(p) { return p.status === 'paid'; });
            var mp = $('myPurchases'); if (!mp) return;
            if (paidPurchases.length === 0) { mp.innerHTML = '<p style="text-align:center;padding:40px;">No purchases yet.</p>'; return; }
            
            apiCall('tips.php?action=all', 'GET')
                .then(function(tipResponse) {
                    var tips = tipResponse.success ? tipResponse.data : [];
                    var h = '';
                    for (var i = paidPurchases.length - 1; i >= 0; i--) {
                        var purchase = paidPurchases[i];
                        var tip = tips.find(function(t) { return t.id === purchase.tip_id; });
                        if (tip) h += '<div class="bet-slip-card"><div class="bet-slip-header"><span>' + getPlatformIcon(tip.platform) + ' ' + escapeHTML((tip.platform || 'Unknown').toUpperCase()) + '</span><span class="badge badge-success">✅ PURCHASED</span></div><div class="bet-slip-body"><div class="bet-code" style="color:#059669;border:2px solid #10B981;">🔓 ' + escapeHTML(tip.code) + '</div><div><span>Odds: ' + tip.odds + '</span><span>' + fmt(tip.price) + '</span></div></div></div>';
                    }
                    mp.innerHTML = h || '<p>No purchases.</p>';
                });
        });
}

// ============================================
// BUY TIP
// ============================================
function buyTip(tipId, amount) { 
    if (!currentUser) { window.location.href = 'login.html'; return; } 
    if (!confirm('Purchase ' + fmt(amount) + '?')) return; 
    apiCall('purchases.php', 'POST', { user_id: currentUser.id, tip_id: tipId, amount: amount })
        .then(function(r) { 
            if (r.success) { 
                toast('✅ Tip unlocked!', 'success'); 
                loadUserTipsTab(); 
                loadUserPurchasesTab(); 
                loadUserOverview(); 
                location.reload();
            } else toast(r.message || 'Purchase failed', 'error'); 
        })
        .catch(function() { toast('Purchase failed', 'error'); });
}

// ============================================
// TIPSTER DASHBOARD
// ============================================
function setupTipsterSidebar() { document.querySelectorAll('[data-tab-tipster]').forEach(function(item) { item.onclick = function() { var tab = this.getAttribute('data-tab-tipster'); document.querySelectorAll('[data-tab-tipster]').forEach(function(i) { i.classList.remove('active'); }); this.classList.add('active'); document.querySelectorAll('.tipster-tab-content').forEach(function(c) { c.style.display = 'none'; }); var tabId = 'tipster' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Tab', tabEl = $(tabId); if (tabEl) { tabEl.style.display = 'block'; loadTipsterTabContent(tab); } }; }); var ot = $('tipsterOverviewTab'); if (ot) ot.style.display = 'block'; }

function loadTipsterTabContent(tab) { switch(tab) { case 'overview': loadTipsterOverview(); break; case 'upload': setupTipsterUploadForm(); break; case 'mytips': loadTipsterMyTips(); break; case 'sales': loadTipsterSales(); break; } }

function loadTipsterDashboard() { loadTipsterOverview(); }

function loadTipsterOverview() { 
    if (!currentUser) return;
    apiCall('tips.php?action=tipster&tipster_id=' + currentUser.id, 'GET')
        .then(function(response) {
            var mt = response.success ? response.data : [];
            var ts = 0, tr = 0;
            for (var i = 0; i < mt.length; i++) { ts += (mt[i].purchased || 0); tr += (mt[i].purchased || 0) * (mt[i].price || 0); }
            var wt = mt.filter(function(t) { return t.result === 'won'; }).length;
            var lt = mt.filter(function(t) { return t.result === 'lost'; }).length;
            var wr = (wt+lt)>0?Math.round((wt/(wt+lt))*100):0;
            var ic = $('tipsterInfoCard'); 
            if (ic) ic.innerHTML = '<div style="display:flex;align-items:center;gap:16px;"><div style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:1.8rem;">' + (currentUser.name||'T').charAt(0).toUpperCase() + '</div><div><h2 style="color:white;margin:0;">' + escapeHTML(currentUser.name) + '</h2><p style="color:rgba(255,255,255,0.8);">' + escapeHTML(currentUser.bio||'Tipster') + '</p></div></div>';
            var s = $('tipsterStats'); 
            if (s) s.innerHTML = '<div class="stat-card"><div class="stat-number">' + mt.length + '</div><div class="stat-label">My Tips</div></div><div class="stat-card"><div class="stat-number">' + ts + '</div><div class="stat-label">Sold</div></div><div class="stat-card"><div class="stat-number">' + fmt(tr) + '</div><div class="stat-label">Revenue</div></div><div class="stat-card"><div class="stat-number">' + wr + '%</div><div class="stat-label">Win Rate</div></div>';
        });
}

function setupTipsterUploadForm() { 
    var form = $('uploadTipForm'); 
    if (!form) return; 
    var nf = form.cloneNode(true); 
    form.parentNode.replaceChild(nf, form); 
    nf.onsubmit = function(e) { 
        e.preventDefault(); 
        var platform = sanitizeInput($('tipPlatform').value); 
        var code = sanitizeInput($('tipCode').value); 
        var odds = parseFloat($('tipOdds').value); 
        var price = parseInt($('tipPrice').value); 
        if (!platform) { toast('Select platform', 'error'); return; } 
        if (!code || code.length < 3) { toast('Enter valid code', 'error'); return; } 
        if (!odds || odds <= 1) { toast('Odds > 1.00', 'error'); return; } 
        if (!price || price < 1000) { toast('Min TZS 1,000', 'error'); return; } 
        apiCall('tips.php', 'POST', { tipster_id: currentUser.id, platform: platform, bet_code: code, odds: odds, price: price, result: 'pending' })
            .then(function(r) { 
                if (r.success) { 
                    toast('✅ Tip uploaded!', 'success'); 
                    $('tipPlatform').value = ''; 
                    $('tipCode').value = ''; 
                    $('tipOdds').value = ''; 
                    $('tipPrice').value = ''; 
                    loadTipsterOverview(); 
                    loadTipsterMyTips(); 
                } else toast(r.message, 'error'); 
            })
            .catch(function() { toast('Upload failed', 'error'); });
    }; 
}

function loadTipsterMyTips() { 
    if (!currentUser) return;
    apiCall('tips.php?action=tipster&tipster_id=' + currentUser.id, 'GET')
        .then(function(response) {
            var myTips = response.success ? response.data : [];
            var ml = $('myTipsList'); if (!ml) return;
            if (myTips.length === 0) { ml.innerHTML = '<div style="text-align:center;padding:40px;">No Tips Yet</div>'; return; }
            myTips.reverse();
            var h = '';
            for (var i = 0; i < myTips.length; i++) {
                var tip = myTips[i];
                var isPending = tip.result === 'pending';
                h += '<div class="bet-slip-card" style="border-left:4px solid ' + (isPending?'#F59E0B':tip.result==='won'?'#10B981':'#EF4444') + ';"><div class="bet-slip-header" style="background:' + (isPending?'linear-gradient(135deg,#F59E0B,#D97706)':tip.result==='won'?'linear-gradient(135deg,#059669,#047857)':'linear-gradient(135deg,#DC2626,#991B1B)') + ';"><span>' + getPlatformIcon(tip.platform) + ' ' + escapeHTML((tip.platform||'').toUpperCase()) + '</span><span class="badge ' + getBadge(tip.result).class + '">' + getBadge(tip.result).text + '</span></div><div class="bet-slip-body"><div class="bet-code">' + escapeHTML(tip.code) + '</div><div>Odds: ' + tip.odds + ' | Price: ' + fmt(tip.price) + ' | Sold: ' + (tip.purchased||0) + '</div>' + (isPending?'<div style="margin-top:10px;display:flex;gap:8px;"><button class="btn btn-success btn-sm" style="flex:1;" onclick="updateTipResult(\'' + tip.id + '\',\'won\')">🏆 Won</button><button class="btn btn-danger btn-sm" style="flex:1;" onclick="updateTipResult(\'' + tip.id + '\',\'lost\')">❌ Lost</button></div>':'<div style="margin-top:10px;padding:8px;background:' + (tip.result==='won'?'#D1FAE5':'#FEE2E2') + ';border-radius:6px;text-align:center;">' + (tip.result==='won'?'✅ Won':'❌ Lost') + '</div>') + '</div></div>';
            }
            ml.innerHTML = h;
        });
}

function updateTipResult(tipId, newResult) { 
    if (!currentUser || currentUser.role !== 'tipster') return;
    apiCall('tips.php', 'PUT', { tip_id: tipId, result: newResult })
        .then(function(r) { 
            if (r.success) { 
                toast('✅ Updated!', 'success'); 
                loadTipsterOverview(); 
                loadTipsterMyTips(); 
            } else toast(r.message, 'error');
        })
        .catch(function() { toast('Update failed', 'error'); });
}

function loadTipsterSales() { 
    if (!currentUser) return;
    apiCall('tips.php?action=tipster&tipster_id=' + currentUser.id, 'GET')
        .then(function(tipResponse) {
            var myTips = tipResponse.success ? tipResponse.data : [];
            var myTipIds = myTips.map(function(t) { return t.id; });
            apiCall('purchases.php', 'GET')
                .then(function(purchaseResponse) {
                    var allPurchases = purchaseResponse.success ? purchaseResponse.data : [];
                    var mySales = allPurchases.filter(function(p) { return myTipIds.indexOf(p.tip_id) !== -1 && p.status === 'paid'; });
                    var salesEl = $('salesHistory'); if (!salesEl) return;
                    if (mySales.length === 0) { salesEl.innerHTML = '<p style="text-align:center;padding:40px;">No sales yet.</p>'; return; }
                    var totalRevenue = 0;
                    for (var i = 0; i < mySales.length; i++) totalRevenue += mySales[i].amount || 0;
                    var h = '<div style="text-align:center;padding:16px;background:var(--primary-soft);border-radius:12px;margin-bottom:12px;"><span style="font-size:1.5rem;font-weight:800;">' + fmt(totalRevenue) + '</span><p>' + mySales.length + ' sales</p></div>';
                    
                    apiCall('users.php', 'GET')
                        .then(function(userResponse) {
                            var users = userResponse.success ? userResponse.data : [];
                            for (var s = 0; s < mySales.length; s++) {
                                var sale = mySales[s];
                                var tip = myTips.find(function(t) { return t.id === sale.tip_id; });
                                var bn = 'Unknown';
                                var user = users.find(function(u) { return u.id === sale.user_id; });
                                if (user) bn = user.name || user.phone;
                                h += '<div class="card" style="padding:10px;display:flex;justify-content:space-between;"><div>' + (tip?escapeHTML(tip.code):'N/A') + '<br><small>' + fdate(sale.paid_at) + ' | ' + escapeHTML(bn) + '</small></div><div style="font-weight:700;color:#059669;">' + fmt(sale.amount) + '</div></div>';
                            }
                            salesEl.innerHTML = h;
                        });
                });
        });
}

// ============================================
// ADMIN - FULLY FIXED
// ============================================
function initAdmin() { 
    if (!currentUser || currentUser.role !== 'admin') { window.location.href = '../login.html'; return; } 
    updateNav(); 
    var an = $('adminName'); 
    if (an) an.textContent = currentUser.name || 'Administrator'; 
    setupAdminSidebar(); 
    setupAddTipsterForm(); 
    loadAdminData(); 
}

function setupAdminSidebar() { 
    document.querySelectorAll('[data-admin-tab]').forEach(function(item) { 
        item.addEventListener('click', function() { 
            var tab = this.getAttribute('data-admin-tab'); 
            document.querySelectorAll('[data-admin-tab]').forEach(function(i) { i.classList.remove('active'); }); 
            this.classList.add('active'); 
            document.querySelectorAll('.admin-tab-content').forEach(function(c) { c.style.display = 'none'; }); 
            var tabId = 'admin' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Tab'; 
            var tabEl = $(tabId); 
            if (tabEl) { tabEl.style.display = 'block'; loadAdminTabData(tab); } 
        }); 
    }); 
}

function loadAdminTabData(tab) { 
    switch(tab) { 
        case 'overview': loadOverviewData(); loadRecentActivity(); break; 
        case 'users': loadUsersTable(); break; 
        case 'tipsters': loadTipstersTable(); break; 
        case 'tips': loadTipsTable(); break; 
        case 'transactions': loadTransactionsTable(); break; 
        case 'settings': loadSettingsData(); break; 
    } 
}

function loadOverviewData() {
    Promise.all([
        apiCall('users.php', 'GET'),
        apiCall('tips.php?action=all', 'GET'),
        apiCall('purchases.php', 'GET')
    ]).then(function(results) {
        var users = results[0].success ? results[0].data : [];
        var tips = results[1].success ? results[1].data : [];
        var purchases = results[2].success ? results[2].data : [];
        
        var totalUsers = users.filter(function(u) { return u.role === 'user'; }).length;
        var totalTipsters = users.filter(function(u) { return u.role === 'tipster'; }).length;
        var paidPurchases = purchases.filter(function(p) { return p.status === 'paid'; });
        var totalRevenue = 0;
        for (var i = 0; i < paidPurchases.length; i++) totalRevenue += paidPurchases[i].amount || 0;
        var wonTips = tips.filter(function(t) { return t.result === 'won'; }).length;
        var lostTips = tips.filter(function(t) { return t.result === 'lost'; }).length;
        var pendingTips = tips.filter(function(t) { return t.result === 'pending'; }).length;
        
        var se = $('adminStats');
        if (se) {
            se.innerHTML = '<div class="admin-stat-card"><div class="admin-stat-value">' + totalUsers + '</div><div class="admin-stat-label">Users</div></div>' +
                           '<div class="admin-stat-card"><div class="admin-stat-value">' + totalTipsters + '</div><div class="admin-stat-label">Tipsters</div></div>' +
                           '<div class="admin-stat-card"><div class="admin-stat-value">' + tips.length + '</div><div class="admin-stat-label">Tips</div></div>' +
                           '<div class="admin-stat-card"><div class="admin-stat-value">' + paidPurchases.length + '</div><div class="admin-stat-label">Sales</div></div>' +
                           '<div class="admin-stat-card"><div class="admin-stat-value">' + fmt(totalRevenue) + '</div><div class="admin-stat-label">Revenue</div></div>' +
                           '<div class="admin-stat-card"><div class="admin-stat-value">' + pendingTips + '</div><div class="admin-stat-label">Pending</div></div>';
        }
        
        var re = $('totalRevenueDisplay'), sc = $('totalSalesCount');
        if (re) re.textContent = fmt(totalRevenue);
        if (sc) sc.textContent = paidPurchases.length;
        updateSidebarBadges();
    }).catch(function(err) { console.error('Error loading overview:', err); });
}

function loadRecentActivity() {
    var ae = $('recentActivity'); if (!ae) return;
    
    Promise.all([
        apiCall('users.php', 'GET'),
        apiCall('tips.php?action=all', 'GET'),
        apiCall('purchases.php', 'GET')
    ]).then(function(results) {
        var users = results[0].success ? results[0].data : [];
        var tips = results[1].success ? results[1].data : [];
        var purchases = results[2].success ? results[2].data : [];
        
        var activities = [];
        for (var i = 0; i < users.length; i++) { 
            if (users[i].created_at) activities.push({ icon: '👤', text: '<strong>' + escapeHTML(users[i].name || 'User') + '</strong> registered (' + escapeHTML(users[i].role) + ')', time: users[i].created_at }); 
        }
        for (var j = 0; j < tips.length; j++) { 
            if (tips[j].created_at) activities.push({ icon: '📋', text: 'New tip: <strong>' + escapeHTML(tips[j].code) + '</strong> - ' + escapeHTML(tips[j].platform || ''), time: tips[j].created_at }); 
        }
        for (var k = 0; k < purchases.length; k++) {
            var bn = 'Unknown'; 
            for (var u = 0; u < users.length; u++) { if (users[u].id === purchases[k].user_id) { bn = users[u].name || users[u].phone; break; } }
            activities.push({ icon: '💰', text: '<strong>' + escapeHTML(bn) + '</strong> purchased tip for ' + fmt(purchases[k].amount), time: purchases[k].paid_at || purchases[k].created_at });
        }
        
        activities.sort(function(a, b) { return new Date(b.time) - new Date(a.time); });
        var recent = activities.slice(0, 15);
        
        if (recent.length === 0) { 
            ae.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-inbox"></i></div><h4>No Activity Yet</h4><p>Activity will appear here once users start using the platform.</p></div>'; 
            return; 
        }
        
        var h = '';
        for (var a = 0; a < recent.length; a++) {
            var act = recent[a], ta = getTimeAgo(act.time);
            h += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color);"><span>' + act.icon + '</span><span style="flex:1;font-size:0.82rem;">' + act.text + '</span><span style="font-size:0.7rem;color:#9CA3AF;">' + ta + '</span></div>';
        }
        ae.innerHTML = h;
    }).catch(function(err) { console.error('Error loading activities:', err); });
}

function getTimeAgo(d) {
    if (!d) return ''; 
    var s = Math.floor((new Date() - new Date(d)) / 1000);
    if (s < 60) return 'just now'; 
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' hours ago'; 
    return Math.floor(s / 86400) + ' days ago';
}

function updateSidebarBadges() {
    Promise.all([
        apiCall('users.php', 'GET'),
        apiCall('tips.php?action=all', 'GET'),
        apiCall('purchases.php', 'GET')
    ]).then(function(results) {
        var users = results[0].success ? results[0].data : [];
        var tips = results[1].success ? results[1].data : [];
        var purchases = results[2].success ? results[2].data : [];
        
        var userCount = users.filter(function(u) { return u.role === 'user'; }).length;
        var tipsterCount = users.filter(function(u) { return u.role === 'tipster'; }).length;
        var paidPurchases = purchases.filter(function(p) { return p.status === 'paid'; });
        
        var ub = $('usersCountBadge'), tb = $('tipstersCountBadge'), tib = $('tipsCountBadge'), trb = $('transactionsCountBadge');
        if (ub) ub.textContent = userCount;
        if (tb) tb.textContent = tipsterCount;
        if (tib) tib.textContent = tips.length;
        if (trb) trb.textContent = paidPurchases.length;
    }).catch(function(err) { console.error('Error updating badges:', err); });
}

function loadUsersTable() {
    apiCall('users.php', 'GET')
        .then(function(response) {
            var users = response.success ? response.data : [];
            var tbody = $('usersTableBody'); if (!tbody) return;
            if (users.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No users yet.</td></tr>'; return; }
            var h = '';
            for (var i = 0; i < users.length; i++) {
                var u = users[i];
                h += '<tr>';
                h += '<td>' + escapeHTML(u.name || 'N/A') + '</td>';
                h += '<td>' + escapeHTML(u.phone) + '</td>';
                h += '<td><span class="badge badge-' + (u.role === 'admin' ? 'danger' : (u.role === 'tipster' ? 'info' : 'primary')) + '">' + u.role + '</span></td>';
                h += '<td>' + (u.is_active == 1 ? 'Active' : 'Inactive') + '</td>';
                h += '<td>' + fdate(u.created_at) + '</td>';
                h += '<td>' + (u.role !== 'admin' ? '<button class="btn-delete" onclick="removeUser(\'' + u.id + '\')"><i class="fas fa-trash"></i></button>' : '') + '</td>';
                h += '</tr>';
            }
            tbody.innerHTML = h;
        }).catch(function(err) { console.error('Error loading users:', err); });
}

function loadTipstersTable() {
    apiCall('users.php?role=tipster', 'GET')
        .then(function(response) {
            var users = response.success ? response.data : [];
            var tbody = $('tipstersTableBody'); if (!tbody) return;
            if (users.length === 0) { tbody.innerHTML = '<tr><td colspan="7">No tipsters yet.</td></tr>'; return; }
            
            apiCall('tips.php?action=all', 'GET')
                .then(function(tipResponse) {
                    var tips = tipResponse.success ? tipResponse.data : [];
                    var h = '';
                    for (var i = 0; i < users.length; i++) {
                        var tp = users[i];
                        var tt = tips.filter(function(t) { return t.tipster_id === tp.id; });
                        var won = tt.filter(function(t) { return t.result === 'won'; }).length;
                        var sold = 0;
                        for (var s = 0; s < tt.length; s++) sold += tt[s].purchased || 0;
                        var wr = tt.length > 0 ? Math.round((won / tt.length) * 100) : 0;
                        h += '<tr>';
                        h += '<td>' + escapeHTML(tp.name || 'N/A') + '</td>';
                        h += '<td>' + escapeHTML(tp.phone) + '</td>';
                        h += '<td>' + escapeHTML((tp.bio || '').substring(0, 50)) + '</td>';
                        h += '<td>' + tt.length + '</td>';
                        h += '<td>' + sold + '</td>';
                        h += '<td>' + wr + '%+' + '</td>';
                        h += '<td><button class="btn-delete" onclick="removeUser(\'' + tp.id + '\')"><i class="fas fa-trash"></i></button></td>';
                        h += '</tr>';
                    }
                    tbody.innerHTML = h;
                });
        }).catch(function(err) { console.error('Error loading tipsters:', err); });
}

function loadTipsTable() {
    apiCall('tips.php?action=all', 'GET')
        .then(function(response) {
            var tips = response.success ? response.data : [];
            var tbody = $('tipsTableBody'); if (!tbody) return;
            if (tips.length === 0) { tbody.innerHTML = '<tr><td colspan="8">No tips yet.</td></tr>'; return; }
            var h = '';
            for (var i = tips.length - 1; i >= 0; i--) {
                var t = tips[i];
                var badge = getBadge(t.result);
                h += '<tr>';
                h += '<td>' + getPlatformIcon(t.platform) + ' ' + escapeHTML((t.platform || '').toUpperCase()) + '</td>';
                h += '<td><code>' + escapeHTML(t.code) + '</code></td>';
                h += '<td>' + t.odds + '</td>';
                h += '<td>' + fmt(t.price) + '</td>';
                h += '<td>' + escapeHTML(t.tipster_name || '') + '</td>';
                h += '<td><span class="badge ' + badge.class + '">' + badge.text + '</span></td>';
                h += '<td>' + (t.purchased || 0) + '</td>';
                h += '<td>' + fdate(t.created_at) + '</td>';
                h += '</td>';
            }
            tbody.innerHTML = h;
        }).catch(function(err) { console.error('Error loading tips:', err); });
}

function loadTransactionsTable() {
    apiCall('purchases.php', 'GET')
        .then(function(response) {
            var purchases = response.success ? response.data : [];
            var tbody = $('transactionsTableBody'); if (!tbody) return;
            if (purchases.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No transactions yet.</td></tr>'; return; }
            
            Promise.all([apiCall('users.php', 'GET'), apiCall('tips.php?action=all', 'GET')])
                .then(function(results) {
                    var users = results[0].success ? results[0].data : [];
                    var tips = results[1].success ? results[1].data : [];
                    var h = '';
                    for (var i = purchases.length - 1; i >= 0; i--) {
                        var p = purchases[i];
                        var bn = 'Unknown';
                        var user = users.find(function(u) { return u.id === p.user_id; });
                        if (user) bn = user.name || user.phone;
                        var tc = 'N/A';
                        var tip = tips.find(function(t) { return t.id === p.tip_id; });
                        if (tip) tc = tip.code;
                        h += '<tr>';
                        h += '<td>' + fdate(p.paid_at || p.created_at) + '</td>';
                        h += '<td>' + escapeHTML(bn) + '</td>';
                        h += '<td><code>' + escapeHTML(tc) + '</code></td>';
                        h += '<td>' + fmt(p.amount) + '</td>';
                        h += '<td><span class="badge badge-success">' + (p.status || 'PAID').toUpperCase() + '</span></td>';
                        h += '<td>' + (p.id || '').substring(0, 12) + '</td>';
                        h += '</tr>';
                    }
                    tbody.innerHTML = h;
                });
        }).catch(function(err) { console.error('Error loading transactions:', err); });
}

function loadSettingsData() { 
    var total = 0; 
    for (var i = 0; i < localStorage.length; i++) { 
        var key = localStorage.key(i); 
        if (key && key.indexOf('bashiri_') === 0) total += (localStorage.getItem(key) || '').length; 
    } 
    var el = $('storageUsed'); 
    if (el) el.textContent = (total / 1024).toFixed(2) + ' KB'; 
}

function setupAddTipsterForm() { 
    var form = $('addTipsterForm'); 
    if (!form) return; 
    var nf = form.cloneNode(true); 
    form.parentNode.replaceChild(nf, form); 
    nf.onsubmit = function(e) { 
        e.preventDefault(); 
        var name = sanitizeInput($('tipsterNameInput').value); 
        var phone = sanitizeInput($('tipsterPhoneInput').value); 
        var password = $('tipsterPasswordInput').value; 
        var bio = sanitizeInput($('tipsterBioInput').value) || 'Professional Tipster'; 
        if (!name || !phone || !password) { showAdminMsg('error', 'Fill all fields'); return; } 
        if (password.length < 6) { showAdminMsg('error', 'Password 6+ chars'); return; } 
        apiCall('users.php', 'POST', { name: name, phone: phone, password: password, role: 'tipster', bio: bio })
            .then(function(r) { 
                if (r.success) { 
                    showAdminMsg('success', 'Tipster created! Login: ' + phone); 
                    nf.reset(); 
                    loadAdminData(); 
                    loadUsersTable(); 
                    loadTipstersTable(); 
                } else showAdminMsg('error', r.message); 
            })
            .catch(function() { showAdminMsg('error', 'Server error'); });
    }; 
}

function showAdminMsg(type, msg) { 
    var se = $('successMsg'), ee = $('errorMsg'), st = $('successText'), et = $('errorText'); 
    if (type === 'success') { 
        if (se) se.style.display = 'block'; 
        if (ee) ee.style.display = 'none'; 
        if (st) st.textContent = msg; 
        setTimeout(function() { if (se) se.style.display = 'none'; }, 5000); 
    } else { 
        if (ee) ee.style.display = 'block'; 
        if (se) se.style.display = 'none'; 
        if (et) et.textContent = msg; 
        setTimeout(function() { if (ee) ee.style.display = 'none'; }, 5000); 
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
    if (!confirm('Delete this user?')) return; 
    apiCall('users.php?id=' + id, 'DELETE')
        .then(function(r) { 
            if (r.success) { 
                toast('User deleted', 'success'); 
                loadAdminData(); 
            } else toast(r.message || 'Delete failed', 'error'); 
        })
        .catch(function() { toast('Server error', 'error'); });
}

function changeAdminPassword() { 
    var cur = $('currentPassword').value, np = $('newPassword').value, cp = $('confirmPassword').value, msg = $('passwordMsg'); 
    if (!cur || !np || !cp) { msg.innerHTML = '<span style="color:#EF4444;">Fill all</span>'; return; } 
    if (np !== cp) { msg.innerHTML = '<span style="color:#EF4444;">No match</span>'; return; } 
    if (!currentUser) { msg.innerHTML = '<span style="color:#EF4444;">Not logged in</span>'; return; }
    apiCall('users.php?action=change_password', 'POST', { user_id: currentUser.id, current_password: cur, new_password: np })
        .then(function(r) {
            if (r.success) msg.innerHTML = '<span style="color:#10B981;">Updated!</span>';
            else msg.innerHTML = '<span style="color:#EF4444;">' + (r.message || 'Failed') + '</span>';
        })
        .catch(function() { msg.innerHTML = '<span style="color:#EF4444;">Server error</span>'; });
}

function exportData() { 
    Promise.all([apiCall('users.php', 'GET'), apiCall('tips.php?action=all', 'GET'), apiCall('purchases.php', 'GET')])
        .then(function(results) {
            var data = { users: results[0].data || [], tips: results[1].data || [], purchases: results[2].data || [] };
            var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'bashiri-backup-' + new Date().toISOString().split('T')[0] + '.json';
            a.click();
            URL.revokeObjectURL(url);
            toast('Exported!', 'success');
        })
        .catch(function() { toast('Export failed', 'error'); });
}

function backupData() { 
    exportData();
}

function clearAllData() { 
    if (!confirm('DELETE ALL DATA? This cannot be undone!')) return; 
    if (!confirm('ARE YOU ABSOLUTELY SURE?')) return;
    apiCall('admin.php?action=clear_all', 'POST')
        .then(function(r) {
            if (r.success) { toast('All data cleared!', 'success'); setTimeout(function() { location.reload(); }, 2000); }
            else toast(r.message || 'Failed', 'error');
        })
        .catch(function() { toast('Clear failed', 'error'); });
}

function doLogout() { 
    clearSession(); 
    window.location.href = '../index.html'; 
}

function refreshAll() { 
    loadAdminData(); 
    toast('Refreshed!', 'success'); 
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

console.log('✅ Bashiri Nasi v3.0.0 Ready - ALL DATA TO MYSQL');