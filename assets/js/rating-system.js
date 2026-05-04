// ============================================
// BASHIRI NASI - RATING & REVIEW SYSTEM
// Star Ratings | User Reviews | Tipster Scores
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initRatingSystem();
});

var RatingSystem = {
    config: {
        maxStars: 5,
        minReviewLength: 10,
        maxReviewLength: 500,
        reviewsPerPage: 10
    },
    
    init: function() {
        this.injectRatingStyles();
        this.addRatingToTipsterCards();
        console.log('⭐ Rating System Initialized');
    },
    
    injectRatingStyles: function() {
        if (document.getElementById('ratingStyles')) return;
        
        var styleEl = document.createElement('style');
        styleEl.id = 'ratingStyles';
        styleEl.textContent = `
            .star-rating {
                display: inline-flex;
                gap: 3px;
                direction: ltr;
            }
            .star-rating .star {
                font-size: 1.4rem;
                color: #D1D5DB;
                cursor: pointer;
                transition: all 0.15s ease;
                user-select: none;
            }
            .star-rating .star:hover,
            .star-rating .star.active {
                color: #F59E0B;
                transform: scale(1.2);
            }
            .star-rating.readonly .star {
                cursor: default;
            }
            .star-rating.readonly .star:hover {
                transform: none;
            }
            .rating-display {
                display: flex;
                align-items: center;
                gap: 8px;
                justify-content: center;
            }
            .rating-avg {
                font-size: 1.5rem;
                font-weight: 800;
                color: #F59E0B;
            }
            .rating-count {
                font-size: 0.75rem;
                color: #6B7280;
            }
            .review-card {
                background: var(--card-bg);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                border: 1px solid var(--border-color);
            }
            .review-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            .review-author {
                font-weight: 600;
                font-size: 0.85rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .review-author-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: linear-gradient(135deg, #059669, #10B981);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 0.8rem;
            }
            .review-date {
                font-size: 0.7rem;
                color: #9CA3AF;
            }
            .review-text {
                font-size: 0.85rem;
                color: var(--text-secondary);
                line-height: 1.6;
            }
            .rating-form {
                background: var(--bg-primary);
                border-radius: 12px;
                padding: 16px;
                margin-top: 12px;
                border: 1px solid var(--border-color);
            }
            .rating-form textarea {
                width: 100%;
                min-height: 80px;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 10px;
                font-family: inherit;
                font-size: 0.85rem;
                resize: vertical;
                background: var(--card-bg);
                color: var(--text-primary);
            }
            .rating-form textarea:focus {
                outline: none;
                border-color: #059669;
                box-shadow: 0 0 0 3px rgba(5,150,105,0.1);
            }
            .rating-form-buttons {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 10px;
            }
            .rating-char-count {
                font-size: 0.7rem;
                color: #9CA3AF;
            }
        `;
        document.head.appendChild(styleEl);
    },
    
    // ============================================
    // GET RATINGS DATA
    // ============================================
    getRatings: function(tipsterId) {
        try {
            var allRatings = JSON.parse(localStorage.getItem('bashiri_ratings') || '[]');
            return allRatings.filter(function(r) { return r.tipsterId === tipsterId; });
        } catch(e) { return []; }
    },
    
    getAverageRating: function(tipsterId) {
        var ratings = this.getRatings(tipsterId);
        if (ratings.length === 0) return { avg: 0, count: 0 };
        
        var sum = 0;
        for (var i = 0; i < ratings.length; i++) {
            sum += ratings[i].stars || 0;
        }
        return {
            avg: (sum / ratings.length).toFixed(1),
            count: ratings.length
        };
    },
    
    // ============================================
    // RENDER STARS
    // ============================================
    renderStars: function(rating, interactive, tipsterId) {
        var html = '<div class="star-rating' + (interactive ? '' : ' readonly') + '" data-tipster-id="' + (tipsterId || '') + '">';
        
        for (var i = 1; i <= this.config.maxStars; i++) {
            if (i <= Math.floor(rating)) {
                html += '<span class="star active">★</span>';
            } else {
                html += '<span class="star">☆</span>';
            }
        }
        
        html += '</div>';
        return html;
    },
    
    // ============================================
    // RATE A TIPSTER
    // ============================================
    rateTipster: function(tipsterId) {
        var session = localStorage.getItem('bashiri_session');
        if (!session) {
            if (typeof toast === 'function') toast('Tafadhali ingia ili kupiga kura.', 'error');
            window.location.href = 'login.html';
            return;
        }
        
        // Show star selection first
        this.showStarSelector(tipsterId);
    },
    
    showStarSelector: function(tipsterId) {
        // Remove existing selector
        var existing = document.getElementById('starSelector_' + tipsterId);
        if (existing) {
            existing.remove();
            return;
        }
        
        var card = document.querySelector('[data-tipster-id="' + tipsterId + '"]');
        if (!card) return;
        
        var selectorHtml = '<div id="starSelector_' + tipsterId + '" style="text-align:center;padding:12px;margin-top:8px;background:#FFFBEB;border-radius:8px;">' +
            '<div style="font-size:0.8rem;color:#92400E;margin-bottom:8px;font-weight:600;">Chagua nyota zako:</div>' +
            '<div style="display:flex;justify-content:center;gap:4px;font-size:1.8rem;">';
        
        for (var i = 1; i <= 5; i++) {
            selectorHtml += '<span class="star-selector" data-star="' + i + '" data-tipster="' + tipsterId + '" ' +
                'style="cursor:pointer;color:#D1D5DB;transition:all 0.15s;" ' +
                'onmouseover="RatingSystem.highlightStars(this, ' + i + ')" ' +
                'onmouseout="RatingSystem.resetStars(this)" ' +
                'onclick="RatingSystem.submitRating(\'' + tipsterId + '\', ' + i + ')">★</span>';
        }
        
        selectorHtml += '</div>' +
            '<button style="margin-top:8px;background:none;border:none;color:#6B7280;cursor:pointer;font-size:0.7rem;" ' +
            'onclick="document.getElementById(\'starSelector_' + tipsterId + '\').remove()">Ghairi</button>' +
            '</div>';
        
        card.insertAdjacentHTML('beforeend', selectorHtml);
    },
    
    highlightStars: function(el, count) {
        var parent = el.parentElement;
        var stars = parent.querySelectorAll('.star-selector');
        for (var i = 0; i < stars.length; i++) {
            stars[i].style.color = i < count ? '#F59E0B' : '#D1D5DB';
            stars[i].style.transform = i < count ? 'scale(1.2)' : 'scale(1)';
        }
    },
    
    resetStars: function(el) {
        var parent = el.parentElement;
        var stars = parent.querySelectorAll('.star-selector');
        for (var i = 0; i < stars.length; i++) {
            stars[i].style.color = '#D1D5DB';
            stars[i].style.transform = 'scale(1)';
        }
    },
    
    submitRating: function(tipsterId, stars) {
        var session = localStorage.getItem('bashiri_session');
        if (!session) return;
        
        var user = JSON.parse(session);
        var allRatings = JSON.parse(localStorage.getItem('bashiri_ratings') || '[]');
        
        // Check if already rated
        var existingIndex = -1;
        for (var i = 0; i < allRatings.length; i++) {
            if (allRatings[i].userId === user.id && allRatings[i].tipsterId === tipsterId) {
                existingIndex = i;
                break;
            }
        }
        
        if (existingIndex !== -1) {
            // Update existing
            allRatings[existingIndex].stars = stars;
            allRatings[existingIndex].updatedAt = new Date().toISOString();
        } else {
            // New rating
            allRatings.push({
                id: 'rating_' + Date.now(),
                userId: user.id,
                userName: user.name || 'Mtumiaji',
                tipsterId: tipsterId,
                stars: stars,
                review: '',
                createdAt: new Date().toISOString()
            });
        }
        
        localStorage.setItem('bashiri_ratings', JSON.stringify(allRatings));
        
        // Remove star selector
        var selector = document.getElementById('starSelector_' + tipsterId);
        if (selector) selector.remove();
        
        // Show review form
        this.showReviewForm(tipsterId);
        
        // Refresh display
        this.refreshTipsterCard(tipsterId);
        
        if (typeof toast === 'function') toast('⭐ Umeweka nyota ' + stars + '! Unaweza kuongeza maoni.', 'success');
    },
    
    // ============================================
    // REVIEW FORM (FIXED)
    // ============================================
    showReviewForm: function(tipsterId) {
        // Remove existing form
        var existingForm = document.getElementById('reviewForm_' + tipsterId);
        if (existingForm) existingForm.remove();
        
        var card = document.querySelector('[data-tipster-id="' + tipsterId + '"]');
        if (!card) return;
        
        var formHtml = '<div id="reviewForm_' + tipsterId + '" class="rating-form">' +
            '<label style="font-weight:600;margin-bottom:8px;display:block;font-size:0.85rem;">' +
            '<i class="fas fa-comment"></i> Andika Maoni (Optional)</label>' +
            '<textarea id="reviewText_' + tipsterId + '" placeholder="Andika maoni yako kuhusu tipster huyu..." maxlength="' + this.config.maxReviewLength + '"></textarea>' +
            '<div class="rating-form-buttons">' +
            '<span class="rating-char-count" id="charCount_' + tipsterId + '">0/' + this.config.maxReviewLength + '</span>' +
            '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-outline btn-sm" onclick="RatingSystem.cancelReview(\'' + tipsterId + '\')">Ghairi</button>' +
            '<button class="btn btn-primary btn-sm" onclick="RatingSystem.submitReview(\'' + tipsterId + '\')">' +
            '<i class="fas fa-paper-plane"></i> Tuma</button>' +
            '</div></div></div>';
        
        card.insertAdjacentHTML('afterend', formHtml);
        
        // Character counter
        var textarea = document.getElementById('reviewText_' + tipsterId);
        if (textarea) {
            textarea.addEventListener('input', function() {
                var count = this.value.length;
                var counter = document.getElementById('charCount_' + tipsterId);
                if (counter) counter.textContent = count + '/' + RatingSystem.config.maxReviewLength;
            });
            setTimeout(function() { textarea.focus(); }, 100);
        }
    },
    
    submitReview: function(tipsterId) {
        var session = localStorage.getItem('bashiri_session');
        if (!session) return;
        
        var user = JSON.parse(session);
        var textarea = document.getElementById('reviewText_' + tipsterId);
        var review = textarea ? textarea.value.trim() : '';
        
        if (review.length > 0 && review.length < this.config.minReviewLength) {
            if (typeof toast === 'function') toast('Maoni yanahitaji angalau herufi ' + this.config.minReviewLength, 'error');
            return;
        }
        
        var allRatings = JSON.parse(localStorage.getItem('bashiri_ratings') || '[]');
        
        // Find the user's rating for this tipster
        var found = false;
        for (var i = allRatings.length - 1; i >= 0; i--) {
            if (allRatings[i].userId === user.id && allRatings[i].tipsterId === tipsterId) {
                allRatings[i].review = review;
                allRatings[i].reviewedAt = new Date().toISOString();
                found = true;
                break;
            }
        }
        
        // If no rating exists yet, create one
        if (!found) {
            allRatings.push({
                id: 'rating_' + Date.now(),
                userId: user.id,
                userName: user.name || 'Mtumiaji',
                tipsterId: tipsterId,
                stars: 0,
                review: review,
                createdAt: new Date().toISOString(),
                reviewedAt: new Date().toISOString()
            });
        }
        
        localStorage.setItem('bashiri_ratings', JSON.stringify(allRatings));
        
        // Remove form
        var form = document.getElementById('reviewForm_' + tipsterId);
        if (form) form.remove();
        
        if (typeof toast === 'function') toast('✅ Maoni yamewekwa! Asante.', 'success');
        
        // Show the review
        this.showReviews(tipsterId);
    },
    
    cancelReview: function(tipsterId) {
        var form = document.getElementById('reviewForm_' + tipsterId);
        if (form) {
            form.style.opacity = '0';
            form.style.transform = 'translateY(-10px)';
            form.style.transition = 'all 0.3s';
            setTimeout(function() {
                if (form && form.parentNode) form.remove();
            }, 300);
        }
    },
    
    // ============================================
    // DISPLAY RATINGS
    // ============================================
    addRatingToTipsterCards: function() {
        var self = this;
        
        // Run immediately
        this.enhanceTipsterCards();
        
        // Also observe for changes
        var grid = document.getElementById('tipstersGrid');
        if (grid) {
            var observer = new MutationObserver(function() {
                self.enhanceTipsterCards();
            });
            observer.observe(grid, { childList: true, subtree: true });
        }
    },
    
    enhanceTipsterCards: function() {
        var cards = document.querySelectorAll('#tipstersGrid .card');
        
        cards.forEach(function(card) {
            if (card.querySelector('.rating-display')) return;
            
            var followBtn = card.querySelector('button[onclick*="followTipster"]');
            if (!followBtn) return;
            
            var onclick = followBtn.getAttribute('onclick');
            var match = onclick.match(/followTipster\('([^']+)'\)/);
            if (!match) return;
            
            var tipsterId = match[1];
            card.setAttribute('data-tipster-id', tipsterId);
            
            var avgRating = RatingSystem.getAverageRating(tipsterId);
            
            var ratingHtml = '<div class="rating-display" style="margin:8px 0;justify-content:center;">' +
                RatingSystem.renderStars(parseFloat(avgRating.avg), false, tipsterId) +
                '<span class="rating-count">(' + avgRating.count + ')</span>' +
                '</div>' +
                '<button class="btn btn-outline btn-sm" style="width:100%;margin-top:4px;" onclick="RatingSystem.rateTipster(\'' + tipsterId + '\')">' +
                '<i class="fas fa-star"></i> Piga Kura</button>';
            
            followBtn.insertAdjacentHTML('beforebegin', ratingHtml);
        });
    },
    
    refreshTipsterCard: function(tipsterId) {
        var card = document.querySelector('[data-tipster-id="' + tipsterId + '"]');
        if (!card) return;
        
        var avgRating = this.getAverageRating(tipsterId);
        var starsDisplay = card.querySelector('.star-rating');
        var countDisplay = card.querySelector('.rating-count');
        
        if (starsDisplay) {
            starsDisplay.outerHTML = this.renderStars(parseFloat(avgRating.avg), false, tipsterId);
        }
        if (countDisplay) {
            countDisplay.textContent = '(' + avgRating.count + ')';
        }
        
        this.showReviews(tipsterId);
    },
    
    showReviews: function(tipsterId) {
        // Remove existing reviews for this tipster
        var existingReviews = document.getElementById('reviews_' + tipsterId);
        if (existingReviews) existingReviews.remove();
        
        var ratings = this.getRatings(tipsterId);
        var reviewsWithText = ratings.filter(function(r) { return r.review && r.review.length > 0; });
        
        if (reviewsWithText.length === 0) return;
        
        var card = document.querySelector('[data-tipster-id="' + tipsterId + '"]');
        if (!card) return;
        
        var reviewsHtml = '<div id="reviews_' + tipsterId + '" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);">' +
            '<div style="font-weight:600;font-size:0.8rem;margin-bottom:8px;color:var(--text-muted);">' +
            '<i class="fas fa-comments"></i> Maoni (' + reviewsWithText.length + ')</div>';
        
        reviewsWithText.slice(0, 3).forEach(function(rating) {
            reviewsHtml += '<div class="review-card">' +
                '<div class="review-header">' +
                '<div class="review-author">' +
                '<div class="review-author-avatar">' + (rating.userName || 'M').charAt(0).toUpperCase() + '</div>' +
                '<span>' + RatingSystem.escapeHTML(rating.userName || 'Mtumiaji') + '</span>' +
                '</div>' +
                '<div class="review-date">' + RatingSystem.fdate(rating.reviewedAt || rating.createdAt) + '</div>' +
                '</div>' +
                '<div style="color:#F59E0B;margin-bottom:4px;">' + '★'.repeat(rating.stars || 0) + '☆'.repeat(5 - (rating.stars || 0)) + '</div>' +
                '<div class="review-text">' + RatingSystem.escapeHTML(rating.review) + '</div>' +
                '</div>';
        });
        
        reviewsHtml += '</div>';
        
        card.insertAdjacentHTML('afterend', reviewsHtml);
    },
    
    // ============================================
    // HELPERS
    // ============================================
    escapeHTML: function(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },
    
    fdate: function(d) {
        if (!d) return '';
        try { return new Date(d).toLocaleDateString('en-GB'); } catch(e) { return ''; }
    }
};

function initRatingSystem() {
    RatingSystem.init();
}

// Expose globally
window.RatingSystem = RatingSystem;