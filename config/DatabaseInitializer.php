<?php
require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/boot_i18n.php';
require_once __DIR__ . '/../models/Song.php';
require_once __DIR__ . '/../models/Tag.php';
/**
 * Classe DatabaseInitializer - Vérifie et initialise la structure de la base de données
 */
class DatabaseInitializer {
    private $db = null;
    private $config = null;
    private $dbConfig = null;
    private $messages = [];
    
    /**
     * Constructeur
     */
    public function __construct() {
        // Récupérer la configuration
        $this->config = Config::getInstance();
        // En mode SQLite, la section [db] est optionnelle
        $this->dbConfig = $this->config->getSection('db') ?? [];
        
        // Tenter de se connecter à la base de données (SQLite)
        try {
            $this->db = Database::getInstance()->getConnection();
        } catch (PDOException $e) {
            $this->addMessage(t('db_connection_error') . ' ' . $e->getMessage(), 'error');
        }
    }
    
    /**
     * Vérifie si les tables existent et les crée si nécessaire
     * 
     * @return bool Vrai si l'initialisation s'est bien passée
     */
    public function initialize() {
        try {
            // Si pas de connexion à la base de données, abandon
            if ($this->db === null) {
                return false;
            }
            
            // Vérifier si les tables existent
            $created = false;
            if (!$this->tablesExist()) {
                $this->addMessage(t('db_init_creating_tables'), 'info');
                // Créer les tables
                $this->createTables();
                $created = true;
            } else {
                $this->addMessage(t('db_init_all_tables_exist'), 'success');
            }

            // Import automatique des MP3 depuis les répertoires configurés
            $imported = Song::importFromDirectory();
            $this->addMessage($imported . ' ' . t('db_init_mp3_imported'), $imported > 0 ? 'success' : 'info');

            // Nettoyage des tags orphelins
            $deletedTags = Tag::cleanOrphanTags();
            if ($deletedTags > 0) {
                $this->addMessage($deletedTags . ' ' . t('db_init_orphan_tags_deleted'), 'info');
            }

            return $created || true;
        } catch (Exception $e) {
            $this->addMessage(t('db_init_error') . ' ' . $e->getMessage(), 'error');
            return false;
        }
    }
    
    /**
     * Tente de créer la base de données
     * 
     * @return bool Vrai si la création a réussi
     */
    private function createDatabase() {
        // En SQLite, la création se fait en ouvrant le fichier; rien à faire ici
        return $this->db !== null;
    }
    
    /**
     * Vérifie si les tables principales existent
     * 
     * @return bool Vrai si les tables existent
     */
    private function tablesExist() {
        try {
            // Liste des tables requises
            $requiredTables = ['songs', 'tags', 'song_tags', 'playlists', 'playlist_songs'];
            
            // Obtenir la liste des tables en SQLite via sqlite_master
            $tables = [];
            $stmt = $this->db->query("SELECT name FROM sqlite_master WHERE type='table'");
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $tables[] = $row['name'];
            }
            
            // Vérifier si toutes les tables requises existent
            foreach ($requiredTables as $table) {
                if (!in_array($table, $tables)) {
                    $this->addMessage(t('db_missing_table') . ': ' . $table, 'info');
                    return false;
                }
            }
            
            return true;
        } catch (PDOException $e) {
            $this->addMessage("Erreur lors de la vérification des tables : " . $e->getMessage(), 'error');
            return false;
        }
    }
    
    /**
     * Crée les tables de la base de données
     * 
     * @return bool Vrai si les tables ont été créées avec succès
     */
    private function createTables() {
        try {
            // Schéma SQLite inline (les fichiers SQL ne sont pas présents ici)
            $schema = [
                "CREATE TABLE IF NOT EXISTS songs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL UNIQUE,
                    artist TEXT NOT NULL,
                    title TEXT NOT NULL,
                    rating INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
                "CREATE TABLE IF NOT EXISTS tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE
                )",
                "CREATE TABLE IF NOT EXISTS song_tags (
                    song_id INTEGER NOT NULL,
                    tag_id INTEGER NOT NULL,
                    PRIMARY KEY (song_id, tag_id),
                    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                )",
                "CREATE TABLE IF NOT EXISTS playlists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
                "CREATE TABLE IF NOT EXISTS playlist_songs (
                    playlist_id INTEGER NOT NULL,
                    song_id INTEGER NOT NULL,
                    position INTEGER,
                    PRIMARY KEY (playlist_id, song_id),
                    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
                    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
                )"
            ];
            
            foreach ($schema as $sql) {
                $this->db->exec($sql);
            }
            
            $this->addMessage(t('db_init_tables_created_success'), 'success');
            return true;
        } catch (Exception $e) {
            $this->addMessage(t('db_init_create_tables_error') . ' ' . $e->getMessage(), 'error');
            throw $e;
        }
    }
    
    /**
     * Ajoute un message à la liste des messages
     * 
     * @param string $message Le message à ajouter
     * @param string $type Type de message (info, success, warning, error)
     */
    private function addMessage($message, $type = 'info') {
        $this->messages[] = [
            'message' => $message,
            'type' => $type
        ];
        
        // Logger le message
        error_log("[DatabaseInitializer] [$type] $message");
    }
    
    /**
     * Récupère tous les messages générés
     * 
     * @return array Liste des messages
     */
    public function getMessages() {
        return $this->messages;
    }
    
    /**
     * Affiche les messages formatés en HTML
     * 
     * @return string Messages formatés en HTML
     */
    public function displayMessages() {
        $output = '<div class="database-init-messages">';
        
        foreach ($this->messages as $msg) {
            $class = 'info';
            switch ($msg['type']) {
                case 'success': $class = 'success'; break;
                case 'warning': $class = 'warning'; break;
                case 'error': $class = 'danger'; break;
            }
            
            $output .= '<div class="alert alert-' . $class . '">' . htmlspecialchars($msg['message']) . '</div>';
        }
        
        $output .= '</div>';
        return $output;
    }
}

// Si le script est exécuté en ligne de commande, lancer l'initialisation
if (php_sapi_name() === 'cli' && basename($_SERVER['SCRIPT_FILENAME']) === basename(__FILE__)) {
    echo t('cli_db_init_start') . "\n";
    
    $initializer = new DatabaseInitializer();
    $result = $initializer->initialize();
    
    $messages = $initializer->getMessages();
    foreach ($messages as $msg) {
        echo "[{$msg['type']}] {$msg['message']}\n";
    }
    
    echo "\n";
    echo $result ? t('cli_db_init_success') : t('cli_db_init_failed');
    echo "\n";
    
    exit($result ? 0 : 1);
}