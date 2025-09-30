<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * Classe Song - Modèle pour gérer les chansons (MP3)
 */
class Song {
    private $id;
    private $filename;
    private $artist;
    private $title;
    private $rating;
    private $created_at;
    private $updated_at;
    private $db;
    
    /**
     * Constructeur
     */
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Charge une chanson depuis la base de données
     * 
     * @param int $id ID de la chanson
     * @return bool True si la chanson a été trouvée, False sinon
     */
    public function load($id) {
        $sql = "SELECT * FROM songs WHERE id = ?";
        $song = $this->db->fetchOne($sql, [$id]);
        
        if ($song) {
            $this->id = $song['id'];
            $this->filename = $song['filename'];
            $this->artist = $song['artist'];
            $this->title = $song['title'];
            $this->rating = $song['rating'];
            $this->created_at = $song['created_at'];
            $this->updated_at = $song['updated_at'];
            return true;
        }
        
        return false;
    }
    
    /**
     * Crée une nouvelle chanson
     * 
     * @param string $filename Nom du fichier
     * @param string $artist Nom de l'artiste
     * @param string $title Titre de la chanson
     * @return int ID de la chanson créée
     */
    public function create($filename, $artist, $title) {
        $sql = "INSERT INTO songs (filename, artist, title) VALUES (?, ?, ?)";
        $this->db->query($sql, [$filename, $artist, $title]);
        
        $id = $this->db->lastInsertId();
        $this->load($id);
        
        return $id;
    }
    
    /**
     * Met à jour la chanson
     * 
     * @return bool True si la mise à jour a réussi
     */
    public function update() {
        if (!$this->id) {
            return false;
        }
        
        $sql = "UPDATE songs SET filename = ?, artist = ?, title = ?, rating = ? WHERE id = ?";
        $this->db->query($sql, [$this->filename, $this->artist, $this->title, $this->rating, $this->id]);
        
        return true;
    }
    
    /**
     * Met à jour la note de la chanson
     * 
     * @param int $rating Note (1-5)
     * @return bool True si la mise à jour a réussi
     */
    public function setRating($rating) {
        if (!$this->id || $rating < 1 || $rating > 5) {
            return false;
        }
        
        $this->rating = $rating;
        
        $sql = "UPDATE songs SET rating = ? WHERE id = ?";
        $this->db->query($sql, [$rating, $this->id]);
        
        return true;
    }
    
    /**
     * Renomme la chanson (met à jour l'artiste et le titre)
     * 
     * @param string $artist Nouvel artiste
     * @param string $title Nouveau titre
     * @return bool True si le renommage a réussi
     */
    public function rename($artist, $title) {
        if (!$this->id) {
            return false;
        }
        
        // Charger la configuration
        require_once __DIR__ . '/../config/Config.php';
        $config = Config::getInstance();
        $musicConfig = $config->getSection('music');
        
        // Récupérer les chemins (qui peuvent être un tableau ou une chaîne)
        $musicPaths = $musicConfig['path'];
        if (!is_array($musicPaths)) {
            $musicPaths = [$musicPaths];
        }
        
        // Nouveau nom de fichier
        $newFilename = $artist . ' - ' . $title . '.mp3';
        $fileFound = false;
        
        // Chercher le fichier dans tous les répertoires configurés
        foreach ($musicPaths as $path) {
            $musicDir = $path . '/';
            $oldPath = $musicDir . $this->filename;
            $newPath = $musicDir . $newFilename;
            
            // Si le fichier est trouvé dans ce répertoire
            if (file_exists($oldPath)) {
                // Vérifier que le nouveau nom n'existe pas déjà
                if (!file_exists($newPath)) {
                    if (rename($oldPath, $newPath)) {
                        $fileFound = true;
                        break; // Renommage réussi, sortir de la boucle
                    }
                }
            }
        }
        
        // Si le fichier n'a pas été trouvé ou n'a pas pu être renommé
        if (!$fileFound) {
            return false;
        }
        
        // Mettre à jour les données
        $this->artist = $artist;
        $this->title = $title;
        $this->filename = $newFilename;
        
        // Mettre à jour la base de données
        $sql = "UPDATE songs SET filename = ?, artist = ?, title = ? WHERE id = ?";
        $this->db->query($sql, [$newFilename, $artist, $title, $this->id]);
        
        return true;
    }
    
