<?php
/**
 * API pour préparer une playlist en copiant les fichiers MP3 vers un dossier spécifié
 * Utilise la base de données MySQL pour récupérer les informations des playlists et des chansons
 */

// Empêcher l'affichage des avertissements et erreurs PHP dans la sortie
// Les journaliser dans les logs à la place
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);

// Assurer que nous n'avons aucune sortie avant d'envoyer l'en-tête JSON
ob_start();

// Inclure les fichiers nécessaires avec gestion d'erreurs explicite
try {
    $configPath = dirname(__DIR__, 2) . '/config/Config.php';
    
    // Vérifier si le fichier existe avant de l'inclure
    if (!file_exists($configPath)) {
        error_log("Fichier Config.php introuvable: " . $configPath);
        header('Content-Type: application/json');
        exit(json_encode(['success' => false, 'message' => 'Configuration système introuvable']));
    }
    
    require_once $configPath;
    $config = Config::getInstance();
    
    if (!$config) {
        error_log("Échec de l'initialisation de Config::getInstance()");
        header('Content-Type: application/json');
        exit(json_encode(['success' => false, 'message' => 'Échec de l\'initialisation de la configuration']));
    }
    
    error_log("Configuration chargée avec succès");
    
    // Connexion à la base de données
    $dbConfig = $config->getSection('db');
    if (!$dbConfig) {
        error_log("Configuration de base de données manquante");
        header('Content-Type: application/json');
        exit(json_encode(['success' => false, 'message' => 'Configuration de base de données manquante']));
    }
    
    try {
        $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['database']};charset=utf8mb4";
        $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        error_log("Connexion à la base de données établie avec succès");
    } catch (PDOException $e) {
        error_log("Erreur de connexion à la base de données: " . $e->getMessage());
        header('Content-Type: application/json');
        exit(json_encode(['success' => false, 'message' => 'Erreur de connexion à la base de données: ' . $e->getMessage()]));
    }
} catch (Error $e) {
    error_log("Erreur lors du chargement de la configuration: " . $e->getMessage());
    header('Content-Type: application/json');
    exit(json_encode([
        'success' => false, 
        'message' => 'Erreur lors du chargement de la configuration: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]));
} catch (Exception $e) {
    error_log("Exception lors du chargement de la configuration: " . $e->getMessage());
    header('Content-Type: application/json');
    exit(json_encode([
        'success' => false, 
        'message' => 'Exception lors du chargement de la configuration: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]));
}

// Vérifier la méthode de requête
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.1 405 Method Not Allowed');
    exit(json_encode(['success' => false, 'message' => 'Méthode non autorisée']));
}

// Récupérer les données
$songIds = isset($_POST['songs']) ? $_POST['songs'] : [];
$playlistId = null;

// Récupérer l'ID de playlist depuis POST
if (isset($_POST['playlist_id']) && !empty($_POST['playlist_id'])) {
    $playlistId = (int)$_POST['playlist_id'];
} else if (isset($_GET['playlist']) && !empty($_GET['playlist'])) {
    // Fallback sur GET si nécessaire
    $playlistId = (int)$_GET['playlist'];
}

// Journaliser les informations de la requête
error_log("Préparation de playlist - PlaylistID: " . ($playlistId ?? 'non spécifié') . ", Nombre de chansons explicites: " . count($songIds));

// Si un ID de playlist est fourni, récupérer les chansons de cette playlist depuis la base de données
if ($playlistId) {
    error_log("Récupération des chansons pour la playlist ID: " . $playlistId);
    try {
        // Récupérer les chansons de la playlist - avec la note
        $stmt = $pdo->prepare("
            SELECT s.id, s.title, s.artist, s.filename as file, s.rating
            FROM songs s
            JOIN playlist_songs ps ON s.id = ps.song_id
            WHERE ps.playlist_id = :playlist_id
            ORDER BY ps.position
        ");
        $stmt->execute(['playlist_id' => $playlistId]);
        $playlistSongs = $stmt->fetchAll();
        
        if (!empty($playlistSongs)) {
            error_log("Chansons récupérées pour la playlist: " . count($playlistSongs));
            
            // Convertir les chansons de la playlist en format compatible
            $songs = [];
            foreach ($playlistSongs as $song) {
                $songs[$song['id']] = $song;
            }
            
            // Si aucun ID de chanson spécifique n'est fourni, utiliser toutes les chansons de la playlist
            if (empty($songIds)) {
                $songIds = array_column($playlistSongs, 'id');
                error_log("Utilisation de toutes les chansons de la playlist: " . count($songIds));
            }
        } else {
            error_log("Aucune chanson trouvée pour la playlist ID: " . $playlistId);
            $songs = [];
        }
    } catch (PDOException $e) {
        error_log("Erreur lors de la récupération des chansons de la playlist: " . $e->getMessage());
        header('Content-Type: application/json');
        exit(json_encode(['success' => false, 'message' => 'Erreur lors de la récupération des chansons de la playlist: ' . $e->getMessage()]));
    }
}
// Si des IDs de chanson sont spécifiés mais pas de playlist, récupérer les informations des chansons individuelles
else if (!empty($songIds)) {
    error_log("Récupération des informations pour les chansons spécifiées: " . implode(', ', $songIds));
    try {
        // Créer des placeholders pour l'IN clause
        $placeholders = rtrim(str_repeat('?,', count($songIds)), ',');
        
        // Récupérer les chansons spécifiées - avec la note
        $stmt = $pdo->prepare("
            SELECT id, title, artist, filename as file, rating
            FROM songs
            WHERE id IN ($placeholders)
        ");
        $stmt->execute($songIds);
        $songResults = $stmt->fetchAll();
        
        // Convertir en format compatible
        $songs = [];
        foreach ($songResults as $song) {
            $songs[$song['id']] = $song;
        }
        
        error_log("Chansons récupérées individuellement: " . count($songs));
    } catch (PDOException $e) {
        error_log("Erreur lors de la récupération des informations des chansons: " . $e->getMessage());
        header('Content-Type: application/json');
        exit(json_encode(['success' => false, 'message' => 'Erreur lors de la récupération des informations des chansons: ' . $e->getMessage()]));
    }
} else {
    error_log("Aucun ID de playlist ou de chanson spécifié");
    header('Content-Type: application/json');
    exit(json_encode(['success' => false, 'message' => 'Veuillez spécifier un ID de playlist ou une liste de chansons']));
}

// Récupérer le chemin configuré pour la préparation de playlist
$playlistConfig = $config->getSection('playlist');
if (!$playlistConfig || !isset($playlistConfig['prep'])) {
    error_log("Configuration de playlist manquante ou incomplète");
    header('Content-Type: application/json');
    exit(json_encode(['success' => false, 'message' => 'Configuration de playlist manquante ou incomplète']));
}

$folderPath = $playlistConfig['prep'];

// Normaliser le chemin (remplacer / par \ sur Windows)
$folderPath = rtrim(str_replace('/', DIRECTORY_SEPARATOR, $folderPath), DIRECTORY_SEPARATOR);
error_log("Chemin de destination normalisé: " . $folderPath);

// Vérifier que le chemin est absolu
if (!preg_match('/^[A-Z]:/i', $folderPath)) { // Vérifier si c'est un chemin Windows avec lettre de lecteur
    error_log("Le chemin n'est pas absolu, tentative d'ajustement");
    // Essayer d'ajuster en chemin absolu si nécessaire
    $folderPath = dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . $folderPath;
    error_log("Chemin ajusté: " . $folderPath);
}

// Journaliser la configuration pour le débogage
error_log("Configuration de la playlist - dossier prep: " . $folderPath);

// Valider les données - le chemin de destination est obligatoire
// mais les songIds peuvent être vides si la playlist est vide
if (empty($folderPath)) {
    header('Content-Type: application/json');
    exit(json_encode(['success' => false, 'message' => 'Configuration du dossier de destination incorrecte']));
}

// Vérifier si nous avons au moins un ID de playlist ou des ID de chansons
if (empty($songIds) && empty($playlistId)) {
    header('Content-Type: application/json');
    exit(json_encode(['success' => false, 'message' => 'Veuillez spécifier un ID de playlist ou une liste de chansons']));
}

// Vérification des données récupérées
if (empty($songs)) {
    error_log("Aucune chanson trouvée dans la base de données");
    // Nous continuons l'exécution pour créer au moins un dossier vide avec README
}

// Récupérer le chemin de base des fichiers audio
$musicConfig = $config->getSection('music');
if (!$musicConfig || !isset($musicConfig['path'])) {
    error_log("Configuration du chemin musical manquante");
    header('Content-Type: application/json');
    exit(json_encode(['success' => false, 'message' => 'Configuration du chemin musical manquante']));
}

$musicBasePath = $musicConfig['path'];
error_log("Configuration musicale - chemin: " . (is_array($musicBasePath) ? implode(", ", $musicBasePath) : $musicBasePath));

// Créer un sous-dossier daté pour cette préparation de playlist
// Utiliser un nom sécurisé sans caractères spéciaux
$dateFolderName = 'playlist_' . date('Y-m-d_H-i-s');
// Assainir le nom du dossier pour éviter les problèmes
$dateFolderName = preg_replace('/[^a-zA-Z0-9_\-]/', '', $dateFolderName);
$playlistDestFolder = $folderPath . DIRECTORY_SEPARATOR . $dateFolderName;

// Préparer le dossier de destination
error_log("Préparation de la playlist - Chemin du dossier parent: " . $folderPath);
error_log("Chemin du sous-dossier pour cette playlist: " . $playlistDestFolder);

// Vérifier si le dossier parent existe
if (!file_exists($folderPath)) {
    error_log("Le dossier parent n'existe pas, tentative de création");
    try {
        if (!mkdir($folderPath, 0777, true)) {
            $error = error_get_last();
            error_log("Échec de la création du dossier parent: " . ($error ? $error['message'] : "Erreur inconnue"));
            header('Content-Type: application/json');
            exit(json_encode(['success' => false, 'message' => 'Impossible de créer le dossier parent: ' . ($error ? $error['message'] : "Erreur inconnue")]));
        }
        error_log("Dossier parent créé avec succès");
    } catch (Exception $e) {
        error_log("Exception lors de la création du dossier parent: " . $e->getMessage());
        header('Content-Type: application/json');
        exit(json_encode(['success' => false, 'message' => 'Exception lors de la création du dossier parent: ' . $e->getMessage()]));
    }
}

// Créer le sous-dossier pour cette playlist
try {
    error_log("Tentative de création du sous-dossier: " . $playlistDestFolder);
    if (!mkdir($playlistDestFolder, 0777, true)) {
        $error = error_get_last();
        error_log("Échec de la création du sous-dossier: " . ($error ? $error['message'] : "Erreur inconnue"));
        header('Content-Type: application/json');
        exit(json_encode(['success' => false, 'message' => 'Impossible de créer le sous-dossier de destination: ' . ($error ? $error['message'] : "Erreur inconnue")]));
    }
    error_log("Sous-dossier créé avec succès");
    
    // Mettre à jour le chemin de destination
    $folderPath = $playlistDestFolder;
} catch (Exception $e) {
    error_log("Exception lors de la création du sous-dossier: " . $e->getMessage());
    header('Content-Type: application/json');
    exit(json_encode(['success' => false, 'message' => 'Exception lors de la création du sous-dossier: ' . $e->getMessage()]));
}

// Utiliser getID3 préalablement installé dans le dossier lib
$getID3Path = dirname(__DIR__, 2) . '/lib/getid3/getid3.php';

// Fonction pour vérifier que getID3 est disponible
function ensureGetID3Installed($path) {
    if (!file_exists($path)) {
        error_log("Bibliothèque getID3 non trouvée à l'emplacement: " . $path);
        return false;
    }
    error_log("Bibliothèque getID3 trouvée à l'emplacement: " . $path);
    return true;
}

// Les fonctions recursiveCopy et recursiveDelete ont été supprimées car elles ne sont plus nécessaires

// Fonction pour manipuler les tags ID3 d'un fichier MP3
function updateID3Tags($filePath, $artist, $title, $rating = 0) {
    error_log("Mise à jour des tags ID3 pour : $filePath (Artist: $artist, Title: $title, Rating: $rating)");
    
    // Inclure les fichiers nécessaires de getID3 - avant toute vérification de classe
    $libPath = dirname(__DIR__, 2) . '/lib/getid3';
    require_once $libPath . '/getid3.php';
    require_once $libPath . '/write.php';
    
    // Vérifier si la classe est maintenant disponible
    if (!class_exists('getid3_writetags')) {
        error_log("Classe getid3_writetags toujours non disponible après inclusion des fichiers");
        error_log("Fichiers inclus: " . $libPath . '/getid3.php et ' . $libPath . '/write.php');
        return false;
    }
    
    try {
        // Initialiser getID3
        $getID3 = new getID3;
        $getID3->setOption(array('encoding' => 'UTF-8'));
        
        // Préparer l'objet d'écriture
        $tagwriter = new getid3_writetags;
        $tagwriter->filename = $filePath;
        $tagwriter->tagformats = array('id3v1', 'id3v2.3'); // Ajouter id3v1 pour plus de compatibilité
        
        // Options importantes pour l'écriture des tags
        $tagwriter->overwrite_tags = true;       // Écraser les tags existants
        $tagwriter->remove_other_tags = true;    // Supprimer les autres formats de tags
        $tagwriter->tag_encoding = 'UTF-8';      // Utiliser l'encodage UTF-8
        
        // Convertir la notation en texte pour le commentaire
        $ratingText = '';
        if ($rating > 0) {
            $ratingText = str_repeat('★', $rating) . str_repeat('☆', 5 - $rating);
        }
        
        // Préparer les données des tags
        $tagData = array(
            'title'   => array($title),
            'artist'  => array($artist)
        );
        
        // Ajouter la notation si disponible
        if ($rating > 0) {
            // Convertir la notation sur 5 en valeur de 0 à 255 pour la compatibilité
            $ratingValue = min(255, $rating * 51);  // 5 étoiles = 255, 1 étoile = 51
            
            // Ajouter le champ rating selon l'exemple d'internet
            $tagData['rating'] = array(
                array(
                    'value' => $ratingValue
                )
            );
            
            // Ajouter également le champ POPM qui est standard pour les notations
            $tagData['POPM'] = array(
                array(
                    'email' => 'rating@muzplayer.app',
                    'rating' => $ratingValue
                )
            );
            
            // Ajouter également un commentaire texte pour les lecteurs qui ne supportent pas les ratings
            $tagData['comment'] = array("Note: $rating/5 $ratingText");
        }
        
        $tagwriter->tag_data = $tagData;
        
        // Journalisation des données de tags avant écriture
        if ($rating > 0) {
            error_log("Tentative d'écriture des tags de notation - Rating: $rating/5, Text: $ratingText");
            error_log("Données de tags préparées: " . print_r($tagData, true));
        }
        
        // Écrire les tags avec plus de journalisation
        error_log("Tentative d'écriture des tags ID3 pour le fichier: " . $filePath);
        if ($tagwriter->WriteTags()) {
            error_log("Tags ID3 mis à jour avec succès pour : $filePath");
            
            // Vérifier s'il y a des avertissements
            if (!empty($tagwriter->warnings)) {
                error_log("Avertissements lors de l'écriture des tags ID3: " . implode(", ", $tagwriter->warnings));
            }
            
            // Vérification de l'écriture des tags
            try {
                $getID3 = new getID3();
                $fileInfo = $getID3->analyze($filePath);
                
                error_log("Vérification des tags après écriture - structure complète: " . print_r($fileInfo['tags'] ?? [], true));
                
                // Vérifier les tags de rating et popularimeter
                if (isset($fileInfo['tags']['id3v2']['rating'])) {
                    error_log("Rating ID3v2 écrit: " . print_r($fileInfo['tags']['id3v2']['rating'], true));
                }
                if (isset($fileInfo['tags']['id3v2']['popularimeter'])) {
                    error_log("Popularimeter ID3v2 écrit: " . print_r($fileInfo['tags']['id3v2']['popularimeter'], true));
                }
                if (isset($fileInfo['id3v2']['POPM'])) {
                    error_log("POPM ID3v2 détecté: " . print_r($fileInfo['id3v2']['POPM'], true));
                }
                if (isset($fileInfo['tags']['id3v2']['comment'])) {
                    error_log("Commentaire ID3v2 écrit: " . implode(", ", $fileInfo['tags']['id3v2']['comment']));
                }
                
                // Vérifier également les informations brutes
                if (isset($fileInfo['id3v2'])) {
                    foreach ($fileInfo['id3v2'] as $frameID => $frameData) {
                        if (strpos($frameID, 'POPM') !== false || strpos($frameID, 'rating') !== false) {
                            error_log("Frame ID3v2 trouvée - $frameID: " . print_r($frameData, true));
                        }
                    }
                }
            } catch (Exception $e) {
                error_log("Exception lors de la vérification des tags: " . $e->getMessage());
            }
            
            return true;
        } else {
            $errors = $tagwriter->errors;
            error_log("Erreurs lors de l'écriture des tags ID3: " . implode(", ", $errors));
            return false;
        }
    } catch (Exception $e) {
        error_log("Exception lors de la manipulation des tags ID3: " . $e->getMessage());
        return false;
    }
    
    return false;
}

// Fonction alternative pour appliquer directement un tag POPM (popularimètre) 
// Cette fonction est utilisée si la méthode standard échoue
function applyRatingTagDirectly($filePath, $rating) {
    if ($rating <= 0) {
        return false;
    }
    
    // Convertir la notation sur 5 en valeur de 0 à 255
    $ratingValue = min(255, $rating * 51);
    
    error_log("Tentative d'application directe d'un tag de notation POPM: $ratingValue sur 255");
    
    // Méthode 1: Utiliser l'outil en ligne de commande id3v2 si disponible
    if (function_exists('exec')) {
        $safeFilePath = escapeshellarg($filePath);
        
        // Appliquer le POPM (popularimètre)
        $cmd = "id3v2 --POPM \"rating@muzplayer.app:$ratingValue:0\" $safeFilePath 2>&1";
        error_log("Exécution de la commande: $cmd");
        
        exec($cmd, $output, $returnVar);
        if ($returnVar === 0) {
            error_log("Tag POPM appliqué avec succès via id3v2");
            return true;
        } else {
            error_log("Échec de l'application du tag POPM via id3v2: " . implode("\n", $output));
        }
    }
    
    // Méthode 2: Écriture directe dans le fichier (plus complexe, non implémentée ici)
    
    return false;
}

// Vérifier que getID3 est disponible
$getID3Available = ensureGetID3Installed($getID3Path);
if (!$getID3Available) {
    error_log("Impossible de trouver getID3, la manipulation des tags ID3 sera ignorée");
} else {
    error_log("getID3 est disponible à l'emplacement: " . $getID3Path);
    // Tester l'inclusion explicite pour diagnostiquer d'éventuels problèmes
    try {
        require_once $getID3Path;
        error_log("Fichier getid3.php inclus avec succès");
        
        $writePhpPath = dirname($getID3Path) . '/write.php';
        if (file_exists($writePhpPath)) {
            require_once $writePhpPath;
            error_log("Fichier write.php inclus avec succès");
            
            if (class_exists('getid3_writetags')) {
                error_log("La classe getid3_writetags est disponible");
            } else {
                error_log("ERREUR: La classe getid3_writetags n'est pas définie dans write.php");
            }
        } else {
            error_log("ERREUR: Fichier write.php introuvable à l'emplacement: " . $writePhpPath);
        }
    } catch (Exception $e) {
        error_log("Exception lors de l'inclusion des fichiers getID3: " . $e->getMessage());
        $getID3Available = false;
    }
}

// Copier les fichiers
$copiedFiles = 0;
$errors = [];

error_log("Début de la copie des fichiers. Nombre de chansons: " . count($songIds));
error_log("Chemin source: " . (is_array($musicBasePath) ? implode(", ", $musicBasePath) : $musicBasePath));
error_log("Chemin destination: " . $folderPath);

// Parcourir les chansons à copier
if (empty($songs)) {
    error_log("Aucune chanson trouvée dans la base de données pour cette playlist ou ces IDs");
}

// Si nous avons des IDs de chanson spécifiques, les utiliser, sinon utiliser toutes les chansons récupérées
$songsToProcess = !empty($songIds) ? $songIds : array_keys($songs);

foreach ($songsToProcess as $songId) {
    error_log("Traitement de la chanson ID: " . $songId);
    
    // Vérifier si l'ID de chanson est valide et existe dans le tableau songs
    if (!empty($songs) && isset($songs[$songId])) {
        $song = $songs[$songId];
        
        // Gérer les chemins multiples pour la musique
        $sourceFile = null;
        $paths = is_array($musicBasePath) ? $musicBasePath : [$musicBasePath];
        
        foreach ($paths as $path) {
            $tempSourceFile = $path . '/' . $song['file'];
            if (file_exists($tempSourceFile)) {
                $sourceFile = $tempSourceFile;
                break;
            }
        }
        
        // Si aucun fichier n'a été trouvé, utiliser le premier chemin pour l'affichage d'erreur
        if ($sourceFile === null) {
            $sourceFile = (is_array($musicBasePath) ? reset($musicBasePath) : $musicBasePath) . '/' . $song['file'];
        }
        
        error_log("Chemin du fichier source: " . $sourceFile);
        
        if (file_exists($sourceFile)) {
            // Générer un nom de fichier propre pour la destination
            $fileName = basename($song['file']);
            $destFile = $folderPath . '/' . $fileName;
            error_log("Chemin du fichier destination: " . $destFile);
            
            // Copier le fichier
            try {
                // Normaliser le chemin de destination
                $destFile = str_replace('/', DIRECTORY_SEPARATOR, $destFile);
                
                error_log("Tentative de copie - de: {$sourceFile} à: {$destFile}");
                
                // Vérifier si le fichier de destination existe déjà
                if (file_exists($destFile)) {
                    error_log("Le fichier de destination existe déjà. Tentative de remplacement.");
                    
                    // Tenter de supprimer le fichier existant si nécessaire
                    if (!is_writable($destFile)) {
                        error_log("Le fichier de destination n'est pas accessible en écriture.");
                        @chmod($destFile, 0666); // Tenter de changer les permissions
                    }
                }
                
                // Copier avec gestion explicite des erreurs
                $result = @copy($sourceFile, $destFile);
                if ($result) {
                    $copiedFiles++;
                    error_log("Fichier copié avec succès: " . $fileName);
                    
                    // Maintenant, mettre à jour les tags ID3 si getID3 est disponible
                    if ($getID3Available) {
                        // Récupérer les informations nécessaires pour les tags
                        $artist = $song['artist'];
                        $title = $song['title'];
                        $rating = isset($song['rating']) ? (int)$song['rating'] : 0;
                        
                        error_log("Tentative de mise à jour des tags ID3 pour {$artist} - {$title} (Note: {$rating}/5)");
                        error_log("Chemin complet du fichier à mettre à jour: {$destFile}");
                        
                        // Vérifier que le fichier existe et est accessible en écriture
                        if (!file_exists($destFile)) {
                            error_log("ERREUR: Le fichier {$destFile} n'existe pas pour la mise à jour des tags");
                        } elseif (!is_writable($destFile)) {
                            error_log("ERREUR: Le fichier {$destFile} n'est pas accessible en écriture");
                            // Tenter de modifier les permissions
                            @chmod($destFile, 0666);
                            error_log("Tentative de modification des permissions effectuée");
                        }
                        
                        // Mettre à jour les tags ID3
                        $tagUpdateResult = updateID3Tags($destFile, $artist, $title, $rating);
                        
                        if (!$tagUpdateResult) {
                            error_log("Échec de la mise à jour des tags ID3 pour {$fileName}, mais le fichier a été copié");
                            
                            if ($rating > 0) {
                                // Essayer d'appliquer directement les tags de notation
                                if (applyRatingTagDirectly($destFile, $rating)) {
                                    error_log("Tags de notation appliqués avec succès via la méthode alternative");
                                } else {
                                    error_log("Toutes les méthodes d'application de notation ont échoué");
                                }
                            }
                        } else {
                            error_log("Tags ID3 mis à jour avec succès pour {$fileName}");
                        }
                    } else {
                        error_log("Mise à jour des tags ID3 ignorée car getID3 n'est pas disponible");
                    }
                } else {
                    $copyError = error_get_last();
                    $errorMsg = "Impossible de copier {$song['artist']} - {$song['title']}: " . 
                               ($copyError ? $copyError['message'] : "Erreur inconnue") . 
                               " (Source: $sourceFile, Destination: $destFile)";
                    error_log($errorMsg);
                    $errors[] = $errorMsg;
                }
            } catch (Exception $e) {
                $errorMsg = "Exception lors de la copie de {$song['artist']} - {$song['title']}: " . $e->getMessage();
                error_log($errorMsg);
                $errors[] = $errorMsg;
            }
        } else {
            // Afficher un message d'erreur plus approprié pour les chemins multiples
            if (is_array($musicBasePath)) {
                $errorMsg = "Fichier introuvable: {$song['artist']} - {$song['title']} (fichier: {$song['file']}, cherché dans " . count($musicBasePath) . " répertoires)";
            } else {
                $errorMsg = "Fichier introuvable: {$song['artist']} - {$song['title']} (chemin: $sourceFile)";
            }
            error_log($errorMsg);
            $errors[] = $errorMsg;
        }
    } else {
        error_log("Chanson avec ID $songId introuvable dans la base de données");
        $errors[] = "Chanson avec ID $songId introuvable dans la base de données";
    }
}

// Créer un message de réussite plus informatif avec le chemin de la playlist
$shortPath = basename($folderPath); // Juste le nom du dossier pour l'affichage

// Traitement spécial si nous n'avons pas de chansons à copier
if (empty($songs) || count($songIds) === 0) {
    error_log("Aucune chanson à copier : la playlist est vide ou les IDs de chanson ne correspondent à aucune entrée.");
}

// Compter les chansons non trouvées dans la base
$missingSongs = 0;
foreach ($errors as $error) {
    if (strpos($error, 'introuvable dans la base') !== false) {
        $missingSongs++;
    }
}

// Compter les fichiers MP3 non trouvés
$missingFiles = 0;
foreach ($errors as $error) {
    if (strpos($error, 'Fichier introuvable') !== false) {
        $missingFiles++;
    }
}

// Déterminer le message approprié
$message = "";
if ($copiedFiles > 0) {
    // Des fichiers ont été copiés avec succès
    $message = "Opération terminée. $copiedFiles fichiers sur " . count($songsToProcess) . " ont été copiés vers '$shortPath'.";
    
    if ($missingFiles > 0) {
        $message .= " $missingFiles fichiers MP3 n'ont pas été trouvés à l'emplacement spécifié.";
    }
} else if (empty($songs)) {
    // Base de données vide ou playlist vide
    $message = $playlistId 
        ? "Aucune chanson trouvée pour la playlist ID $playlistId. Un dossier vide a été créé." 
        : "Aucune chanson trouvée. Un dossier vide a été créé.";
} else if ($missingSongs > 0 && $missingSongs == count($songsToProcess)) {
    // Toutes les chansons sont introuvables dans la base
    $message = "Aucune des chansons demandées n'a été trouvée dans la base de données.";
} else if ($missingFiles > 0 && $missingFiles == count($songsToProcess)) {
    // Tous les fichiers MP3 sont introuvables
    if (is_array($musicBasePath)) {
        $message = "Aucun des fichiers MP3 n'a été trouvé dans les répertoires configurés. Vérifiez que les fichiers existent dans les dossiers configurés.";
    } else {
        $message = "Aucun des fichiers MP3 n'a été trouvé à l'emplacement spécifié. Vérifiez que les fichiers existent dans le dossier configuré.";
    }
} else {
    // Autres cas d'erreur
    $message = "Aucun fichier n'a pu être copié. Vérifiez les permissions et les chemins.";
}

// Récupérer le nom de la playlist si disponible
$playlistName = null;
if ($playlistId) {
    try {
        $stmtPlaylist = $pdo->prepare("SELECT name FROM playlists WHERE id = :id");
        $stmtPlaylist->execute(['id' => $playlistId]);
        $playlistName = $stmtPlaylist->fetchColumn();
    } catch (Exception $e) {
        error_log("Impossible de récupérer le nom de la playlist: " . $e->getMessage());
    }
}

// Retourner le résultat
$response = [
    'success' => $copiedFiles > 0,
    'copied' => $copiedFiles,
    'total' => count($songsToProcess),
    'errors' => $errors,
    'folderPath' => $folderPath,
    'folderName' => $shortPath,
    'basePath' => $playlistConfig['prep'], // Ajout du chemin de base configuré
    'emptyPlaylist' => empty($songs),
    'missingSongs' => $missingSongs,
    'missingFiles' => $missingFiles,
    'playlistId' => $playlistId,
    'playlistName' => $playlistName,
    'id3Updated' => $getID3Available,
    'message' => $message
];

error_log("Réponse: " . json_encode($response));

// Nettoyer toute sortie mise en tampon avant d'envoyer la réponse JSON
ob_end_clean();

header('Content-Type: application/json');
echo json_encode($response);