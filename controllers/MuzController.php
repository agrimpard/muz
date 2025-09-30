<?php
require_once __DIR__ . '/../config/Config.php';
require_once __DIR__ . '/../models/Song.php';
require_once __DIR__ . '/../models/Tag.php';
require_once __DIR__ . '/../models/Playlist.php';

/**
 * Classe MuzController - Contrôleur principal de l'application
 */
class MuzController {
    private $config;
    
    /**
     * Constructeur
     */
    public function __construct() {
        $this->config = Config::getInstance();
        // Démarrer un buffer de sortie au plus tôt pour capturer tout echo/whitespace/BOM accidentel
        if (!ob_get_level()) {
            @ob_start();
        }
    }
    
    /**
     * Page d'accueil
     */
    public function home() {
        // Gestion du changement de langue via ?setlang=<code_langue>
        if (isset($_GET['setlang'])) {
            // Normaliser le code langue (remplacer '-' par '_')
            $newLang = str_replace('-', '_', trim($_GET['setlang']));

            // Construire dynamiquement la liste des langues disponibles depuis /lang/*.php
            $langDir = __DIR__ . '/../lang';
            $availableLangs = [];
            if (is_dir($langDir)) {
                foreach (glob($langDir . '/*.php') as $file) {
                    $code = basename($file, '.php');
                    $availableLangs[$code] = true;
                }
            }

            // Si la langue demandée existe, la persister dans conf.ini
            if (isset($availableLangs[$newLang])) {
                // Modifier le fichier de config pour persister le choix
                $confPath = dirname(__DIR__, 1) . '/conf.ini';
                if (file_exists($confPath)) {
                    $ini = file_get_contents($confPath);
                    // Remplacer lang = <value> dans la section [app]
                    if (preg_match('/^\[app\].*?^\s*lang\s*=\s*\S+/msi', $ini)) {
                        $ini = preg_replace('/(^\[app\].*?^\s*)lang\s*=\s*\S+/msi', '${1}lang = ' . $newLang, $ini);
                    } else {
                        // Ajouter après [app] si absent
                        $ini = preg_replace('/(^\[app\][^\[]*)/ms', '$1lang = ' . $newLang . "\n", $ini);
                    }
                    file_put_contents($confPath, $ini);
                }
                // Rediriger pour enlever le paramètre de l'URL
                header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
                exit;
            }
        }
        
        try {
            // Importer automatiquement les nouveaux MP3 à chaque chargement
            $importCount = Song::importFromDirectory();
            
            // Nettoyer les tags orphelins après l'importation
            $deletedTagsCount = Tag::cleanOrphanTags();
            
            // Filtres (rating géré en JS/localStorage, seul artist reste en URL)
            $artist = isset($_GET['artist']) ? $_GET['artist'] : null;
            $playlistId = isset($_GET['playlist']) ? intval($_GET['playlist']) : null;
            $sortType = isset($_GET['sort']) ? $_GET['sort'] : 'alpha'; // alpha, recent ou random
            
            // Note : Le filtrage par tags est maintenant géré côté client via JavaScript + localStorage
            
            // Récupérer les chansons (avec filtres éventuels)
            $songs = [];
            
            if ($playlistId) {
                // Si une playlist est sélectionnée, récupérer ses chansons
                $playlist = new Playlist();
                if ($playlist->load($playlistId)) {
                    $songs = $playlist->getSongs();
                    // Si un filtre artiste est appliqué, filtrer les résultats de la playlist
                    if ($artist !== null) {
                        $songs = array_filter($songs, function($song) use ($artist) {
                            return $song['artist'] === $artist;
                        });
                    }
                }
            } else {
                // Récupérer toutes les chansons (tags + rating filtrés en JS)
                $songs = Song::getAll(null, null, $artist, $sortType);
            }
            
            // Récupérer tous les tags actifs (s'assurer que c'est un tableau)
            $tags = Tag::getAll();
            if (!is_array($tags)) {
                $tags = [];
            }
            
            // Récupérer la liste des artistes distincts (s'assurer que c'est un tableau)
            $artists = Song::getAllArtists();
            if (!is_array($artists)) {
                $artists = [];
            }
            
            // Récupérer toutes les playlists
            $playlists = Playlist::getAll();
            if (!is_array($playlists)) {
                $playlists = [];
            }
        } catch (Exception $e) {
            // En cas d'erreur, logger l'exception et initialiser des tableaux vides
            error_log("Erreur sur la page d'accueil : " . $e->getMessage());
            $songs = [];
            $tags = [];
            $artists = [];
            $playlists = [];
        }
        
        // Charger la langue AVANT la vue
        $langCode = str_replace('-', '_', $this->config->get('app.lang', 'fr'));
        $langFile = __DIR__ . '/../lang/' . $langCode . '.php';
        
        if (file_exists($langFile)) {
            $lang = require $langFile;
        } else {
            $lang = require __DIR__ . '/../lang/fr.php';
        }
        
        // File safety: s'assurer que $lang est bien un tableau
        if (!is_array($lang)) {
            $lang = require __DIR__ . '/../lang/fr.php';
        }
        
        // IMPORTANT: Mettre $lang dans la portée globale pour que t() y accède
        $GLOBALS['lang'] = $lang;
        
        // Définir la fonction t() globalement
        if (!function_exists('t')) {
            function t($key) {
                // Utiliser $GLOBALS au lieu de global $lang
                $lang = $GLOBALS['lang'] ?? [];
                if (is_array($lang) && array_key_exists($key, $lang)) {
                    return $lang[$key];
                }
                // Fallback unique vers FR si la clé manque
                static $fallback = null;
                if ($fallback === null) {
                    $fallbackFile = dirname(__DIR__) . '/lang/fr.php';
                    if (file_exists($fallbackFile)) {
                        $fallback = include $fallbackFile;
                        if (!is_array($fallback)) {
                            $fallback = [];
                        }
                    } else {
                        $fallback = [];
                    }
                }
                return array_key_exists($key, $fallback) ? $fallback[$key] : $key;
            }
        }
        
        // Charger la vue
        include __DIR__ . '/../views/home.php';
    }
    
