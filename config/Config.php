<?php
/**
 * Fichier de configuration principal
 * Charge les configurations depuis les fichiers INI
 */

require_once __DIR__ . '/boot_i18n.php';

class Config {
    private static $instance = null;
    private $config = [];
    
    private function __construct() {
        // Charger la configuration depuis le fichier unique à la racine
        $confPath = dirname(__DIR__, 1) . '/conf.ini';
        if (file_exists($confPath)) {
            $this->config = parse_ini_file($confPath, true);
        } else {
            die(t('config_conf_not_found'));
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Récupère une valeur de configuration
     * 
     * @param string $key Clé de configuration (ex: "app.name", "db.host")
     * @param mixed $default Valeur par défaut si la clé n'existe pas
     * @return mixed Valeur de configuration
     */
    public function get($key, $default = null) {
        $parts = explode('.', $key);
        
        if (count($parts) < 2) {
            return $default;
        }
        
        $section = $parts[0];
        $name = $parts[1];
        
        if (isset($this->config[$section]) && isset($this->config[$section][$name])) {
            return $this->config[$section][$name];
        }
        
        return $default;
    }
    
    /**
     * Récupère tous les paramètres d'une section
     * 
     * @param string $section Nom de la section
     * @return array|null Paramètres de la section ou null si la section n'existe pas
     */
    public function getSection($section) {
        if (isset($this->config[$section])) {
            return $this->config[$section];
        }
        
        return null;
    }
}