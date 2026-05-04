<?php
// ============================================
// BASHIRI NASI - PURCHASES API
// ============================================
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetPurchases();
        break;
    case 'POST':
        requireAuth();
        handleCreatePurchase();
        break;
    default:
        sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

function handleGetPurchases() {
    $pdo = getDB();
    $userId = $_GET['user_id'] ?? null;
    
    if ($userId) {
        $stmt = $pdo->prepare("SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$userId]);
    } else {
        $stmt = $pdo->query("SELECT * FROM purchases ORDER BY created_at DESC");
    }
    
    $purchases = $stmt->fetchAll();
    
    sendResponse([
        'success' => true,
        'data' => $purchases
    ]);
}

function handleCreatePurchase() {
    $pdo = getDB();
    $data = getJSONInput();
    
    $userId = $data['user_id'] ?? '';
    $tipId = $data['tip_id'] ?? '';
    $amount = intval($data['amount'] ?? 0);
    
    if (!$userId || !$tipId || $amount <= 0) {
        sendResponse(['success' => false, 'message' => 'Invalid purchase data'], 400);
    }
    
    // Check if already purchased
    $stmt = $pdo->prepare("SELECT id FROM purchases WHERE user_id = ? AND tip_id = ? AND status = 'paid'");
    $stmt->execute([$userId, $tipId]);
    if ($stmt->fetch()) {
        sendResponse(['success' => false, 'message' => 'Already purchased this tip'], 409);
    }
    
    $id = generateToken(16);
    
    $pdo->beginTransaction();
    try {
        // Create purchase
        $stmt = $pdo->prepare("INSERT INTO purchases (id, user_id, tip_id, amount, status, paid_at) VALUES (?, ?, ?, ?, 'paid', NOW())");
        $stmt->execute([$id, $userId, $tipId, $amount]);
        
        // Update tip purchase count
        $stmt = $pdo->prepare("UPDATE tips SET purchased = purchased + 1 WHERE id = ?");
        $stmt->execute([$tipId]);
        
        $pdo->commit();
        
        sendResponse([
            'success' => true,
            'message' => 'Purchase successful! Tip unlocked.'
        ], 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendResponse(['success' => false, 'message' => 'Purchase failed'], 500);
    }
}
?>
