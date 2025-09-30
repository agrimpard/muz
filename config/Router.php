<?php
require_once __DIR__ . '/../controllers/MuzController.php';

/**
 * Classe Router - Version simplifiée sans URL rewriting
 */
class Router {
    private $controller;
    
    /**
     * Constructeur
     */
    public function __construct() {
        $this->controller = new MuzController();
    }
    
    /**
     * Route les requêtes vers les bonnes actions du contrôleur
     */
    public function route() {
        // Obtenir le chemin demandé
        $path = $_SERVER['SCRIPT_NAME'];
        $filename = basename($path);
        
        // Router vers l'action appropriée en fonction du fichier appelé
        switch ($filename) {
            // Gérer à la fois les formats avec et sans préfixe "api-"
            case 'api-rating.php':
            case 'set-rating.php':
                $this->controller->setRating();
                break;
                
            case 'api-add-tag.php':
            case 'add-tag.php':
                $this->controller->addTag();
                break;
                
            case 'api-remove-tag.php':
            case 'remove-tag.php':
                $this->controller->removeTag();
                break;
                
            case 'api-rename.php':
            case 'rename-song.php':
                $this->controller->renameSong();
                break;
                
            case 'api-create-playlist.php':
            case 'create-playlist.php':
                $this->controller->createPlaylist();
                break;
                
            case 'api-add-to-playlist.php':
            case 'add-to-playlist.php':
                $this->controller->addSongToPlaylist();
                break;
                
            case 'api-remove-from-playlist.php':
            case 'remove-from-playlist.php':
                $this->controller->removeSongFromPlaylist();
                break;
                
            case 'api-delete-playlist.php':
            case 'delete-playlist.php':
                $this->controller->deletePlaylist();
                break;
                
            case 'api-get-song-playlists.php':
            case 'get-song-playlists.php':
                $this->controller->getSongPlaylists();
                break;
                
            case 'init-db.php':
                $this->controller->initDb();
                break;
                
            default:
                $this->controller->home();
                break;
        }
    }
}