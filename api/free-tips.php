<?php
// ============================================
// BASHIRI NASI - FREE TIPS API
// ============================================

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'today':
        getTodayFreeTips();
        break;
    case 'add':
        addFreeTip();
        break;
    case 'all':
        getAllFreeTips();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

// ============================================
// GET TODAY'S FREE TIPS
// ============================================
function getTodayFreeTips() {
    try {
        $pdo = getDB();
        
        // Get tips marked as free for today
        $stmt = $pdo->query("SELECT * FROM tips WHERE status = 'free' AND DATE(created_at) = CURDATE() ORDER BY created_at DESC LIMIT 5");
        $tips = $stmt->fetchAll();
        
        if (empty($tips)) {
            // Return default free tips if none set
            echo json_encode([
                'success' => true,
                'data' => [
                    [
                        'platform' => 'sportbet',
                        'bet_code' => 'SB-FREE-001',
                        'odds' => 1.75,
                        'match' => 'Simba SC vs Young Africans',
                        'tip' => 'Over 1.5 Goals'
                    ],
                    [
                        'platform' => 'betpawa',
                        'bet_code' => 'BP-FREE-002',
                        'odds' => 2.05,
                        'match' => 'Arsenal vs Chelsea',
                        'tip' => 'Both Teams to Score'
                    ]
                ]
            ]);
        } else {
            echo json_encode(['success' => true, 'data' => $tips]);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================
// ADD FREE TIP
// ============================================
function addFreeTip() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['platform']) || empty($data['bet_code']) || empty($data['odds'])) {
        echo json_encode(['success' => false, 'message' => 'Missing fields']);
        return;
    }
    
    try {
        $pdo = getDB();
        
        $stmt = $pdo->prepare("INSERT INTO tips (id, tipster_id, tipster_name, platform, bet_code, odds, price, result, status) 
                               VALUES (:id, :tid, 'Bashiri Nasi', :platform, :code, :odds, 0, 'pending', 'free')");
        $stmt->execute([
            ':id' => 'free_' . time(),
            ':tid' => $data['tipster_id'] ?? 'admin_default',
            ':platform' => sanitize($data['platform']),
            ':code' => sanitize($data['bet_code']),
            ':odds' => floatval($data['odds'])
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Free tip added!']);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================
// GET ALL FREE TIPS
// ============================================
function getAllFreeTips() {
    try {
        $pdo = getDB();
        $stmt = $pdo->query("SELECT * FROM tips WHERE status = 'free' OR price = 0 ORDER BY created_at DESC LIMIT 20");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>