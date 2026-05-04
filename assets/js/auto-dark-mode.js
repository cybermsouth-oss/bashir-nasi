// ============================================
// BASHIRI NASI - AUTO DARK MODE
// Automatically switches based on time of day
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initAutoDarkMode();
});

var AutoDarkMode = {
    // Configuration
    config: {
        enabled: true,
        darkStart: 18, // 6:00 PM
        darkEnd: 6,    // 6:00 AM
        useSystemPreference: true,
        transitionDuration: 500
    },
    
    // Initialize
    init: function() {
        // Load saved preferences
        this.loadPreferences();
        
        // Apply initial mode
        this.applyMode();
        
        // Listen for system changes
        this.listenForSystemChanges();
        
        // Check every 30 minutes
        this.startTimeChecker();
        
        // Add toggle button if not exists
        this.addToggleButton();
    },
    
    // Load from localStorage
    loadPreferences: function() {
        var saved = localStorage.getItem('bashiri_auto_dark_mode');
        if (saved) {
            try {
                var prefs = JSON.parse(saved);
                this.config = Object.assign(this.config, prefs);
            } catch(e) {}
        }
    },
    
    // Save preferences
    savePreferences: function() {
        localStorage.setItem('bashiri_auto_dark_mode', JSON.stringify(this.config));
    },
    
    // Determine if should be dark mode
    shouldBeDark: function() {
        // If manual override is set, use that
        var manualOverride = localStorage.getItem('bashiri_theme_manual');
        if (manualOverride) {
            return manualOverride === 'dark';
        }
        
        // Check system preference
        if (this.config.useSystemPreference && window.matchMedia) {
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) return true;
        }
        
        // Check time of day
        var hour = new Date().getHours();
        if (this.config.darkStart <= 23) {
            // Normal: dark from evening to morning
            return hour >= this.config.darkStart || hour < this.config.darkEnd;
        } else {
            // If darkStart is 24+, always light
            return false;
        }
    },
    
    // Apply the correct mode
    applyMode: function() {
        var shouldBeDark = this.shouldBeDark();
        var currentTheme = document.documentElement.getAttribute('data-theme');
        var targetTheme = shouldBeDark ? 'dark' : 'light';
        
        if (currentTheme !== targetTheme) {
            // Add transition class
            document.documentElement.style.transition = 'background ' + this.config.transitionDuration + 'ms, color ' + this.config.transitionDuration + 'ms';
            
            // Apply theme
            document.documentElement.setAttribute('data-theme', targetTheme);
            
            // Update toggle button
            this.updateToggleButton(targetTheme);
            
            // Save current theme
            localStorage.setItem('bashiri_theme', targetTheme);
            
            // Remove transition after applied
            setTimeout(function() {
                document.documentElement.style.transition = '';
            }, this.config.transitionDuration);
            
            console.log('🌙 Auto Dark Mode: Switched to ' + targetTheme + ' mode');
        }
    },
    
    // Listen for system preference changes
    listenForSystemChanges: function() {
        if (window.matchMedia) {
            var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            var self = this;
            mediaQuery.addEventListener('change', function(e) {
                if (self.config.useSystemPreference) {
                    self.applyMode();
                }
            });
        }
    },
    
    // Check time periodically
    startTimeChecker: function() {
        var self = this;
        setInterval(function() {
            self.applyMode();
        }, 30 * 60 * 1000); // Every 30 minutes
    },
    
    // Add toggle button
    addToggleButton: function() {
        var existingBtn = document.getElementById('darkModeToggle');
        if (existingBtn) {
            // Add click handler to existing button
            existingBtn.addEventListener('click', function() {
                AutoDarkMode.manualToggle();
            });
            return;
        }
        
        // Create new button
        var btn = document.createElement('button');
        btn.id = 'darkModeToggle';
        btn.className = 'dark-mode-toggle';
        btn.innerHTML = '<i class="fas fa-moon"></i> <span style="font-size:0.7rem;margin-left:4px;">Auto</span>';
        btn.title = 'Toggle Dark Mode';
        btn.addEventListener('click', function() {
            AutoDarkMode.manualToggle();
        });
        document.body.appendChild(btn);
    },
    
    // Update toggle button appearance
    updateToggleButton: function(theme) {
        var btn = document.getElementById('darkModeToggle');
        if (!btn) return;
        
        var icon = btn.querySelector('i');
        var label = btn.querySelector('span');
        
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        if (label) {
            var manualOverride = localStorage.getItem('bashiri_theme_manual');
            label.textContent = manualOverride ? 'Manual' : 'Auto';
        }
    },
    
    // Manual toggle
    manualToggle: function() {
        var currentTheme = document.documentElement.getAttribute('data-theme');
        var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Set manual override
        localStorage.setItem('bashiri_theme_manual', newTheme);
        localStorage.setItem('bashiri_theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        
        this.updateToggleButton(newTheme);
        
        // Show toast
        if (typeof toast === 'function') {
            var icon = newTheme === 'dark' ? '🌙' : '☀️';
            toast(icon + ' Imewekwa kuwa ' + (newTheme === 'dark' ? 'Dark Mode' : 'Light Mode') + ' (Manual)', 'info');
        }
        
        // Reset to auto after 12 hours
        var self = this;
        setTimeout(function() {
            localStorage.removeItem('bashiri_theme_manual');
            self.applyMode();
            if (typeof toast === 'function') {
                toast('🔄 Imerejea Auto Mode', 'info');
            }
        }, 12 * 60 * 60 * 1000);
    },
    
    // Enable/disable auto mode
    toggleAutoMode: function() {
        this.config.enabled = !this.config.enabled;
        this.savePreferences();
        
        if (this.config.enabled) {
            localStorage.removeItem('bashiri_theme_manual');
            this.applyMode();
            if (typeof toast === 'function') toast('🔄 Auto Dark Mode Imewashwa', 'success');
        } else {
            if (typeof toast === 'function') toast('🔒 Auto Dark Mode Imezimwa', 'info');
        }
    }
};

function initAutoDarkMode() {
    AutoDarkMode.init();
}

// Expose to global
window.AutoDarkMode = AutoDarkMode;
window.toggleAutoDarkMode = function() {
    AutoDarkMode.toggleAutoMode();
};

console.log('✅ Auto Dark Mode Module Loaded');
console.log('   Dark Mode: ' + AutoDarkMode.config.darkStart + ':00 - ' + AutoDarkMode.config.darkEnd + ':00');
console.log('   System Preference: ' + (AutoDarkMode.config.useSystemPreference ? 'Enabled' : 'Disabled'));