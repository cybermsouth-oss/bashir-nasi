<?php
// ============================================
// BASHIRI NASI - DATABASE CONFIGURATION
// ============================================
// SECURITY: Keep this file outside public directory in production!

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

// CORS headers (restrict in production)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Requested-With');
header('Access-Control-Max-Age: 3600');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'bashiri_nasi_db');
define('DB_USER', 'root');     // Change in production!
define('DB_PASS', '');          // Change in production!
define('DB_CHARSET', 'utf8mb4');

// Session configuration
define('SESSION_TIMEOUT', 1800); // 30 minutes
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 3600); // 1 hour

// Security
define('MIN_PASSWORD_LENGTH', 8);
define('BCRYPT_COST', 12);

// Create database connection
function getDB() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed'
            ]);
            exit();
        }
    }
    
    return $pdo;
}

// Get JSON input
function getJSONInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid JSON input'
        ]);
        exit();
    }
    
    return $data ?: [];
}

// Sanitize input
function sanitize($str, $maxLength = 200) {
    if (!is_string($str)) return '';
    $str = strip_tags($str);
    $str = trim($str);
    if ($maxLength > 0) {
        $str = mb_substr($str, 0, $maxLength);
    }
    return $str;
}

// Validate Tanzanian phone number
function validatePhone($phone) {
    $phone = preg_replace('/\D/', '', $phone);
    if (strlen($phone) === 10 && $phone[0] === '0') {
        $phone = '255' . substr($phone, 1);
    }
    if (strlen($phone) === 12 && substr($phone, 0, 3) === '255') {
        return preg_match('/^255[67]\d{8}$/', $phone) ? $phone : false;
    }
    return false;
}

// Validate email
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

// Generate token
function generateToken($length = 64) {
    return bin2hex(random_bytes($length / 2));
}

// Hash password
function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
}

// Verify password
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// Send JSON response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

// Check if database tables exist, create if not
function initializeDatabase() {
    $pdo = getDB();
    
    // Users table
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE,
        email VARCHAR(100) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'tipster', 'admin') DEFAULT 'user',
        bio TEXT,
        is_active TINYINT(1) DEFAULT 1,
        login_attempts INT DEFAULT 0,
        locked_until DATETIME NULL,
        last_login DATETIME NULL,
        token VARCHAR(128) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_email (email),
        INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    
    // Tips table
    $pdo->exec("CREATE TABLE IF NOT EXISTS tips (
        id VARCHAR(36) PRIMARY KEY,
        tipster_id VARCHAR(36) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        bet_code TEXT NOT NULL,
        odds DECIMAL(10,2) NOT NULL,
        price INT NOT NULL,
        result ENUM('pending', 'won', 'lost') DEFAULT 'pending',
        purchased INT DEFAULT 0,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tipster_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_tipster (tipster_id),
        INDEX idx_result (result)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    
    // Purchases table
    $pdo->exec("CREATE TABLE IF NOT EXISTS purchases (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        tip_id VARCHAR(36) NOT NULL,
        amount INT NOT NULL,
        status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
        paid_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (tip_id) REFERENCES tips(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_tip (tip_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    
    // Follows table
    $pdo->exec("CREATE TABLE IF NOT EXISTS follows (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        tipster_id VARCHAR(36) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_follow (user_id, tipster_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (tipster_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

// Initialize database on first load
initializeDatabase();

// Check authentication
function requireAuth() {
    $headers = getallheaders();
    $token = null;
    
    if (isset($headers['Authorization'])) {
        $token = str_replace('Bearer ', '', $headers['Authorization']);
    }
    
    if (!$token) {
        sendResponse(['success' => false, 'message' => 'Authentication required'], 401);
    }
    
    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT id, name, phone, email, role, bio FROM users WHERE token = ? AND is_active = 1");
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        sendResponse(['success' => false, 'message' => 'Invalid or expired token'], 401);
    }
    
    return $user;
}

// Check admin role
function requireAdmin() {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        sendResponse(['success' => false, 'message' => 'Admin access required'], 403);
    }
    return $user;
}
?>
