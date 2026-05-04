<?php
// ============================================
// BASHIRI NASI - AUTHENTICATION API
// ============================================
require_once 'config.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'login':
        if ($method !== 'POST') sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        handleLogin();
        break;
        
    case 'register':
        if ($method !== 'POST') sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        handleRegister();
        break;
        
    case 'logout':
        if ($method !== 'POST') sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        handleLogout();
        break;
        
    default:
        sendResponse(['success' => false, 'message' => 'Invalid action'], 400);
}

function handleLogin() {
    $data = getJSONInput();
    $pdo = getDB();
    
    $phone = sanitize($data['phone'] ?? '');
    $email = sanitize($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    if ((!$phone && !$email) || !$password) {
        sendResponse(['success' => false, 'message' => 'Phone/email and password are required'], 400);
    }
    
    // Find user by phone or email
    if ($email) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND is_active = 1");
        $stmt->execute([$email]);
    } else {
        $validPhone = validatePhone($phone);
        if (!$validPhone) {
            sendResponse(['success' => false, 'message' => 'Invalid phone number format'], 400);
        }
        $stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ? AND is_active = 1");
        $stmt->execute([$validPhone]);
    }
    
    $user = $stmt->fetch();
    
    // Check if user exists
    if (!$user) {
        sendResponse(['success' => false, 'message' => 'Invalid credentials'], 401);
    }
    
    // Check if account is locked
    if ($user['locked_until'] && strtotime($user['locked_until']) > time()) {
        $remaining = ceil((strtotime($user['locked_until']) - time()) / 60);
        sendResponse([
            'success' => false,
            'message' => "Account locked. Try again in {$remaining} minutes"
        ], 429);
    }
    
    // Verify password
    if (!verifyPassword($password, $user['password_hash'])) {
        // Increment login attempts
        $attempts = $user['login_attempts'] + 1;
        $lockedUntil = null;
        
        if ($attempts >= MAX_LOGIN_ATTEMPTS) {
            $lockedUntil = date('Y-m-d H:i:s', time() + LOGIN_LOCKOUT_TIME);
        }
        
        $stmt = $pdo->prepare("UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?");
        $stmt->execute([$attempts, $lockedUntil, $user['id']]);
        
        sendResponse(['success' => false, 'message' => 'Invalid credentials'], 401);
    }
    
    // Reset login attempts on success
    $token = generateToken();
    $stmt = $pdo->prepare("UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = NOW(), token = ? WHERE id = ?");
    $stmt->execute([$token, $user['id']]);
    
    sendResponse([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'phone' => $user['phone'],
            'email' => $user['email'],
            'role' => $user['role'],
            'bio' => $user['bio'],
            'token' => $token
        ]
    ]);
}

function handleRegister() {
    $data = getJSONInput();
    $pdo = getDB();
    
    $name = sanitize($data['name'] ?? '', 100);
    $phone = sanitize($data['phone'] ?? '', 20);
    $email = sanitize($data['email'] ?? '', 100);
    $password = $data['password'] ?? '';
    
    // Validate inputs
    if (!$name || strlen($name) < 2) {
        sendResponse(['success' => false, 'message' => 'Name must be at least 2 characters'], 400);
    }
    
    $validPhone = validatePhone($phone);
    if (!$validPhone) {
        sendResponse(['success' => false, 'message' => 'Invalid phone number. Use format: 0712345678'], 400);
    }
    
    if ($email && !validateEmail($email)) {
        sendResponse(['success' => false, 'message' => 'Invalid email address'], 400);
    }
    
    if (strlen($password) < MIN_PASSWORD_LENGTH) {
        sendResponse(['success' => false, 'message' => 'Password must be at least ' . MIN_PASSWORD_LENGTH . ' characters'], 400);
    }
    
    // Check password strength
    if (!preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password) || !preg_match('/[0-9]/', $password)) {
        sendResponse(['success' => false, 'message' => 'Password must contain uppercase, lowercase letters and numbers'], 400);
    }
    
    // Check if phone already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
    $stmt->execute([$validPhone]);
    if ($stmt->fetch()) {
        sendResponse(['success' => false, 'message' => 'Phone number already registered'], 409);
    }
    
    // Check if email already exists
    if ($email) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            sendResponse(['success' => false, 'message' => 'Email already registered'], 409);
        }
    }
    
    // Create user
    $id = generateToken(16); // Use UUID in production
    $passwordHash = hashPassword($password);
    
    $stmt = $pdo->prepare("INSERT INTO users (id, name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, ?, 'user')");
    $stmt->execute([$id, $name, $validPhone, $email ?: null, $passwordHash]);
    
    sendResponse([
        'success' => true,
        'message' => 'Registration successful! Please login.'
    ], 201);
}

function handleLogout() {
    $data = getJSONInput();
    $userId = $data['user_id'] ?? '';
    
    if ($userId) {
        $pdo = getDB();
        $stmt = $pdo->prepare("UPDATE users SET token = NULL WHERE id = ?");
        $stmt->execute([$userId]);
    }
    
    sendResponse(['success' => true, 'message' => 'Logged out successfully']);
}
?>
