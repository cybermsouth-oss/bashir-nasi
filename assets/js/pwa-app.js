// ============================================
// BASHIRI NASI - PWA MOBILE APP MODULE
// Install Prompt | Offline Detection | App Features
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initPWA();
});

var PWAApp = {
    deferredPrompt: null,
    isInstalled: false,
    isOnline: navigator.onLine,
    installButtonAdded: false,
    
    init: function() {
        this.detectInstallStatus();
        this.listenForInstallPrompt();
        this.monitorOnlineStatus();
        this.addInstallButton();
        this.registerBackgroundSync();
        console.log('📱 PWA Module Initialized');
    },
    
    detectInstallStatus: function() {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
            console.log('✅ App is installed (standalone mode)');
        }
        
        // Listen for display mode changes
        window.matchMedia('(display-mode: standalone)').addEventListener('change', function(e) {
            PWAApp.isInstalled = e.matches;
            if (e.matches) {
                console.log('✅ App was just installed!');
                PWAApp.onAppInstalled();
            }
        });
    },
    
    listenForInstallPrompt: function() {
        var self = this;
        
        window.addEventListener('beforeinstallprompt', function(e) {
            // Prevent default browser prompt
            e.preventDefault();
            
            // Store for later use
            self.deferredPrompt = e;
            
            // Show custom install button
            self.showInstallButton();
            
            console.log('📲 Install prompt available');
        });
        
        window.addEventListener('appinstalled', function() {
            self.isInstalled = true;
            self.deferredPrompt = null;
            self.hideInstallButton();
            console.log('🎉 App installed successfully!');
            
            if (typeof toast === 'function') {
                toast('✅ App imewekwa kwenye simu yako!', 'success');
            }
        });
    },
    
    addInstallButton: function() {
        // Don't add if already exists or app is installed
        if (document.getElementById('pwaInstallBtn') || this.isInstalled) return;
        
        var installBtn = document.createElement('button');
        installBtn.id = 'pwaInstallBtn';
        installBtn.style.cssText = 'display:none;position:fixed;bottom:80px;right:20px;z-index:998;background:linear-gradient(135deg,#059669,#10B981);color:white;border:none;padding:12px 20px;border-radius:30px;font-weight:600;font-size:0.85rem;cursor:pointer;box-shadow:0 8px 25px rgba(5,150,105,0.4);transition:all 0.3s;animation:slideInRight 0.5s ease-out;';
        installBtn.innerHTML = '<i class="fas fa-download"></i> Weka App Kwenye Simu';
        installBtn.onclick = function() {
            PWAApp.installApp();
        };
        
        document.body.appendChild(installBtn);
        this.installButtonAdded = true;
    },
    
    showInstallButton: function() {
        var btn = document.getElementById('pwaInstallBtn');
        if (btn) {
            btn.style.display = 'block';
        }
    },
    
    hideInstallButton: function() {
        var btn = document.getElementById('pwaInstallBtn');
        if (btn) {
            btn.style.display = 'none';
        }
    },
    
    installApp: function() {
        if (!this.deferredPrompt) {
            if (typeof toast === 'function') {
                toast('📲 Fungua kwenye browser ya Chrome na bonyeza "Add to Home Screen" kwenye menu', 'info');
            }
            return;
        }
        
        // Show the install prompt
        this.deferredPrompt.prompt();
        
        // Wait for user response
        var self = this;
        this.deferredPrompt.userChoice.then(function(choiceResult) {
            if (choiceResult.outcome === 'accepted') {
                console.log('✅ User accepted install');
                self.isInstalled = true;
            } else {
                console.log('❌ User declined install');
            }
            self.deferredPrompt = null;
        });
    },
    
    monitorOnlineStatus: function() {
        var self = this;
        
        window.addEventListener('online', function() {
            self.isOnline = true;
            self.showOnlineIndicator();
            console.log('🌐 Back online!');
            
            if (typeof toast === 'function') {
                toast('🌐 Umeunganishwa kwenye mtandao!', 'success');
            }
            
            // Sync data
            self.syncOfflineData();
        });
        
        window.addEventListener('offline', function() {
            self.isOnline = false;
            self.showOfflineIndicator();
            console.log('📡 Offline mode');
            
            if (typeof toast === 'function') {
                toast('📡 Uko offline. Baadhi ya vipengele havifanyi kazi.', 'warning');
            }
        });
    },
    
    showOnlineIndicator: function() {
        var indicator = document.getElementById('connectionIndicator');
        if (indicator) {
            indicator.style.background = '#10B981';
            indicator.textContent = '🟢 Online';
            setTimeout(function() {
                indicator.style.opacity = '0';
                setTimeout(function() { if (indicator.parentNode) indicator.remove(); }, 500);
            }, 2000);
        } else {
            this.createConnectionIndicator('🟢 Online', '#10B981');
        }
    },
    
    showOfflineIndicator: function() {
        this.createConnectionIndicator('🔴 Offline - Hakuna Mtandao', '#EF4444');
    },
    
    createConnectionIndicator: function(text, color) {
        var existing = document.getElementById('connectionIndicator');
        if (existing) existing.remove();
        
        var indicator = document.createElement('div');
        indicator.id = 'connectionIndicator';
        indicator.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:' + color + ';color:white;text-align:center;padding:6px;font-size:0.8rem;font-weight:600;transition:opacity 0.5s;';
        indicator.textContent = text;
        document.body.insertBefore(indicator, document.body.firstChild);
    },
    
    registerBackgroundSync: function() {
        if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
        
        navigator.serviceWorker.ready.then(function(registration) {
            // Register sync for tips
            registration.sync.register('sync-tips').catch(function(err) {
                console.log('Background sync registration failed:', err);
            });
            
            // Register sync for purchases
            registration.sync.register('sync-purchases').catch(function(err) {
                console.log('Background sync registration failed:', err);
            });
        });
    },
    
    syncOfflineData: function() {
        console.log('🔄 Syncing offline data...');
        
        // Get offline queue
        var offlineQueue = JSON.parse(localStorage.getItem('bashiri_offline_queue') || '[]');
        
        if (offlineQueue.length === 0) return;
        
        // Process each item
        offlineQueue.forEach(function(item, index) {
            // Retry failed operations
            console.log('Processing offline item:', item.action);
        });
        
        // Clear queue after processing
        localStorage.setItem('bashiri_offline_queue', '[]');
    },
    
    onAppInstalled: function() {
        // Track installation
        var installs = parseInt(localStorage.getItem('bashiri_app_installs') || '0');
        localStorage.setItem('bashiri_app_installs', installs + 1);
        
        // Hide install button
        this.hideInstallButton();
    },
    
    // Check for updates
    checkForUpdates: function() {
        if (!('serviceWorker' in navigator)) return;
        
        navigator.serviceWorker.ready.then(function(registration) {
            registration.update().then(function() {
                console.log('🔍 Checking for app updates...');
            });
        });
    }
};

function initPWA() {
    PWAApp.init();
    
    // Check for updates every hour
    setInterval(function() {
        PWAApp.checkForUpdates();
    }, 60 * 60 * 1000);
}

// Expose globally
window.PWAApp = PWAApp;
window.installApp = function() {
    PWAApp.installApp();
};

console.log('✅ PWA Mobile App Module Loaded');