<?php
// ============================================
// BASHIRI NASI - PURCHASES API (FULLY FIXED)
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handleGetPurchases();
} elseif ($method === 'POST') {
    handleCreatePurchase();
} else {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

function handleGetPurchases() {
    try {
        $pdo = getDB();
        $userId = $_GET['user_id'] ?? 0;
        
        if ($userId) {
            $stmt = $pdo->prepare("SELECT p.*, t.code, t.platform, t.odds, t.price as tip_price 
                                   FROM purchases p 
                                   JOIN tips t ON p.tip_id = t.id 
                                   WHERE p.user_id = :uid 
                                   ORDER BY p.created_at DESC");
            $stmt->execute([':uid' => $userId]);
        } else {
            $stmt = $pdo->query("SELECT p.*, u.name as user_name, u.phone, t.code, t.platform 
                                 FROM purchases p 
                                 JOIN users u ON p.user_id = u.id 
                                 JOIN tips t ON p.tip_id = t.id 
                                 ORDER BY p.created_at DESC LIMIT 100");
        }
        
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

function handleCreatePurchase() {
    $data = getRequestBody();
    
    if (empty($data['user_id']) || empty($data['tip_id']) || empty($data['amount'])) {
        jsonResponse(['success' => false, 'message' => 'Missing fields: user_id, tip_id, amount required'], 400);
    }
    
    try {
        $pdo = getDB();
        
        // Check if tip exists and get price
        $stmt = $pdo->prepare("SELECT id, price, purchased FROM tips WHERE id = :tid AND status = 'active'");
        $stmt->execute([':tid' => $data['tip_id']]);
        $tip = $stmt->fetch();
        
        if (!$tip) {
            jsonResponse(['success' => false, 'message' => 'Tip not found or inactive'], 404);
        }
        
        // Verify amount matches tip price (optional)
        if ($data['amount'] != $tip['price']) {
            jsonResponse(['success' => false, 'message' => 'Amount does not match tip price'], 400);
        }
        
        // Check if already purchased
        $stmt = $pdo->prepare("SELECT id FROM purchases WHERE user_id = :uid AND tip_id = :tid AND status = 'paid'");
        $stmt->execute([':uid' => $data['user_id'], ':tid' => $data['tip_id']]);
        if ($stmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Already purchased this tip'], 409);
        }
        
        // Create purchase with ID
        $purchaseId = 'pur_' . time() . '_' . uniqid();
        
        $stmt = $pdo->prepare("INSERT INTO purchases (id, user_id, tip_id, amount, status, paid_at, created_at) 
                               VALUES (:id, :uid, :tid, :amount, 'paid', NOW(), NOW())");
        $stmt->execute([
            ':id' => $purchaseId,
            ':uid' => $data['user_id'],
            ':tid' => $data['tip_id'],
            ':amount' => intval($data['amount'])
        ]);
        
        // Update tip purchase count
        $stmt = $pdo->prepare("UPDATE tips SET purchased = purchased + 1 WHERE id = :tid");
        $stmt->execute([':tid' => $data['tip_id']]);
        
        // Get the purchased tip code
        $stmt = $pdo->prepare("SELECT t.code, t.platform, t.odds, t.tipster_name 
                               FROM tips t WHERE t.id = :tid");
        $stmt->execute([':tid' => $data['tip_id']]);
        $tipData = $stmt->fetch();
        
        jsonResponse([
            'success' => true, 
            'message' => 'Purchase successful!',
            'purchase_id' => $purchaseId,
            'tip_code' => $tipData['code'],
            'platform' => $tipData['platform'],
            'odds' => $tipData['odds'],
            'tipster' => $tipData['tipster_name']
        ], 201);
        
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    }
}
?>