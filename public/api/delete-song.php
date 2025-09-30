<?php
/**
 * API Endpoint pour supprimer un MP3
 */

// Inclure les fichiers nécessaires
require_once __DIR__ . '/../../config/boot_i18n.php';
require_once __DIR__ . '/../../controllers/MuzController.php';

// Initialiser le contrôleur
$controller = new MuzController();

// Vérifier si la requête est en POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => t('method_not_allowed')]);
    exit;
}

// Vérifier si l'ID du MP3 est fourni
if (!isset($_POST['song_id']) || empty($_POST['song_id'])) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => t('missing_song_id')]);
    exit;
}

$songId = (int) $_POST['song_id'];
$filename = isset($_POST['filename']) ? $_POST['filename'] : null;

// Appeler la méthode de suppression du contrôleur
try {
    $result = $controller->deleteSong($songId, $filename);
    
    header('Content-Type: application/json');
    if ($result === true) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => $result]);
    }
} catch (Exception $e) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}