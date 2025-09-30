/**
 * Muz - Script JavaScript pour la gestion des filtres (tags + rating)
 * Utilise localStorage pour conserver les préférences + filtrage côté client sans rechargement
 */

// Clés pour localStorage

const STORAGE_KEY_TAGS = 'muz-excluded-tags';
const STORAGE_KEY_UNTAGGED = 'muz-include-untagged'; // '1' pour inclure les morceaux sans tag, '0' pour les exclure
const STORAGE_KEY_RATING = 'muz-rating-filter';
const STORAGE_KEY_PLAYLIST = 'muz-playlist-filter';
/**
 * Récupère le filtre de playlist depuis localStorage
 */
function getPlaylistFilter() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_PLAYLIST);
        return stored ? stored : '';
    } catch (e) {
        console.error('Erreur localStorage playlist:', e);
    }
    return '';
}

/**
 * Sauvegarde le filtre de playlist dans localStorage
 */
function savePlaylistFilter(playlistId) {
    try {
        if (!playlistId) {
            localStorage.removeItem(STORAGE_KEY_PLAYLIST);
        } else {
            localStorage.setItem(STORAGE_KEY_PLAYLIST, playlistId);
        }
    } catch (e) {
        console.error('Erreur sauvegarde playlist:', e);
    }
}

// Fonction globale pour mettre à jour l'icône des tags d'un MP3
function updateTagsIcon(songId) {
    const mp3Item = $('#song-' + songId);
    const tagsContainer = $('#tags-' + songId);
    const tagCount = tagsContainer.find('span').length;
    
    // Supprimer l'icône existante si elle existe
    mp3Item.find('.mp3-has-tags').remove();
    
    // Ajouter l'icône si des tags sont présents
    if (tagCount > 0) {
        // Récupérer les noms des tags
        const tagNames = [];
        tagsContainer.find('span[data-tag-name]').each(function() {
            tagNames.push($(this).data('tag-name'));
        });
        const tagsList = tagNames.join(', ');
        
        const tagsIcon = $('<div class="mp3-has-tags">' +
                          '<i class="fas fa-tags" title="' + tagsList + '"></i>' +
                          '</div>');
        mp3Item.append(tagsIcon);
    }
}

/**
 * Récupère les tags exclus depuis le localStorage
 */
function getExcludedTags() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_TAGS);
        if (stored) {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        }
    } catch (e) {
        console.error('Erreur localStorage tags:', e);
    }
    return [];
}

/**
 * Sauvegarde les tags exclus dans le localStorage
 */
function saveExcludedTags(excludedTags) {
    try {
        localStorage.setItem(STORAGE_KEY_TAGS, JSON.stringify(excludedTags));
    } catch (e) {
        console.error('Erreur sauvegarde tags:', e);
    }
}

/**
 * Récupère le filtre de rating depuis localStorage
 */
function getRatingFilter() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_RATING);
        return stored ? parseInt(stored) : null;
    } catch (e) {
        console.error('Erreur localStorage rating:', e);
    }
    return null;
}

/**
 * Sauvegarde le filtre de rating dans localStorage
 */
function saveRatingFilter(rating) {
    try {
        if (rating === null || rating === '') {
            localStorage.removeItem(STORAGE_KEY_RATING);
        } else {
            localStorage.setItem(STORAGE_KEY_RATING, rating.toString());
        }
    } catch (e) {
        console.error('Erreur sauvegarde rating:', e);
    }
}


/**
 * Filtre les MP3 selon tags exclus, rating et playlist
 */
function filterMp3Items() {
    const excludedTags = getExcludedTags();
    const ratingFilter = getRatingFilter();
    const playlistFilter = getPlaylistFilter();
    const includeUntagged = (localStorage.getItem(STORAGE_KEY_UNTAGGED) ?? '1') === '1';
    let visibleCount = 0;

    $('.mp3-item').each(function() {
        const $item = $(this);
        const songId = $item.data('id');
        let shouldShow = true;

        // Filtre par tags (exclusion) + gestion des "sans tag"
        const tagsContainer = $('#tags-' + songId);
        const songTags = [];
        tagsContainer.find('span[data-tag-id]').each(function() {
            const tagId = parseInt($(this).data('tag-id'));
            if (!isNaN(tagId)) songTags.push(tagId);
        });

        // Exclure si la chanson a un tag dans la liste exclue
        if (shouldShow && excludedTags && excludedTags.length > 0) {
            if (songTags.some(tagId => excludedTags.includes(tagId))) {
                shouldShow = false;
            }
        }

        // Gérer l'affichage des morceaux sans tag selon includeUntagged
        if (shouldShow && songTags.length === 0 && !includeUntagged) {
            shouldShow = false;
        }

        // Filtre par rating
        if (shouldShow && ratingFilter !== null) {
            const songRating = $item.find('.mp3-rating .rating-star-small').length;
            if (songRating !== ratingFilter) {
                shouldShow = false;
            }
        }

        // Filtre par playlist
        if (shouldShow && playlistFilter) {
            // Récupère la liste des playlists de la chanson (data-playlist-ids est une chaîne de type "1,2,3")
            let playlists = $item.attr('data-playlist-ids');
            if (playlists && playlists.trim() !== '') {
                playlists = playlists.split(',').map(function(id) { return id.trim(); });
            } else {
                playlists = [];
            }
            // La chanson doit faire partie de la playlist sélectionnée
            if (playlists.indexOf(playlistFilter) === -1) {
                shouldShow = false;
            }
        }

        $item.toggle(shouldShow);
        if (shouldShow) {
            visibleCount++;
        }
    });
    
    // Mettre à jour le compteur de titres
    updateSongCounter(visibleCount);
}

