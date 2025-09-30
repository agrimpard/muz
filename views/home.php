<?php
// La langue ($lang, $langCode) et la fonction t() sont chargées dans le contrôleur
?>
<!DOCTYPE html>
<html lang="<?php echo htmlspecialchars($langCode); ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo t('app_title'); ?></title>
    <link rel="icon" href="img/muz.png" type="image/png"> 
    <link rel="shortcut icon" href="favicon.ico" type="image/x-icon">
    <link rel="manifest" href="m.json" crossorigin="use-credentials">

    

    <!-- Bootstrap -->
    <link rel="stylesheet" href="lib/bootstrap-5.3.6/css/bootstrap.min.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="lib/font-awesome-6.0.0/all.min.css">
    
    <!-- Plyr.io CSS -->
    <link rel="stylesheet" href="lib/plyr/plyr.css">
    
    <!-- Select2 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    
    <!-- Styles personnalisés -->
    <link rel="stylesheet" href="css/muz.css<?php echo '?v=' . time(); ?>">
    <link rel="stylesheet" href="css/muz-tags.css<?php echo '?v=' . time(); ?>">
    <link rel="stylesheet" href="css/plyr-custom.css<?php echo '?v=' . time(); ?>">
    <link rel="stylesheet" href="css/select2-custom.css<?php echo '?v=' . time(); ?>">
    <link rel="stylesheet" href="css/artist-image.css<?php echo '?v=' . time(); ?>">
    <link rel="stylesheet" href="css/sidebar-controls.css<?php echo '?v=' . time(); ?>">
    <link rel="stylesheet" href="css/playlist-actions.css<?php echo '?v=' . time(); ?>">
    <link rel="stylesheet" href="css/muz-search.css<?php echo '?v=' . time(); ?>">
    <link rel="stylesheet" href="css/muz-rating.css<?php echo '?v=' . time(); ?>">
    <link rel="stylesheet" href="css/modal-effect.css<?php echo '?v=' . time(); ?>">
