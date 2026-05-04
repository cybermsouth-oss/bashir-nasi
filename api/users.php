<?php
// ============================================
// BASHIRI NASI - USERS API
// ============================================
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        handleGetUsers();
        break;
    case 'POST':
        requireAdmin();
        handleCreateUser();
        break;
    case 'DELETE':
        requireAdmin();
        handleDeleteUser();
        break;
    default:
        sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

function handleGetUsers() {
    $pdo = getDB();
    $role = $_GET['role'] ?? '';
    
    if ($role) {
        $stmt = $pdo->prepare("SELECT id, name, phone, email, role, bio, is_active, created_at FROM users WHERE role = ? AND is_active = 1 ORDER BY created_at DESC");
        $stmt->execute([$role]);
    } else {
        $stmt = $pdo->query("SELECT id, name, phone, email, role, bio, is_active, created_at FROM users WHERE is_active = 1 ORDER BY created_at DESC");
    }
    
    $users = $stmt->fetchAll();
    
    sendResponse([
        'success' => true,
        'data' => $users
    ]);
}

function handleCreateUser() {
    $data = getJSONInput();
    $pdo = getDB();
    
    $name = sanitize($data['name'] ?? '', 100);
    $phone = sanitize($data['phone'] ?? '', 20);
    $password = $data['password'] ?? '';
    $role = in_array($data['role'] ?? '', ['user', 'tipster']) ? $data['role'] : 'tipster';
    $bio = sanitize($data['bio'] ?? '', 500);
    
    $validPhone = validatePhone($phone);
    if (!$validPhone) {
        sendResponse(['success' => false, 'message' => 'Invalid phone number'], 400);
    }
    
    $id = generateToken(16);
    $passwordHash = hashPassword($password);
    
    $stmt = $pdo->prepare("INSERT INTO users (id, name, phone, password_hash, role, bio) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$id, $name, $validPhone, $passwordHash, $role, $bio]);
    
    sendResponse([
        'success' => true,
        'message' => 'User created successfully',
        'user' => [
            'id' => $id,
            'name' => $name,
            'phone' => $validPhone,
            'role' => $role
        ]
    ], 201);
}

function handleDeleteUser() {
    $userId = $_GET['id'] ?? '';
    
    if (!$userId) {
        sendResponse(['success' => false, 'message' => 'User ID required'], 400);
    }
    
    $pdo = getDB();
    
    // Don't allow deleting the last admin
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if ($user && $user['role'] === 'admin') {
        $adminCount = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        if ($adminCount <= 1) {
            sendResponse(['success' => false, 'message' => 'Cannot delete the last admin'], 400);
        }
    }
    
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ? AND role != 'admin'");
    $stmt->execute([$userId]);
    
    sendResponse(['success' => true, 'message' => 'User deleted']);
}
?>
