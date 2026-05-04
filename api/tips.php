<?php
// ============================================
// BASHIRI NASI - TIPS API (FULLY FIXED)
// ============================================
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        handleGetTips($action);
        break;
    case 'POST':
        handleCreateTip();
        break;
    case 'PUT':
        handleUpdateTip();
        break;
    default:
        jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

function handleGetTips($action) {
    try {
        $pdo = getDB();
        
        if ($action === 'all' || $action === 'recent') {
            $stmt = $pdo->query("SELECT * FROM tips WHERE status = 'active' ORDER BY created_at DESC LIMIT 20");
        } elseif ($action === 'tipster') {
            $tipsterId = $_GET['tipster_id'] ?? 0;
            $stmt = $pdo->prepare("SELECT * FROM tips WHERE tipster_id = :tid ORDER BY created_at DESC");
            $stmt->execute([':tid' => $tipsterId]);
        } elseif ($action === 'followed') {
            $userId = $_GET['user_id'] ?? 0;
            // Get followed tipsters first
            $stmt = $pdo->prepare("SELECT tipster_id FROM follows WHERE user_id = :uid");
            $stmt->execute([':uid' => $userId]);
            $followed = $stmt->fetchAll();
            if ($followed) {
                $ids = array_column($followed, 'tipster_id');
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $stmt = $pdo->prepare("SELECT * FROM tips WHERE tipster_id IN ($placeholders) AND status = 'active' ORDER BY created_at DESC");
                $stmt->execute($ids);
            } else {
                jsonResponse(['success' => true, 'data' => []]);
                return;
            }
        } else {
            $stmt = $pdo->query("SELECT * FROM tips WHERE status = 'active' ORDER BY created_at DESC");
        }
        
        $tips = $stmt->fetchAll();
        jsonResponse(['success' => true, 'data' => $tips]);
        
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

function handleCreateTip() {
    $data = getRequestBody();
    
    if (empty($data['tipster_id']) || empty($data['platform']) || empty($data['bet_code']) || empty($data['odds']) || empty($data['price'])) {
        jsonResponse(['success' => false, 'message' => 'Missing fields: tipster_id, platform, bet_code, odds, price required'], 400);
    }
    
    try {
        $pdo = getDB();
        
        // Get tipster name
        $stmt = $pdo->prepare("SELECT name FROM users WHERE id = :id");
        $stmt->execute([':id' => $data['tipster_id']]);
        $tipster = $stmt->fetch();
        
        if (!$tipster) {
            jsonResponse(['success' => false, 'message' => 'Tipster not found'], 404);
        }
        
        // FIXED: Using correct column name 'code' instead of 'bet_code'
        $stmt = $pdo->prepare("INSERT INTO tips (id, tipster_id, tipster_name, platform, code, odds, price, result, status, purchased, created_at) 
                               VALUES (:id, :tid, :tname, :platform, :code, :odds, :price, :result, 'active', 0, NOW())");
        $stmt->execute([
            ':id' => 'tip_' . time() . '_' . uniqid(),
            ':tid' => $data['tipster_id'],
            ':tname' => $tipster['name'],
            ':platform' => sanitize($data['platform']),
            ':code' => sanitize($data['bet_code']),
            ':odds' => floatval($data['odds']),
            ':price' => intval($data['price']),
            ':result' => $data['result'] ?? 'pending'
        ]);
        
        // Get the inserted tip
        $lastId = $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM tips WHERE id = :id");
        $stmt->execute([':id' => $lastId]);
        $newTip = $stmt->fetch();
        
        jsonResponse(['success' => true, 'message' => 'Tip uploaded!', 'tip' => $newTip], 201);
        
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'message' => 'Server error: ' . $e->getMessage()], 500);
    }
}

function handleUpdateTip() {
    $data = getRequestBody();
    
    if (empty($data['tip_id']) || empty($data['result'])) {
        jsonResponse(['success' => false, 'message' => 'Missing fields: tip_id and result required'], 400);
    }
    
    // Validate result
    if (!in_array($data['result'], ['won', 'lost', 'pending'])) {
        jsonResponse(['success' => false, 'message' => 'Invalid result. Use: won, lost, or pending'], 400);
    }
    
    try {
        $pdo = getDB();
        
        $stmt = $pdo->prepare("UPDATE tips SET result = :result, updated_at = NOW() WHERE id = :id AND result = 'pending'");
        $stmt->execute([':result' => $data['result'], ':id' => $data['tip_id']]);
        
        if ($stmt->rowCount() > 0) {
            jsonResponse(['success' => true, 'message' => 'Tip updated!']);
        } else {
            jsonResponse(['success' => false, 'message' => 'Tip not found or already updated'], 404);
        }
        
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
    }
}
?>