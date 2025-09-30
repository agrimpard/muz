<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * Classe Tag - Modèle pour gérer les tags
 */
class Tag {
    private $id;
    private $name;
    private $created_at;
    private $db;
    
    /**
     * Constructeur
     */
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Charge un tag depuis la base de données
     * 
     * @param int $id ID du tag
     * @return bool True si le tag a été trouvé, False sinon
     */
    public function load($id) {
        $sql = "SELECT * FROM tags WHERE id = ?";
        $tag = $this->db->fetchOne($sql, [$id]);
        
        if ($tag) {
            $this->id = $tag['id'];
            $this->name = $tag['name'];
            $this->created_at = $tag['created_at'];
            return true;
        }
        
        return false;
    }
    
    /**
     * Charge un tag par son nom
     * 
     * @param string $name Nom du tag
     * @return bool True si le tag a été trouvé, False sinon
     */
    public function loadByName($name) {
        $sql = "SELECT * FROM tags WHERE name = ?";
        $tag = $this->db->fetchOne($sql, [$name]);
        
        if ($tag) {
            $this->id = $tag['id'];
            $this->name = $tag['name'];
            $this->created_at = $tag['created_at'];
            return true;
        }
        
        return false;
    }
    
    /**
     * Crée un nouveau tag
     * 
     * @param string $name Nom du tag
     * @return int ID du tag créé
     */
    public function create($name) {
        $sql = "INSERT INTO tags (name) VALUES (?)";
        $this->db->query($sql, [$name]);
        
        $id = $this->db->lastInsertId();
        $this->load($id);
        
        return $id;
    }
    
    /**
     * Met à jour le tag
     * 
     * @return bool True si la mise à jour a réussi
     */
    public function update() {
        if (!$this->id) {
            return false;
        }
        
        $sql = "UPDATE tags SET name = ? WHERE id = ?";
        $this->db->query($sql, [$this->name, $this->id]);
        
        return true;
    }
    
    /**
     * Trouve un tag par son nom ou le crée s'il n'existe pas
     * 
     * @param string $name Nom du tag
     * @return int ID du tag
     */
    public function findOrCreate($name) {
        // Chercher le tag
        if ($this->loadByName($name)) {
            return $this->id;
        }
        
        // Créer le tag s'il n'existe pas
        return $this->create($name);
    }
    
    /**
     * Récupère les chansons associées à ce tag
     * 
     * @return array Tableau des chansons
     */
    public function getSongs() {
        if (!$this->id) {
            return [];
        }
        
        $sql = "SELECT s.* 
                FROM songs s
                JOIN song_tags st ON s.id = st.song_id
                WHERE st.tag_id = ?
                ORDER BY s.artist, s.title";
        
        return $this->db->fetchAll($sql, [$this->id]);
    }
    
    /**
     * Récupère tous les tags
     * 
     * @return array Tableau de tags
     */
    public static function getAll() {
        $db = Database::getInstance();
        
        try {
            // Récupérer uniquement les tags qui sont associés à au moins une chanson
            $sql = "SELECT DISTINCT t.* FROM tags t 
                    JOIN song_tags st ON t.id = st.tag_id 
                    ORDER BY t.name";
            
            return $db->fetchAll($sql);
        } catch (Exception $e) {
            error_log("Erreur lors de la récupération des tags : " . $e->getMessage());
            // En cas d'erreur, retourner un tableau vide
            return [];
        }
    }
    
    /**
     * Récupère les tags populaires (avec le nombre de chansons)
     * 
     * @param int $limit Limite de résultats (optionnel)
     * @return array Tableau de tags avec statistiques
     */
    public static function getPopular($limit = null) {
        $db = Database::getInstance();
        
        $sql = "SELECT t.*, COUNT(st.song_id) as song_count 
                FROM tags t
                JOIN song_tags st ON t.id = st.tag_id
                GROUP BY t.id
                ORDER BY song_count DESC";
        
        if ($limit !== null) {
            $sql .= " LIMIT " . intval($limit);
        }
        
        return $db->fetchAll($sql);
    }
    
    /**
     * Nettoie les tags orphelins (non associés à des chansons)
     * 
     * @return int Nombre de tags supprimés
     */
    public static function cleanOrphanTags() {
        $db = Database::getInstance();
        
        try {
            // Vérifier d'abord si la table song_tags existe et n'est pas vide
            $checkSql = "SELECT COUNT(*) FROM song_tags";
            $count = $db->fetchOne($checkSql);
            
            if (!$count || $count === 0) {
                return 0; // Pas de tags à nettoyer si song_tags est vide
            }
            
            // Requête pour trouver les tags non associés à des chansons
            $sql = "DELETE FROM tags 
                    WHERE id NOT IN (
                        SELECT DISTINCT tag_id FROM song_tags
                    )";
            
            $stmt = $db->query($sql);
            return $stmt->rowCount();
        } catch (Exception $e) {
            error_log("Erreur lors du nettoyage des tags orphelins : " . $e->getMessage());
            return 0;
        }
    }
    
    // Getters
    public function getId() { return $this->id; }
    public function getName() { return $this->name; }
    public function getCreatedAt() { return $this->created_at; }
    
    // Setters
    public function setName($name) { $this->name = $name; }
}