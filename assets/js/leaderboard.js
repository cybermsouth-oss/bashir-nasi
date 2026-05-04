// ============================================
// BASHIRI NASI - TIPSTER LEADERBOARD
// Rankings by win rate, revenue, sales
// ============================================

var Leaderboard = {
    currentFilter: 'all',
    
    init: function() {
        this.load('all');
        console.log('🏆 Leaderboard Initialized');
    },
    
    load: function(filter) {
        this.currentFilter = filter;
        
        // Update active tab
        document.querySelectorAll('.leaderboard-tab').forEach(function(tab) {
            tab.classList.remove('active');
        });
        
        var activeTab = document.querySelector('[onclick*="' + filter + '"]');
        if (activeTab) activeTab.classList.add('active');
        
        // Get and sort tipsters
        var tipsters = this.getTipstersWithStats();
        var sorted = this.sortTipsters(tipsters, filter);
        
        // Render
        this.render(sorted);
    },
    
    getTipstersWithStats: function() {
        var users = this.getUsersData();
        var tips = this.getTipsData();
        var ratings = this.getRatingsData();
        
        var tipsters = users.filter(function(u) { return u.role === 'tipster'; });
        
        return tipsters.map(function(tipster) {
            var tipsterTips = tips.filter(function(t) { return t.tipsterId === tipster.id; });
            var wonTips = tipsterTips.filter(function(t) { return t.result === 'won'; }).length;
            var lostTips = tipsterTips.filter(function(t) { return t.result === 'lost'; }).length;
            var totalCompleted = wonTips + lostTips;
            var totalSold = tipsterTips.reduce(function(sum, t) { return sum + (t.purchased || 0); }, 0);
            var totalRevenue = tipsterTips.reduce(function(sum, t) { return sum + ((t.purchased || 0) * (t.price || 0)); }, 0);
            var winRate = totalCompleted > 0 ? Math.round((wonTips / totalCompleted) * 100) : 0;
            
            var tipsterRatings = ratings.filter(function(r) { return r.tipsterId === tipster.id; });
            var avgRating = tipsterRatings.length > 0 ? 
                (tipsterRatings.reduce(function(sum, r) { return sum + r.stars; }, 0) / tipsterRatings.length).toFixed(1) : 0;
            
            return {
                id: tipster.id,
                name: tipster.name || 'Unknown',
                bio: tipster.bio || '',
                totalTips: tipsterTips.length,
                wonTips: wonTips,
                lostTips: lostTips,
                winRate: winRate,
                totalSold: totalSold,
                totalRevenue: totalRevenue,
                avgRating: parseFloat(avgRating),
                ratingCount: tipsterRatings.length,
                joinedDate: tipster.createdAt
            };
        });
    },
    
    sortTipsters: function(tipsters, filter) {
        switch(filter) {
            case 'weekly':
                return tipsters.sort(function(a, b) { return b.totalSold - a.totalSold; });
            case 'monthly':
                return tipsters.sort(function(a, b) { return b.totalRevenue - a.totalRevenue; });
            case 'winrate':
                return tipsters.filter(function(t) { return t.totalTips >= 5; }).sort(function(a, b) { return b.winRate - a.winRate; });
            case 'revenue':
                return tipsters.sort(function(a, b) { return b.totalRevenue - a.totalRevenue; });
            default:
                return tipsters.sort(function(a, b) { 
                    var scoreA = (a.winRate * 0.4) + (a.totalSold * 0.3) + (a.avgRating * 20 * 0.3);
                    var scoreB = (b.winRate * 0.4) + (b.totalSold * 0.3) + (b.avgRating * 20 * 0.3);
                    return scoreB - scoreA;
                });
        }
    },
    
    render: function(tipsters) {
        var list = document.getElementById('leaderboardList');
        if (!list) return;
        
        if (tipsters.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:40px;"><p>Hakuna wataalamu bado.</p></div>';
            return;
        }
        
        var medals = ['🥇', '🥈', '🥉'];
        var html = '';
        
        tipsters.forEach(function(tipster, index) {
            var rank = index + 1;
            var rankClass = rank <= 3 ? 'rank-' + rank : 'rank-other';
            var medalHtml = rank <= 3 ? '<span class="leaderboard-medal">' + medals[rank - 1] + '</span>' : '';
            
            var starsHtml = '';
            if (tipster.avgRating > 0) {
                starsHtml = '<span style="color:#F59E0B;">' + '★'.repeat(Math.round(tipster.avgRating)) + '</span>' +
                    '<span style="font-size:0.7rem;color:#6B7280;"> ' + tipster.avgRating + '</span>';
            }
            
            html += '<div class="leaderboard-card">' +
                '<div class="leaderboard-rank ' + rankClass + '">' + (rank <= 3 ? medalHtml : rank) + '</div>' +
                '<div class="leaderboard-info">' +
                '<div class="leaderboard-name">' + this.escapeHTML(tipster.name) + ' ' + starsHtml + '</div>' +
                '<div class="leaderboard-bio">' + this.escapeHTML((tipster.bio || '').substring(0, 60)) + '</div>' +
                '</div>' +
                '<div class="leaderboard-stats">' +
                '<div class="leaderboard-stat"><div class="leaderboard-stat-value" style="color:#059669;">' + tipster.winRate + '%</div><div class="leaderboard-stat-label">Win Rate</div></div>' +
                '<div class="leaderboard-stat"><div class="leaderboard-stat-value">' + tipster.totalTips + '</div><div class="leaderboard-stat-label">Tips</div></div>' +
                '<div class="leaderboard-stat"><div class="leaderboard-stat-value">' + tipster.totalSold + '</div><div class="leaderboard-stat-label">Zilizouzwa</div></div>' +
                '<div class="leaderboard-stat"><div class="leaderboard-stat-value" style="color:#059669;">TZS ' + this.formatNumber(tipster.totalRevenue) + '</div><div class="leaderboard-stat-label">Mapato</div></div>' +
                '</div>' +
                '</div>';
        }.bind(this));
        
        list.innerHTML = html;
    },
    
    getUsersData: function() {
        try {
            var d = localStorage.getItem('bashiri_users');
            if (!d) return [];
            if (d.startsWith('ENC:') && typeof CryptoJS !== 'undefined') {
                var bytes = CryptoJS.AES.decrypt(d.substring(4), 'BashiriNasi@2025!TZ#Secure#Key$%^&*()');
                var decrypted = bytes.toString(CryptoJS.enc.Utf8);
                if (decrypted) return JSON.parse(decrypted);
            }
            return JSON.parse(d);
        } catch(e) { return []; }
    },
    
    getTipsData: function() {
        try {
            var d = localStorage.getItem('bashiri_tips');
            if (!d) return [];
            if (d.startsWith('ENC:') && typeof CryptoJS !== 'undefined') {
                var bytes = CryptoJS.AES.decrypt(d.substring(4), 'BashiriNasi@2025!TZ#Secure#Key$%^&*()');
                var decrypted = bytes.toString(CryptoJS.enc.Utf8);
                if (decrypted) return JSON.parse(decrypted);
            }
            return JSON.parse(d);
        } catch(e) { return []; }
    },
    
    getRatingsData: function() {
        try {
            return JSON.parse(localStorage.getItem('bashiri_ratings') || '[]');
        } catch(e) { return []; }
    },
    
    escapeHTML: function(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },
    
    formatNumber: function(n) {
        return Number(n).toLocaleString('en-TZ');
    }
};

document.addEventListener('DOMContentLoaded', function() {
    Leaderboard.init();
});

window.Leaderboard = Leaderboard;