/**
 * Muz - Script de recherche pour filtrer les chansons
 */
$(document).ready(function() {
    // Éléments DOM
    const searchInput = $('#song-search');
    const clearButton = $('#search-clear');
    let songsList = $('.mp3-item');
    let noResultsMessage = null;
    let originalSongsCount = songsList.length;
    
    /**
     * Effectue une recherche dans les éléments de chanson et affiche uniquement ceux qui correspondent
     */
    function performSearch() {
        const query = searchInput.val().toLowerCase().trim();
        let matchCount = 0;
        
        // Si la recherche est vide, réappliquer les filtres normaux
        if (query === '') {
            // Réappliquer les filtres (tags, rating, playlist)
            if (typeof filterMp3Items === 'function') {
                filterMp3Items();
            } else {
                songsList.each(function() {
                    $(this).show();
                });
                updateSongsCount(originalSongsCount);
            }
            if (typeof window.refreshSongsList === 'function') window.refreshSongsList();
            removeNoResultsMessage();
            return;
        }
        
        // Filtrer les chansons visibles selon la recherche
        songsList.each(function() {
            const $item = $(this);
            const artist = $item.find('.mp3-artist').text().toLowerCase();
            const title = $item.find('.mp3-title').text().toLowerCase();
            
            // Vérifier si le titre ou l'artiste contient le terme de recherche
            if (artist.includes(query) || title.includes(query)) {
                $item.show();
                matchCount++;
            } else {
                $item.hide();
            }
        });
        
    // Mettre à jour le compteur de chansons visibles
        updateSongsCount(matchCount);
    if (typeof window.refreshSongsList === 'function') window.refreshSongsList();
        
        // Afficher un message si aucun résultat
        if (matchCount === 0) {
            displayNoResultsMessage();
        } else {
            removeNoResultsMessage();
        }
    }
    
    /**
     * Affiche un message quand aucun résultat n'est trouvé
     */
    function displayNoResultsMessage() {
        // Supprimer un message existant si présent
        removeNoResultsMessage();
        
        // Créer un nouveau message
        const title = (window.i18n && window.i18n.no_results_found) ? window.i18n.no_results_found : 'Aucun résultat trouvé';
        const subtitle = (window.i18n && window.i18n.try_other_terms) ? window.i18n.try_other_terms : "Essayez d'autres termes de recherche";
        noResultsMessage = $('<div class="no-results-message p-4 text-center">' +
            '<i class="fas fa-search fa-2x mb-3"></i>' +
            '<h4>' + title + '</h4>' +
            '<p>' + subtitle + '</p>' +
            '</div>');
        
        // Insérer le message après la grille de MP3
        $('.mp3-grid').after(noResultsMessage);
    }
    
    /**
     * Supprime le message "aucun résultat"
     */
    function removeNoResultsMessage() {
        if (noResultsMessage) {
            noResultsMessage.remove();
            noResultsMessage = null;
        }
    }
    
    /**
     * Met à jour le compteur de chansons affichées
     */
    function updateSongsCount(count) {
        // Utiliser la fonction globale si elle existe (définie dans muz-tags.js)
        if (typeof updateSongCounter === 'function') {
            updateSongCounter(count);
        } else {
            // Fallback au cas où la fonction globale n'est pas disponible
            $('.songs-count').text(count);
        }
    }
    
    /**
     * Efface le champ de recherche et réinitialise l'affichage
     */
    function clearSearch() {
        searchInput.val('');
        performSearch();
        
        // Cacher le bouton d'effacement
        clearButton.hide();
        
        // Remettre le focus sur le champ de recherche
        searchInput.focus();
    }
    
    // Événements
    searchInput.on('input', function() {
        performSearch();
        
        // Montrer/cacher le bouton d'effacement
        if ($(this).val().trim() !== '') {
            clearButton.show();
        } else {
            clearButton.hide();
        }
    });
    
    // Bouton pour effacer la recherche
    clearButton.on('click', function(e) {
        e.preventDefault();
        clearSearch();
    });
    
    // Touche Échap pour effacer la recherche
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && document.activeElement === searchInput[0]) {
            clearSearch();
        }
    });
    
    // Initialisation - cacher le bouton d'effacement
    clearButton.hide();
    
    // Mémoriser le nombre original de chansons
    originalSongsCount = songsList.length;
});