</head>
<body>
    <!-- Écran de chargement -->
    <div id="loading-screen">
        <div class="text-center w-100">
            <img src="img/muz.png" alt="Muz Logo">
            <br>
            <h1><?php echo t('loading'); ?></h1>
        </div>
    </div>
    
    <div class="container-fluid d-flex flex-row">
		
        <!-- Barre latérale (playlists + filtres) -->
        <div class="sidebar">

            <h1 class="text-center sidebar-title fw-bold m-0 p-4"><img src="img/muz.png" class="me-1"><span class="h1-1">M</span><span class="h1-2">U</span><span class="h1-3">Z</span></h1>

            <!-- Playlists -->
            <div class="playlists-section p-4 bg-dark mt-3">
                <button class="btn btn-sm btn-outline-success float-end" id="create-playlist-btn"><i class="fas fa-plus"></i></button>
                <h3 class="fw-bold"><i class="fas fa-list me-2"></i> <?= t('playlists'); ?></h3>
                <div class="playlist-select-container d-flex">
                    <select id="playlist-select" class="form-control mr-2" data-bs-theme="dark">
                        <option value=""><?php echo t('no_playlist'); ?></option>
                        <?php foreach ($playlists as $playlist): ?>
                            <option value="<?php echo $playlist['id']; ?>" <?php echo (isset($_GET['playlist']) && $_GET['playlist'] == $playlist['id']) ? 'selected' : ''; ?> data-name="<?php echo htmlspecialchars($playlist['name']); ?>">
                                <?php echo htmlspecialchars($playlist['name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <!-- Le bouton de suppression a été déplacé dans le songs-container -->
                </div>
                <!-- Liste cachée pour compatibilité JavaScript -->
                <ul id="playlists-list" class="d-none">
                    <?php foreach ($playlists as $playlist): ?>
                        <li data-id="<?php echo $playlist['id']; ?>" data-name="<?php echo htmlspecialchars($playlist['name']); ?>"></li>
                    <?php endforeach; ?>
                </ul>
            </div>

            <!-- Tri -->
            <div class="filters-section p-4 bg-dark mt-3">
                <h3 class="fw-bold"><i class="fas fa-sort me-2"></i> <?php echo t('sort_list'); ?></h3>
                
                <div class="sort-options">
                    <select id="sort-select" class="form-control" data-bs-theme="dark">
                        <option value="alpha" <?php echo (!isset($_GET['sort']) || $_GET['sort'] == 'alpha') ? 'selected' : ''; ?>><?php echo t('alphabetical'); ?></option>
                        <option value="recent" <?php echo (isset($_GET['sort']) && $_GET['sort'] == 'recent') ? 'selected' : ''; ?>><?php echo t('recent'); ?></option>
                        <option value="random" <?php echo (isset($_GET['sort']) && $_GET['sort'] == 'random') ? 'selected' : ''; ?>><?php echo t('random'); ?></option>
                    </select>
                </div>

            </div>

            <!-- Artistes / Groupes -->
            <div class="filters-section p-4 bg-dark mt-3">
                <h3 class="fw-bold"><i class="fas fa-guitar me-2"></i> <?php echo t('artists_groups'); ?></h3>
                <div class="artist-filters mb-1">
                    <select id="artist-select" class="form-control select2-search" data-bs-theme="dark" aria-label="<?= t('filter_by_artist') ?>">
                        <option value=""><?php echo t('all_artists'); ?></option>
                        <?php foreach ($artists as $artistName => $songCount): ?>
                            <option value="<?php echo htmlspecialchars($artistName); ?>" <?php echo (isset($_GET['artist']) && $_GET['artist'] == $artistName) ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($artistName); ?> (<?php echo $songCount; ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <?php
                // Afficher le bouton "Tous les artistes / groupes" uniquement si un artiste/groupe est sélectionné
                $hasArtistFilter = isset($_GET['artist']) && $_GET['artist'] !== '';
                ?>
                <div class="reset-artist-container mt-3" style="display: <?php echo $hasArtistFilter ? 'block' : 'none'; ?>;">
                    <a href="#" class="reset-artist btn btn-sm btn-outline-secondary w-100"><?php echo t('reset_artists'); ?></a>
                </div>
            </div>
            
            <!-- Filtres -->
            <div class="filters-section p-4 bg-dark mt-3">
                <h3 class="fw-bold"><i class="fas fa-filter me-2"></i> <?php echo t('filter_list'); ?></h3>
                <div class="filter-stars mb-1">
                    <select id="rating-select" class="form-control" data-bs-theme="dark">
                        <option value=""><?php echo t('all_ratings'); ?></option>
                        <?php for ($i = 0; $i <= 5; $i++): ?>
                            <option value="<?php echo $i; ?>">
                                <?php echo $i; ?> <?php echo ($i == 1) ? t('star') : t('stars'); ?> 
                                <?php for ($j = 0; $j < $i; $j++): ?>★<?php endfor; ?>
                            </option>
                        <?php endfor; ?>
                    </select>
                </div>
                <div class="tag-filters m-0">
                    <!-- Bouton pour filtrer les morceaux sans tag -->
                    <a href="#" id="filter-untagged" class="filter-tag filter-untagged badge badge-primary me-1 mb-1" data-state="1" data-label="<?php echo t('untagged') ?? 'Sans tag'; ?>">
                        <?php echo t('untagged') ?? 'Sans tag'; ?>
                    </a>
                    <?php foreach ($tags as $tag): ?>
                        <?php 
                        // Le filtrage par tags est géré côté client via localStorage
                        // Tous les tags sont actifs par défaut (badge-primary)
                        // JavaScript se chargera de les mettre à jour selon localStorage
                        ?>
                        <a href="#" class="filter-tag badge badge-primary" 
                            data-id="<?php echo $tag['id']; ?>"
                            data-selected="1"
                            data-label="<?php echo htmlspecialchars($tag['name']); ?>">
                            <?php echo htmlspecialchars($tag['name']); ?>
                        </a>
                    <?php endforeach; ?>
                </div>
                <?php
                // Afficher le bouton "Réinitialiser les filtres" uniquement si une note est choisie ou un tag est désélectionné
                // Le JS gère l'affichage si des tags sont désélectionnés (badge-secondary), donc on laisse le bouton toujours présent
                ?>
                <div class="reset-filters-container mt-3" style="display: none;">
                    <a href="#" class="reset-filters btn btn-sm btn-outline-secondary w-100"><?php echo t('reset_filters'); ?></a>
                </div>
            </div>
            
            <!-- Démarrage à un temps spécifique -->
            <div class="filters-section p-4 bg-dark mt-3">
                <h3 class="fw-bold"><i class="fas fa-clock me-2"></i> <?php echo t('start_specific'); ?></h3>
                <div class="start-time-controls">
                    <div class="d-flex mb-2">
                        <input type="number" class="form-control me-1 flex-fill" id="sidebar-start-minutes" min="0" value="1" placeholder="<?php echo t('minutes') ?? 'Min'; ?>" data-bs-theme="dark">
                        <span class="align-self-center mx-1 flex-fill text-center">:</span>
                        <input type="number" class="form-control ms-1 flex-fill" id="sidebar-start-seconds" min="0" max="59" value="0" placeholder="<?php echo t('seconds') ?? 'Sec'; ?>" data-bs-theme="dark">
                    </div>
                    <div class="d-flex">
                        <button id="sidebar-start-time" class="btn btn-sm btn-outline-primary w-100 me-1"><?php echo t('apply'); ?></button>
                        <button id="sidebar-reset-time" class="btn btn-sm btn-outline-secondary w-100 ms-1"><?php echo t('reset'); ?></button>
                    </div>
                </div>
            </div>
            
            <!-- Sélection du fond du lecteur -->
            <div class="filters-section p-4 bg-dark mt-3">
                <h3 class="fw-bold"><i class="fas fa-image me-2"></i> <?php echo t('player_image'); ?></h3>
                
                <div class="background-options">
                    <select id="background-select" class="form-control" data-bs-theme="dark">
                        <option value="0"><?php echo t('random_image'); ?></option>
                        <?php for ($i = 1; $i <= 18; $i++): ?>
                            <option value="<?php echo $i; ?>"><?= t('image') ?> <?php echo $i; ?></option>
                        <?php endfor; ?>
                    </select>
                </div>
                
                <div class="background-preview mt-2" style="height: 80px; background-size: cover; background-position: center; border-radius: 5px; cursor: pointer;" title="<?= t('click_to_expand') ?>"></div>
            </div>
            
        </div>
            
        <div class="main-content d-flex flex-column">
            <!-- Lecteur audio -->
            <header class="audio-container text-center m-0">
                <!-- Bouton pour afficher/masquer la sidebar -->
                <div class="sidebar-toggle d-flex align-items-center gap-2">
                    <button id="toggle-sidebar" class="btn btn-sm btn-outline-light" title="<?php echo t('toggle_sidebar') ?? 'Afficher/Masquer le panneau latéral'; ?>">
                        <i class="fas fa-bars"></i>
                    </button>
                    <button id="open-db-modal" class="btn btn-sm btn-outline-light" title="<?php echo t('db_management'); ?>" data-bs-toggle="modal" data-bs-target="#dbManagerModal">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>

                <!-- Visualizer canvas overlay (affiché si activé dans conf.ini) -->
                <canvas id="audio-visualizer" style="visibility: hidden;"></canvas>
                <div class="player-m">
                    <span id="prev-song" class="player-bt-prev" title="<?= t('prev_title') ?>"><i class="fas fa-backward-fast"></i></span>
                    <span class="player-g"><?= t('artist') ?></span>
                    <span class="player-t"><?= t('title') ?></span>
                    <span id="next-song" class="player-bt-next" title="<?= t('next_title') ?>"><i class="fas fa-forward-fast"></i></span>
                </div>
                <div class="clearfix"></div>
                <div class="p-0">
                    <audio id="audio-player" class="plyr-player" controls></audio>
                </div>
            </header>
            <!-- Contenu principal -->
            <div class="main-panel">
                <!-- En-tête de la bibliothèque -->
                <div class="songs-container">
                    <h3 class="p-4">
                        <?php 
                        if (isset($_GET['playlist']) && !empty($_GET['playlist'])) {
                            // Récupérer l'ID de la playlist depuis l'URL
                            $playlistId = (int)$_GET['playlist'];
                            
                            // Récupérer les informations de la playlist depuis la liste des playlists
                            $playlistName = "Playlist";
                            $playlistObj = null;
                            
                            // Rechercher la playlist correspondante dans le tableau $playlists
                            foreach ($playlists as $p) {
                                if ((int)$p['id'] === $playlistId) {
                                    $playlistName = $p['name'];
                                    $playlistObj = $p;
                                    break;
                                }
                            }
                            
                            echo '
                                <div class="playlist-title-wrapper">
                                    <a href="index.php" class="btn btn-sm btn-outline-secondary back-button"><i class="fas fa-arrow-left me-1"></i> ' . t('back') . '</a>
                                    <span class="playlist-title flex-grow-1">' . t('playlist_label') . ' : ' . htmlspecialchars($playlistName) . ' (' . count($songs) . ' ' . t('tracks') . ')</span>
                                    <div class="search-container">
                                        <div class="input-group input-group-sm">
                                            <input type="text" id="song-search" class="form-control rounded border-primary text-primary" placeholder="' . t('quick_filter') . '">
                                            <div class="input-group-append">
                                                <button type="button" id="search-clear" class="btn btn-outline-secondary" style="display: none;">
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="playlist-actions">
                                        <button id="playlist-prep-btn" class="btn btn-sm btn-outline-primary" title="' . t('prepare_copy_title') . '"><i class="fas fa-copy me-1"></i> ' . t('prepare_copy') . '</button>
                                        <button class="btn btn-sm btn-outline-primary rename-playlist-btn" data-playlist-id="' . $playlistId . '" data-playlist-name="' . htmlspecialchars($playlistName) . '"><i class="fas fa-edit me-1"></i> ' . t('rename') . '</button>
                                        <button class="btn btn-sm btn-outline-primary duplicate-playlist-btn" data-playlist-id="' . $playlistId . '" data-playlist-name="' . htmlspecialchars($playlistName) . '"><i class="fas fa-clone me-1"></i> ' . t('duplicate') . '</button>
                                        <button class="btn btn-sm btn-outline-danger delete-playlist-btn" data-playlist-id="' . $playlistId . '" data-playlist-name="' . htmlspecialchars($playlistName) . '"><i class="fas fa-trash-alt me-1"></i> ' . t('delete') . '</button>
                                    </div>
                                </div>
                                <div id="playlist-prep-progress" class="progress mt-2 d-none">
                                    <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%"></div>
                                </div>
                            ';
                        } else {
                            echo '
                                <div class="playlist-title-wrapper">
                                    <span class="playlist-title flex-grow-1">' . t('library') . ' (' . count($songs) . ' ' . t('tracks') . ')</span>
                                    <div class="search-container">
                                        <div class="input-group input-group-sm">
                                            <input type="text" id="song-search" class="form-control rounded border-primary text-primary" placeholder="' . t('quick_filter') . '">
                                            <div class="input-group-append">
                                                <button type="button" id="search-clear" class="btn btn-outline-secondary" style="display: none;">
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ';
                        }
                        ?>
                    </h3>
                    
                    <!-- Champ de recherche pour filtrer les titres/artistes -->
                    
                    <!-- Grille des MP3 -->
                    <div class="mp3-grid px-4 mb-4">
                <?php if (empty($songs)): ?>
                    <div class="empty-state text-center text-muted p-5 w-100" style="grid-column: 1 / -1;">
                        <div class="mb-3"><i class="fas fa-music fa-3x"></i></div>
                        <h4 class="mb-3"><?= t('empty_library_message') ?></h4>
                        <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#dbManagerModal">
                            <i class="fas fa-gear me-1"></i> <?= t('open_upload_manager') ?>
                        </button>
                    </div>
                <?php else: foreach ($songs as $song): ?>
                    <?php 
                        // Récupérer les tags de la chanson
                        $songObj = new Song();
                        $songObj->load($song['id']);
                        $songTags = $songObj->getTags();
                        $songPlaylists = $songObj->getPlaylistIds();
                    ?>
                    <div class="mp3-item" id="song-<?php echo $song['id']; ?>" data-id="<?php echo $song['id']; ?>" data-date-added="<?php echo strtotime($song['created_at']); ?>" data-filename="<?php echo htmlspecialchars($song['filename']); ?>" data-playlist-ids="<?php echo implode(',', $songPlaylists); ?>">
                        <div class="mp3-title"><?php echo htmlspecialchars($song['title']); ?></div>
                        <div class="mp3-artist"><?php echo htmlspecialchars($song['artist']); ?></div>
                        
                        <?php if ($song['rating'] > 0): ?>
                            <div class="mp3-rating">
                                <?php for ($i = 1; $i <= $song['rating']; $i++): ?>
                                    <i class="fas fa-star rating-star-small"></i>
                                <?php endfor; ?>
                            </div>
                        <?php endif; ?>
                        
                        <?php if (count($songTags) > 0): ?>
                            <div class="mp3-has-tags">
                                <i class="fas fa-tags" title="<?php echo htmlspecialchars(implode(', ', array_column($songTags, 'name'))); ?>"></i>
                            </div>
                        <?php endif; ?>
                        
                        <button class="mp3-menu-button" data-id="<?php echo $song['id']; ?>" data-artist="<?php echo htmlspecialchars($song['artist']); ?>" data-title="<?php echo htmlspecialchars($song['title']); ?>" data-rating="<?php echo $song['rating']; ?>" data-filename="<?php echo htmlspecialchars($song['filename']); ?>">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        
                        <!-- Ces éléments sont cachés et utilisés uniquement pour le stockage des données -->
                        <div id="tags-<?php echo $song['id']; ?>" class="d-none">
                            <?php foreach ($songTags as $tag): ?>
                                <span id="tag-<?php echo $song['id']; ?>-<?php echo $tag['id']; ?>" class="d-none" 
                                    data-tag-id="<?php echo $tag['id']; ?>"
                                    data-tag-name="<?php echo htmlspecialchars($tag['name']); ?>"
                                    data-is-artist="<?php echo ($tag['name'] === $song['artist']) ? '1' : '0'; ?>"></span>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endforeach; endif; ?>
            </div>
            
            <!-- Conteneur pour l'image de l'artiste sélectionné -->
            <div id="artist-image-container" class="mt-4 p-4 text-center d-none">
                <div id="artist-image-title" class="mb-4 fs-1 fw-bold"></div>
                <img id="artist-image" class="img-fluid rounded shadow-sm" alt="<?= t('artist_image_alt') ?>">
            </div>
        </div>
    </div>
    
    <!-- Modal de gestion de chanson -->
    <div class="modal fade" id="songOptionsModal" tabindex="-1" role="dialog" aria-labelledby="songOptionsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold text-uppercase" id="songOptionsModalLabel"><?php echo t('song_management') ?? 'Gestion de la chanson'; ?></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="option-song-id">
                    <input type="hidden" id="option-song-filename">
                    
                    <div class="row">
                        <div class="col-md-6">
                            <!-- Section Renommer -->
                            <div class="card mb-3">
                                <div class="card-header">
                                    <h5 class="mb-0"><i class="fas fa-pencil-alt me-1"></i> <?php echo t('rename') ?? 'Renommer'; ?></h5>
                                </div>
                                <div class="card-body">
                                    <form id="rename-form">
                                        <input id="rename-artist" type="text" class="form-control form-control-sm" placeholder="<?php echo t('artist') ?? 'Artiste'; ?>" required>
                                        <input id="rename-title" type="text" class="form-control form-control-sm mt-2" placeholder="<?php echo t('title') ?? 'Titre'; ?>" required>
                                        <div class="text-center mt-2">
                                            <button type="submit" class="btn btn-sm btn-primary"><?php echo t('rename') ?? 'Renommer'; ?></button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                            
                            <!-- Section Note -->
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="mb-0"><i class="fas fa-star me-1"></i> <?php echo t('rating') ?? 'Notation'; ?></h5>
                                </div>
                                <div class="card-body">
                                    <div class="rating-selection text-center">
                                        <div class="big-stars fs-3">
                                            <?php for ($i = 1; $i <= 5; $i++): ?>
                                                <i class="far fa-star rating-big-star" data-rating="<?php echo $i; ?>"></i>
                                            <?php endfor; ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <!-- Section Tags -->
                            <div class="card mb-3">
                                <div class="card-header">
                                    <h5 class="mb-0"><i class="fas fa-tags me-1"></i> <?php echo t('tags') ?? 'Tags'; ?></h5>
                                </div>
                                <div class="card-body">
                                    <form id="add-tag-form">
                                        <div class="input-group">
                                            <input type="text" id="new-tag-input" class="form-control form-control-sm rounded-start" placeholder="<?php echo t('new_tag') ?? 'Nouveau tag'; ?>" list="available-tags-list">
                                            <datalist id="available-tags-list">
                                                <?php foreach ($tags as $tag): ?>
                                                    <option value="<?php echo htmlspecialchars($tag['name']); ?>">
                                                <?php endforeach; ?>
                                            </datalist>
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary rounded-start-0" type="submit"><?php echo t('add') ?? 'Ajouter'; ?></button>
                                            </div>
                                        </div>
                                    </form>
                                    <div class="suggested-tags mt-2 mb-2">
                                        <small class="text-muted"><?php echo t('available_tags') ?? 'Tags disponibles :'; ?></small>
                                        <div id="suggested-tags-list" class="mt-1">
                                            <?php foreach ($tags as $tag): ?>
                                                <a href="#" class="badge badge-light border me-1 mb-1 suggested-tag" data-tag-name="<?php echo htmlspecialchars($tag['name']); ?>">
                                                    <?php echo htmlspecialchars($tag['name']); ?>
                                                </a>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                    <div class="current-tags">
                                        <div id="song-tags-list">
                                            <!-- Les tags seront ajoutés dynamiquement ici -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Section Playlists -->
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="mb-0"><i class="fas fa-list me-1"></i> <?php echo t('playlists'); ?></h5>
                                </div>
                                <div class="card-body p-0">
                                    <div class="playlists-selection">
                                        <ul class="list-group list-group-flush" id="modal-playlists-list">
                                            <?php foreach ($playlists as $playlist): ?>
                                                <li class="list-group-item d-flex justify-content-between align-items-center rounded">
                                                    <?php echo htmlspecialchars($playlist['name']); ?>
                                                    <button class="btn btn-sm btn-outline-primary add-to-playlist-btn" data-playlist-id="<?php echo $playlist['id']; ?>">
                                                        <?php echo t('add'); ?>
                                                    </button>
                                                </li>
                                            <?php endforeach; ?>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer d-flex justify-content-between">
                    <button type="button" class="btn btn-danger" id="delete-song-btn"><i class="fas fa-trash-alt me-1"></i> <?php echo t('delete_mp3') ?? 'Supprimer le MP3'; ?></button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?php echo t('close'); ?></button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Modal de création de playlist -->
    <div class="modal fade" id="createPlaylistModal" tabindex="-1" role="dialog" aria-labelledby="createPlaylistModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold text-uppercase" id="createPlaylistModalLabel"><?php echo t('create_playlist') ?? 'Créer une playlist'; ?></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form id="create-playlist-form">
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="playlist-name"><?php echo t('playlist_name') ?? 'Nom de la playlist'; ?></label>
                            <input type="text" class="form-control" id="playlist-name" required>
                        </div>
                        <div class="form-group">
                            <label for="playlist-description"><?php echo t('playlist_description') ?? 'Description'; ?></label>
                            <textarea class="form-control" id="playlist-description" rows="3"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?php echo t('cancel') ?? 'Annuler'; ?></button>
                        <button type="submit" class="btn btn-primary"><?php echo t('create') ?? 'Créer'; ?></button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <!-- Modal de confirmation de suppression -->
    <div class="modal fade" id="deletePlaylistModal" tabindex="-1" role="dialog" aria-labelledby="deletePlaylistModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold text-uppercase" id="deletePlaylistModalLabel"><?php echo t('delete_playlist') ?? 'Supprimer la playlist'; ?></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p><?php echo t('confirm_delete_playlist') ?? 'Êtes-vous sûr de vouloir supprimer la playlist'; ?> <strong id="playlist-to-delete-name"></strong> ?</p>
                    <p><?php echo t('irreversible_action') ?? 'Cette action est irréversible.'; ?></p>
                    <input type="hidden" id="playlist-to-delete-id">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?php echo t('cancel') ?? 'Annuler'; ?></button>
                    <button type="button" class="btn btn-danger" id="confirm-delete-playlist"><?php echo t('delete'); ?></button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Modal de renommage de playlist -->
    <div class="modal fade" id="renamePlaylistModal" tabindex="-1" role="dialog" aria-labelledby="renamePlaylistModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold text-uppercase" id="renamePlaylistModalLabel"><?php echo t('rename_playlist') ?? 'Renommer la playlist'; ?></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form id="rename-playlist-form">
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="new-playlist-name"><?php echo t('new_playlist_name') ?? 'Nouveau nom de la playlist'; ?></label>
                            <input type="text" class="form-control" id="new-playlist-name" required>
                            <input type="hidden" id="playlist-to-rename-id">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?php echo t('cancel') ?? 'Annuler'; ?></button>
                        <button type="submit" class="btn btn-success"><?php echo t('rename'); ?></button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <!-- Modal de confirmation de suppression de MP3 -->
    <div class="modal fade" id="deleteSongModal" tabindex="-1" role="dialog" aria-labelledby="deleteSongModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold text-uppercase" id="deleteSongModalLabel"><?php echo t('delete_mp3') ?? 'Supprimer le MP3'; ?></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p><?php echo t('confirm_delete_mp3') ?? 'Êtes-vous sûr de vouloir supprimer le MP3'; ?> <strong id="song-to-delete-info"></strong> ?</p>
                    <p><?php echo t('irreversible_action_mp3') ?? 'Cette action est irréversible. Le fichier MP3 sera supprimé du système.'; ?></p>
                    <input type="hidden" id="song-to-delete-id">
                    <input type="hidden" id="song-to-delete-filename">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?php echo t('cancel') ?? 'Annuler'; ?></button>
                    <button type="button" class="btn btn-danger" id="confirm-delete-song"><?php echo t('delete'); ?></button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- jQuery et Bootstrap JS (bundle inclut Popper) -->
    <script src="lib/jquery-3.7.1.min.js"></script>
    <script src="lib/bootstrap-5.3.6/js/bootstrap.bundle.min.js"></script>
    
    <!-- Select2 JS -->
    <script src="lib/select2-4.0.13/js/select2.min.js"></script>
    <script src="js/select2-init.js<?php echo '?v=' . time(); ?>"></script>

    <!-- Variables JavaScript pour les chemins configurés -->
    <script>
        // Charger les paramètres de configuration depuis PHP
        var configMusicPaths = <?php 
            // Récupérer les chemins de musique
            $musicPaths = $this->config->getSection('music')['path'];
            
            // S'assurer que c'est un tableau, même si un seul chemin est défini
            if (!is_array($musicPaths)) {
                $musicPaths = [$musicPaths];
            }
            
            // Convertir en JSON pour JavaScript
            echo json_encode($musicPaths);
        ?>;
        var appUrl = "<?php echo $this->config->getSection('app')['url']; ?>";
    </script>
    
    <!-- Plyr.io JavaScript -->
    <script src="lib/plyr/plyr.min.js"></script>
    
        <!-- Modal Gestion DB & Fichiers -->
        <div class="modal fade" id="dbManagerModal" tabindex="-1" aria-labelledby="dbManagerModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body">
                    <button type="button" class="btn-close float-end" data-bs-dismiss="modal" aria-label="Close"></button>
                       <div class="card h-100 border-0">
                            <div class="card-body">
                                <h6 class="card-title fw-bold"><i class="fas fa-language me-2"></i><?= t('choose_language') ?></h6>
                                <?php
                                $langDir = __DIR__ . '/../lang';
                                if (is_dir($langDir)) {
                                    echo '<div class="d-flex flex-wrap gap-2">';
                                    foreach (scandir($langDir) as $file) {
                                        if (preg_match('/^(\w+)\.php$/', $file, $m)) {
                                            $code = $m[1];
                                            // Lecture des métadonnées de langue
                                            $langFileMeta = $langDir . '/' . $file;
                                            $meta = (function($__file){
                                                $data = include $__file;
                                                return is_array($data) ? $data : [];
                                            })($langFileMeta);
                                            $flag = isset($meta['language_flag']) ? $meta['language_flag'] : '';
                                            $name = isset($meta['language_name']) ? $meta['language_name'] : strtoupper($code);
                                            $label = trim(($flag ? $flag . ' ' : '') . $name);
                                            $isActive = ($code === ($langCode ?? 'fr'));
                                            $btnClass = $isActive ? 'btn btn-sm btn-primary active' : 'btn btn-sm btn-outline-secondary';
                                            $aria = $isActive ? ' aria-current="true"' : '';
                                            echo '<a class="' . $btnClass . '" href="?setlang=' . htmlspecialchars($code) . '"' . $aria . '>' . htmlspecialchars($label) . '</a>';
                                        }
                                    }
                                    echo '</div>';
                                }
                                ?>
                            </div>
                        </div>

                        <div class="card h-100 border-0">
                            <div class="card-body">
                                <h6 class="card-title fw-bold"><i class="fas fa-database me-2"></i><?= t('db_management') ?></h6>
                                <div class="small text-muted mt-2" id="import-db-status"></div>
                                <form id="form-import-db" class="input-group" enctype="multipart/form-data">
                                    <input type="file" name="dbfile" accept=".sqlite,.db,.sqlite3,application/octet-stream" class="form-control form-control-sm" required>
                                    <button type="submit" class="btn btn-sm btn-outline-danger">
                                        <i class="fas fa-upload me-1"></i><?= t('import') ?>
                                    </button>
                                    <a href="api/export-db.php" class="btn btn-sm btn-outline-primary" id="btn-export-db">
                                        <i class="fas fa-download me-1"></i><?= t('export') ?>
                                    </a>
                                </form>
                            </div>
                        </div>
                        <div class="card h-100 border-0">
                            <div class="card-body">
                                <h6 class="card-title fw-bold"><i class="fas fa-music me-2"></i><?= t('upload_mp3') ?></h6>
                                <p class="text-muted small"><?= t('upload_music_info') ?></p>
                                <form id="form-upload-music" enctype="multipart/form-data">
                                    <div id="music-dropzone" class="border rounded p-3 text-center mb-2 bg-light py-5" style="cursor: pointer;">
                                        <i class="fas fa-cloud-upload-alt me-1"></i>
                                        <?= t('dropzone_text') ?>
                                        <input type="file" id="music-file-input" name="files[]" accept="audio/mpeg,.mp3,image/png,image/jpeg,image/webp" class="d-none" multiple>
                                    </div>
                                    <button type="submit" class="btn btn-sm btn-outline-primary w-100">
                                        <i class="fas fa-cloud-upload-alt me-1"></i><?= t('upload') ?>
                                    </button>
                                </form>
                                <div class="small text-muted mt-2" id="upload-music-status" style="max-height: 200px; overflow-y: auto;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    <!-- Exposer les messages i18n au JavaScript -->
        <script>
            window.i18n = {
                importing: <?= json_encode(t('importing')) ?>,
                import_success: <?= json_encode(t('import_success')) ?>,
                import_error: <?= json_encode(t('import_error')) ?>,
                network_error_import: <?= json_encode(t('network_error_import')) ?>,
                uploading: <?= json_encode(t('uploading')) ?>,
                upload_success: <?= json_encode(t('upload_success')) ?>,
                upload_error: <?= json_encode(t('upload_error')) ?>,
                network_error_upload: <?= json_encode(t('network_error_upload')) ?>,
                unsupported_type: <?= json_encode(t('unsupported_type')) ?>,
                unknown_error: <?= json_encode(t('unknown_error') ?? 'Unknown error') ?>,
                reload_prompt: <?= json_encode(t('reload_prompt') ?? 'Upload finished. Reload the page now?') ?>,
                in_images_dir: <?= json_encode(t('in_images_dir') ?? ' (in /public/img/gp/)') ?>,
                add_to_playlist: <?= json_encode(t('add_to_playlist')) ?>,
                remove_from_playlist: <?= json_encode(t('remove_from_playlist')) ?>,
                tracks: <?= json_encode(t('tracks')) ?>,
                // Messages de recherche rapide
                no_results_found: <?= json_encode(t('no_results_found') ?? 'No results found') ?>,
                try_other_terms: <?= json_encode(t('try_other_terms') ?? 'Try other search terms') ?>,
                all_artists_placeholder: <?= json_encode(t('all_artists')) ?>,
                no_results_artists: <?= json_encode(t('no_results_artists') ?? 'Aucun groupe/artiste trouvé') ?>,
                searching: <?= json_encode(t('searching') ?? 'Recherche en cours...') ?>,
                input_too_short: <?= json_encode(t('input_too_short') ?? 'Veuillez saisir au moins 1 caractère') ?>,
                remove_all_items: <?= json_encode(t('remove_all_items') ?? 'Supprimer tous les éléments') ?>
            };
        </script>

        <!-- Scripts personnalisés -->
        <script src="js/plyr-init.js<?php echo '?v=' . time(); ?>"></script>
        <script>
            // Exposer le flag du visualizer pour le script
            window.visualizerEnabled = <?php 
                $playerConf = $this->config->getSection('player') ?? [];
                $v = isset($playerConf['visualizer']) ? (int)$playerConf['visualizer'] : 0;
                echo $v ? 'true' : 'false';
            ?>;
        </script>
        <script src="js/audio-visualizer.js<?php echo '?v=' . time(); ?>"></script>
    <script src="js/muz-playlist.js<?php echo '?v=' . time(); ?>"></script>
    <script src="js/muz.js<?php echo '?v=' . time(); ?>"></script>
    <script src="js/muz-tags.js<?php echo '?v=' . time(); ?>"></script>
    <script src="js/image-checker.js<?php echo '?v=' . time(); ?>"></script>
    <script src="js/muz-search.js<?php echo '?v=' . time(); ?>"></script>
    <script src="js/muz-rating.js<?php echo '?v=' . time(); ?>"></script>
    <script src="js/muz-playlist-style.js<?php echo '?v=' . time(); ?>"></script>
    <script src="js/modal-effect.js<?php echo '?v=' . time(); ?>"></script>
    <script src="js/muz-delete-song.js<?php echo '?v=' . time(); ?>"></script>
    <script src="js/muz-db.js<?php echo '?v=' . time(); ?>"></script>
    <script src="js/pwa.js<?php echo '?v=' . time(); ?>"></script>
</body>
</html>