/**
 * Met à jour le compteur de titres affichés
 */
function updateSongCounter(count) {
    const $playlistTitle = $('.playlist-title');
    if ($playlistTitle.length > 0) {
        const currentText = $playlistTitle.text();
        const tracksWord = (window.i18n && window.i18n.tracks) ? window.i18n.tracks : 'titres';
        const hasParens = /\(\s*\d+\s*[^)]*\)/.test(currentText);
        const replacement = `(${count} ${tracksWord})`;
        const newText = hasParens
            ? currentText.replace(/\(\s*\d+\s*[^)]*\)/, replacement)
            : `${currentText} ${replacement}`;
        $playlistTitle.text(newText);
    }
}

$(document).ready(function() {
    // Exposer pour d'autres modules
    window.getPlaylistFilter = getPlaylistFilter;
    let excludedTags = getExcludedTags();
    // Initialiser le flag untagged (par défaut: inclure)
    if (localStorage.getItem(STORAGE_KEY_UNTAGGED) === null) {
        localStorage.setItem(STORAGE_KEY_UNTAGGED, '1');
    }
    
    function updateTagStyles() {
        $('.filter-tag').each(function() {
            const tagId = parseInt($(this).data('id'));
            // Le bouton untagged n'a pas d'id de tag
            const isUntaggedBtn = isNaN(tagId);
            const isExcluded = !isUntaggedBtn && excludedTags.includes(tagId);
            // Changer la couleur et l'icône (check si inclus, croix si exclu)
            const $el = $(this);
            $el.removeClass('badge-primary badge-secondary')
               .addClass(isExcluded ? 'badge-secondary' : 'badge-primary')
               .data('selected', isExcluded ? 0 : 1);
            // Mettre à jour l'icône et le label
            const rawText = ($el.data('label') || $el.text()).trim();
            const label = rawText.replace(/^([\s\u00A0]*)(<i[^>]*>.*?<\/i>)?/i, '').trim();
            const icon = isExcluded ? '<i class="fas fa-times me-1"></i>' : '<i class="fas fa-check me-1"></i>';
            $el.html(icon + ' ' + label);
        });

        // Mettre à jour le bouton "Sans tag"
        const includeUntagged = (localStorage.getItem(STORAGE_KEY_UNTAGGED) ?? '1') === '1';
        const $untagged = $('#filter-untagged');
        if ($untagged.length) {
            $untagged.removeClass('badge-primary badge-secondary')
                     .addClass(includeUntagged ? 'badge-primary' : 'badge-secondary')
                     .attr('data-state', includeUntagged ? '1' : '0')
                     .html((includeUntagged ? '<i class="fas fa-check me-1"></i>' : '<i class="fas fa-times me-1"></i>') + ' ' + ($untagged.data('label') || ($untagged.text().trim() || 'Sans tag')));
        }
    }
    

    // Init rating select depuis localStorage
    const savedRating = getRatingFilter();
    if (savedRating !== null) {
        $('#rating-select').val(savedRating);
    }

    // Init playlist select depuis localStorage
    const savedPlaylist = getPlaylistFilter();
    if (savedPlaylist) {
        $('#playlist-select').val(savedPlaylist);
    }

    updateTagStyles();
    // Exposer pour d'autres modules
    window.updateTagStyles = updateTagStyles;
    filterMp3Items();
    if (typeof window.refreshSongsList === 'function') window.refreshSongsList();
    // Changement du select de playlist
    $('#playlist-select').off('change').on('change', function() {
        const playlistId = $(this).val();
        if (!playlistId) {
            // Si "Pas de playlist" est sélectionné, on supprime le filtre
            savePlaylistFilter('');
        } else {
            savePlaylistFilter(playlistId);
        }
    filterMp3Items();
    if (typeof window.refreshSongsList === 'function') window.refreshSongsList();
        checkFiltersActive();
    });
    
    // Clic sur un tag (délégué pour prendre en compte les tags ajoutés dynamiquement)
    $(document).off('click.muzTagFilter', '.filter-tag').on('click.muzTagFilter', '.filter-tag', function(e) {
        e.preventDefault();
        const tagId = parseInt($(this).data('id'));
        // Ignorer le bouton untagged ici (il a son handler dédié)
        if (isNaN(tagId)) {
            return;
        }
        const isActive = !excludedTags.includes(tagId);
        
        if (isActive) {
            excludedTags.push(tagId);
        } else {
            const index = excludedTags.indexOf(tagId);
            if (index !== -1) excludedTags.splice(index, 1);
        }
        
        saveExcludedTags(excludedTags);
        updateTagStyles();
    filterMp3Items();
    if (typeof window.refreshSongsList === 'function') window.refreshSongsList();
        checkFiltersActive();
    });

    // Clic sur le bouton "Sans tag"
    $('#filter-untagged').off('click').on('click', function(e) {
        e.preventDefault();
        const includeUntagged = (localStorage.getItem(STORAGE_KEY_UNTAGGED) ?? '1') === '1';
        const newVal = includeUntagged ? '0' : '1';
        localStorage.setItem(STORAGE_KEY_UNTAGGED, newVal);
        updateTagStyles();
    filterMp3Items();
    if (typeof window.refreshSongsList === 'function') window.refreshSongsList();
        checkFiltersActive();
    });
    
    // Changement du select de rating
    $('#rating-select').off('change').on('change', function() {
        const rating = $(this).val();
        saveRatingFilter(rating === '' ? null : parseInt(rating));
        filterMp3Items();
        checkFiltersActive();
    });


    function checkFiltersActive() {
        const urlParams = new URLSearchParams(window.location.search);
        const hasUrlFilters = urlParams.has('artist');
        const hasExcludedTags = excludedTags.length > 0;
        const hasRatingFilter = getRatingFilter() !== null;
        const hasPlaylistFilter = getPlaylistFilter() !== '';
        
        // Afficher le bouton artiste uniquement si un artiste est sélectionné
        $('.reset-artist-container').toggle(hasUrlFilters);
        
        // Afficher le bouton filtres uniquement si tags exclus, rating sélectionnés, ou filtre untagged actif (exclusion)
        const includeUntagged = (localStorage.getItem(STORAGE_KEY_UNTAGGED) ?? '1') === '1';
        const hasUntaggedFilter = !includeUntagged; // si on exclut les sans tag, un filtre est actif
        const hasFilters = hasExcludedTags || hasRatingFilter || hasUntaggedFilter;
        $('.reset-filters-container').toggle(hasFilters);
        
        return hasFilters || hasUrlFilters;
    }
    

    $('.reset-filters').off('click').on('click', function(e) {
        e.preventDefault();

    // Reset localStorage (tags, rating et untagged uniquement, pas la playlist)
        excludedTags = [];
        saveExcludedTags(excludedTags);
        saveRatingFilter(null);
    localStorage.setItem(STORAGE_KEY_UNTAGGED, '1');

    // Reset UI (tags, rating et untagged)
        updateTagStyles();
        $('#rating-select').val('');
    filterMp3Items();
    if (typeof window.refreshSongsList === 'function') window.refreshSongsList();
        
        // Pas de reload, juste mise à jour de l'affichage
        checkFiltersActive();
    });
    
    // Gestion du bouton reset artiste
    $('.reset-artist').off('click').on('click', function(e) {
        e.preventDefault();
        
        // Reload sans le paramètre artist, mais en conservant sort
        const urlParams = new URLSearchParams(window.location.search);
        const sortType = urlParams.get('sort');
        let url = window.location.pathname;
        let params = [];
        if (sortType) params.push('sort=' + sortType);
        if (params.length > 0) url += '?' + params.join('&');
        window.location.href = url;
    });
    
    checkFiltersActive();
    
    // Exposer des helpers au global
    window.filterMp3Items = filterMp3Items;
    window.addFilterTag = function(tagId, tagName) {
        // Ajoute un badge de filtre tag dans la sidebar s'il n'existe pas
        const $container = $('.tag-filters');
        if (!$container.length) return;
        const idStr = String(tagId);
        if ($container.find('.filter-tag[data-id="' + idStr + '"]').length) {
            return; // déjà présent
        }
        const $badge = $('<a href="#" class="filter-tag badge badge-primary me-1 mb-1" data-id="' + idStr + '" data-selected="1" data-label="' + $('<div>').text(tagName).html() + '"></a>');
        $badge.text(tagName);
        // Insérer après le bouton "Sans tag" si présent, sinon à la fin
        const $untagged = $('#filter-untagged');
        if ($untagged.length) {
            $untagged.after($badge);
        } else {
            $container.append($badge);
        }
        // Mettre à jour style pour ajouter l'icône et les couleurs, sans changer l'état (actif par défaut)
        updateTagStyles();
    };
});