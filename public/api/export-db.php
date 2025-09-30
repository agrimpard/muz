<?php
require_once __DIR__ . '/../../config/boot_i18n.php';
require_once __DIR__ . '/../../config/Config.php';
require_once __DIR__ . '/../../config/Database.php';

// Le chemin utilisé par Database.php
$dbPath = __DIR__ . '/../../db/muz.sqlite';

if (!file_exists($dbPath)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => t('db_not_found')]);
    exit;
}

$filename = 'muz-db-' . date('Ymd-His') . '.sqlite';
header('Content-Description: File Transfer');
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename=' . $filename);
header('Content-Length: ' . filesize($dbPath));
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: public');

readfile($dbPath);
exit;