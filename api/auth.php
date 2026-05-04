<?php
// ============================================
// BASHIRI NASI - AUTH API (FULLY FIXED)
// ============================================
require_once __DIR__ . '/config.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'register':
        handleRegister();
        break;
    default:
        jsonResponse(['success' => false, 'message' => 'Invalid action'], 400);
}

function handleLogin() {
    $data = getRequestBody();
    
    if (empty($data['phone']) || empty($data['password'])) {
        jsonResponse(['success' => false, 'message' => 'Phone and password required'], 400);
    }
    
    $input = sanitize($data['phone']);
    $password = $data['password'];
    
    error_log("Login attempt - Input: $input, Password length: " . strlen($password));
    
    try {
        $pdo = getDB();
        
        // Find user by phone OR name
        $stmt = $pdo->prepare("SELECT * FROM users WHERE (phone = :phone OR name = :name) AND is_active = 1 LIMIT 1");
        $stmt->execute([':phone' => $input, ':name' => $input]);
        $user = $stmt->fetch();
        
        if (!$user) {
            error_log("User not found: $input");
            jsonResponse(['success' => false, 'message' => 'Account not found'], 401);
        }
        
        error_log("User found: " . $user['name'] . " - Role: " . $user['role']);
        error_log("Stored password hash: " . $user['password']);
        
        // Try different password verification methods
        $passwordValid = false;
        
        // Method 1: Caesar cipher (for your existing data)
        $caesarHash = '';
        for ($i = 0; $i < strlen($password); $i++) {
            $caesarHash .= chr(ord($password[$i]) + 7);
        }
        error_log("Calculated Caesar hash: " . $caesarHash);
        
        if ($caesarHash === $user['password']) {
            $passwordValid = true;
            error_log("Password matched using Caesar cipher");
        }
        
        // Method 2: Try bcrypt
        if (!$passwordValid && password_verify($password, $user['password'])) {
            $passwordValid = true;
            error_log("Password matched using bcrypt");
        }
        
        // Method 3: Direct comparison (for simple passwords)
        if (!$passwordValid && $password === $user['password']) {
            $passwordValid = true;
            error_log("Password matched directly");
        }
        
        if (!$passwordValid) {
            error_log("Password verification failed");
            jsonResponse(['success' => false, 'message' => 'Incorrect password'], 401);
        }
        
        // Update login info
        try {
            $stmt = $pdo->prepare("UPDATE users SET login_count = login_count + 1, last_login = NOW(), last_active = NOW() WHERE id = :id");
            $stmt->execute([':id' => $user['id']]);
        } catch (Exception $e) {
            // Columns might not exist, ignore
            error_log("Could not update login count: " . $e->getMessage());
        }
        
        // Return user data (without password)
        unset($user['password']);
        
        jsonResponse([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'phone' => $user['phone'],
                'role' => $user['role'],
                'bio' => $user['bio'] ?? ''
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Server error: ' . $e->getMessage()], 500);
    }
}

function handleRegister() {
    $data = getRequestBody();
    
    if (empty($data['name']) || empty($data['phone']) || empty($data['password'])) {
        jsonResponse(['success' => false, 'message' => 'All fields required'], 400);
    }
    
    $name = sanitize($data['name']);
    $phone = sanitize($data['phone']);
    $password = $data['password'];
    
    if (strlen($password) < 6) {
        jsonResponse(['success' => false, 'message' => 'Password must be 6+ characters'], 400);
    }
    
    try {
        $pdo = getDB();
        
        // Check if phone exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = :phone LIMIT 1");
        $stmt->execute([':phone' => $phone]);
        if ($stmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Phone already registered'], 409);
        }
        
        // Create Caesar hash (matching your existing format)
        $caesarHash = '';
        for ($i = 0; $i < strlen($password); $i++) {
            $caesarHash .= chr(ord($password[$i]) + 7);
        }
        
        // Insert new user
        $stmt = $pdo->prepare("INSERT INTO users (id, name, phone, password, role, bio, is_active, created_at) 
                               VALUES (:id, :name, :phone, :password, 'user', 'Bettor', 1, NOW())");
        $stmt->execute([
            ':id' => 'user_' . time() . '_' . uniqid(),
            ':name' => $name,
            ':phone' => $phone,
            ':password' => $caesarHash
        ]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Account created successfully!'
        ], 201);
        
    } catch (Exception $e) {
        error_log("Register error: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => 'Server error: ' . $e->getMessage()], 500);
    }
}
?>