    /**
     * Initialisation de la base de données
     */
    public function initDb() {
        // Lire les fichiers SQL
        $sqlFiles = [
            __DIR__ . '/../config/database.sql',
            __DIR__ . '/../config/playlists.sql'
        ];
        
        $db = Database::getInstance();
        $pdo = $db->getConnection();
        $message = "";
        
        foreach ($sqlFiles as $sqlFile) {
            if (file_exists($sqlFile)) {
                $sql = file_get_contents($sqlFile);
                
                try {
                    $pdo->exec($sql);
                    $message .= "Fichier SQL " . basename($sqlFile) . " exécuté avec succès.<br>";
                } catch (PDOException $e) {
                    $message .= "Erreur lors de l'exécution de " . basename($sqlFile) . " : " . $e->getMessage() . "<br>";
                }
            } else {
                $message .= "Le fichier SQL " . basename($sqlFile) . " est introuvable.<br>";
            }
        }
        
        // Importer les MP3
        $count = Song::importFromDirectory();
        $message .= "<br>" . $count . " fichiers MP3 importés.";
        
        echo $message;
    }
    
    /**
     * API: Définir une note pour un MP3
     */
    public function setRating() {
        // Vérifier la méthode de requête
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => t('method_not_allowed')], 405);
            return;
        }
        
        // Récupérer et valider les paramètres
        $songId = isset($_POST['song_id']) ? intval($_POST['song_id']) : 0;
        $rating = isset($_POST['rating']) ? intval($_POST['rating']) : 0;
        
        if ($songId <= 0 || $rating < 1 || $rating > 5) {
            $this->jsonResponse(['error' => t('invalid_params')], 400);
            return;
        }
        
        // Mettre à jour la note
        $song = new Song();
        if (!$song->load($songId)) {
            $this->jsonResponse(['error' => t('song_not_found')], 404);
            return;
        }
        
        if ($song->setRating($rating)) {
            $this->jsonResponse(['success' => true, 'message' => t('rating_updated')]);
        } else {
            $this->jsonResponse(['error' => t('rating_update_error')], 500);
        }
    }
    
    /**
     * API: Ajouter un tag à un MP3
     */
    public function addTag() {
        // Vérifier la méthode de requête
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => t('method_not_allowed')], 405);
            return;
        }
        
        // Récupérer et valider les paramètres
        $songId = isset($_POST['song_id']) ? intval($_POST['song_id']) : 0;
        $tagName = isset($_POST['tag_name']) ? trim($_POST['tag_name']) : '';
        
        if ($songId <= 0 || empty($tagName)) {
            $this->jsonResponse(['error' => t('invalid_params')], 400);
            return;
        }
        
        // Charger la chanson
        $song = new Song();
        if (!$song->load($songId)) {
            $this->jsonResponse(['error' => t('song_not_found')], 404);
            return;
        }
        
        // Créer ou récupérer le tag
        $tag = new Tag();
        $tagId = $tag->findOrCreate($tagName);
        
        // Ajouter le tag à la chanson
        if ($song->addTag($tagId)) {
            $this->jsonResponse([
                'success' => true, 
                'message' => t('tag_added'),
                'tag' => [
                    'id' => $tag->getId(),
                    'name' => $tag->getName()
                ]
            ]);
        } else {
            $this->jsonResponse(['error' => t('add_tag_error')], 500);
        }
    }
    
    /**
     * API: Supprimer un tag d'un MP3
     */
    public function removeTag() {
        // Vérifier la méthode de requête
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => t('method_not_allowed')], 405);
            return;
        }
        
        // Récupérer et valider les paramètres
        $songId = isset($_POST['song_id']) ? intval($_POST['song_id']) : 0;
        $tagId = isset($_POST['tag_id']) ? intval($_POST['tag_id']) : 0;
        
        if ($songId <= 0 || $tagId <= 0) {
            $this->jsonResponse(['error' => t('invalid_params')], 400);
            return;
        }
        
        // Charger la chanson
        $song = new Song();
        if (!$song->load($songId)) {
            $this->jsonResponse(['error' => t('song_not_found')], 404);
            return;
        }
        
        // Supprimer le tag de la chanson
        if ($song->removeTag($tagId)) {
            $this->jsonResponse(['success' => true, 'message' => t('tag_removed')]);
        } else {
            $this->jsonResponse(['error' => t('remove_tag_error')], 500);
        }
    }
    
    /**
     * API: Renommer un MP3
     */
    public function renameSong() {
        // Vérifier la méthode de requête
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => t('method_not_allowed')], 405);
            return;
        }
        
        // Récupérer et valider les paramètres
        $songId = isset($_POST['song_id']) ? intval($_POST['song_id']) : 0;
        $artist = isset($_POST['artist']) ? trim($_POST['artist']) : '';
        $title = isset($_POST['title']) ? trim($_POST['title']) : '';
        
        if ($songId <= 0 || empty($artist) || empty($title)) {
            $this->jsonResponse(['error' => t('invalid_params')], 400);
            return;
        }
        
        // Charger la chanson
        $song = new Song();
        if (!$song->load($songId)) {
            $this->jsonResponse(['error' => t('song_not_found')], 404);
            return;
        }
        
        // Renommer la chanson
        if ($song->rename($artist, $title)) {
            $this->jsonResponse([
                'success' => true, 
                'message' => t('song_renamed'),
                'song' => [
                    'id' => $song->getId(),
                    'artist' => $song->getArtist(),
                    'title' => $song->getTitle(),
                    'filename' => $song->getFilename()
                ]
            ]);
        } else {
            $this->jsonResponse(['error' => t('rename_song_error')], 500);
        }
    }
    
    /**
     * API: Créer une nouvelle playlist
     */
    public function createPlaylist() {
        // Vérifier la méthode de requête
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => t('method_not_allowed')], 405);
            return;
        }
        
        // Récupérer et valider les paramètres
        $name = isset($_POST['name']) ? trim($_POST['name']) : '';
        $description = isset($_POST['description']) ? trim($_POST['description']) : '';
        
        if (empty($name)) {
            $this->jsonResponse(['error' => t('playlist_name_required')], 400);
            return;
        }
        
        // Créer la playlist
        $playlist = new Playlist();
        $playlistId = $playlist->create($name, $description);
        
        if ($playlistId) {
            $this->jsonResponse([
                'success' => true,
                'message' => t('playlist_created'),
                'playlist' => [
                    'id' => $playlistId,
                    'name' => $name,
                    'description' => $description
                ]
            ]);
        } else {
            $this->jsonResponse(['error' => t('create_playlist_error')], 500);
        }
    }
    
    /**
     * API: Ajouter une chanson à une playlist
     */
    public function addSongToPlaylist() {
        // Vérifier la méthode de requête
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => t('method_not_allowed')], 405);
            return;
        }
        
        // Récupérer et valider les paramètres
        $playlistId = isset($_POST['playlist_id']) ? intval($_POST['playlist_id']) : 0;
        $songId = isset($_POST['song_id']) ? intval($_POST['song_id']) : 0;
        $position = isset($_POST['position']) ? intval($_POST['position']) : null;
        
        if ($playlistId <= 0 || $songId <= 0) {
            $this->jsonResponse(['error' => t('invalid_params')], 400);
            return;
        }
        
        // Ajouter la chanson à la playlist
        $playlist = new Playlist();
        if (!$playlist->load($playlistId)) {
            $this->jsonResponse(['error' => t('playlist_not_found')], 404);
            return;
        }
        
        if ($playlist->addSong($songId, $position)) {
            // Récupérer les informations sur la chanson
            $song = new Song();
            $song->load($songId);
            
            $this->jsonResponse([
                'success' => true,
                'message' => t('song_added_to_playlist'),
                'song' => [
                    'id' => $song->getId(),
                    'title' => $song->getTitle(),
                    'artist' => $song->getArtist()
                ]
            ]);
        } else {
            $this->jsonResponse(['error' => t('add_song_to_playlist_error')], 500);
        }
    }
    
    /**
     * API: Supprimer une chanson d'une playlist
     */
    public function removeSongFromPlaylist() {
        // Vérifier la méthode de requête
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => t('method_not_allowed')], 405);
            return;
        }
        
        // Récupérer et valider les paramètres
        $playlistId = isset($_POST['playlist_id']) ? intval($_POST['playlist_id']) : 0;
        $songId = isset($_POST['song_id']) ? intval($_POST['song_id']) : 0;
        
        if ($playlistId <= 0 || $songId <= 0) {
            $this->jsonResponse(['error' => t('invalid_params')], 400);
            return;
        }
        
        // Supprimer la chanson de la playlist
        $playlist = new Playlist();
        if (!$playlist->load($playlistId)) {
            $this->jsonResponse(['error' => t('playlist_not_found')], 404);
            return;
        }
        
        if ($playlist->removeSong($songId)) {
            $this->jsonResponse(['success' => true, 'message' => t('song_removed_from_playlist')]);
        } else {
            $this->jsonResponse(['error' => t('remove_song_from_playlist_error')], 500);
        }
    }
    
    /**
     * API: Supprimer une playlist
     */
    public function deletePlaylist() {
        // Vérifier la méthode de requête
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => t('method_not_allowed')], 405);
            return;
        }
        
        // Récupérer et valider les paramètres
        $playlistId = isset($_POST['playlist_id']) ? intval($_POST['playlist_id']) : 0;
        
        if ($playlistId <= 0) {
            $this->jsonResponse(['error' => t('invalid_params')], 400);
            return;
        }
        
        // Supprimer la playlist
        $playlist = new Playlist();
        if (!$playlist->load($playlistId)) {
            $this->jsonResponse(['error' => t('playlist_not_found')], 404);
            return;
        }
        
        if ($playlist->delete()) {
            $this->jsonResponse(['success' => true, 'message' => t('playlist_deleted')]);
        } else {
            $this->jsonResponse(['error' => t('delete_playlist_error')], 500);
        }
    }
    
    /**
     * API: Renommer une playlist
     */
    public function renamePlaylist() {
        // Vérifier la méthode de requête
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => t('method_not_allowed')], 405);
            return;
        }
        
        // Récupérer et valider les paramètres
        $playlistId = isset($_POST['playlist_id']) ? intval($_POST['playlist_id']) : 0;
        $name = isset($_POST['name']) ? trim($_POST['name']) : '';
        
        if ($playlistId <= 0 || empty($name)) {
            $this->jsonResponse(['error' => t('invalid_params')], 400);
            return;
        }
        
        // Charger la playlist
        $playlist = new Playlist();
        if (!$playlist->load($playlistId)) {
            $this->jsonResponse(['error' => t('playlist_not_found')], 404);
            return;
        }
        
        // Mettre à jour le nom
        $playlist->setName($name);
        
        if ($playlist->update()) {
            $this->jsonResponse([
                'success' => true,
                'message' => t('playlist_renamed'),
                'playlist' => [
                    'id' => $playlist->getId(),
                    'name' => $playlist->getName()
                ]
            ]);
        } else {
            $this->jsonResponse(['error' => t('rename_playlist_error')], 500);
        }
    }
    
    /**
     * API: Dupliquer une playlist
     */
    public function duplicatePlaylist() {
        // Vérifier la méthode de requête
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => t('method_not_allowed')], 405);
            return;
        }
        
        // Récupérer et valider les paramètres
        $playlistId = isset($_POST['playlist_id']) ? intval($_POST['playlist_id']) : 0;
        $name = isset($_POST['name']) ? trim($_POST['name']) : '';
        
        if ($playlistId <= 0 || empty($name)) {
            $this->jsonResponse(['error' => t('invalid_params')], 400);
            return;
        }
        
        // Charger la playlist d'origine
        $sourcePlaylist = new Playlist();
        if (!$sourcePlaylist->load($playlistId)) {
            $this->jsonResponse(['error' => t('source_playlist_not_found')], 404);
            return;
        }
        
        // Récupérer les chansons de la playlist source
        $songs = $sourcePlaylist->getSongs();
        
        // Créer une nouvelle playlist
        $newPlaylist = new Playlist();
        $newPlaylistId = $newPlaylist->create($name, 'Copie de: ' . $sourcePlaylist->getName());
        
        if (!$newPlaylistId) {
            $this->jsonResponse(['error' => t('create_new_playlist_error')], 500);
            return;
        }
        
        // Ajouter les chansons à la nouvelle playlist
        $success = true;
        foreach ($songs as $index => $song) {
            $position = $index + 1;
            if (!$newPlaylist->addSong($song['id'], $position)) {
                $success = false;
            }
        }
        
        if ($success) {
            $this->jsonResponse([
                'success' => true,
                'message' => t('playlist_duplicated_success'),
                'playlist_id' => $newPlaylistId
            ]);
        } else {
            $this->jsonResponse([
                'success' => true,
                'message' => t('playlist_duplicated_partial'),
                'playlist_id' => $newPlaylistId
            ]);
        }
    }
    
    /**
     * API: Récupérer les playlists contenant une chanson spécifique
     */
    public function getSongPlaylists() {
        // Vérifier la méthode de requête
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            $this->jsonResponse(['error' => t('method_not_allowed')], 405);
            return;
        }
        
        // Récupérer et valider les paramètres
        $songId = isset($_GET['song_id']) ? intval($_GET['song_id']) : 0;
        
        if ($songId <= 0) {
            $this->jsonResponse(['error' => t('invalid_params')], 400);
            return;
        }
        
        // Obtenir les playlists contenant cette chanson
        $db = Database::getInstance();
        $pdo = $db->getConnection();
        
        $sql = "SELECT playlist_id FROM playlist_songs WHERE song_id = :song_id";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':song_id', $songId, PDO::PARAM_INT);
        $stmt->execute();
        
        $playlistIds = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
        
        $this->jsonResponse([
            'success' => true,
            'playlists' => $playlistIds
        ]);
    }
    
    /**
     * Supprime un MP3 (en base de données et le fichier physique)
     * 
     * @param int $songId ID de la chanson à supprimer
     * @param string|null $filename Nom du fichier (optionnel, si non fourni, sera récupéré depuis la BDD)
     * @return true|string True si succès, message d'erreur sinon
     */
    public function deleteSong($songId, $filename = null) {
        // Charger la chanson
        $song = new Song();
        if (!$song->load($songId)) {
            return "Chanson non trouvée";
        }
        
        // Si le nom de fichier n'est pas fourni, le récupérer depuis l'objet Song
        if ($filename === null) {
            $filename = $song->getFilename();
        }
        
        // Supprimer les références dans les playlists
        $db = Database::getInstance();
        $pdo = $db->getConnection();
        
        try {
            // Supprimer les entrées de playlist_songs
            $sql = "DELETE FROM playlist_songs WHERE song_id = :song_id";
            $stmt = $pdo->prepare($sql);
            $stmt->bindParam(':song_id', $songId, PDO::PARAM_INT);
            $stmt->execute();
            
            // Supprimer les tags associés à la chanson
            $sql = "DELETE FROM song_tags WHERE song_id = :song_id";
            $stmt = $pdo->prepare($sql);
            $stmt->bindParam(':song_id', $songId, PDO::PARAM_INT);
            $stmt->execute();
            
            // Supprimer l'entrée dans la table songs
            $sql = "DELETE FROM songs WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->bindParam(':id', $songId, PDO::PARAM_INT);
            $stmt->execute();
            
            // Supprimer le fichier physique s'il existe
            if (!empty($filename)) {
                $musicPaths = $this->config->getSection('music')['path'];
                
                // S'assurer que c'est un tableau
                if (!is_array($musicPaths)) {
                    $musicPaths = [$musicPaths];
                }
                
                $fileDeleted = false;
                foreach ($musicPaths as $path) {
                    $fullPath = rtrim($path, '/\\') . DIRECTORY_SEPARATOR . basename($filename);
                    if (file_exists($fullPath)) {
                        unlink($fullPath);
                        $fileDeleted = true;
                        break;
                    }
                }
                
                if (!$fileDeleted) {
                    error_log("Fichier MP3 non trouvé : $filename");
                    // Continuer quand même, car l'entrée en base a été supprimée
                }
            }
            
            return true;
        } catch (Exception $e) {
            error_log("Erreur lors de la suppression de la chanson : " . $e->getMessage());
            return "Erreur lors de la suppression : " . $e->getMessage();
        }
    }
    
    /**
     * Envoie une réponse JSON
     * 
     * @param array $data Données à envoyer
     * @param int $statusCode Code HTTP (200 par défaut)
     */
    private function jsonResponse($data, $statusCode = 200) {
        // Nettoyer toute sortie précédente (BOM, espaces, warnings) pour éviter de casser le JSON
        while (ob_get_level() > 0) {
            @ob_end_clean();
        }
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
}