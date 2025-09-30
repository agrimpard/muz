<?php
/**
 * Script pour servir les fichiers musicaux directement depuis le dossier configuré
 */

// Activer l'affichage des erreurs en développement
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Inclure les classes nécessaires
require_once __DIR__ . '/../config/boot_i18n.php';
require_once __DIR__ . '/../config/Config.php';

// Récupérer la configuration
$config = Config::getInstance();
$musicConfig = $config->getSection('music');

if (!$musicConfig || !isset($musicConfig['path'])) {
    http_response_code(500);
    die(t('music_dir_config_not_found'));
}

// Récupérer les chemins (qui peuvent être un tableau ou une chaîne)
$musicPaths = $musicConfig['path'];
if (!is_array($musicPaths)) {
    $musicPaths = [$musicPaths];
}

// Vérifier si le paramètre file est présent
if (!isset($_GET['file']) || empty($_GET['file'])) {
    header('HTTP/1.1 400 Bad Request');
    die(t('missing_file_param'));
}

// Récupérer le nom du fichier
$fileName = $_GET['file'];

// Sécurité: nettoyer le nom de fichier pour empêcher les attaques de traversée de répertoire
$fileName = basename($fileName); // Ne garde que le nom du fichier, sans le chemin
$fileName = str_replace(['..', '/', '\\'], '', $fileName);

// Variable pour stocker le chemin complet du fichier trouvé
$fullPath = null;
$fileFound = false;

// Chercher le fichier dans tous les répertoires configurés
foreach ($musicPaths as $musicDir) {
    $testPath = $musicDir . DIRECTORY_SEPARATOR . $fileName;
    if (file_exists($testPath) && is_file($testPath)) {
        $fullPath = $testPath;
        $fileFound = true;
        break; // Sortir de la boucle dès que le fichier est trouvé
    }
}

// Vérifier si le fichier a été trouvé
if ($fileFound) {
    // Définir le type MIME
    $mimeTypes = [
        'mp3' => 'audio/mpeg',
        'mp4' => 'audio/mp4',
        'ogg' => 'audio/ogg',
        'wav' => 'audio/wav'
    ];
    
    $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    $contentType = isset($mimeTypes[$extension]) ? $mimeTypes[$extension] : 'application/octet-stream';
    
    header("Content-Type: {$contentType}");
    header("Content-Length: " . filesize($fullPath));
    header("Content-Disposition: inline; filename=\"{$fileName}\"");
    header("Accept-Ranges: bytes");
    
    // Envoi du fichier
    readfile($fullPath);
    exit;
} else {
    // Fichier non trouvé
    header('HTTP/1.1 404 Not Found');
    echo t('file_not_found') . ': ' . htmlspecialchars($fileName);
    echo "<br>";
    echo t('searched_path') . ': ' . htmlspecialchars((string)$fullPath);
    exit;
}