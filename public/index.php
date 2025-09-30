<?php
/**
 * Point d'entrée principal de l'application
 */

// Activer l'affichage des erreurs en développement
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Inclure les classes nécessaires
require_once dirname(__DIR__, 1) . '/config/boot_i18n.php';
require_once dirname(__DIR__, 1) . '/config/Config.php';
require_once dirname(__DIR__, 1) . '/config/Database.php';
require_once dirname(__DIR__, 1) . '/config/DatabaseInitializer.php';
require_once dirname(__DIR__, 1) . '/config/Router.php';

// Initialiser la base de données si nécessaire
try {
    $dbInitializer = new DatabaseInitializer();
    $result = $dbInitializer->initialize();
    
    if (!$result) {
        error_log(t('db_init_error'));
        // Continuer l'exécution malgré l'erreur pour ne pas bloquer l'application
    }
} catch (Exception $e) {
    error_log(t('db_init_error') . ' ' . $e->getMessage());
    // Continuer l'exécution malgré l'erreur
}

// Démarrer le routage
$router = new Router();
$router->route();