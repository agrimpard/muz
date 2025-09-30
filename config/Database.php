<?php
/**
 * Classe Database - Gère la connexion à la base de données
 */
class Database {
    private static $instance = null;
    private $connection = null;
    
    /**
     * Constructeur privé (pattern Singleton)
     * Etablit la connexion à la base de données SQLite
     */
    private function __construct() {
        // Charger l'i18n afin d'utiliser t() même côté config/CLI
        require_once __DIR__ . '/boot_i18n.php';
        require_once __DIR__ . '/Config.php';
        $config = Config::getInstance();
        // Section [db] optionnelle en mode SQLite
        $dbConfig = $config->getSection('db');
        // Chemin SQLite configurable (db.path) sinon défaut sur db/muz.sqlite
        $sqlitePath = null;
        if (is_array($dbConfig) && isset($dbConfig['path']) && !empty($dbConfig['path'])) {
            $sqlitePath = $dbConfig['path'];
        } else {
            $sqlitePath = __DIR__ . '/../db/muz.sqlite';
        }
        
        try {
            // SQLite : fichier db/muz.sqlite
            $dbPath = $sqlitePath;
            // S'assurer que le dossier existe
            $dbDir = dirname($dbPath);
            if (!is_dir($dbDir)) {
                @mkdir($dbDir, 0777, true);
            }
            $dsn = "sqlite:" . $dbPath;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ];
            
            $this->connection = new PDO($dsn, null, null, $options);
            
            // Activer les clés étrangères
            $this->connection->exec('PRAGMA foreign_keys = ON');
        } catch (PDOException $e) {
            die(t('db_connection_error') . ' ' . $e->getMessage());
        }
    }
    
    /**
     * Récupère l'instance unique de la base de données
     * 
     * @return Database Instance de la base de données
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Récupère la connexion PDO
     * 
     * @return PDO Objet de connexion PDO
     */
    public function getConnection() {
        return $this->connection;
    }
    
    /**
     * Exécute une requête SQL préparée
     * 
     * @param string $sql Requête SQL
     * @param array $params Paramètres de la requête
     * @return PDOStatement Résultat de la requête
     */
    public function query($sql, $params = []) {
        $stmt = $this->connection->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }
    
    /**
     * Récupère une seule ligne de résultat
     * 
     * @param string $sql Requête SQL
     * @param array $params Paramètres de la requête
     * @return array|false Une ligne de résultat ou false si aucun résultat
     */
    public function fetchOne($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetch();
    }
    
    /**
     * Récupère toutes les lignes de résultat
     * 
     * @param string $sql Requête SQL
     * @param array $params Paramètres de la requête
     * @return array Tableau de résultats
     */
    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll();
    }
    
    /**
     * Récupère le dernier ID inséré
     * 
     * @return string Le dernier ID inséré
     */
    public function lastInsertId() {
        return $this->connection->lastInsertId();
    }
}