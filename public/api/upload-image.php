<?php
// upload-image.php
// Permet d'uploader une image (png/jpg/webp), la slugifier, la convertir en webp et la placer dans /public/img/gp/

require_once __DIR__ . '/../../config/boot_i18n.php';
header('Content-Type: application/json');

$targetDir = __DIR__ . '/../../public/img/gp/';
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0777, true);
}

if (!isset($_FILES['image'])) {
    echo json_encode(['success' => false, 'error' => t('invalid_file')]);
    exit;
}

$file = $_FILES['image'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => t('upload_error')]);
    exit;
}

$allowed = ['image/png', 'image/jpeg', 'image/webp'];
if (!in_array($file['type'], $allowed)) {
    echo json_encode(['success' => false, 'error' => t('unsupported_type')]);
    exit;
}

// Slugifier le nom
function slugify($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-a-z0-9]+~i', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    $text = strtolower($text);
    return $text ?: 'image';
}

$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$base = pathinfo($file['name'], PATHINFO_FILENAME);
$slug = slugify($base);
$targetFile = $targetDir . $slug . '.webp';

// Charger l'image
switch ($file['type']) {
    case 'image/png':
        $img = imagecreatefrompng($file['tmp_name']);
        break;
    case 'image/jpeg':
        $img = imagecreatefromjpeg($file['tmp_name']);
        break;
    case 'image/webp':
        $img = imagecreatefromwebp($file['tmp_name']);
        break;
    default:
        echo json_encode(['success' => false, 'error' => t('unsupported_type')]);
        exit;
}
if (!$img) {
    echo json_encode(['success' => false, 'error' => t('unknown_error')]);
    exit;
}

// Sauvegarder en webp
if (!imagewebp($img, $targetFile, 90)) {
    echo json_encode(['success' => false, 'error' => t('upload_error')]);
    imagedestroy($img);
    exit;
}
imagedestroy($img);

// Retourner le nom du fichier webp
echo json_encode(['success' => true, 'filename' => basename($targetFile)]);
