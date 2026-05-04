<?php
// ============================================
// BASHIRI NASI - AUTO CODE DELIVERY API
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
    case 'deliver':
        deliverCode();
        break;
    case 'check':
        checkPaymentStatus();
        break;
    case 'pending':
        getPendingPayments();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

// ============================================
// DELIVER CODE AFTER PAYMENT
// ============================================
function deliverCode() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['purchase_id'])) {
        echo json_encode(['success' => false, 'message' => 'Purchase ID required']);
        return;
    }
    
    try {
        $pdo = getDB();
        
        // Get purchase info
        $stmt = $pdo->prepare("SELECT p.*, t.bet_code, t.platform, t.odds, t.tipster_name 
                               FROM purchases p 
                               JOIN tips t ON p.tip_id = t.id 
                               WHERE p.id = :id");
        $stmt->execute([':id' => $data['purchase_id']]);
        $purchase = $stmt->fetch();
        
        if (!$purchase) {
            echo json_encode(['success' => false, 'message' => 'Purchase not found']);
            return;
        }
        
        if ($purchase['status'] === 'paid') {
            // Return the code
            echo json_encode([
                'success' => true,
                'message' => 'Code delivered!',
                'data' => [
                    'code' => $purchase['bet_code'],
                    'platform' => $purchase['platform'],
                    'odds' => $purchase['odds'],
                    'tipster' => $purchase['tipster_name'],
                    'amount' => $purchase['amount'],
                    'delivered_at' => date('Y-m-d H:i:s')
                ]
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Payment not yet confirmed',
                'status' => $purchase['status']
            ]);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    }
}

// ============================================
// CHECK PAYMENT STATUS
// ============================================
function checkPaymentStatus() {
    $purchaseId = $_GET['purchase_id'] ?? '';
    
    if (empty($purchaseId)) {
        echo json_encode(['success' => false, 'message' => 'Purchase ID required']);
        return;
    }
    
    try {
        $pdo = getDB();
        
        $stmt = $pdo->prepare("SELECT id, status, amount, paid_at FROM purchases WHERE id = :id");
        $stmt->execute([':id' => $purchaseId]);
        $purchase = $stmt->fetch();
        
        if ($purchase) {
            echo json_encode([
                'success' => true,
                'data' => [
                    'status' => $purchase['status'],
                    'amount' => $purchase['amount'],
                    'paid_at' => $purchase['paid_at']
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Purchase not found']);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================
// GET PENDING PAYMENTS (For Admin)
// ============================================
function getPendingPayments() {
    try {
        $pdo = getDB();
        
        $stmt = $pdo->query("SELECT p.*, u.name as user_name, u.phone as user_phone, t.bet_code, t.platform 
                             FROM purchases p 
                             JOIN users u ON p.user_id = u.id 
                             JOIN tips t ON p.tip_id = t.id 
                             WHERE p.status = 'pending' 
                             ORDER BY p.created_at DESC");
        
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>