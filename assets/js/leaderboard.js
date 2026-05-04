// ============================================
// BASHIRI NASI - LEADERBOARD MODULE v3.0
// STANDALONE VERSION - Built-in API Caller
// ============================================

// API Configuration
var CONFIG = {
    API_BASE_URL: 'https://cybermsouth-oss.github.io/bashir-nasi/api/',
    API_TIMEOUT: 10000
};

// Built-in API caller
function apiCall(endpoint, method, data) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        var url = CONFIG.API_BASE_URL + endpoint;
        
        if (method === 'GET' && data) {
            var params = [];
            for (var key in data) {
                if (data.hasOwnProperty(key) && data[key] !== null) {
                    params.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
                }
            }
            if (params.length > 0) url += '?' + params.join('&');
        }
        
        xhr.open(method, url, true);
        xhr.timeout = CONFIG.API_TIMEOUT;
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onload = function() {
            try {
                var response = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(response);
                } else {
                    reject(response || { success: false, message: 'Server error' });
                }
            } catch(e) {
                reject({ success: false, message: 'Invalid response' });
            }
        };
        
        xhr.onerror = function() {
            reject({ success: false, message: 'Network error' });
        };
        
        xhr.ontimeout = function() {
            reject({ success: false, message: 'Timeout' });
        };
        
        if (method === 'GET') {
            xhr.send();
        } else {
            xhr.send(JSON.stringify(data || {}));
        }
    });
}

// Leaderboard Module
var Leaderboard = {
    currentFilter: 'all',
    
    load: function(filter) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.leaderboard-tab').forEach(function(tab) {
            tab.classList.remove('active');
        });
        
        var tabs = document.querySelectorAll('.leaderboard-tab');
        tabs.forEach(function(tab) {
            var text = tab.textContent.toLowerCase();
            if ((filter === 'all' && (text.includes('all') || text.includes('wote'))) || 
                (filter === 'monthly' && (text.includes('month') || text.includes('mwezi'))) || 
                (filter === 'weekly' && (text.includes('week') || text.includes('wiki'))) || 
                (filter === 'winrate' && (text.includes('win rate') || text.includes('winrate')))) {
                tab.classList.add('active');
            }
        });
        
        var container = document.getElementById('leaderboardList');
        if (container) {
            container.innerHTML = '<div style="text-align:center;padding:40px;">' +
                '<i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#059669;"></i>' +
                '<p>Loading top tipsters...</p></div>';
        }
        
        this.fetchTipsters(filter);
    },
    
    fetchTipsters: function(filter) {
        var self = this;
        var container = document.getElementById('leaderboardList');
        
        apiCall('users.php?role=tipster', 'GET')
            .then(function(response) {
                if (response.success && response.data && response.data.length > 0) {
                    apiCall('tips.php?action=all', 'GET')
                        .then(function(tipResponse) {
                            var tips = tipResponse.success ? (tipResponse.data || []) : [];
                            self.renderLeaderboard(response.data, tips, filter);
                        })
                        .catch(function() {
                            if (container) {
                                container.innerHTML = '<div style="text-align:center;padding:60px;">' +
                                    '<div style="font-size:3rem;">⚠️</div>' +
                                    '<h3>Failed to Load Tips</h3>' +
                                    '<button class="btn btn-primary" style="margin-top:16px;" onclick="Leaderboard.load(\'all\')">Retry</button></div>';
                            }
                        });
                } else {
                    self.showEmpty();
                }
            })
            .catch(function() {
                if (container) {
                    container.innerHTML = '<div style="text-align:center;padding:60px;">' +
                        '<div style="font-size:3rem;">⚠️</div>' +
                        '<h3>Cannot Connect to Server</h3>' +
                        '<p style="color:#6B7280;">Make sure your API server is running.</p>' +
                        '<button class="btn btn-primary" style="margin-top:16px;" onclick="Leaderboard.load(\'all\')">Retry</button></div>';
                }
            });
    },
    
    renderLeaderboard: function(tipsters, tips, filter) {
        var container = document.getElementById('leaderboardList');
        if (!container) return;
        
        var stats = tipsters.map(function(t) {
            var myTips = tips.filter(function(tip) { return tip.tipster_id === t.id; });
            var won = myTips.filter(function(tip) { return tip.result === 'won'; }).length;
            var lost = myTips.filter(function(tip) { return tip.result === 'lost'; }).length;
            var total = myTips.length;
            var winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;
            
            return {
                id: t.id,
                name: t.name || 'Unknown',
                bio: t.bio || '',
                total: total,
                won: won,
                lost: lost,
                winRate: winRate
            };
        });
        
        stats = stats.filter(function(s) { return s.total > 0; });
        
        stats.sort(function(a, b) {
            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
            return b.total - a.total;
        });
        
        stats = stats.slice(0, 20);
        
        if (stats.length === 0) {
            this.showEmpty();
            return;
        }
        
        var html = '';
        
        stats.forEach(function(s, i) {
            var rank = i + 1;
            var rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
            var medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            var color = s.winRate >= 70 ? '#059669' : s.winRate >= 50 ? '#F59E0B' : '#EF4444';
            
            html += '<div class="leaderboard-card">';
            html += '<div class="leaderboard-rank ' + rankClass + '">' + (medal || rank) + '</div>';
            html += '<div class="leaderboard-info">';
            html += '<div class="leaderboard-name">' + escapeHTML(s.name) + '</div>';
            if (s.bio) html += '<div class="leaderboard-bio">' + escapeHTML(s.bio) + '</div>';
            html += '</div>';
            html += '<div class="leaderboard-stats">';
            html += '<div class="leaderboard-stat"><div class="leaderboard-stat-value" style="color:' + color + ';font-size:1.2rem;">' + s.winRate + '%</div><div class="leaderboard-stat-label">Win Rate</div></div>';
            html += '<div class="leaderboard-stat"><div class="leaderboard-stat-value">' + s.won + '/' + s.lost + '</div><div class="leaderboard-stat-label">W/L</div></div>';
            html += '<div class="leaderboard-stat"><div class="leaderboard-stat-value">' + s.total + '</div><div class="leaderboard-stat-label">Tips</div></div>';
            html += '</div>';
            html += '</div>';
        });
        
        container.innerHTML = html;
    },
    
    showEmpty: function() {
        var container = document.getElementById('leaderboardList');
        if (container) {
            container.innerHTML = '<div style="text-align:center;padding:60px;">' +
                '<div style="font-size:3rem;">🏆</div>' +
                '<h3>No Tipsters Found</h3>' +
                '<p style="color:#6B7280;">No tipsters with verified tips yet.</p></div>';
        }
    }
};

function escapeHTML(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    Leaderboard.load('all');
});
