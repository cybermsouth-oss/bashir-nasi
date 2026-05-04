<?php
// ============================================
// AUTOMATIC DATABASE BACKUP
// Run this via cron job daily
// ============================================

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'backup':
        createBackup();
        break;
    case 'restore':
        restoreBackup();
        break;
    case 'list':
        listBackups();
        break;
    default:
        echo json_encode(['error' => 'Invalid action']);
}

function createBackup() {
    $backupDir = __DIR__ . '/../backups/';
    
    // Create backup directory if not exists
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0755, true);
    }
    
    $filename = 'backup_' . date('Y-m-d_H-i-s') . '.sql';
    $filepath = $backupDir . $filename;
    
    try {
        $pdo = getDB();
        
        // Get all tables
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $output = "-- Bashiri Nasi Database Backup\n";
        $output .= "-- Generated: " . date('Y-m-d H:i:s') . "\n\n";
        $output .= "SET FOREIGN_KEY_CHECKS=0;\n\n";
        
        foreach ($tables as $table) {
            // Get create table syntax
            $stmt = $pdo->query("SHOW CREATE TABLE $table");
            $create = $stmt->fetch();
            $output .= "DROP TABLE IF EXISTS `$table`;\n";
            $output .= $create['Create Table'] . ";\n\n";
            
            // Get data
            $stmt = $pdo->query("SELECT * FROM $table");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($rows) > 0) {
                $output .= "INSERT INTO `$table` VALUES\n";
                $values = [];
                foreach ($rows as $row) {
                    $escaped = array_map(function($val) use ($pdo) {
                        return $val === null ? 'NULL' : $pdo->quote($val);
                    }, array_values($row));
                    $values[] = "(" . implode(',', $escaped) . ")";
                }
                $output .= implode(",\n", $values) . ";\n\n";
            }
        }
        
        $output .= "SET FOREIGN_KEY_CHECKS=1;\n";
        
        // Write to file
        file_put_contents($filepath, $output);
        
        // Delete old backups (keep last 7 days)
        $files = glob($backupDir . 'backup_*.sql');
        usort($files, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        
        $keep = 7; // Keep 7 most recent
        for ($i = $keep; $i < count($files); $i++) {
            unlink($files[$i]);
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Backup created successfully',
            'file' => $filename,
            'size' => round(filesize($filepath) / 1024, 2) . ' KB'
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function listBackups() {
    $backupDir = __DIR__ . '/../backups/';
    $backups = [];
    
    if (is_dir($backupDir)) {
        $files = glob($backupDir . 'backup_*.sql');
        foreach ($files as $file) {
            $backups[] = [
                'name' => basename($file),
                'size' => round(filesize($file) / 1024, 2) . ' KB',
                'date' => date('Y-m-d H:i:s', filemtime($file))
            ];
        }
        usort($backups, function($a, $b) {
            return strtotime($b['date']) - strtotime($a['date']);
        });
    }
    
    echo json_encode(['success' => true, 'backups' => $backups]);
}
?>