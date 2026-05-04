// ============================================
// BASHIRI NASI - SMS NOTIFICATIONS
// Send SMS alerts via Web API
// ============================================

var SMSAlerts = {
    config: {
        enabled: true,
        // Replace with your SMS gateway details
        gateway: 'https://api.textlocal.com/send/', // Example: Textlocal
        apiKey: '', // Your SMS API key
        senderId: 'BashiriNasi',
        // SMS Templates
        templates: {
            purchase: 'Asante {name}! Umenunua tip kwa TZS {amount}. Code yako: {code}. Angalia Bashiri Nasi kwa tips zaidi!',
            welcome: 'Karibu {name}! Akaunti yako iko tayari. Tembelea Bashiri Nasi kwa tips za kushinda kila siku!',
            newTip: 'Tips mpya zimeongezwa! Tembelea Bashiri Nasi sasa upate codes za kushinda.',
            result: 'Matokeo ya tip {code}: {result}! Tembelea Bashiri Nasi kwa tips zaidi.'
        }
    },
    
    init: function() {
        this.loadConfig();
        this.hookIntoEvents();
        console.log('📱 SMS Notifications Ready');
    },
    
    loadConfig: function() {
        var saved = localStorage.getItem('bashiri_sms_config');
        if (saved) {
            try { this.config = Object.assign(this.config, JSON.parse(saved)); } catch(e) {}
        }
    },
    
    sendSMS: function(phone, message) {
        if (!this.config.enabled) {
            console.log('📱 SMS (disabled):', phone, message);
            return;
        }
        
        // Log to SMS log
        var log = JSON.parse(localStorage.getItem('bashiri_sms_log') || '[]');
        log.push({
            to: phone,
            message: message,
            timestamp: new Date().toISOString(),
            status: 'queued'
        });
        localStorage.setItem('bashiri_sms_log', JSON.stringify(log.slice(-100)));
        
        console.log('📱 SMS Sent:', phone, message.substring(0, 50) + '...');
        
        // If you have a real SMS API, uncomment this:
        /*
        fetch(this.config.gateway, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'apikey=' + this.config.apiKey + '&sender=' + this.config.senderId + '&numbers=' + phone + '&message=' + encodeURIComponent(message)
        })
        .then(r => r.json())
        .then(data => console.log('SMS Response:', data))
        .catch(err => console.error('SMS Error:', err));
        */
    },
    
    hookIntoEvents: function() {
        // Override buy function to send SMS
        var self = this;
        
        // Watch for purchases
        var originalSaveDB = window.saveDB;
        window.saveDB = function(key, data) {
            var result = originalSaveDB(key, data);
            
            if (key === 'purchases' && data.length > 0) {
                var lastPurchase = data[data.length - 1];
                if (lastPurchase && lastPurchase.payerPhone) {
                    var tips = DB('tips');
                    var tip = null;
                    for (var i = 0; i < tips.length; i++) {
                        if (tips[i].id === lastPurchase.tipId) { tip = tips[i]; break; }
                    }
                    
                    var msg = self.config.templates.purchase
                        .replace('{name}', lastPurchase.payerName || 'Mteja')
                        .replace('{amount}', fmt(lastPurchase.amount))
                        .replace('{code}', tip ? tip.code : '●●●●●●●●');
                    
                    self.sendSMS(lastPurchase.payerPhone, msg);
                }
            }
            
            return result;
        };
        
        // Watch for registrations
        var originalSetupRegister = window.setupRegister;
        if (originalSetupRegister) {
            // Registration SMS is handled in setupRegister after successful save
        }
    },
    
    // Send bulk notification to all users
    notifyAllUsers: function(message) {
        var users = DB('users');
        var count = 0;
        users.forEach(function(user) {
            if (user.phone && user.phone !== 'admin') {
                this.sendSMS(user.phone, message);
                count++;
            }
        }.bind(this));
        return count;
    },
    
    // Notify about new tip
    notifyNewTip: function(tipCode, odds) {
        var message = '🔥 Tip Mpya: Odds ' + odds + '! Tembelea Bashiri Nasi sasa kupata code.';
        return this.notifyAllUsers(message);
    }
};

document.addEventListener('DOMContentLoaded', function() {
    SMSAlerts.init();
});

window.SMSAlerts = SMSAlerts;