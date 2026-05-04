// ============================================
// BASHIRI NASI - SCREENSHOT UPLOAD MODULE
// Tipsters can upload proof screenshots
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initScreenshotUpload();
});

function initScreenshotUpload() {
    // Add screenshot upload to tipster upload form
    var uploadForm = document.getElementById('uploadTipForm');
    if (!uploadForm) return;
    
    // Check if already added
    if (document.getElementById('screenshotUploadGroup')) return;
    
    // Create upload field
    var uploadGroup = document.createElement('div');
    uploadGroup.id = 'screenshotUploadGroup';
    uploadGroup.className = 'form-group';
    uploadGroup.innerHTML = `
        <label class="form-label">
            <i class="fas fa-camera"></i> Screenshot ya Ushahidi (Optional)
        </label>
        <div class="screenshot-upload-area" id="screenshotDropZone">
            <div class="screenshot-placeholder">
                <i class="fas fa-cloud-upload-alt" style="font-size:2rem;color:#9CA3AF;"></i>
                <p style="color:#6B7280;margin:8px 0;">Bofya au buruta picha hapa</p>
                <span style="font-size:0.7rem;color:#9CA3AF;">Max: 5MB | Formats: JPG, PNG, WEBP</span>
            </div>
            <input type="file" id="screenshotInput" accept="image/*" style="display:none;" />
            <div id="screenshotPreview" style="display:none;position:relative;">
                <img id="screenshotImg" src="" alt="Preview" style="max-width:100%;max-height:200px;border-radius:8px;" />
                <button type="button" id="removeScreenshot" style="position:absolute;top:8px;right:8px;background:#EF4444;color:white;border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;">×</button>
            </div>
        </div>
        <span class="form-hint">Pakia screenshot ya bet slip kama ushahidi (itakayoonekana baada ya matokeo)</span>
    `;
    
    // Insert before submit button
    var submitBtn = uploadForm.querySelector('button[type="submit"]');
    submitBtn.parentNode.insertBefore(uploadGroup, submitBtn);
    
    // Setup event listeners
    setupScreenshotEvents();
}

function setupScreenshotEvents() {
    var dropZone = document.getElementById('screenshotDropZone');
    var fileInput = document.getElementById('screenshotInput');
    var preview = document.getElementById('screenshotPreview');
    var previewImg = document.getElementById('screenshotImg');
    var placeholder = dropZone.querySelector('.screenshot-placeholder');
    var removeBtn = document.getElementById('removeScreenshot');
    
    // Style the drop zone
    dropZone.style.cssText = 'border:2px dashed #D1D5DB;border-radius:12px;padding:24px;text-align:center;cursor:pointer;transition:all 0.3s;background:#F9FAFB;';
    
    // Click to upload
    dropZone.addEventListener('click', function() {
        fileInput.click();
    });
    
    // File selected
    fileInput.addEventListener('change', function(e) {
        handleFileSelect(e.target.files[0]);
    });
    
    // Drag and drop
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#059669';
        dropZone.style.background = '#ECFDF5';
    });
    
    dropZone.addEventListener('dragleave', function() {
        dropZone.style.borderColor = '#D1D5DB';
        dropZone.style.background = '#F9FAFB';
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#D1D5DB';
        dropZone.style.background = '#F9FAFB';
        
        var file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    });
    
    // Remove screenshot
    if (removeBtn) {
        removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            fileInput.value = '';
            placeholder.style.display = 'block';
            preview.style.display = 'none';
            previewImg.src = '';
        });
    }
}

function handleFileSelect(file) {
    if (!file) return;
    
    // Validate file type
    var validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (validTypes.indexOf(file.type) === -1) {
        if (typeof toast === 'function') toast('Aina ya faili hairuhusiwi. Tumia JPG, PNG au WEBP.', 'error');
        return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        if (typeof toast === 'function') toast('Faili ni kubwa sana. Max 5MB.', 'error');
        return;
    }
    
    var reader = new FileReader();
    reader.onload = function(e) {
        var placeholder = document.querySelector('.screenshot-placeholder');
        var preview = document.getElementById('screenshotPreview');
        var previewImg = document.getElementById('screenshotImg');
        
        previewImg.src = e.target.result;
        placeholder.style.display = 'none';
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Get screenshot data for upload
function getScreenshotData() {
    var fileInput = document.getElementById('screenshotInput');
    if (fileInput && fileInput.files[0]) {
        return fileInput.files[0];
    }
    return null;
}

// Add screenshot to tip data before submit
var originalUploadForm = document.getElementById('uploadTipForm');
if (originalUploadForm) {
    var originalSubmit = originalUploadForm.onsubmit;
    originalUploadForm.onsubmit = function(e) {
        e.preventDefault();
        
        // Get form data
        var formData = new FormData(originalUploadForm);
        var screenshot = getScreenshotData();
        
        if (screenshot) {
            formData.append('screenshot', screenshot);
            
            // Use FormData to submit
            uploadTipWithScreenshot(formData);
        } else {
            // No screenshot, use original submit
            if (originalSubmit) {
                originalSubmit.call(this, e);
            }
        }
    };
}

function uploadTipWithScreenshot(formData) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'api/upload-screenshot.php', true);
    
    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            var percent = Math.round((e.loaded / e.total) * 100);
            console.log('Upload progress: ' + percent + '%');
        }
    };
    
    xhr.onload = function() {
        try {
            var response = JSON.parse(xhr.responseText);
            if (response.success) {
                if (typeof toast === 'function') {
                    toast('✅ Tip na screenshot imepakiwa!', 'success');
                }
                // Reset form
                document.getElementById('uploadTipForm').reset();
                var placeholder = document.querySelector('.screenshot-placeholder');
                var preview = document.getElementById('screenshotPreview');
                if (placeholder) placeholder.style.display = 'block';
                if (preview) preview.style.display = 'none';
                
                // Reload tips
                if (typeof loadTipsterMyTips === 'function') loadTipsterMyTips();
                if (typeof loadTipsterOverview === 'function') loadTipsterOverview();
            } else {
                if (typeof toast === 'function') toast(response.message || 'Upload failed', 'error');
            }
        } catch(e) {
            console.error('Upload response error:', e);
        }
    };
    
    xhr.onerror = function() {
        if (typeof toast === 'function') toast('Network error during upload', 'error');
    };
    
    xhr.send(formData);
}

// Display screenshot in tip cards
function addScreenshotToTipCard(tipId, screenshotUrl) {
    var tipCards = document.querySelectorAll('.bet-slip-card');
    tipCards.forEach(function(card) {
        if (card.getAttribute('data-tip-id') === tipId) {
            var screenshotDiv = document.createElement('div');
            screenshotDiv.className = 'tip-screenshot';
            screenshotDiv.style.cssText = 'margin-top:12px;';
            screenshotDiv.innerHTML = `
                <div style="font-size:0.75rem;color:#6B7280;margin-bottom:6px;">
                    <i class="fas fa-camera"></i> Screenshot ya Ushahidi:
                </div>
                <img src="${screenshotUrl}" alt="Bet Slip Screenshot" 
                     style="max-width:100%;border-radius:8px;border:1px solid #E5E7EB;cursor:pointer;"
                     onclick="window.open('${screenshotUrl}', '_blank')" />
            `;
            card.querySelector('.bet-slip-body').appendChild(screenshotDiv);
        }
    });
}

console.log('✅ Screenshot Upload Module Loaded');