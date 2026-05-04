-- ============================================
-- UPDATE EXISTING DATABASE WITH MISSING COLUMNS
-- ============================================

USE `bashiri_nasi`;

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- UPDATE USERS TABLE - Add missing columns
-- ============================================
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `avatar` VARCHAR(255) AFTER `bio`,
ADD COLUMN IF NOT EXISTS `login_count` INT DEFAULT 0 AFTER `is_active`,
ADD COLUMN IF NOT EXISTS `last_login` DATETIME AFTER `login_count`,
ADD COLUMN IF NOT EXISTS `last_active` DATETIME AFTER `last_login`,
ADD COLUMN IF NOT EXISTS `updated_at` DATETIME AFTER `created_at`;

-- ============================================
-- UPDATE TIPS TABLE - Add missing columns
-- ============================================
ALTER TABLE `tips` 
ADD COLUMN IF NOT EXISTS `match_name` VARCHAR(200) AFTER `code`,
ADD COLUMN IF NOT EXISTS `screenshot` VARCHAR(255) AFTER `total_revenue`,
ADD COLUMN IF NOT EXISTS `updated_at` DATETIME AFTER `created_at`,
ADD COLUMN IF NOT EXISTS `total_revenue` INT DEFAULT 0 AFTER `purchased`;

-- ============================================
-- UPDATE PURCHASES TABLE - Add missing columns
-- ============================================
ALTER TABLE `purchases` 
ADD COLUMN IF NOT EXISTS `payment_method` ENUM('mpesa', 'tigo_pesa', 'airtel_money', 'manual') DEFAULT 'manual' AFTER `status`,
ADD COLUMN IF NOT EXISTS `payer_name` VARCHAR(100) AFTER `payment_method`,
ADD COLUMN IF NOT EXISTS `payer_phone` VARCHAR(20) AFTER `payer_name`,
ADD COLUMN IF NOT EXISTS `transaction_id` VARCHAR(100) AFTER `payer_phone`,
ADD COLUMN IF NOT EXISTS `mpesa_receipt` VARCHAR(100) AFTER `transaction_id`,
ADD COLUMN IF NOT EXISTS `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP AFTER `paid_at`,
MODIFY COLUMN `paid_at` DATETIME NULL;

-- ============================================
-- CREATE MISSING TABLES
-- ============================================

-- 1. WALLETS TABLE
CREATE TABLE IF NOT EXISTS `wallets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(100) NOT NULL UNIQUE,
    `balance` INT DEFAULT 0,
    `total_deposited` INT DEFAULT 0,
    `total_withdrawn` INT DEFAULT 0,
    `total_spent` INT DEFAULT 0,
    `total_earned` INT DEFAULT 0,
    `updated_at` DATETIME,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(100) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT,
    `type` ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    `is_read` BOOLEAN DEFAULT 0,
    `link` VARCHAR(255),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. WITHDRAWALS TABLE
CREATE TABLE IF NOT EXISTS `withdrawals` (
    `id` VARCHAR(100) PRIMARY KEY,
    `tipster_id` VARCHAR(100) NOT NULL,
    `amount` INT NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `status` ENUM('pending', 'processing', 'completed', 'rejected') DEFAULT 'pending',
    `payment_method` ENUM('mpesa', 'tigo_pesa', 'airtel_money') DEFAULT 'mpesa',
    `transaction_id` VARCHAR(100),
    `admin_notes` TEXT,
    `requested_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `processed_at` DATETIME,
    FOREIGN KEY (`tipster_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. FREE_TIPS TABLE
CREATE TABLE IF NOT EXISTS `free_tips` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tip_id` VARCHAR(100),
    `title` VARCHAR(200),
    `description` TEXT,
    `display_order` INT DEFAULT 0,
    `is_active` BOOLEAN DEFAULT 1,
    `expires_at` DATETIME,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`tip_id`) REFERENCES `tips`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. BANNERS TABLE
CREATE TABLE IF NOT EXISTS `banners` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(200),
    `image_url` VARCHAR(500),
    `link_url` VARCHAR(500),
    `position` ENUM('home', 'sidebar', 'footer') DEFAULT 'home',
    `display_order` INT DEFAULT 0,
    `is_active` BOOLEAN DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. CONTACT_MESSAGES TABLE
CREATE TABLE IF NOT EXISTS `contact_messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100),
    `phone` VARCHAR(20),
    `message` TEXT NOT NULL,
    `is_read` BOOLEAN DEFAULT 0,
    `replied_at` DATETIME,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS `transactions` (
    `id` VARCHAR(100) PRIMARY KEY,
    `user_id` VARCHAR(100) NOT NULL,
    `type` ENUM('deposit', 'withdrawal', 'purchase', 'refund', 'commission') NOT NULL,
    `amount` INT NOT NULL,
    `status` ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    `payment_method` VARCHAR(50),
    `reference` VARCHAR(100),
    `description` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert admin if not exists
INSERT IGNORE INTO `users` (`id`, `name`, `phone`, `password`, `role`, `bio`, `is_active`) VALUES
('admin_default', 'Administrator', 'admin', 'Hmks|@2025b[G#Zljvyl', 'admin', 'Platform Administrator', 1);

-- Insert default settings if not exists
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
('site_name', 'Bashiri Nasi'),
('site_description', '#1 Trusted Football Predictions Platform in Tanzania'),
('contact_phone', '255784967484'),
('contact_whatsapp', '255784967484'),
('min_tip_price', '1000'),
('max_tip_price', '100000'),
('commission_rate', '10'),
('maintenance_mode', '0'),
('version', '3.0.0'),
('currency', 'TZS'),
('currency_symbol', 'TSh');

-- Create wallet for existing users
INSERT IGNORE INTO `wallets` (`user_id`, `balance`, `created_at`) 
SELECT id, 0, NOW() FROM users WHERE id NOT IN (SELECT user_id FROM wallets);

-- ============================================
-- RE-ENABLE FOREIGN KEY CHECKS
-- ============================================
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- VERIFY
-- ============================================
SELECT '✅ Database updated successfully!' AS message;
SHOW TABLES;