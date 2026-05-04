// ============================================
// BASHIRI NASI - EXPORT REPORTS MODULE
// Export data as CSV, Excel, PDF
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initExportReports();
});

var ExportReports = {
    init: function() {
        this.addExportButtons();
    },
    
    addExportButtons: function() {
        // Add export buttons to admin overview
        var adminStats = document.getElementById('adminStats');
        if (!adminStats) return;
        
        var exportBar = document.createElement('div');
        exportBar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;';
        exportBar.innerHTML = `
            <button class="btn btn-outline btn-sm" onclick="ExportReports.exportUsersCSV()" title="Pakua orodha ya watumiaji">
                <i class="fas fa-users"></i> Export Users (CSV)
            </button>
            <button class="btn btn-outline btn-sm" onclick="ExportReports.exportTipsCSV()" title="Pakua orodha ya tips">
                <i class="fas fa-ticket-alt"></i> Export Tips (CSV)
            </button>
            <button class="btn btn-outline btn-sm" onclick="ExportReports.exportTransactionsCSV()" title="Pakua orodha ya manunuzi">
                <i class="fas fa-chart-bar"></i> Export Transactions (CSV)
            </button>
            <button class="btn btn-outline btn-sm" onclick="ExportReports.exportFullReportExcel()" title="Pakua ripoti kamili">
                <i class="fas fa-file-excel"></i> Export Full Report (Excel)
            </button>
            <button class="btn btn-outline btn-sm" onclick="ExportReports.printReport()" title="Chapisha ripoti">
                <i class="fas fa-print"></i> Print Report
            </button>
        `;
        
        adminStats.parentNode.insertBefore(exportBar, adminStats);
    },
    
    // ============================================
    // CSV EXPORTS
    // ============================================
    
    exportUsersCSV: function() {
        var users = this.getUsersData();
        if (users.length === 0) {
            if (typeof toast === 'function') toast('Hakuna data ya watumiaji', 'error');
            return;
        }
        
        var csv = 'Name,Phone,Role,Bio,Status,Login Count,Last Login,Created At\n';
        
        users.forEach(function(user) {
            csv += [
                this.escapeCSV(user.name || ''),
                this.escapeCSV(user.phone || ''),
                this.escapeCSV(user.role || ''),
                this.escapeCSV((user.bio || '').substring(0, 50)),
                user.isActive !== false ? 'Active' : 'Inactive',
                user.loginCount || 0,
                this.escapeCSV(user.lastLogin || ''),
                this.escapeCSV(user.createdAt || '')
            ].join(',') + '\n';
        }.bind(this));
        
        this.downloadFile(csv, 'bashiri-nasi-users-' + this.getDateString() + '.csv', 'text/csv');
        
        if (typeof toast === 'function') toast('✅ Users report downloaded!', 'success');
    },
    
    exportTipsCSV: function() {
        var tips = this.getTipsData();
        if (tips.length === 0) {
            if (typeof toast === 'function') toast('Hakuna data ya tips', 'error');
            return;
        }
        
        var csv = 'Platform,Bet Code,Odds,Price (TZS),Tipster,Result,Purchased,Revenue,Date\n';
        
        tips.forEach(function(tip) {
            csv += [
                this.escapeCSV(tip.platform || ''),
                this.escapeCSV(tip.code || ''),
                tip.odds || '',
                tip.price || '',
                this.escapeCSV(tip.tipsterName || ''),
                this.escapeCSV(tip.result || ''),
                tip.purchased || 0,
                (tip.purchased || 0) * (tip.price || 0),
                this.escapeCSV(tip.createdAt || '')
            ].join(',') + '\n';
        }.bind(this));
        
        this.downloadFile(csv, 'bashiri-nasi-tips-' + this.getDateString() + '.csv', 'text/csv');
        
        if (typeof toast === 'function') toast('✅ Tips report downloaded!', 'success');
    },
    
    exportTransactionsCSV: function() {
        var purchases = this.getPurchasesData();
        if (purchases.length === 0) {
            if (typeof toast === 'function') toast('Hakuna data ya manunuzi', 'error');
            return;
        }
        
        var users = this.getUsersData();
        
        var csv = 'Date,User,Phone,Tip Code,Amount (TZS),Status,Transaction ID\n';
        
        purchases.forEach(function(purchase) {
            var user = users.find(function(u) { return u.id === purchase.userId; }) || {};
            
            csv += [
                this.escapeCSV(purchase.paidAt || purchase.createdAt || ''),
                this.escapeCSV(user.name || 'Unknown'),
                this.escapeCSV(user.phone || ''),
                this.escapeCSV(this.getTipCode(purchase.tipId)),
                purchase.amount || 0,
                this.escapeCSV(purchase.status || ''),
                this.escapeCSV(purchase.id || '')
            ].join(',') + '\n';
        }.bind(this));
        
        this.downloadFile(csv, 'bashiri-nasi-transactions-' + this.getDateString() + '.csv', 'text/csv');
        
        if (typeof toast === 'function') toast('✅ Transactions report downloaded!', 'success');
    },
    
    // ============================================
    // EXCEL EXPORT (XLS format)
    // ============================================
    
    exportFullReportExcel: function() {
        var users = this.getUsersData();
        var tips = this.getTipsData();
        var purchases = this.getPurchasesData();
        
        // Create HTML table for Excel
        var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">';
        html += '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>';
        html += '<x:ExcelWorksheet><x:Name>Users</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>';
        html += '<x:ExcelWorksheet><x:Name>Tips</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>';
        html += '<x:ExcelWorksheet><x:Name>Transactions</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>';
        html += '</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>';
        
        // Users sheet
        html += '<h2>Bashiri Nasi - Users Report</h2>';
        html += '<table border="1"><tr><th>Name</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th></tr>';
        users.forEach(function(u) {
            html += '<tr><td>' + this.escapeHTML(u.name) + '</td><td>' + u.phone + '</td><td>' + u.role + '</td><td>' + (u.isActive !== false ? 'Active' : 'Inactive') + '</td><td>' + this.fdate(u.createdAt) + '</td></tr>';
        }.bind(this));
        html += '</table><br><br>';
        
        // Tips sheet
        html += '<h2>Bashiri Nasi - Tips Report</h2>';
        html += '<table border="1"><tr><th>Platform</th><th>Code</th><th>Odds</th><th>Price</th><th>Result</th><th>Sold</th></tr>';
        tips.forEach(function(t) {
            html += '<tr><td>' + t.platform + '</td><td>' + t.code + '</td><td>' + t.odds + '</td><td>TZS ' + t.price + '</td><td>' + t.result + '</td><td>' + (t.purchased || 0) + '</td></tr>';
        });
        html += '</table><br><br>';
        
        // Transactions sheet
        html += '<h2>Bashiri Nasi - Transactions Report</h2>';
        html += '<table border="1"><tr><th>Date</th><th>Amount</th><th>Status</th></tr>';
        purchases.forEach(function(p) {
            html += '<tr><td>' + this.fdate(p.paidAt) + '</td><td>TZS ' + (p.amount || 0) + '</td><td>' + p.status + '</td></tr>';
        }.bind(this));
        html += '</table>';
        
        html += '</body></html>';
        
        this.downloadFile(html, 'bashiri-nasi-full-report-' + this.getDateString() + '.xls', 'application/vnd.ms-excel');
        
        if (typeof toast === 'function') toast('✅ Full Excel report downloaded!', 'success');
    },
    
    // ============================================
    // PRINT REPORT
    // ============================================
    
    printReport: function() {
        var users = this.getUsersData();
        var tips = this.getTipsData();
        var purchases = this.getPurchasesData();
        
        var totalRevenue = purchases.reduce(function(sum, p) { return sum + (p.amount || 0); }, 0);
        var wonTips = tips.filter(function(t) { return t.result === 'won'; }).length;
        var winRate = tips.length > 0 ? Math.round((wonTips / tips.length) * 100) : 0;
        
        var printWindow = window.open('', '_blank', 'width=800,height=600');
        
        printWindow.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bashiri Nasi Report</title>');
        printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;}h1{color:#059669;}h2{color:#064E3B;border-bottom:2px solid #059669;padding-bottom:5px;}table{width:100%;border-collapse:collapse;margin:10px 0;}th{background:#059669;color:white;padding:8px;text-align:left;}td{padding:8px;border-bottom:1px solid #ddd;}tr:nth-child(even){background:#f9f9f9;}.summary{display:flex;gap:20px;margin:20px 0;}.summary-box{flex:1;padding:15px;border:2px solid #059669;border-radius:8px;text-align:center;}.summary-box h3{color:#059669;margin:0;font-size:1.5rem;}.summary-box p{margin:5px 0 0;color:#666;font-size:0.8rem;}@media print{.no-print{display:none;}}</style>');
        printWindow.document.write('</head><body>');
        
        // Header
        printWindow.document.write('<h1>⚡ Bashiri Nasi - Ripoti Kamili</h1>');
        printWindow.document.write('<p>Tarehe: ' + new Date().toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'}) + '</p>');
        
        // Summary
        printWindow.document.write('<div class="summary">');
        printWindow.document.write('<div class="summary-box"><h3>' + users.length + '</h3><p>Watumiaji</p></div>');
        printWindow.document.write('<div class="summary-box"><h3>' + tips.length + '</h3><p>Tips Zote</p></div>');
        printWindow.document.write('<div class="summary-box"><h3>' + winRate + '%</h3><p>Win Rate</p></div>');
        printWindow.document.write('<div class="summary-box"><h3>TZS ' + totalRevenue.toLocaleString() + '</h3><p>Mapato</p></div>');
        printWindow.document.write('</div>');
        
        // Users Table
        printWindow.document.write('<h2>Watumiaji</h2>');
        printWindow.document.write('<table><tr><th>Jina</th><th>Simu</th><th>Jukumu</th><th>Tarehe</th></tr>');
        users.forEach(function(u) {
            printWindow.document.write('<tr><td>' + this.escapeHTML(u.name) + '</td><td>' + u.phone + '</td><td>' + u.role + '</td><td>' + this.fdate(u.createdAt) + '</td></tr>');
        }.bind(this));
        printWindow.document.write('</table>');
        
        // Tips Table
        printWindow.document.write('<h2>Bet Slips</h2>');
        printWindow.document.write('<table><tr><th>Platform</th><th>Code</th><th>Odds</th><th>Bei</th><th>Matokeo</th></tr>');
        tips.forEach(function(t) {
            printWindow.document.write('<tr><td>' + t.platform + '</td><td>' + t.code + '</td><td>' + t.odds + '</td><td>TZS ' + t.price + '</td><td>' + t.result + '</td></tr>');
        });
        printWindow.document.write('</table>');
        
        // Print button
        printWindow.document.write('<br><button class="no-print" onclick="window.print()" style="padding:10px 20px;background:#059669;color:white;border:none;border-radius:5px;cursor:pointer;font-size:1rem;">🖨️ Print Report</button>');
        
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        if (typeof toast === 'function') toast('📄 Report ready for printing!', 'success');
    },
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
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
        } catch(e) {
            return [];
        }
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
        } catch(e) {
            return [];
        }
    },
    
    getPurchasesData: function() {
        try {
            var d = localStorage.getItem('bashiri_purchases');
            if (!d) return [];
            if (d.startsWith('ENC:') && typeof CryptoJS !== 'undefined') {
                var bytes = CryptoJS.AES.decrypt(d.substring(4), 'BashiriNasi@2025!TZ#Secure#Key$%^&*()');
                var decrypted = bytes.toString(CryptoJS.enc.Utf8);
                if (decrypted) return JSON.parse(decrypted);
            }
            return JSON.parse(d);
        } catch(e) {
            return [];
        }
    },
    
    getTipCode: function(tipId) {
        var tips = this.getTipsData();
        var tip = tips.find(function(t) { return t.id === tipId; });
        return tip ? tip.code : 'N/A';
    },
    
    escapeCSV: function(value) {
        if (!value) return '';
        value = String(value);
        if (value.indexOf(',') !== -1 || value.indexOf('"') !== -1 || value.indexOf('\n') !== -1) {
            return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
    },
    
    escapeHTML: function(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },
    
    fdate: function(d) {
        if (!d) return 'N/A';
        try { return new Date(d).toLocaleDateString('en-GB'); } catch(e) { return 'N/A'; }
    },
    
    getDateString: function() {
        return new Date().toISOString().split('T')[0];
    },
    
    downloadFile: function(content, filename, mimeType) {
        var blob = new Blob([content], { type: mimeType + ';charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

function initExportReports() {
    ExportReports.init();
}

window.ExportReports = ExportReports;

console.log('✅ Export Reports Module Loaded');