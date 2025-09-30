<?php
require_once __DIR__ . '/../../config/boot_i18n.php';
header('Content-Type: application/json');

$targetDir = __DIR__ . '/../music';
if (!is_dir($targetDir)) {
    if (!@mkdir($targetDir, 0775, true)) {
        echo json_encode(['success' => false, 'error' => t('cannot_create_destination_dir')]);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => t('method_not_allowed')]);
    exit;
}

if (!isset($_FILES['files'])) {
    echo json_encode(['success' => false, 'error' => t('invalid_file')]);
    exit;
}

$files = $_FILES['files'];
$uploaded = [];
$errors = [];

for ($i = 0; $i < count($files['name']); $i++) {
    $name = $files['name'][$i];
    $tmp = $files['tmp_name'][$i];
    $error = $files['error'][$i];
    $size = $files['size'][$i];

    if ($error !== UPLOAD_ERR_OK) {
        $errors[] = $name . ': ' . t('upload_error') . ' (' . $error . ')';
        continue;
    }

    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if ($ext !== 'mp3') {
        $errors[] = $name . ': ' . t('unsupported_extension');
        continue;
    }

    if ($size > 200 * 1024 * 1024) { // 200MB
        $errors[] = $name . ': ' . t('unknown_error');
        continue;
    }

    $safeName = preg_replace('/[^A-Za-z0-9._ -]/', '_', $name);
    $dest = $targetDir . '/' . $safeName;

    // éviter l'écrasement
    $counter = 1;
    while (file_exists($dest)) {
        $dest = $targetDir . '/' . pathinfo($safeName, PATHINFO_FILENAME) . ' (' . $counter++ . ').mp3';
    }

    if (!@move_uploaded_file($tmp, $dest)) {
        $errors[] = $name . ': ' . t('upload_error');
        continue;
    }

    $uploaded[] = basename($dest);
}

echo json_encode([
    'success' => count($errors) === 0,
    'uploaded' => $uploaded,
    'errors' => $errors
]);
