<?php
// ============================================
// BASHIRI NASI - PAYMENT API
// M-Pesa | Airtel Money | Tigo Pesa
// ============================================

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

switch ($action) {
    case 'submit':
        handlePaymentSubmission();
        break;
    case 'verify':
        handlePaymentVerification();
        break;
    case 'history':
        getPaymentHistory();
        break;
    case 'mpesa_callback':
        handleMpesaCallback();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

// ============================================
// SUBMIT PAYMENT
// ============================================
function handlePaymentSubmission() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['user_id']) || empty($data['tip_id']) || empty($data['amount']) || empty($data['payment_method'])) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        return;
    }
    
    try {
        $pdo = getDB();
        
        // Check if already purchased
        $stmt = $pdo->prepare("SELECT id FROM purchases WHERE user_id = :uid AND tip_id = :tid AND status = 'paid'");
        $stmt->execute([':uid' => $data['user_id'], ':tid' => $data['tip_id']]);
        
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Already purchased this tip']);
            return;
        }
        
        // Create purchase record (pending until verified)
        $purchaseId = 'purchase_' . time() . '_' . uniqid();
        
        $stmt = $pdo->prepare("INSERT INTO purchases (id, user_id, tip_id, amount, status, payment_method, payer_name, payer_phone, transaction_id) 
                               VALUES (:id, :uid, :tid, :amount, 'pending', :method, :name, :phone, :txn)");
        $stmt->execute([
            ':id' => $purchaseId,
            ':uid' => $data['user_id'],
            ':tid' => $data['tip_id'],
            ':amount' => intval($data['amount']),
            ':method' => $data['payment_method'],
            ':name' => $data['payer_name'] ?? '',
            ':phone' => $data['payer_phone'] ?? '',
            ':txn' => $data['transaction_id'] ?? ''
        ]);
        
        // Get tip code for response
        $stmt = $pdo->prepare("SELECT bet_code FROM tips WHERE id = :tid");
        $stmt->execute([':tid' => $data['tip_id']]);
        $tip = $stmt->fetch();
        
        echo json_encode([
            'success' => true,
            'message' => 'Payment submitted for verification',
            'purchase_id' => $purchaseId,
            'tip_code' => $tip ? $tip['bet_code'] : null,
            'status' => 'pending'
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    }
}

// ============================================
// VERIFY PAYMENT (Admin confirms)
// ============================================
function handlePaymentVerification() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['purchase_id']) || empty($data['status'])) {
        echo json_encode(['success' => false, 'message' => 'Missing fields']);
        return;
    }
    
    try {
        $pdo = getDB();
        
        if ($data['status'] === 'paid') {
            // Approve payment
            $stmt = $pdo->prepare("UPDATE purchases SET status = 'paid', paid_at = NOW() WHERE id = :id");
            $stmt->execute([':id' => $data['purchase_id']]);
            
            // Update tip sold count
            $stmt = $pdo->prepare("SELECT tip_id, amount FROM purchases WHERE id = :id");
            $stmt->execute([':id' => $data['purchase_id']]);
            $purchase = $stmt->fetch();
            
            if ($purchase) {
                $stmt = $pdo->prepare("UPDATE tips SET purchased = purchased + 1, total_revenue = total_revenue + :amount WHERE id = :tid");
                $stmt->execute([':amount' => $purchase['amount'], ':tid' => $purchase['tip_id']]);
            }
            
            echo json_encode(['success' => true, 'message' => 'Payment approved! Code delivered.']);
        } else {
            // Reject payment
            $stmt = $pdo->prepare("UPDATE purchases SET status = 'cancelled' WHERE id = :id");
            $stmt->execute([':id' => $data['purchase_id']]);
            
            echo json_encode(['success' => true, 'message' => 'Payment rejected.']);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    }
}

// ============================================
// GET PAYMENT HISTORY
// ============================================
function getPaymentHistory() {
    $userId = $_GET['user_id'] ?? 0;
    
    try {
        $pdo = getDB();
        
        if ($userId) {
            $stmt = $pdo->prepare("SELECT p.*, t.bet_code, t.platform, t.odds FROM purchases p JOIN tips t ON p.tip_id = t.id WHERE p.user_id = :uid ORDER BY p.created_at DESC");
            $stmt->execute([':uid' => $userId]);
        } else {
            $stmt = $pdo->query("SELECT p.*, u.name as user_name, t.bet_code FROM purchases p JOIN users u ON p.user_id = u.id JOIN tips t ON p.tip_id = t.id ORDER BY p.created_at DESC");
        }
        
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================
// M-PESA CALLBACK (For real M-Pesa API)
// ============================================
function handleMpesaCallback() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Log the callback
    $logFile = __DIR__ . '/../logs/mpesa_callback.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) mkdir($logDir, 0755, true);
    
    file_put_contents($logFile, date('Y-m-d H:i:s') . ' - ' . json_encode($data) . "\n", FILE_APPEND);
    
    // Process M-Pesa callback
    if (isset($data['Body']['stkCallback']['ResultCode']) && $data['Body']['stkCallback']['ResultCode'] == 0) {
        // Payment successful - update purchase
        $checkoutRequestID = $data['Body']['stkCallback']['CheckoutRequestID'] ?? '';
        
        try {
            $pdo = getDB();
            $stmt = $pdo->prepare("UPDATE purchases SET status = 'paid', paid_at = NOW(), transaction_id = :txn WHERE transaction_id = :txn");
            $stmt->execute([':txn' => $checkoutRequestID]);
        } catch (Exception $e) {
            error_log('M-Pesa callback error: ' . $e->getMessage());
        }
    }
    
    echo json_encode(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
}
?>