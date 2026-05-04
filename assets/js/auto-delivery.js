// ============================================
// BASHIRI NASI - PROFESSIONAL DEPOSIT SCREEN
// After selecting network, shows deposit page
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initAutoDelivery();
});

var AutoDelivery = {
    selectedMethod: '',
    
    init: function() {
        this.overrideBuyFunction();
        console.log('📬 Auto Delivery System Ready');
    },
    
    overrideBuyFunction: function() {
        var self = this;
        window.buyTip = function(tipId, amount) {
            if (!currentUser) { window.location.href = 'login.html'; return; }
            self.showNetworkSelection(tipId, amount);
        };
    },
    
    // STEP 1: Select Payment Network
    showNetworkSelection: function(tipId, amount) {
        var existing = document.getElementById('autoDeliveryModal');
        if (existing) existing.remove();
        
        var tip = this.getTipInfo(tipId);
        
        var modalHTML = `
            <div id="autoDeliveryModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
                <div style="background:white;border-radius:20px;max-width:420px;width:100%;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.3);">
                    
                    <!-- Header -->
                    <div style="background:linear-gradient(135deg,#059669,#047857);padding:20px;text-align:center;color:white;">
                        <div style="font-size:2.5rem;margin-bottom:4px;">💰</div>
                        <h2 style="margin:0;font-size:1.3rem;font-weight:700;">Deposit</h2>
                        <div style="font-size:0.9rem;opacity:0.9;margin-top:4px;">Tsh - Tanzanian Shilling</div>
                    </div>
                    
                    <!-- Tip Info -->
                    <div style="text-align:center;padding:14px;border-bottom:1px solid #E5E7EB;">
                        <div style="font-size:0.7rem;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Kiasi cha Kulipa</div>
                        <div style="font-size:1.8rem;font-weight:900;color:#059669;">TZS ${amount.toLocaleString()}</div>
                        ${tip ? `<div style="font-size:0.7rem;color:#6B7280;margin-top:2px;">${getPlatformIcon(tip.platform)} ${escapeHTML((tip.platform||'').toUpperCase())} | Odds: ${tip.odds}</div>` : ''}
                    </div>
                    
                    <!-- Payment Methods -->
                    <div style="padding:16px;">
                        <div style="font-size:0.8rem;color:#6B7280;margin-bottom:12px;font-weight:600;">Chagua Njia ya Malipo:</div>
                        
                        <div onclick="AutoDelivery.showDepositScreen('mpesa', '${tipId}', ${amount})" style="display:flex;align-items:center;gap:14px;padding:14px;border:2px solid #E5E7EB;border-radius:12px;cursor:pointer;margin-bottom:10px;transition:all 0.2s;" onmouseover="this.style.borderColor='#10B981';this.style.background='#F0FDF4';" onmouseout="this.style.borderColor='#E5E7EB';this.style.background='white';">
                            <div style="width:42px;height:42px;background:linear-gradient(135deg,#10B981,#059669);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">M</div>
                            <div style="flex:1;"><div style="font-weight:700;font-size:0.9rem;">Vodacom M-Pesa</div><div style="font-size:0.7rem;color:#6B7280;">m-pesa | Mixx by Yas</div></div>
                            <i class="fas fa-chevron-right" style="color:#9CA3AF;"></i>
                        </div>
                        
                        <div onclick="AutoDelivery.showDepositScreen('airtel', '${tipId}', ${amount})" style="display:flex;align-items:center;gap:14px;padding:14px;border:2px solid #E5E7EB;border-radius:12px;cursor:pointer;margin-bottom:10px;transition:all 0.2s;" onmouseover="this.style.borderColor='#EF4444';this.style.background='#FEF2F2';" onmouseout="this.style.borderColor='#E5E7EB';this.style.background='white';">
                            <div style="width:42px;height:42px;background:linear-gradient(135deg,#EF4444,#DC2626);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">A</div>
                            <div style="flex:1;"><div style="font-weight:700;font-size:0.9rem;">Airtel Money</div><div style="font-size:0.7rem;color:#6B7280;">Airtel</div></div>
                            <i class="fas fa-chevron-right" style="color:#9CA3AF;"></i>
                        </div>
                        
                        <div onclick="AutoDelivery.showDepositScreen('halopesa', '${tipId}', ${amount})" style="display:flex;align-items:center;gap:14px;padding:14px;border:2px solid #E5E7EB;border-radius:12px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='#8B5CF6';this.style.background='#F5F3FF';" onmouseout="this.style.borderColor='#E5E7EB';this.style.background='white';">
                            <div style="width:42px;height:42px;background:linear-gradient(135deg,#8B5CF6,#6D28D9);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">H</div>
                            <div style="flex:1;"><div style="font-weight:700;font-size:0.9rem;">HaloPesa</div><div style="font-size:0.7rem;color:#6B7280;">haloPesa</div></div>
                            <i class="fas fa-chevron-right" style="color:#9CA3AF;"></i>
                        </div>
                        
                        <div onclick="AutoDelivery.showDepositScreen('tigo', '${tipId}', ${amount})" style="display:flex;align-items:center;gap:14px;padding:14px;border:2px solid #E5E7EB;border-radius:12px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='#3B82F6';this.style.background='#EFF6FF';" onmouseout="this.style.borderColor='#E5E7EB';this.style.background='white';">
                            <div style="width:42px;height:42px;background:linear-gradient(135deg,#3B82F6,#1D4ED8);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">T</div>
                            <div style="flex:1;"><div style="font-weight:700;font-size:0.9rem;">Tigo Pesa</div><div style="font-size:0.7rem;color:#6B7280;">Tigo</div></div>
                            <i class="fas fa-chevron-right" style="color:#9CA3AF;"></i>
                        </div>
                    </div>
                    
                    <div style="padding:12px 16px;border-top:1px solid #E5E7EB;text-align:center;">
                        <button onclick="document.getElementById('autoDeliveryModal').remove()" style="background:none;border:none;color:#6B7280;cursor:pointer;font-size:0.85rem;font-weight:600;">Ghairi</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    // STEP 2: Deposit Screen (After selecting network)
    showDepositScreen: function(method, tipId, amount) {
        this.selectedMethod = method;
        
        var paymentInfo = {
            mpesa: { number: '255784967484', name: 'BASHIRI NASI', color: '#10B981', icon: '📱' },
            airtel: { number: '255784967484', name: 'BASHIRI NASI', color: '#EF4444', icon: '📡' },
            halopesa: { number: '255784967484', name: 'BASHIRI NASI', color: '#8B5CF6', icon: '💳' },
            tigo: { number: '255784967484', name: 'BASHIRI NASI', color: '#3B82F6', icon: '📶' }
        };
        
        var info = paymentInfo[method];
        var userPhone = currentUser ? (currentUser.phone || '') : '';
        
        // Preset amounts
        var presetAmounts = [
            Math.max(amount, 1000),
            amount + 2000,
            amount + 4000,
            amount + 8000,
            amount + 10000
        ];
        
        var modal = document.getElementById('autoDeliveryModal');
        if (modal) {
            modal.querySelector('div').innerHTML = `
                <div style="background:white;border-radius:20px;max-width:420px;width:100%;overflow:hidden;">
                    
                    <!-- Back Button + Network -->
                    <div style="display:flex;align-items:center;padding:14px 16px;gap:12px;border-bottom:1px solid #E5E7EB;">
                        <button onclick="AutoDelivery.showNetworkSelection('${tipId}', ${amount})" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:#6B7280;padding:4px;">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div style="display:flex;align-items:center;gap:8px;flex:1;">
                            <div style="width:32px;height:32px;background:${info.color};border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.7rem;">${method.charAt(0).toUpperCase()}</div>
                            <span style="font-weight:600;">${method === 'mpesa' ? 'Vodacom M-Pesa' : method === 'airtel' ? 'Airtel Money' : method === 'halopesa' ? 'HaloPesa' : 'Tigo Pesa'}</span>
                        </div>
                        <span style="font-size:0.75rem;color:#6B7280;background:#F3F4F6;padding:4px 8px;border-radius:12px;">Fiat</span>
                    </div>
                    
                    <!-- Phone Number -->
                    <div style="padding:16px 20px;">
                        <div style="font-size:0.75rem;color:#6B7280;margin-bottom:6px;font-weight:600;">Namba ya Simu</div>
                        <input type="text" id="depositPhone" value="${escapeHTML(userPhone)}" placeholder="+255 000 000 000" 
                               style="width:100%;padding:12px;border:1px solid #E5E7EB;border-radius:10px;font-size:0.95rem;outline:none;box-sizing:border-box;letter-spacing:1px;"
                               onfocus="this.style.borderColor='${info.color}'" onblur="this.style.borderColor='#E5E7EB'" />
                    </div>
                    
                    <!-- Amount -->
                    <div style="padding:0 20px 16px;">
                        <div style="font-size:0.75rem;color:#6B7280;margin-bottom:6px;font-weight:600;">Amount</div>
                        <input type="number" id="depositAmount" value="${amount}" min="1000" max="5000000"
                               style="width:100%;padding:14px;border:1px solid #E5E7EB;border-radius:10px;font-size:1.5rem;font-weight:700;color:#059669;outline:none;box-sizing:border-box;text-align:center;"
                               onfocus="this.style.borderColor='${info.color}'" onblur="this.style.borderColor='#E5E7EB'" />
                        <div style="font-size:0.65rem;color:#9CA3AF;margin-top:4px;text-align:center;">from TZS 1,000 to TZS 5,000,000</div>
                    </div>
                    
                    <!-- Preset Amounts -->
                    <div style="padding:0 20px 16px;display:flex;gap:8px;flex-wrap:wrap;">
                        <button onclick="document.getElementById('depositAmount').value=${presetAmounts[0]}" style="flex:1;min-width:70px;padding:10px;border:1px solid #E5E7EB;border-radius:8px;background:white;cursor:pointer;font-weight:600;font-size:0.75rem;transition:all 0.2s;" onmouseover="this.style.borderColor='${info.color}';this.style.background='#F9FAFB';" onmouseout="this.style.borderColor='#E5E7EB';this.style.background='white';">TZS ${presetAmounts[0].toLocaleString()}</button>
                        <button onclick="document.getElementById('depositAmount').value=${presetAmounts[1]}" style="flex:1;min-width:70px;padding:10px;border:1px solid #E5E7EB;border-radius:8px;background:white;cursor:pointer;font-weight:600;font-size:0.75rem;transition:all 0.2s;" onmouseover="this.style.borderColor='${info.color}';this.style.background='#F9FAFB';" onmouseout="this.style.borderColor='#E5E7EB';this.style.background='white';">TZS ${presetAmounts[1].toLocaleString()}</button>
                        <button onclick="document.getElementById('depositAmount').value=${presetAmounts[2]}" style="flex:1;min-width:70px;padding:10px;border:1px solid #E5E7EB;border-radius:8px;background:white;cursor:pointer;font-weight:600;font-size:0.75rem;transition:all 0.2s;" onmouseover="this.style.borderColor='${info.color}';this.style.background='#F9FAFB';" onmouseout="this.style.borderColor='#E5E7EB';this.style.background='white';">TZS ${presetAmounts[2].toLocaleString()}</button>
                        <button onclick="document.getElementById('depositAmount').value=${presetAmounts[3]}" style="flex:1;min-width:70px;padding:10px;border:1px solid #E5E7EB;border-radius:8px;background:white;cursor:pointer;font-weight:600;font-size:0.75rem;transition:all 0.2s;" onmouseover="this.style.borderColor='${info.color}';this.style.background='#F9FAFB';" onmouseout="this.style.borderColor='#E5E7EB';this.style.background='white';">TZS ${presetAmounts[3].toLocaleString()}</button>
                    </div>
                    
                    <!-- Deposit Button -->
                    <div style="padding:0 20px 20px;">
                        <button onclick="AutoDelivery.processDeposit('${tipId}', ${amount})" 
                                style="width:100%;padding:14px;background:${info.color};color:white;border:none;border-radius:12px;font-weight:700;font-size:1rem;cursor:pointer;transition:all 0.2s;"
                                onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                            Deposit
                        </button>
                    </div>
                </div>
            `;
        }
    },
    
    // STEP 3: Process Deposit
    processDeposit: function(tipId, requiredAmount) {
        var phone = document.getElementById('depositPhone').value.trim();
        var amount = parseInt(document.getElementById('depositAmount').value) || requiredAmount;
        
        if (!phone || phone.length < 10) {
            toast('Tafadhali weka namba sahihi ya simu', 'error');
            return;
        }
        
        if (amount < 1000 || amount > 5000000) {
            toast('Kiasi kinatakiwa kuwa kati ya TZS 1,000 na TZS 5,000,000', 'error');
            return;
        }
        
        // Show processing
        var modal = document.getElementById('autoDeliveryModal');
        if (modal) {
            modal.querySelector('div').innerHTML = `
                <div style="background:white;border-radius:20px;max-width:420px;width:100%;overflow:hidden;text-align:center;padding:40px 20px;">
                    <i class="fas fa-spinner fa-spin" style="font-size:3rem;color:#059669;"></i>
                    <h3 style="margin-top:16px;color:#059669;">Inachakatwa...</h3>
                    <p style="color:#6B7280;font-size:0.85rem;">Tafadhali subiri...</p>
                </div>
            `;
        }
        
        var userName = currentUser ? (currentUser.name || 'Mtumiaji') : 'Mtumiaji';
        var txnId = 'TXN' + Date.now().toString(36).toUpperCase();
        
        // Save purchase
        var purchases = DB('purchases');
        purchases.push({
            id: 'purchase_' + Date.now(),
            userId: currentUser.id,
            tipId: tipId,
            amount: amount,
            status: 'paid',
            paymentMethod: this.selectedMethod || 'mpesa',
            payerName: userName,
            payerPhone: phone,
            transactionId: txnId,
            paidAt: new Date().toISOString()
        });
        saveDB('purchases', purchases);
        
        // Update tip sold count
        var tips = DB('tips');
        var tipCode = '';
        for (var i = 0; i < tips.length; i++) {
            if (tips[i].id === tipId) {
                tips[i].purchased = (tips[i].purchased || 0) + 1;
                tipCode = tips[i].code;
                break;
            }
        }
        saveDB('tips', tips);
        
        // Show success
        var self = this;
        setTimeout(function() {
            if (modal) {
                modal.querySelector('div').innerHTML = `
                    <div style="background:white;border-radius:20px;max-width:420px;width:100%;overflow:hidden;text-align:center;padding:30px 20px;">
                        <div style="font-size:4rem;">✅</div>
                        <h3 style="color:#059669;margin-top:8px;">Deposit Successful!</h3>
                        <p style="color:#6B7280;font-size:0.85rem;">Hii hapa code yako:</p>
                        <div style="background:#ECFDF5;border:2px solid #10B981;border-radius:12px;padding:16px;margin:16px 0;">
                            <div style="font-size:0.7rem;color:#6B7280;">CODE YAKO:</div>
                            <div style="font-size:1.8rem;font-weight:900;color:#059669;letter-spacing:3px;">${tipCode || '●●●●●●●●'}</div>
                        </div>
                        <p style="font-size:0.75rem;color:#6B7280;">📱 Angalia "My Purchases" kwenye dashboard</p>
                        <button onclick="document.getElementById('autoDeliveryModal').remove()" 
                                style="width:100%;padding:12px;background:#059669;color:white;border:none;border-radius:10px;font-weight:700;cursor:pointer;margin-top:8px;">
                            Sawa, Nimeipata!
                        </button>
                    </div>
                `;
            }
            
            if (typeof loadUserTipsTab === 'function') loadUserTipsTab();
            if (typeof loadUserPurchasesTab === 'function') loadUserPurchasesTab();
            if (typeof loadUserOverview === 'function') loadUserOverview();
            
            toast('✅ Code imetumwa!', 'success');
        }, 1500);
    },
    
    getTipInfo: function(tipId) {
        var tips = DB('tips');
        for (var i = 0; i < tips.length; i++) {
            if (tips[i].id === tipId) return tips[i];
        }
        return null;
    }
};

function initAutoDelivery() {
    AutoDelivery.init();
}

window.AutoDelivery = AutoDelivery;