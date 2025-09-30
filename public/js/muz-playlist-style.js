/**
 * Script pour gérer l'apparence des éléments de la playlist
 * Applique une bordure en pointillés aux éléments déjà joués
 */
$(document).ready(function() {
    // Fonction pour mettre à jour les bordures des éléments
    function updateItemBorders() {
        // Récupérer l'élément en cours de lecture
        const playingItem = $('.mp3-item.playing');
        
        if (playingItem.length) {
            // Réinitialiser tous les styles de bordure
            $('.mp3-item').css('border', '1px solid #dee2e6');
            
            // Trouver tous les éléments avant celui en cours de lecture
            let previousItems = [];
            let found = false;
            
            $('.mp3-item').each(function() {
                if ($(this).hasClass('playing')) {
                    found = true;
                } else if (!found) {
                    previousItems.push($(this));
                }
            });
            
            // Appliquer la bordure en pointillés aux éléments précédents
            $(previousItems).each(function() {
                $(this).css('border', '1px dashed #dee2e6');
            });
        }
    }
    
    // Observer les changements de classe sur les éléments .mp3-item
    // pour détecter quand un élément devient .playing
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                updateItemBorders();
            }
        });
    });
    
    // Configurer l'observateur pour surveiller les changements de classe
    $('.mp3-item').each(function() {
        observer.observe(this, { attributes: true });
    });
    
    // Appeler la fonction immédiatement en cas d'élément déjà en cours de lecture
    updateItemBorders();
    
    // S'assurer que la fonction est appelée après le chargement du contenu dynamique
    $(document).on('click', '.mp3-item', function() {
        // Petit délai pour laisser le temps à la classe .playing d'être appliquée
        setTimeout(updateItemBorders, 100);
    });
});