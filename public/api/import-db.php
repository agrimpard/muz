<?php
require_once __DIR__ . '/../../config/boot_i18n.php';
require_once __DIR__ . '/../../config/Config.php';
require_once __DIR__ . '/../../config/Database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => t('method_not_allowed')]);
    exit;
}

if (!isset($_FILES['dbfile']) || $_FILES['dbfile']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => t('invalid_file')]);
    exit;
}

// Vérifications minimales
$allowed = ['application/octet-stream'];
$ext = strtolower(pathinfo($_FILES['dbfile']['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['sqlite','db','sqlite3'])) {
    echo json_encode(['success' => false, 'error' => t('unsupported_extension')]);
    exit;
}

// Emplacement DB (cohérent avec Database.php)
$dbPath = __DIR__ . '/../../db/muz.sqlite';
$backupDir = dirname($dbPath) . '/backup';
if (!is_dir($backupDir)) @mkdir($backupDir, 0775, true);

// Sauvegarde
$backupPath = $backupDir . '/muz-' . date('Ymd-His') . '.sqlite';
if (file_exists($dbPath)) {
    @copy($dbPath, $backupPath);
}

// Remplacement
$tmpPath = $_FILES['dbfile']['tmp_name'];
if (!@move_uploaded_file($tmpPath, $dbPath)) {
    echo json_encode(['success' => false, 'error' => t('db_replace_failed')]);
    exit;
}

echo json_encode(['success' => true, 'backup' => basename($backupPath)]);
