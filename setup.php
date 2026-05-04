<?php
// ============================================
// BASHIRI NASI - SETUP & INSTALLATION
// Run this once to set up the database
// ============================================

$pageTitle = 'Bashiri Nasi - Setup';
$step = $_GET['step'] ?? 1;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $pageTitle ?></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #F0FDF4; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .setup-container { max-width: 600px; width: 100%; padding: 20px; }
        .setup-card { background: white; border-radius: 20px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
        h1 { color: #059669; margin-bottom: 8px; }
        h2 { color: #064E3B; margin-bottom: 20px; font-size: 1.2rem; }
        p { color: #6B7280; margin-bottom: 16px; font-size: 0.9rem; }
        .step-indicator { display: flex; gap: 10px; margin-bottom: 30px; }
        .step-dot { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; background: #E5E7EB; color: #6B7280; }
        .step-dot.active { background: #059669; color: white; }
        .step-dot.done { background: #10B981; color: white; }
        .step-line { flex: 1; height: 2px; background: #E5E7EB; align-self: center; }
        .form-group { margin-bottom: 16px; }
        label { display: block; font-weight: 600; margin-bottom: 6px; color: #374151; font-size: 0.85rem; }
        input { width: 100%; padding: 10px 14px; border: 1.5px solid #E5E7EB; border-radius: 8px; font-size: 0.9rem; }
        input:focus { outline: none; border-color: #059669; }
        .btn { padding: 12px 24px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; font-size: 0.9rem; }
        .btn-primary { background: #059669; color: white; width: 100%; }
        .btn-primary:hover { background: #047857; }
        .alert { padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 0.85rem; }
        .alert-success { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
        .alert-error { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; }
        .badge-success { background: #D1FAE5; color: #059669; }
        .badge-error { background: #FEE2E2; color: #DC2626; }
    </style>
</head>
<body>
    <div class="setup-container">
        <div class="setup-card">
            <h1>⚡ Bashiri Nasi</h1>
            <h2>Database Setup Wizard</h2>
            
            <div class="step-indicator">
                <div class="step-dot <?= $step >= 1 ? 'active' : '' ?>">1</div>
                <div class="step-line"></div>
                <div class="step-dot <?= $step >= 2 ? 'active' : '' ?>">2</div>
                <div class="step-line"></div>
                <div class="step-dot <?= $step >= 3 ? 'active' : '' ?>">3</div>
            </div>
            
            <?php if ($step == 1): ?>
                <p>Step 1: Enter your database credentials</p>
                <form method="GET" action="setup.php">
                    <input type="hidden" name="step" value="2">
                    <div class="form-group">
                        <label>Database Host</label>
                        <input type="text" name="host" value="localhost" required>
                    </div>
                    <div class="form-group">
                        <label>Database Name</label>
                        <input type="text" name="dbname" value="bashiri_nasi" required>
                    </div>
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" name="user" value="root" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="text" name="pass" placeholder="Leave blank for XAMPP default">
                    </div>
                    <button type="submit" class="btn btn-primary">Test Connection & Continue</button>
                </form>
                
            <?php elseif ($step == 2): 
                $host = $_GET['host'] ?? 'localhost';
                $dbname = $_GET['dbname'] ?? 'bashiri_nasi';
                $user = $_GET['user'] ?? 'root';
                $pass = $_GET['pass'] ?? '';
                
                try {
                    // Test connection
                    $pdo = new PDO("mysql:host=$host", $user, $pass);
                    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                    
                    // Create database
                    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    
                    // Import SQL file
                    $sql = file_get_contents(__DIR__ . '/database/bashiri_nasi.sql');
                    $pdo->exec("USE `$dbname`");
                    $pdo->exec($sql);
                    
                    // Update config file
                    $configContent = "<?php
define('DB_HOST', '$host');
define('DB_NAME', '$dbname');
define('DB_USER', '$user');
define('DB_PASS', '$pass');
define('DB_CHARSET', 'utf8mb4');
?>";
                    
                    $configPath = __DIR__ . '/api/config_db.php';
                    $configSaved = file_put_contents($configPath, $configContent);
                    
                    echo '<div class="alert alert-success">✅ Database connected and tables created successfully!</div>';
                    if ($configSaved) {
                        echo '<div class="alert alert-success">✅ Configuration file saved!</div>';
                    } else {
                        echo '<div class="alert alert-error">⚠️ Could not save config file. Please check permissions.</div>';
                    }
                    
                } catch (PDOException $e) {
                    echo '<div class="alert alert-error">❌ Connection failed: ' . $e->getMessage() . '</div>';
                    echo '<a href="setup.php?step=1" class="btn btn-primary" style="display:inline-block;text-align:center;text-decoration:none;">Go Back</a>';
                }
            ?>
                <p style="margin-top:16px;">Database setup complete! You can now:</p>
                <a href="index.html" class="btn btn-primary" style="display:inline-block;text-align:center;text-decoration:none;margin-top:8px;">Go to Website</a>
                
            <?php elseif ($step == 3): ?>
                <div class="alert alert-success">✅ Setup Complete!</div>
                <p>Your Bashiri Nasi platform is now ready to use.</p>
                <p><strong>Admin Login:</strong> admin / Admin@2025!TZ#Secure</p>
                <p><strong>Important:</strong> Change the admin password immediately!</p>
                <a href="index.html" class="btn btn-primary" style="display:inline-block;text-align:center;text-decoration:none;">Launch Website</a>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>