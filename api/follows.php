<?php
// ============================================
// BASHIRI NASI - FOLLOWS API
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handleGetFollows();
} elseif ($method === 'POST') {
    handleCreateFollow();
} elseif ($method === 'DELETE') {
    handleDeleteFollow();
} else {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

function handleGetFollows() {
    $userId = $_GET['user_id'] ?? 0;
    
    if (!$userId) {
        jsonResponse(['success' => false, 'message' => 'User ID required'], 400);
    }
    
    try {
        $pdo = getDB();
        $stmt = $pdo->prepare("SELECT f.*, u.name as tipster_name, u.bio as tipster_bio 
                               FROM follows f 
                               JOIN users u ON f.tipster_id = u.id 
                               WHERE f.user_id = :uid");
        $stmt->execute([':uid' => $userId]);
        
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

function handleCreateFollow() {
    $data = getRequestBody();
    
    if (empty($data['user_id']) || empty($data['tipster_id'])) {
        jsonResponse(['success' => false, 'message' => 'user_id and tipster_id required'], 400);
    }
    
    try {
        $pdo = getDB();
        
        // Check if already following
        $stmt = $pdo->prepare("SELECT id FROM follows WHERE user_id = :uid AND tipster_id = :tid");
        $stmt->execute([':uid' => $data['user_id'], ':tid' => $data['tipster_id']]);
        
        if ($stmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Already following this tipster'], 409);
        }
        
        $stmt = $pdo->prepare("INSERT INTO follows (id, user_id, tipster_id, created_at) 
                               VALUES (:id, :uid, :tid, NOW())");
        $stmt->execute([
            ':id' => 'follow_' . time() . '_' . uniqid(),
            ':uid' => $data['user_id'],
            ':tid' => $data['tipster_id']
        ]);
        
        jsonResponse(['success' => true, 'message' => 'Now following!'], 201);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

function handleDeleteFollow() {
    $followId = $_GET['id'] ?? 0;
    
    try {
        $pdo = getDB();
        $stmt = $pdo->prepare("DELETE FROM follows WHERE id = :id");
        $stmt->execute([':id' => $followId]);
        
        jsonResponse(['success' => true, 'message' => 'Unfollowed']);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    }
}
?>