// ============================================
// BASHIRI NASI - DAILY FREE TIPS WIDGET
// Shows free tips on homepage to attract users
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initFreeTipsWidget();
});

var FreeTips = {
    // Free tips data - Updated daily
    dailyTips: [
        {
            platform: 'sportbet',
            code: 'SB-FREE-001',
            odds: 1.75,
            match: 'Simba SC vs Young Africans',
            tip: 'Over 1.5 Goals',
            result: 'pending'
        },
        {
            platform: 'betpawa',
            code: 'BP-FREE-002',
            odds: 2.05,
            match: 'Arsenal vs Chelsea',
            tip: 'Both Teams to Score',
            result: 'pending'
        }
    ],
    
    init: function() {
        this.createWidget();
        console.log('🎁 Free Tips Widget Ready');
    },
    
    createWidget: function() {
        var homeContent = document.getElementById('homepageContent');
        if (!homeContent) return;
        
        // Find where to insert (after features section)
        var sections = homeContent.querySelectorAll('section');
        var insertAfter = sections[1]; // After features
        
        if (!insertAfter) return;
        
        var widgetHTML = `
            <section class="section-padding" style="background:linear-gradient(135deg,#FFFBEB,#FEF3C7);">
                <div class="container">
                    <div class="section-header">
                        <span class="section-badge" style="background:#F59E0B;color:white;">🎁 BURE</span>
                        <h2 class="section-title">Tips za Bure za Leo</h2>
                        <p class="section-subtitle">Jaribu tips zetu bila malipo! Kila siku tunatoa tips 2-3 za bure.</p>
                    </div>
                    
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;max-width:800px;margin:0 auto;">
                        ${this.renderFreeTips()}
                    </div>
                    
                    <div style="text-align:center;margin-top:30px;">
                        <p style="color:#92400E;margin-bottom:12px;font-weight:600;">
                            🔓 Unataka tips za uhakika zaidi? Angalia premium tips zetu!
                        </p>
                        <a href="register.html" class="hero-btn-primary" style="display:inline-flex;">
                            <i class="fas fa-crown"></i> Jisajili Kwa Premium Tips
                        </a>
                    </div>
                </div>
            </section>
        `;
        
        insertAfter.insertAdjacentHTML('afterend', widgetHTML);
    },
    
    renderFreeTips: function() {
        var html = '';
        
        this.dailyTips.forEach(function(tip) {
            var icon = getPlatformIcon(tip.platform);
            
            html += `
                <div class="card" style="text-align:center;border:2px solid #F59E0B;border-radius:16px;overflow:hidden;">
                    <div style="background:linear-gradient(135deg,#F59E0B,#D97706);padding:12px;color:white;font-weight:700;">
                        ${icon} ${tip.platform.toUpperCase()} - FREE TIP
                    </div>
                    <div style="padding:20px;">
                        <div style="font-weight:700;font-size:1rem;margin-bottom:8px;">${tip.match}</div>
                        <div style="background:#FFFBEB;padding:10px;border-radius:8px;margin:10px 0;">
                            <div style="font-size:0.8rem;color:#92400E;">UTABIRI:</div>
                            <div style="font-weight:700;color:#D97706;font-size:1.1rem;">${tip.tip}</div>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-top:12px;">
                            <span><i class="fas fa-chart-line"></i> Odds: <strong>${tip.odds}</strong></span>
                            <span class="badge badge-success">🎁 FREE</span>
                        </div>
                        <div style="margin-top:12px;padding:10px;background:#ECFDF5;border-radius:8px;">
                            <div style="font-weight:700;color:#059669;">CODE: ${tip.code}</div>
                            <div style="font-size:0.7rem;color:#6B7280;margin-top:4px;">
                                ⚡ Weka code hii kwenye ${tip.platform.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return html;
    },
    
    // Update free tips daily (called by admin or automatically)
    updateTips: function(newTips) {
        this.dailyTips = newTips;
        // Refresh the widget
        var widget = document.querySelector('.section-padding[style*="FFFBEB"]');
        if (widget) {
            widget.querySelector('[style*="grid-template-columns"]').innerHTML = this.renderFreeTips();
        }
    }
};

function initFreeTipsWidget() {
    FreeTips.init();
}

window.FreeTips = FreeTips;