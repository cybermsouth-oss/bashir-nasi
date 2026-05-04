// ============================================
// BASHIRI NASI - FIREBASE CONFIG
// Ultra Simple - No persistence issues
// ============================================

// Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyCbSJLQMwDllBVCh63YOIPwzzGHcuzHFr0",
  authDomain: "bashiri-nasi.firebaseapp.com",
  projectId: "bashiri-nasi",
  storageBucket: "bashiri-nasi.firebasestorage.app",
  messagingSenderId: "770542516866",
  appId: "1:770542516866:web:691be411049b43382cd29b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firestore
var db = firebase.firestore();

// IMPORTANT: Do NOT enable persistence - it causes "Operation cancelled" error
// db.enablePersistence() - REMOVED COMPLETELY

// Collection references
var usersCollection = db.collection('users');
var tipsCollection = db.collection('tips');
var purchasesCollection = db.collection('purchases');
var followingCollection = db.collection('following');

// Password encoding (simple - avoids btoa issues)
function safeEncode(str) {
  var result = '';
  for (var i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) + 1);
  }
  return result;
}

function safeDecode(str) {
  var result = '';
  for (var i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) - 1);
  }
  return result;
}

console.log('✅ Firebase ready');