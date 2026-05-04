// ============================================
// BASHIRI NASI - PUSH NOTIFICATIONS
// Browser notifications for new tips & updates
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initPushNotifications();
});

var PushNotifications = {
    config: {
        enabled: true,
        newTipAlert: true,
        resultUpdateAlert: true,
        purchaseAlert: true,
        checkInterval: 60000, // Check every 1 minute
    },
    
    permission: 'default',
    lastTipCount: 0,
    lastCheckTime: null,
    
    init: function() {
        this.loadConfig();
        this.checkPermission();
        this.startMonitoring();
        this.addNotificationToggle();
    },
    
    loadConfig: function() {
        var saved = localStorage.getItem('bashiri_push_config');
        if (saved) {
            try {
                this.config = Object.assign(this.config, JSON.parse(saved));
            } catch(e) {}
        }
    },
    
    saveConfig: function() {
        localStorage.setItem('bashiri_push_config', JSON.stringify(this.config));
    },
    
    checkPermission: function() {
        if (!('Notification' in window)) {
            console.log('⚠️ Browser does not support notifications');
            this.permission = 'denied';
            return;
        }
        
        this.permission = Notification.permission;
        
        if (this.permission === 'default') {
            this.requestPermission();
        }
    },
    
    requestPermission: function() {
        var self = this;
        Notification.requestPermission().then(function(permission) {
            self.permission = permission;
            if (permission === 'granted') {
                console.log('✅ Push notifications enabled');
                self.showSystemNotification(
                    'Bashiri Nasi ⚡',
                    'Notifikation zimewashwa! Utapata taarifa za tips mpya na matokeo.',
                    'https://via.placeholder.com/64/059669/ffffff?text=BN'
                );
            }
        });
    },
    
    startMonitoring: function() {
        var self = this;
        
        // Check for new tips every minute
        setInterval(function() {
            self.checkForUpdates();
        }, this.config.checkInterval);
        
        // Initial check after 5 seconds
        setTimeout(function() {
            self.checkForUpdates();
        }, 5000);
    },
    
    checkForUpdates: function() {
        if (this.permission !== 'granted' || !this.config.enabled) return;
        
        // Check if user is logged in
        var session = localStorage.getItem('bashiri_session');
        if (!session) return;
        
        try {
            var user = JSON.parse(session);
            
            // Get current tips count from localStorage (as fallback)
            var tips = this.getTipsData();
            var currentCount = tips.length;
            
            // Check for new tips
            if (this.lastTipCount > 0 && currentCount > this.lastTipCount) {
                var newTips = currentCount - this.lastTipCount;
                
                if (this.config.newTipAlert) {
                    this.showSystemNotification(
                        'Tips Mpya! 🔥',
                        'Kuna tips ' + newTips + ' mpya zimeongezwa. Angalia sasa!',
                        'https://via.placeholder.com/64/F59E0B/ffffff?text=NEW'
                    );
                    
                    // Play notification sound
                    this.playNotificationSound();
                }
            }
            
            // Check for result updates
            if (this.config.resultUpdateAlert) {
                this.checkResultUpdates(tips);
            }
            
            this.lastTipCount = currentCount;
            this.lastCheckTime = new Date().toISOString();
            
        } catch(e) {
            console.error('Notification check error:', e);
        }
    },
    
    getTipsData: function() {
        try {
            var d = localStorage.getItem('bashiri_tips');
            if (!d) return [];
            
            // Try to decrypt if needed
            if (d.startsWith('ENC:') && typeof CryptoJS !== 'undefined') {
                var encrypted = d.substring(4);
                var bytes = CryptoJS.AES.decrypt(encrypted, 'BashiriNasi@2025!TZ#Secure#Key$%^&*()');
                var decrypted = bytes.toString(CryptoJS.enc.Utf8);
                if (decrypted) return JSON.parse(decrypted);
            }
            
            return JSON.parse(d);
        } catch(e) {
            return [];
        }
    },
    
    checkResultUpdates: function(tips) {
        var storedResults = JSON.parse(localStorage.getItem('bashiri_tip_results') || '{}');
        
        tips.forEach(function(tip) {
            if (tip.result !== 'pending') {
                if (storedResults[tip.id] === 'pending' || !storedResults[tip.id]) {
                    // Result was updated
                    var icon = tip.result === 'won' ? '🏆' : '❌';
                    var message = tip.result === 'won' ? 'Imeshinda!' : 'Imepotea';
                    
                    PushNotifications.showSystemNotification(
                        icon + ' Matokeo Yamesasishwa!',
                        'Tip yako: ' + tip.code + ' - ' + message,
                        'https://via.placeholder.com/64/' + (tip.result === 'won' ? '059669' : 'EF4444') + '/ffffff?text=' + icon
                    );
                }
            }
            
            storedResults[tip.id] = tip.result;
        });
        
        localStorage.setItem('bashiri_tip_results', JSON.stringify(storedResults));
    },
    
    showSystemNotification: function(title, body, icon) {
        if (this.permission !== 'granted') return;
        
        try {
            var options = {
                body: body,
                icon: icon || 'https://via.placeholder.com/64/059669/ffffff?text=BN',
                badge: 'https://via.placeholder.com/32/059669/ffffff?text=BN',
                tag: 'bashiri-nasi-' + Date.now(),
                requireInteraction: false,
                vibrate: [200, 100, 200],
                data: {
                    url: window.location.origin + '/index.html'
                }
            };
            
            var notification = new Notification(title, options);
            
            // Click handler
            notification.addEventListener('click', function() {
                window.focus();
                window.location.href = this.data.url;
                this.close();
            });
            
            // Auto close after 5 seconds
            setTimeout(function() {
                notification.close();
            }, 5000);
            
        } catch(e) {
            console.error('Notification error:', e);
        }
    },
    
    playNotificationSound: function() {
        try {
            // Create a simple beep using AudioContext
            var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            var oscillator = audioCtx.createOscillator();
            var gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;
            
            oscillator.start();
            
            setTimeout(function() {
                oscillator.stop();
                audioCtx.close();
            }, 200);
            
        } catch(e) {
            // Audio not supported
        }
    },
    
    addNotificationToggle: function() {
        // Add to settings if on admin page
        var settingsTab = document.getElementById('adminSettingsTab');
        if (!settingsTab) return;
        
        var notificationSettings = document.createElement('div');
        notificationSettings.style.cssText = 'background:var(--bg-primary);border-radius:12px;padding:20px;margin-top:12px;';
        notificationSettings.innerHTML = `
            <h4 style="margin-bottom:12px;"><i class="fas fa-bell"></i> Mipangilio ya Notifikation</h4>
            <div style="display:grid;gap:8px;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                    <input type="checkbox" id="pushEnableToggle" ${PushNotifications.config.enabled ? 'checked' : ''} 
                           onchange="PushNotifications.toggleEnabled()" />
                    <span>Wezesha Push Notifications</span>
                </label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                    <input type="checkbox" id="newTipToggle" ${PushNotifications.config.newTipAlert ? 'checked' : ''}
                           onchange="PushNotifications.toggleNewTipAlert()" />
                    <span>Arifa za Tips Mpya</span>
                </label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                    <input type="checkbox" id="resultUpdateToggle" ${PushNotifications.config.resultUpdateAlert ? 'checked' : ''}
                           onchange="PushNotifications.toggleResultAlert()" />
                    <span>Arifa za Matokeo</span>
                </label>
                <div style="font-size:0.75rem;color:#6B7280;margin-top:4px;">
                    Permission: <strong style="color:${PushNotifications.permission === 'granted' ? '#059669' : '#EF4444'}">${PushNotifications.permission}</strong>
                    ${PushNotifications.permission === 'default' ? ' <button onclick="PushNotifications.requestPermission()" style="color:#059669;cursor:pointer;border:none;background:none;text-decoration:underline;">(Ruhusu)</button>' : ''}
                </div>
            </div>
        `;
        
        settingsTab.querySelector('.admin-card-body').appendChild(notificationSettings);
    },
    
    toggleEnabled: function() {
        this.config.enabled = !this.config.enabled;
        this.saveConfig();
        if (typeof toast === 'function') {
            toast(this.config.enabled ? '🔔 Notifications Enabled' : '🔕 Notifications Disabled', 'info');
        }
    },
    
    toggleNewTipAlert: function() {
        this.config.newTipAlert = !this.config.newTipAlert;
        this.saveConfig();
    },
    
    toggleResultAlert: function() {
        this.config.resultUpdateAlert = !this.config.resultUpdateAlert;
        this.saveConfig();
    }
};

function initPushNotifications() {
    PushNotifications.init();
}

window.PushNotifications = PushNotifications;
window.requestNotificationPermission = function() {
    PushNotifications.requestPermission();
};

console.log('✅ Push Notifications Module Loaded');