    /**
     * Récupère tous les tags de la chanson
     * 
     * @return array Tableau des tags
     */
    public function getTags() {
        if (!$this->id) {
            return [];
        }
        
        $sql = "SELECT t.id, t.name 
                FROM tags t
                JOIN song_tags st ON t.id = st.tag_id
                WHERE st.song_id = ?
                ORDER BY t.name";
        
        return $this->db->fetchAll($sql, [$this->id]);
    }
    
    /**
     * Récupère les IDs des playlists contenant cette chanson
     * 
     * @return array Tableau des IDs de playlists
     */
    public function getPlaylistIds() {
        if (!$this->id) {
            return [];
        }
        
        $sql = "SELECT playlist_id 
                FROM playlist_songs
                WHERE song_id = ?
                ORDER BY playlist_id";
        
        $results = $this->db->fetchAll($sql, [$this->id]);
        
        // Retourner uniquement les IDs sous forme de tableau simple
        return array_column($results, 'playlist_id');
    }
    
    /**
     * Ajoute un tag à la chanson
     * 
     * @param int $tagId ID du tag
     * @return bool True si l'ajout a réussi
     */
    public function addTag($tagId) {
        if (!$this->id) {
            return false;
        }
        
        // Vérifier si la relation existe déjà
        $sql = "SELECT * FROM song_tags WHERE song_id = ? AND tag_id = ?";
        $exists = $this->db->fetchOne($sql, [$this->id, $tagId]);
        
        if ($exists) {
            return true; // La relation existe déjà
        }
        
        // Ajouter la relation
        $sql = "INSERT INTO song_tags (song_id, tag_id) VALUES (?, ?)";
        $this->db->query($sql, [$this->id, $tagId]);
        
        return true;
    }
    
    /**
     * Supprime un tag de la chanson
     * 
     * @param int $tagId ID du tag
     * @return bool True si la suppression a réussi
     */
    public function removeTag($tagId) {
        if (!$this->id) {
            return false;
        }
        
        $sql = "DELETE FROM song_tags WHERE song_id = ? AND tag_id = ?";
        $this->db->query($sql, [$this->id, $tagId]);
        
        return true;
    }
    
    /**
     * Récupère toutes les chansons
     * 
     * @param int|null $rating Filtrer par note (optionnel)
     * @param mixed $tagId EXCLURE par tag (peut être null, un entier ou un tableau d'entiers) - LOGIQUE INVERSÉE
     * @param string|null $artist Filtrer par artiste (optionnel)
     * @param string|null $sortType Type de tri: 'alpha' (par défaut), 'recent', 'random'
     * @return array Tableau de chansons
     */
    public static function getAll($rating = null, $tagId = null, $artist = null, $sortType = 'alpha') {
        $db = Database::getInstance();
        $params = [];
        
        // Initialisation de la requête SQL
        $sql = "SELECT DISTINCT s.* FROM songs s";
        $conditions = [];
        
        // LOGIQUE INVERSÉE : Exclure les chansons qui ont les tags spécifiés
        // Si aucun tag n'est spécifié, on montre tout (tous les tags sont actifs)
        // Si des tags sont spécifiés, on EXCLUT les chansons qui ont ces tags
        if ($tagId !== null && !empty($tagId)) {
            // Convertir en tableau si ce n'est pas déjà le cas
            $tagIds = is_array($tagId) ? $tagId : [$tagId];
            
            if (count($tagIds) > 0) {
                // Construire les placeholders pour NOT IN
                $tagPlaceholders = [];
                foreach ($tagIds as $id) {
                    $tagPlaceholders[] = "?";
                    $params[] = $id;
                }
                
                // Exclure les chansons qui ont au moins un des tags désélectionnés
                $conditions[] = "s.id NOT IN (
                    SELECT DISTINCT song_id 
                    FROM song_tags 
                    WHERE tag_id IN (" . implode(", ", $tagPlaceholders) . ")
                )";
                
                error_log("Requête SQL EXCLUANT les tags: " . implode(',', $tagIds));
            }
        }
        
