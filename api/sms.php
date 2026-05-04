<?php
// ============================================
// BASHIRI NASI - SMS API
// Send SMS via Gateway
// ============================================

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'send':
        sendSingleSMS();
        break;
    case 'bulk':
        sendBulkSMS();
        break;
    case 'notify_tip':
        notifyNewTip();
        break;
    case 'log':
        getSMSLog();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

// ============================================
// SEND SINGLE SMS
// ============================================
function sendSingleSMS() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['phone']) || empty($data['message'])) {
        echo json_encode(['success' => false, 'message' => 'Phone and message required']);
        return;
    }
    
    $phone = preg_replace('/[^0-9]/', '', $data['phone']);
    if (strlen($phone) === 10 && $phone[0] === '0') {
        $phone = '255' . substr($phone, 1);
    }
    
    $message = substr($data['message'], 0, 480); // Max SMS length
    
    // Log the SMS
    $smsSent = sendViaGateway($phone, $message);
    
    // Save to database log
    try {
        $pdo = getDB();
        $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, details, severity) VALUES (:uid, :action, :details, 'info')");
        $stmt->execute([
            ':uid' => $data['user_id'] ?? null,
            ':action' => 'SMS_SENT',
            ':details' => "To: $phone | Message: $message"
        ]);
    } catch (Exception $e) {}
    
    echo json_encode([
        'success' => $smsSent,
        'message' => $smsSent ? 'SMS sent successfully' : 'SMS failed to send',
        'phone' => $phone
    ]);
}

// ============================================
// SEND BULK SMS
// ============================================
function sendBulkSMS() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['message'])) {
        echo json_encode(['success' => false, 'message' => 'Message required']);
        return;
    }
    
    $message = substr($data['message'], 0, 480);
    $sent = 0;
    $failed = 0;
    
    // Get users from request or database
    $phones = $data['phones'] ?? [];
    
    if (empty($phones) && isset($data['all_users']) && $data['all_users']) {
        try {
            $pdo = getDB();
            $stmt = $pdo->query("SELECT phone FROM users WHERE phone != 'admin' AND is_active = 1");
            $users = $stmt->fetchAll();
            $phones = array_column($users, 'phone');
        } catch (Exception $e) {
            $phones = [];
        }
    }
    
    foreach ($phones as $phone) {
        $phone = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($phone) === 10 && $phone[0] === '0') {
            $phone = '255' . substr($phone, 1);
        }
        
        if (sendViaGateway($phone, $message)) {
            $sent++;
        } else {
            $failed++;
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => "SMS sent: $sent successful, $failed failed",
        'sent' => $sent,
        'failed' => $failed
    ]);
}

// ============================================
// NOTIFY ABOUT NEW TIP
// ============================================
function notifyNewTip() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $odds = $data['odds'] ?? '0';
    $message = "🔥 Tips Mpya! Odds $odds zimeongezwa. Tembelea Bashiri Nasi sasa kupata code. Jiunge leo!";
    
    // Get all users
    try {
        $pdo = getDB();
        $stmt = $pdo->query("SELECT phone FROM users WHERE phone != 'admin' AND is_active = 1");
        $users = $stmt->fetchAll();
        
        $sent = 0;
        foreach ($users as $user) {
            if (sendViaGateway($user['phone'], $message)) $sent++;
        }
        
        echo json_encode(['success' => true, 'message' => "Notified $sent users"]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================
// GET SMS LOG
// ============================================
function getSMSLog() {
    try {
        $pdo = getDB();
        $stmt = $pdo->query("SELECT * FROM audit_logs WHERE action = 'SMS_SENT' ORDER BY created_at DESC LIMIT 100");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ============================================
// SMS GATEWAY FUNCTION
// Replace with your real SMS gateway
// ============================================
function sendViaGateway($phone, $message) {
    // Log the SMS
    $logFile = __DIR__ . '/../logs/sms.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) mkdir($logDir, 0755, true);
    
    file_put_contents($logFile, date('Y-m-d H:i:s') . " | To: $phone | " . substr($message, 0, 50) . "\n", FILE_APPEND);
    
    // TODO: Replace with real SMS gateway
    // Example using Textlocal:
    /*
    $apiKey = 'YOUR_API_KEY';
    $sender = 'BashiriNasi';
    
    $ch = curl_init('https://api.textlocal.in/send/');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'apikey' => $apiKey,
        'numbers' => $phone,
        'sender' => $sender,
        'message' => $message
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $result = json_decode($response, true);
    return isset($result['status']) && $result['status'] === 'success';
    */
    
    // For now, just log and return success
    return true;
}
?>