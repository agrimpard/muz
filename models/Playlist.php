<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/Song.php';

/**
 * Classe Playlist - Modèle pour gérer les playlists
 */
class Playlist {
    private $id;
    private $name;
    private $description;
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
     * Charge une playlist depuis la base de données
     * 
     * @param int $id ID de la playlist
     * @return bool True si la playlist a été trouvée, False sinon
     */
    public function load($id) {
        $sql = "SELECT * FROM playlists WHERE id = ?";
        $playlist = $this->db->fetchOne($sql, [$id]);
        
        if ($playlist) {
            $this->id = $playlist['id'];
            $this->name = $playlist['name'];
            $this->description = $playlist['description'];
            $this->created_at = $playlist['created_at'];
            $this->updated_at = $playlist['updated_at'];
            return true;
        }
        
        return false;
    }
    
    /**
     * Crée une nouvelle playlist
     * 
     * @param string $name Nom de la playlist
     * @param string $description Description de la playlist
     * @return int ID de la playlist créée
     */
    public function create($name, $description = '') {
        $sql = "INSERT INTO playlists (name, description) VALUES (?, ?)";
        $this->db->query($sql, [$name, $description]);
        
        $id = $this->db->lastInsertId();
        $this->load($id);
        
        return $id;
    }
    
    /**
     * Met à jour la playlist
     * 
     * @return bool True si la mise à jour a réussi
     */
    public function update() {
        if (!$this->id) {
            return false;
        }
        
        $sql = "UPDATE playlists SET name = ?, description = ? WHERE id = ?";
        $this->db->query($sql, [$this->name, $this->description, $this->id]);
        
        return true;
    }
    
    /**
     * Supprime la playlist
     * 
     * @return bool True si la suppression a réussi
     */
    public function delete() {
        if (!$this->id) {
            return false;
        }
        
        $sql = "DELETE FROM playlists WHERE id = ?";
        $this->db->query($sql, [$this->id]);
        
        return true;
    }
    
    /**
     * Ajoute une chanson à la playlist
     * 
     * @param int $songId ID de la chanson
     * @param int $position Position dans la playlist (optionnel)
     * @return bool True si l'ajout a réussi
     */
    public function addSong($songId, $position = null) {
        if (!$this->id) {
            return false;
        }
        
        // Vérifier si la chanson existe déjà dans la playlist
        $sql = "SELECT * FROM playlist_songs WHERE playlist_id = ? AND song_id = ?";
        $exists = $this->db->fetchOne($sql, [$this->id, $songId]);
        
        if ($exists) {
            return true; // La chanson est déjà dans la playlist
        }
        
        // Déterminer la position si non spécifiée
        if ($position === null) {
            $sql = "SELECT MAX(position) as max_position FROM playlist_songs WHERE playlist_id = ?";
            $result = $this->db->fetchOne($sql, [$this->id]);
            $position = $result && $result['max_position'] ? $result['max_position'] + 1 : 1;
        }
        
        // Ajouter la chanson
        $sql = "INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)";
        $this->db->query($sql, [$this->id, $songId, $position]);
        
        return true;
    }
    
    /**
     * Supprime une chanson de la playlist
     * 
     * @param int $songId ID de la chanson
     * @return bool True si la suppression a réussi
     */
    public function removeSong($songId) {
        if (!$this->id) {
            return false;
        }
        
        $sql = "DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?";
        $this->db->query($sql, [$this->id, $songId]);
        
        // Réorganiser les positions
        $sql = "SELECT song_id, position FROM playlist_songs WHERE playlist_id = ? ORDER BY position";
        $songs = $this->db->fetchAll($sql, [$this->id]);
        
        for ($i = 0; $i < count($songs); $i++) {
            $sql = "UPDATE playlist_songs SET position = ? WHERE playlist_id = ? AND song_id = ?";
            $this->db->query($sql, [$i + 1, $this->id, $songs[$i]['song_id']]);
        }
        
        return true;
    }
    
    /**
     * Récupère toutes les chansons de la playlist
     * 
     * @return array Tableau de chansons
     */
    public function getSongs() {
        if (!$this->id) {
            return [];
        }
        
        $sql = "SELECT s.*, ps.position 
                FROM songs s
                JOIN playlist_songs ps ON s.id = ps.song_id
                WHERE ps.playlist_id = ?
                ORDER BY ps.position";
        
        return $this->db->fetchAll($sql, [$this->id]);
    }
    
    /**
     * Récupère toutes les playlists
     * 
     * @return array Tableau de playlists
     */
    public static function getAll() {
        $db = Database::getInstance();
        $sql = "SELECT * FROM playlists ORDER BY name";
        
        return $db->fetchAll($sql);
    }
    
    // Getters
    public function getId() { return $this->id; }
    public function getName() { return $this->name; }
    public function getDescription() { return $this->description; }
    public function getCreatedAt() { return $this->created_at; }
    public function getUpdatedAt() { return $this->updated_at; }
    
    // Setters
    public function setName($name) { $this->name = $name; }
    public function setDescription($description) { $this->description = $description; }
}