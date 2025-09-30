<?php
require_once __DIR__ . '/../../controllers/MuzController.php';

// Initialiser le contrôleur et exécuter l'action
$controller = new MuzController();
$controller->renameSong();