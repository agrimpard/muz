<?php
require_once __DIR__ . '/../controllers/MuzController.php';

// Instancier le contrôleur et appeler la méthode appropriée
$controller = new MuzController();
$controller->renamePlaylist();
?>