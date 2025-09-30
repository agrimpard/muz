<?php
/**
 * API pour préparer une playlist en copiant les fichiers MP3 vers un dossier spécifié
 */

// Inclure les fichiers nécessaires
require_once __DIR__ . '/../config/boot_i18n.php';
require_once __DIR__ . '/../config/Config.php';
$config = Config::getInstance();

// Vérifier la méthode de requête
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.1 405 Method Not Allowed');
    header('Content-Type: application/json');
    exit(json_encode(['success' => false, 'message' => t('method_not_allowed')]));
}

// Récupérer les données
$songIds = isset($_POST['songs']) ? $_POST['songs'] : [];

// Récupérer le chemin configuré pour la préparation de playlist
$folderPath = $config->getSection('playlist')['prep'];

// Valider les données
if (empty($songIds) || empty($folderPath)) {
    header('Content-Type: application/json');
    exit(json_encode(['success' => false, 'message' => t('missing_params_or_bad_config')]));
}

// Charger le fichier de base de données JSON
$dbFile = __DIR__ . '/../data/songs.json';
if (!file_exists($dbFile)) {
    header('Content-Type: application/json');
    exit(json_encode(['success' => false, 'message' => t('database_not_found') ]));
}

$songs = json_decode(file_get_contents($dbFile), true);

// Récupérer les chemins de base des fichiers audio (maintenant c'est un tableau)
$musicPaths = $config->getSection('music')['path'];

// S'assurer que c'est un tableau, même si un seul chemin est défini
if (!is_array($musicPaths)) {
    $musicPaths = [$musicPaths];
}

// Préparer le dossier de destination
if (!file_exists($folderPath)) {
    if (!mkdir($folderPath, 0777, true)) {
        header('Content-Type: application/json');
        exit(json_encode(['success' => false, 'message' => t('cannot_create_destination_dir')]));
    }
}

// Copier les fichiers
$copiedFiles = 0;
$errors = [];

foreach ($songIds as $songId) {
    if (isset($songs[$songId])) {
        $song = $songs[$songId];
        $found = false;
        
        // Rechercher le fichier dans tous les chemins configurés
        foreach ($musicPaths as $musicPath) {
            $sourceFile = $musicPath . '/' . $song['file'];
            
            if (file_exists($sourceFile)) {
                // Générer un nom de fichier propre pour la destination
                $fileName = basename($song['file']);
                $destFile = $folderPath . '/' . $fileName;
                
                // Copier le fichier
                if (copy($sourceFile, $destFile)) {
                    $copiedFiles++;
                    $found = true;
                    break; // Fichier trouvé et copié, passer au suivant
                } else {
                    $errors[] = t('cannot_copy_from_path') . ' ' . $song['artist'] . ' - ' . $song['title'] . ' ' . t('from_path') . ' ' . $musicPath;
                }
            }
        }
        
        // Si le fichier n'a pas été trouvé dans aucun des chemins
        if (!$found) {
            $errors[] = t('file_not_found_all_paths') . ': ' . $song['artist'] . ' - ' . $song['title'];
        }
    }
}

// Générer un nom de dossier basé sur la date et l'heure
$folderName = 'playlist_' . date('Y-m-d_H-i-s');
$playlistFolder = $folderPath . '/' . $folderName;

// Créer le dossier final pour cette playlist spécifique
if (!mkdir($playlistFolder, 0777, true)) {
    header('Content-Type: application/json');
    exit(json_encode([
        'success' => false, 
        'message' => t('cannot_create_specific_playlist_dir')
    ]));
}

// Déplacer tous les fichiers copiés dans ce nouveau dossier
$filesMoved = 0;
$moveErrors = [];
$filesInTempDir = scandir($folderPath);
foreach ($filesInTempDir as $file) {
    if ($file != '.' && $file != '..' && pathinfo($file, PATHINFO_EXTENSION) == 'mp3') {
        $sourceFile = $folderPath . '/' . $file;
        $destFile = $playlistFolder . '/' . $file;
        
        if (rename($sourceFile, $destFile)) {
            $filesMoved++;
        } else {
            $moveErrors[] = t('cannot_move_to_final_dir') . ' ' . $file;
        }
    }
}

// Retourner le résultat
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'copied' => $copiedFiles,
    'total' => count($songIds),
    'moved' => $filesMoved,
    'folderName' => $folderName,
    'basePath' => $folderPath,
    'errors' => array_merge($errors, $moveErrors),
    'message' => t('operation_completed') . ' ' . $copiedFiles . ' ' . t('files_copied_out_of') . ' ' . count($songIds) . '.'
]);