        // Ajouter filtrage par note
        if ($rating !== null) {
            $conditions[] = "s.rating = ?";
            $params[] = $rating;
        }
        
        // Ajouter filtrage par artiste
        if ($artist !== null) {
            $conditions[] = "s.artist = ?";
            $params[] = $artist;
        }
        
        // Ajouter les conditions à la requête
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(" AND ", $conditions);
        }
        
        // Choisir le tri en fonction du paramètre sortType
        switch ($sortType) {
            case 'recent':
                $sql .= " ORDER BY s.created_at DESC";
                break;
            case 'random':
                $sql .= " ORDER BY RANDOM()"; // SQLite utilise RANDOM()
                break;
            case 'alpha':
            default:
                $sql .= " ORDER BY s.artist, s.title";
                break;
        }
        
        error_log("SQL avec tri '$sortType': " . $sql);
        
        return $db->fetchAll($sql, $params);
    }
    
    /**
     * Récupère la liste de tous les artistes avec le nombre de titres pour chacun
     * 
     * @return array Tableau associatif des artistes avec leur nombre de titres
     */
    public static function getAllArtists() {
        $db = Database::getInstance();
        
        // Récupérer les artistes avec le nombre de titres
        $sql = "SELECT artist, COUNT(*) as song_count FROM songs GROUP BY artist ORDER BY artist";
        
        $results = $db->fetchAll($sql);
        $artists = [];
        
        // Extraire les noms d'artistes et le nombre de titres
        foreach ($results as $row) {
            $artists[$row['artist']] = $row['song_count'];
        }
        
        return $artists;
    }
    
    /**
     * Importe tous les fichiers MP3 des répertoires music dans la base de données
     * 
     * @return int Nombre de fichiers importés
     */
    public static function importFromDirectory() {
        $db = Database::getInstance();
        
        // Charger la configuration
        require_once __DIR__ . '/../config/Config.php';
        $config = Config::getInstance();
        $musicConfig = $config->getSection('music');
        
        // Récupérer les chemins (qui peuvent être un tableau ou une chaîne)
        $musicPaths = $musicConfig['path'];
        if (!is_array($musicPaths)) {
            $musicPaths = [$musicPaths];
        }
        
        $count = 0;
        
        // Parcourir tous les répertoires configurés
        foreach ($musicPaths as $path) {
            $musicDir = $path . '/';
            
            // Parcourir tous les fichiers MP3 de ce répertoire
            $files = glob($musicDir . '*.mp3');
            if (!$files) {
                continue; // Passer au répertoire suivant si aucun fichier trouvé
            }
            
            foreach ($files as $file) {
                $filename = basename($file);
                
                // Vérifier si le fichier est déjà dans la base de données
                $sql = "SELECT id FROM songs WHERE filename = ?";
                $existing = $db->fetchOne($sql, [$filename]);
                
                if (!$existing) {
                    // Extraire l'artiste et le titre
                    $parts = explode(' - ', pathinfo($filename, PATHINFO_FILENAME), 2);
                    
                    if (count($parts) == 2) {
                        $artist = $parts[0];
                        $title = $parts[1];
                        
                        // Insérer la chanson
                        $sql = "INSERT INTO songs (filename, artist, title) VALUES (?, ?, ?)";
                        $db->query($sql, [$filename, $artist, $title]);
                        
                        $count++;
                    }
                }
            }
        }
        
        return $count;
    }
    
    // Getters
    public function getId() { return $this->id; }
    public function getFilename() { return $this->filename; }
    public function getArtist() { return $this->artist; }
    public function getTitle() { return $this->title; }
    public function getRating() { return $this->rating; }
    public function getCreatedAt() { return $this->created_at; }
    public function getUpdatedAt() { return $this->updated_at; }
    
    // Setters
    public function setFilename($filename) { $this->filename = $filename; }
    public function setArtist($artist) { $this->artist = $artist; }
    public function setTitle($title) { $this->title = $title; }
}