<?php
// ============================================
// BASHIRI NASI - USERS API (FULLY FIXED)
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handleGetUsers();
} elseif ($method === 'POST') {
    handleCreateUser();
} elseif ($method === 'DELETE') {
    handleDeleteUser();
} else {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

function handleGetUsers() {
    try {
        $pdo = getDB();
        $role = $_GET['role'] ?? '';
        
        if ($role) {
            $stmt = $pdo->prepare("SELECT id, name, phone, role, bio, is_active, login_count, last_login, created_at 
                                   FROM users WHERE role = :role ORDER BY created_at DESC");
            $stmt->execute([':role' => $role]);
        } else {
            $stmt = $pdo->query("SELECT id, name, phone, role, bio, is_active, login_count, last_login, created_at 
                                 FROM users ORDER BY created_at DESC");
        }
        
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

function handleCreateUser() {
    $data = getRequestBody();
    
    if (empty($data['name']) || empty($data['phone']) || empty($data['password']) || empty($data['role'])) {
        jsonResponse(['success' => false, 'message' => 'Missing fields: name, phone, password, role required'], 400);
    }
    
    // Validate role
    if (!in_array($data['role'], ['user', 'tipster', 'admin'])) {
        jsonResponse(['success' => false, 'message' => 'Invalid role. Use: user, tipster, or admin'], 400);
    }
    
    try {
        $pdo = getDB();
        
        // Check if phone exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = :phone");
        $stmt->execute([':phone' => sanitize($data['phone'])]);
        if ($stmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Phone already exists'], 409);
        }
        
        $userId = ($data['role'] === 'tipster' ? 'tipster_' : 'user_') . time() . '_' . uniqid();
        $bio = $data['bio'] ?? ($data['role'] === 'tipster' ? 'Professional Tipster' : 'Bettor');
        
        $stmt = $pdo->prepare("INSERT INTO users (id, name, phone, password, role, bio, is_active, created_at) 
                               VALUES (:id, :name, :phone, :password, :role, :bio, 1, NOW())");
        $stmt->execute([
            ':id' => $userId,
            ':name' => sanitize($data['name']),
            ':phone' => sanitize($data['phone']),
            ':password' => password_hash($data['password'], PASSWORD_BCRYPT),
            ':role' => $data['role'],
            ':bio' => sanitize($bio)
        ]);
        
        jsonResponse(['success' => true, 'message' => 'User created!', 'user_id' => $userId], 201);
        
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

function handleDeleteUser() {
    $userId = $_GET['id'] ?? 0;
    
    if (!$userId) {
        jsonResponse(['success' => false, 'message' => 'User ID required'], 400);
    }
    
    try {
        $pdo = getDB();
        
        // Check if user exists
        $stmt = $pdo->prepare("SELECT role FROM users WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'User not found'], 404);
        }
        
        if ($user['role'] === 'admin') {
            jsonResponse(['success' => false, 'message' => 'Cannot delete admin user'], 403);
        }
        
        // Soft delete (deactivate)
        $stmt = $pdo->prepare("UPDATE users SET is_active = 0 WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        
        jsonResponse(['success' => true, 'message' => 'User deactivated']);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    }
}
?>