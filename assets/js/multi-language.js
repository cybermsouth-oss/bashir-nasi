// ============================================
// BASHIRI NASI - MULTI-LANGUAGE SUPPORT
// Swahili | English | Toggle
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initMultiLanguage();
});

var MultiLanguage = {
    currentLang: 'sw',
    defaultLang: 'sw',
    
    translations: {
        sw: {
            home: 'Nyumbani',
            login: 'Ingia',
            register: 'Jisajili',
            logout: 'Toka',
            dashboard: 'Dashibodi',
            tips: 'Tips',
            tipsters: 'Wataalamu',
            purchases: 'Manunuzi',
            settings: 'Mipangilio',
            profile: 'Wasifu',
            search: 'Tafuta',
            save: 'Hifadhi',
            cancel: 'Ghairi',
            delete: 'Futa',
            edit: 'Hariri',
            view: 'Angalia',
            upload: 'Pakia',
            download: 'Pakua',
            send: 'Tuma',
            submit: 'Wasilisha',
            confirm: 'Thibitisha',
            yes: 'Ndio',
            no: 'Hapana',
            loading: 'Inapakia...',
            success: 'Imefanikiwa!',
            error: 'Imeshindwa!',
            warning: 'Onyo!',
            info: 'Taarifa',
            welcome: 'Karibu',
            back: 'Rudi',
            next: 'Endelea',
            previous: 'Iliyopita',
            all: 'Zote',
            active: 'Inafanya Kazi',
            inactive: 'Haifanyi Kazi',
            pending: 'Inasubiri',
            won: 'Imeshinda',
            lost: 'Imepotea',
            completed: 'Imekamilika',
            paid: 'Imelipiwa',
            unpaid: 'Haijalipiwa',
            refunded: 'Imerejeshwa',
            total: 'Jumla',
            amount: 'Kiasi',
            date: 'Tarehe',
            time: 'Muda',
            status: 'Hali',
            action: 'Kitendo',
            actions: 'Vitendo',
            details: 'Maelezo',
            description: 'Maelezo',
            name: 'Jina',
            phone: 'Simu',
            email: 'Barua Pepe',
            password: 'Nywila',
            role: 'Jukumu',
            user: 'Mtumiaji',
            admin: 'Msimamizi',
            tipster: 'Mtaalamu',
            bettor: 'Mbeti',
            platform: 'Jukwaa',
            code: 'Code',
            odds: 'Odds',
            price: 'Bei',
            result: 'Matokeo',
            revenue: 'Mapato',
            profit: 'Faida',
            loss: 'Hasara',
            statistics: 'Takwimu',
            reports: 'Ripoti',
            notifications: 'Arifa',
            messages: 'Ujumbe',
            language: 'Lugha',
            theme: 'Mandhari',
            lightMode: 'Mwanga',
            darkMode: 'Giza',
            autoMode: 'Auto',
            online: 'Mtandaoni',
            offline: 'Hakuna Mtandao',
            retry: 'Jaribu Tena',
            close: 'Funga',
            open: 'Fungua',
            add: 'Ongeza',
            remove: 'Ondoa',
            update: 'Sasisha',
            create: 'Tengeneza',
            follow: 'Fuatilia',
            unfollow: 'Acha Kufuatilia',
            purchase: 'Nunua',
            buy: 'Nunua',
            sell: 'Uza',
            rate: 'Piga Kura',
            review: 'Maoni',
            share: 'Sambaza',
            print: 'Chapisha',
            export: 'Hamisha',
            import: 'Ingiza',
            refresh: 'Onyesha Upya',
            reload: 'Pakia Upya',
            copy: 'Nakili',
            paste: 'Bandika',
            cut: 'Kata',
            undo: 'Rudisha',
            redo: 'Rudia',
            filter: 'Chuja',
            sort: 'Panga',
            clear: 'Futa',
            reset: 'Weka Upya',
            apply: 'Tumia',
            more: 'Zaidi',
            less: 'Chache',
            show: 'Onyesha',
            hide: 'Ficha',
            enable: 'Wezesha',
            disable: 'Zima',
            on: 'Washa',
            off: 'Zima',
            account: 'Akaunti',
            loginSuccess: 'Umeingia kwa mafanikio!',
            loginFailed: 'Imeshindwa kuingia. Angalia taarifa zako.',
            registerSuccess: 'Akaunti imefunguliwa!',
            logoutSuccess: 'Umetoka kwa mafanikio',
            sessionExpired: 'Muda wako umeisha. Tafadhali ingia tena.',
            noData: 'Hakuna data',
            noResults: 'Hakuna matokeo',
            notFound: 'Haipatikani',
            comingSoon: 'Inakuja Hivi Karibuni!',
            maintenance: 'Tunafanya matengenezo. Tafadhali rudi baadaye.',
            contactSupport: 'Wasiliana na msaada',
            termsAndConditions: 'Sheria na Masharti',
            privacyPolicy: 'Sera ya Faragha',
            aboutUs: 'Kuhusu Sisi',
            help: 'Msaada',
            faq: 'Maswali Yanayoulizwa Mara kwa Mara'
        },
        en: {
            home: 'Home',
            login: 'Login',
            register: 'Register',
            logout: 'Logout',
            dashboard: 'Dashboard',
            tips: 'Tips',
            tipsters: 'Tipsters',
            purchases: 'Purchases',
            settings: 'Settings',
            profile: 'Profile',
            search: 'Search',
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            edit: 'Edit',
            view: 'View',
            upload: 'Upload',
            download: 'Download',
            send: 'Send',
            submit: 'Submit',
            confirm: 'Confirm',
            yes: 'Yes',
            no: 'No',
            loading: 'Loading...',
            success: 'Success!',
            error: 'Error!',
            warning: 'Warning!',
            info: 'Info',
            welcome: 'Welcome',
            back: 'Back',
            next: 'Next',
            previous: 'Previous',
            all: 'All',
            active: 'Active',
            inactive: 'Inactive',
            pending: 'Pending',
            won: 'Won',
            lost: 'Lost',
            completed: 'Completed',
            paid: 'Paid',
            unpaid: 'Unpaid',
            refunded: 'Refunded',
            total: 'Total',
            amount: 'Amount',
            date: 'Date',
            time: 'Time',
            status: 'Status',
            action: 'Action',
            actions: 'Actions',
            details: 'Details',
            description: 'Description',
            name: 'Name',
            phone: 'Phone',
            email: 'Email',
            password: 'Password',
            role: 'Role',
            user: 'User',
            admin: 'Admin',
            tipster: 'Tipster',
            bettor: 'Bettor',
            platform: 'Platform',
            code: 'Code',
            odds: 'Odds',
            price: 'Price',
            result: 'Result',
            revenue: 'Revenue',
            profit: 'Profit',
            loss: 'Loss',
            statistics: 'Statistics',
            reports: 'Reports',
            notifications: 'Notifications',
            messages: 'Messages',
            language: 'Language',
            theme: 'Theme',
            lightMode: 'Light Mode',
            darkMode: 'Dark Mode',
            autoMode: 'Auto Mode',
            online: 'Online',
            offline: 'Offline',
            retry: 'Retry',
            close: 'Close',
            open: 'Open',
            add: 'Add',
            remove: 'Remove',
            update: 'Update',
            create: 'Create',
            follow: 'Follow',
            unfollow: 'Unfollow',
            purchase: 'Purchase',
            buy: 'Buy',
            sell: 'Sell',
            rate: 'Rate',
            review: 'Review',
            share: 'Share',
            print: 'Print',
            export: 'Export',
            import: 'Import',
            refresh: 'Refresh',
            reload: 'Reload',
            copy: 'Copy',
            paste: 'Paste',
            cut: 'Cut',
            undo: 'Undo',
            redo: 'Redo',
            filter: 'Filter',
            sort: 'Sort',
            clear: 'Clear',
            reset: 'Reset',
            apply: 'Apply',
            more: 'More',
            less: 'Less',
            show: 'Show',
            hide: 'Hide',
            enable: 'Enable',
            disable: 'Disable',
            on: 'On',
            off: 'Off',
            account: 'Account',
            loginSuccess: 'Login successful!',
            loginFailed: 'Login failed. Check your credentials.',
            registerSuccess: 'Account created successfully!',
            logoutSuccess: 'Logged out successfully',
            sessionExpired: 'Session expired. Please login again.',
            noData: 'No data available',
            noResults: 'No results found',
            notFound: 'Not found',
            comingSoon: 'Coming Soon!',
            maintenance: 'We are under maintenance. Please check back later.',
            contactSupport: 'Contact Support',
            termsAndConditions: 'Terms and Conditions',
            privacyPolicy: 'Privacy Policy',
            aboutUs: 'About Us',
            help: 'Help',
            faq: 'Frequently Asked Questions'
        }
    },
    
    init: function() {
        this.loadSavedLanguage();
        this.addLanguageSwitcher();
        this.translatePage();
        console.log('🌐 Multi-Language Initialized: ' + this.currentLang.toUpperCase());
    },
    
    loadSavedLanguage: function() {
        var saved = localStorage.getItem('bashiri_language');
        if (saved && (saved === 'sw' || saved === 'en')) {
            this.currentLang = saved;
        }
    },
    
    addLanguageSwitcher: function() {
        // Add to navigation
        var nav = document.getElementById('navLinks');
        if (!nav) return;
        
        // Check if already added
        if (document.getElementById('langSwitcher')) return;
        
        var switcher = document.createElement('div');
        switcher.id = 'langSwitcher';
        switcher.style.cssText = 'display:flex;align-items:center;gap:4px;';
        switcher.innerHTML = `
            <button class="btn btn-outline btn-sm lang-btn ${this.currentLang === 'sw' ? 'active' : ''}" 
                    onclick="MultiLanguage.switchTo('sw')" title="Kiswahili">
                🇹🇿 SW
            </button>
            <button class="btn btn-outline btn-sm lang-btn ${this.currentLang === 'en' ? 'active' : ''}" 
                    onclick="MultiLanguage.switchTo('en')" title="English">
                🇬🇧 EN
            </button>
        `;
        
        nav.appendChild(switcher);
    },
    
    switchTo: function(lang) {
        this.currentLang = lang;
        localStorage.setItem('bashiri_language', lang);
        
        // Update buttons
        document.querySelectorAll('.lang-btn').forEach(function(btn, i) {
            btn.classList.remove('active');
            if ((i === 0 && lang === 'sw') || (i === 1 && lang === 'en')) {
                btn.classList.add('active');
            }
        });
        
        // Translate page
        this.translatePage();
        
        if (typeof toast === 'function') {
            toast(lang === 'sw' ? '🇹🇿 Lugha imebadilishwa kuwa Kiswahili' : '🇬🇧 Language changed to English', 'info');
        }
    },
    
    translatePage: function() {
        var self = this;
        var translations = this.translations[this.currentLang];
        
        // Translate elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            var key = el.getAttribute('data-i18n');
            if (translations[key]) {
                // Only translate if not an input placeholder
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translations[key];
                } else {
                    el.textContent = translations[key];
                }
            }
        });
        
        // Translate title
        var titleKey = document.title.split('|')[0].trim().toLowerCase();
        // Keep original title structure
    },
    
    translate: function(key) {
        return this.translations[this.currentLang][key] || key;
    },
    
    getCurrentLang: function() {
        return this.currentLang;
    },
    
    isSwahili: function() {
        return this.currentLang === 'sw';
    },
    
    isEnglish: function() {
        return this.currentLang === 'en';
    }
};

function initMultiLanguage() {
    MultiLanguage.init();
}

// Helper function for easy translation in other scripts
function __(key) {
    return MultiLanguage.translate(key);
}

window.MultiLanguage = MultiLanguage;
window.__ = __;

console.log('✅ Multi-Language Module Loaded');