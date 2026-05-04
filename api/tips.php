<?php
// ============================================
// BASHIRI NASI - TIPS API
// ============================================
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'all';

switch ($method) {
    case 'GET':
        handleGetTips();
        break;
    case 'POST':
        handleCreateTip();
        break;
    case 'PUT':
        handleUpdateTip();
        break;
    default:
        sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

function handleGetTips() {
    $pdo = getDB();
    $action = $_GET['action'] ?? 'all';
    
    if ($action === 'tipster' && isset($_GET['tipster_id'])) {
        $stmt = $pdo->prepare("
            SELECT t.*, u.name as tipster_name 
            FROM tips t 
            JOIN users u ON t.tipster_id = u.id 
            WHERE t.tipster_id = ? 
            ORDER BY t.created_at DESC
        ");
        $stmt->execute([$_GET['tipster_id']]);
    } else {
        $stmt = $pdo->query("
            SELECT t.*, u.name as tipster_name 
            FROM tips t 
            JOIN users u ON t.tipster_id = u.id 
            WHERE t.status = 'active' 
            ORDER BY t.created_at DESC
        ");
    }
    
    $tips = $stmt->fetchAll();
    
    sendResponse([
        'success' => true,
        'data' => $tips
    ]);
}

function handleCreateTip() {
    $pdo = getDB();
    $data = getJSONInput();
    
    $tipsterId = $data['tipster_id'] ?? '';
    $platform = sanitize($data['platform'] ?? '', 50);
    $betCode = sanitize($data['bet_code'] ?? '', 500);
    $odds = floatval($data['odds'] ?? 0);
    $price = intval($data['price'] ?? 0);
    
    if (!$tipsterId || !$platform || !$betCode || $odds <= 1 || $price < 1000) {
        sendResponse(['success' => false, 'message' => 'Invalid tip data'], 400);
    }
    
    $id = generateToken(16);
    
    $stmt = $pdo->prepare("INSERT INTO tips (id, tipster_id, platform, bet_code, odds, price) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$id, $tipsterId, $platform, $betCode, $odds, $price]);
    
    sendResponse([
        'success' => true,
        'message' => 'Tip uploaded successfully',
        'tip_id' => $id
    ], 201);
}

function handleUpdateTip() {
    $pdo = getDB();
    $data = getJSONInput();
    
    $tipId = $data['tip_id'] ?? '';
    $result = in_array($data['result'] ?? '', ['won', 'lost']) ? $data['result'] : null;
    
    if (!$tipId || !$result) {
        sendResponse(['success' => false, 'message' => 'Invalid update data'], 400);
    }
    
    $stmt = $pdo->prepare("UPDATE tips SET result = ? WHERE id = ?");
    $stmt->execute([$result, $tipId]);
    
    sendResponse(['success' => true, 'message' => 'Tip updated']);
}

function handleDeleteTip() {
    requireAdmin();
    $tipId = $_GET['id'] ?? '';
    
    if (!$tipId) {
        sendResponse(['success' => false, 'message' => 'Tip ID required'], 400);
    }
    
    $pdo = getDB();
    $stmt = $pdo->prepare("DELETE FROM tips WHERE id = ?");
    $stmt->execute([$tipId]);
    
    sendResponse(['success' => true, 'message' => 'Tip deleted']);
}
?>
