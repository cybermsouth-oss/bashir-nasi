// ============================================
// BASHIRI NASI - LEADERBOARD MODULE
// REAL API DATA ONLY - No Demo/Fallback Data
// ============================================

var Leaderboard = {
    currentFilter: 'all',
    
    load: function(filter) {
        this.currentFilter = filter;
        
        // Update active tab
        document.querySelectorAll('.leaderboard-tab').forEach(function(tab) {
            tab.classList.remove('active');
        });
        
        // Set active tab
        var tabs = document.querySelectorAll('.leaderboard-tab');
        tabs.forEach(function(tab) {
            var tabText = tab.textContent.toLowerCase();
            if ((filter === 'all' && tabText.includes('wote')) || 
                (filter === 'monthly' && tabText.includes('mwezi')) || 
                (filter === 'weekly' && tabText.includes('wiki')) || 
                (filter === 'winrate' && tabText.includes('win rate'))) {
                tab.classList.add('active');
            }
        });
        
        // Show loading state
        var container = document.getElementById('leaderboardList');
        if (container) {
            container.innerHTML = '<div style="text-align:center;padding:40px;">' +
                '<i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#059669;"></i>' +
                '<p>Loading tipsters from server...</p>' +
                '</div>';
        }
        
        // Fetch from API only
        this.fetchTipsters(filter);
    },
    
    fetchTipsters: function(filter) {
        var self = this;
        var container = document.getElementById('leaderboardList');
        
        // Check if API function exists
        if (typeof apiCall !== 'function') {
            if (container) {
                container.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
                    '<div style="font-size:3rem;margin-bottom:16px;">⚠️</div>' +
                    '<h3>Cannot Connect to Server</h3>' +
                    '<p style="color:#6B7280;">Please make sure the API is properly configured.</p>' +
                    '<button class="btn btn-primary" style="margin-top:16px;" onclick="Leaderboard.load(\'all\')">' +
                    '<i class="fas fa-sync-alt"></i> Try Again</button>' +
                    '</div>';
            }
            return;
        }
        
        // Fetch tipsters from real API
        apiCall('users.php?role=tipster', 'GET')
            .then(function(response) {
                if (response.success && response.data && response.data.length > 0) {
                    // Fetch tips for statistics
                    apiCall('tips.php?action=all', 'GET')
                        .then(function(tipResponse) {
                            var tips = tipResponse.success ? (tipResponse.data || []) : [];
                            self.renderLeaderboard(response.data, tips, filter);
                        })
                        .catch(function() {
                            if (container) {
                                container.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
                                    '<div style="font-size:3rem;margin-bottom:16px;">⚠️</div>' +
                                    '<h3>Failed to Load Tips</h3>' +
                                    '<p style="color:#6B7280;">Please try again in a moment.</p>' +
                                    '<button class="btn btn-primary" style="margin-top:16px;" onclick="Leaderboard.load(\'all\')">' +
                                    '<i class="fas fa-sync-alt"></i> Try Again</button>' +
                                    '</div>';
                            }
                        });
                } else {
                    self.showEmpty();
                }
            })
            .catch(function() {
                if (container) {
                    container.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
                        '<div style="font-size:3rem;margin-bottom:16px;">⚠️</div>' +
                        '<h3>Cannot Connect to Server</h3>' +
                        '<p style="color:#6B7280;">Make sure the server is running and try again.</p>' +
                        '<button class="btn btn-primary" style="margin-top:16px;" onclick="Leaderboard.load(\'all\')">' +
                        '<i class="fas fa-sync-alt"></i> Try Again</button>' +
                        '</div>';
                }
            });
    },
    
    renderLeaderboard: function(tipsters, tips, filter) {
        var container = document.getElementById('leaderboardList');
        if (!container) return;
        
        // Calculate stats for each tipster
        var tipsterStats = tipsters.map(function(tipster) {
            var tipsterTips = tips.filter(function(t) {
                return t.tipster_id === tipster.id;
            });
            
            var total = tipsterTips.length;
            var won = tipsterTips.filter(function(t) { return t.result === 'won'; }).length;
            var lost = tipsterTips.filter(function(t) { return t.result === 'lost'; }).length;
            var winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;
            
            return {
                id: tipster.id,
                name: tipster.name || 'Tipster',
                bio: tipster.bio || '',
                totalTips: total,
                won: won,
                lost: lost,
                winRate: winRate
            };
        });
        
        // Filter out tipsters with no tips
        var filtered = tipsterStats.filter(function(s) {
            return s.totalTips > 0;
        });
        
        // Sort by win rate (highest first), then by total tips
        filtered.sort(function(a, b) {
            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
            return b.totalTips - a.totalTips;
        });
        
        // Top 20 only
        filtered = filtered.slice(0, 20);
        
        if (filtered.length === 0) {
            this.showEmpty();
            return;
        }
        
        var html = '';
        
        filtered.forEach(function(tipster, index) {
            var rank = index + 1;
            var rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
            var medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            
            var winRateColor = tipster.winRate >= 70 ? '#059669' : 
                               tipster.winRate >= 50 ? '#F59E0B' : '#EF4444';
            
            html += '<div class="leaderboard-card">';
            html += '<div class="leaderboard-rank ' + rankClass + '">';
            html += medal || rank;
            html += '</div>';
            html += '<div class="leaderboard-info">';
            html += '<div class="leaderboard-name">' + escapeHTML(tipster.name) + '</div>';
            html += '<div class="leaderboard-bio">' + escapeHTML(tipster.bio) + '</div>';
            html += '</div>';
            html += '<div class="leaderboard-stats">';
            html += '<div class="leaderboard-stat">';
            html += '<div class="leaderboard-stat-value" style="color:' + winRateColor + ';font-size:1.2rem;">' + tipster.winRate + '%</div>';
            html += '<div class="leaderboard-stat-label">Win Rate</div>';
            html += '</div>';
            html += '<div class="leaderboard-stat">';
            html += '<div class="leaderboard-stat-value">' + tipster.won + '/' + tipster.lost + '</div>';
            html += '<div class="leaderboard-stat-label">W/L</div>';
            html += '</div>';
            html += '<div class="leaderboard-stat">';
            html += '<div class="leaderboard-stat-value">' + tipster.totalTips + '</div>';
            html += '<div class="leaderboard-stat-label">Total</div>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        });
        
        container.innerHTML = html;
    },
    
    showEmpty: function() {
        var container = document.getElementById('leaderboardList');
        if (container) {
            container.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
                '<div style="font-size:3rem;margin-bottom:16px;">🏆</div>' +
                '<h3>No Tipsters Yet</h3>' +
                '<p style="color:#6B7280;">Tipsters will appear here once they start posting tips.</p>' +
                '<a href="register.html" class="btn btn-primary" style="margin-top:16px;">Register as Tipster</a>' +
                '</div>';
        }
    }
};

// Helper function to escape HTML
function escapeHTML(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    Leaderboard.load('all');
});
