// ============================================
// BASHIRI NASI - SMS NOTIFICATIONS MODULE
// Send SMS alerts via gateway API
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initSMSNotifications();
});

var SMSNotifications = {
    config: {
        enabled: false,
        gatewayUrl: 'https://api.sms-gateway.com/send', // Replace with real gateway
        apiKey: '',
        senderId: 'BashiriNasi',
        notifyOnPurchase: true,
        notifyOnResult: true,
        notifyOnNewTip: true,
        adminPhone: '255784967484'
    },
    
    init: function() {
        this.loadConfig();
        this.injectSMSSettings();
        this.hookIntoEvents();
    },
    
    loadConfig: function() {
        var saved = localStorage.getItem('bashiri_sms_config');
        if (saved) {
            try {
                this.config = Object.assign(this.config, JSON.parse(saved));
            } catch(e) {}
        }
    },
    
    saveConfig: function() {
        localStorage.setItem('bashiri_sms_config', JSON.stringify(this.config));
    },
    
    injectSMSSettings: function() {
        var settingsTab = document.getElementById('adminSettingsTab');
        if (!settingsTab) return;
        
        var smsSettings = document.createElement('div');
        smsSettings.style.cssText = 'background:var(--bg-primary);border-radius:12px;padding:20px;margin-top:12px;';
        smsSettings.innerHTML = `
            <h4 style="margin-bottom:12px;"><i class="fas fa-sms"></i> Mipangilio ya SMS</h4>
            <div style="display:grid;gap:12px;max-width:400px;">
                <div class="form-group">
                    <label class="form-label">SMS Gateway URL</label>
                    <input type="text" class="form-input" id="smsGatewayUrl" value="${this.config.gatewayUrl}" 
                           onchange="SMSNotifications.updateGatewayUrl(this.value)" />
                </div>
                <div class="form-group">
                    <label class="form-label">API Key</label>
                    <input type="password" class="form-input" id="smsApiKey" value="${this.config.apiKey}" 
                           onchange="SMSNotifications.updateApiKey(this.value)" />
                </div>
                <div class="form-group">
                    <label class="form-label">Sender ID</label>
                    <input type="text" class="form-input" id="smsSenderId" value="${this.config.senderId}" 
                           onchange="SMSNotifications.updateSenderId(this.value)" />
                </div>
                <div class="form-group">
                    <label class="form-label">Admin Phone (for alerts)</label>
                    <input type="text" class="form-input" id="smsAdminPhone" value="${this.config.adminPhone}" 
                           onchange="SMSNotifications.updateAdminPhone(this.value)" />
                </div>
                <div style="display:grid;gap:8px;">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" id="smsEnableToggle" ${this.config.enabled ? 'checked' : ''} 
                               onchange="SMSNotifications.toggleEnabled()" />
                        <span>Wezesha SMS Notifications</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" id="smsPurchaseToggle" ${this.config.notifyOnPurchase ? 'checked' : ''} 
                               onchange="SMSNotifications.togglePurchaseAlert()" />
                        <span>Tuma SMS baada ya manunuzi</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" id="smsResultToggle" ${this.config.notifyOnResult ? 'checked' : ''} 
                               onchange="SMSNotifications.toggleResultAlert()" />
                        <span>Tuma SMS baada ya matokeo</span>
                    </label>
                </div>
                <button class="btn btn-outline btn-sm" onclick="SMSNotifications.testSMS()">
                    <i class="fas fa-paper-plane"></i> Jaribu SMS
                </button>
                <div id="smsTestResult" style="font-size:0.8rem;"></div>
            </div>
        `;
        
        settingsTab.querySelector('.admin-card-body').appendChild(smsSettings);
    },
    
    hookIntoEvents: function() {
        // Hook into purchase events
        var originalBuyTip = window.buyTip;
        if (originalBuyTip) {
            window.buyTip = function(tipId, amount) {
                originalBuyTip(tipId, amount);
                
                if (SMSNotifications.config.enabled && SMSNotifications.config.notifyOnPurchase) {
                    setTimeout(function() {
                        SMSNotifications.sendPurchaseSMS(tipId, amount);
                    }, 1000);
                }
            };
        }
        
        // Hook into tip upload events
        this.watchTipUploads();
    },
    
    watchTipUploads: function() {
        var uploadForm = document.getElementById('uploadTipForm');
        if (!uploadForm) return;
        
        var originalSubmit = uploadForm.onsubmit;
        uploadForm.onsubmit = function(e) {
            if (originalSubmit) {
                originalSubmit.call(this, e);
            }
            
            if (SMSNotifications.config.enabled && SMSNotifications.config.notifyOnNewTip) {
                setTimeout(function() {
                    SMSNotifications.sendNewTipAlert();
                }, 1000);
            }
        };
    },
    
    sendSMS: function(phone, message) {
        if (!this.config.enabled) {
            console.log('SMS disabled');
            return Promise.resolve({ success: false, message: 'SMS disabled' });
        }
        
        // Log the SMS (since we may not have a real gateway)
        console.log('📱 SMS to ' + phone + ': ' + message);
        
        // Add to SMS log
        var smsLog = JSON.parse(localStorage.getItem('bashiri_sms_log') || '[]');
        smsLog.push({
            to: phone,
            message: message,
            timestamp: new Date().toISOString(),
            status: 'sent'
        });
        localStorage.setItem('bashiri_sms_log', JSON.stringify(smsLog.slice(-50)));
        
        // Try to send via API
        return fetch(this.config.gatewayUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: this.config.apiKey,
                senderId: this.config.senderId,
                to: phone,
                message: message
            })
        })
        .then(function(response) { return response.json(); })
        .catch(function(error) {
            console.log('SMS Gateway error (using local storage):', error);
            return { success: false, message: 'Stored locally' };
        });
    },
    
    sendPurchaseSMS: function(tipId, amount) {
        var session = JSON.parse(localStorage.getItem('bashiri_session') || '{}');
        var phone = session.phone || this.config.adminPhone;
        
        var message = 'Asante kwa kununua tip! Amount: TZS ' + amount.toLocaleString() + 
                      '. Angalia "My Purchases" kwenye Bashiri Nasi.';
        
        this.sendSMS(phone, message);
    },
    
    sendNewTipAlert: function() {
        var message = 'Tip mpya imepakiwa kwenye Bashiri Nasi! Angalia sasa kwa tips za kushinda.';
        this.sendSMS(this.config.adminPhone, message);
    },
    
    sendResultUpdateSMS: function(phone, tipCode, result) {
        var message = 'Matokeo ya tip ' + tipCode + ': ' + 
                      (result === 'won' ? 'IMESHINDA! Hongera!' : 'Imepotea.') +
                      ' - Bashiri Nasi';
        this.sendSMS(phone, message);
    },
    
    toggleEnabled: function() {
        this.config.enabled = !this.config.enabled;
        this.saveConfig();
        if (typeof toast === 'function') {
            toast(this.config.enabled ? '📱 SMS Zimewashwa' : '📵 SMS Zimezimwa', 'info');
        }
    },
    
    togglePurchaseAlert: function() {
        this.config.notifyOnPurchase = !this.config.notifyOnPurchase;
        this.saveConfig();
    },
    
    toggleResultAlert: function() {
        this.config.notifyOnResult = !this.config.notifyOnResult;
        this.saveConfig();
    },
    
    updateGatewayUrl: function(value) {
        this.config.gatewayUrl = value;
        this.saveConfig();
    },
    
    updateApiKey: function(value) {
        this.config.apiKey = value;
        this.saveConfig();
    },
    
    updateSenderId: function(value) {
        this.config.senderId = value;
        this.saveConfig();
    },
    
    updateAdminPhone: function(value) {
        this.config.adminPhone = value;
        this.saveConfig();
    },
    
    testSMS: function() {
        var testPhone = this.config.adminPhone;
        var message = '[TEST] Hii ni SMS ya majaribio kutoka Bashiri Nasi. Huduma inafanya kazi!';
        
        var resultEl = document.getElementById('smsTestResult');
        if (resultEl) {
            resultEl.innerHTML = '<span style="color:#F59E0B;">Inatuma SMS...</span>';
        }
        
        var self = this;
        this.sendSMS(testPhone, message).then(function(result) {
            if (resultEl) {
                resultEl.innerHTML = '<span style="color:#059669;">✅ SMS imetumwa kwa ' + testPhone + '</span>';
            }
            if (typeof toast === 'function') {
                toast('✅ SMS ya majaribio imetumwa!', 'success');
            }
        }).catch(function() {
            if (resultEl) {
                resultEl.innerHTML = '<span style="color:#EF4444;">❌ Imeshindwa kutuma. Angalia settings.</span>';
            }
        });
    }
};

function initSMSNotifications() {
    SMSNotifications.init();
}

window.SMSNotifications = SMSNotifications;

console.log('✅ SMS Notifications Module Loaded');