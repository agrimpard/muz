/**
 * Muz - Gestion des étoiles de notation
 * Permet l'interaction avec les étoiles de notation, notamment l'effet de survol
 */
$(document).ready(function() {
    // Variable pour stocker la notation actuelle de manière fiable
    let currentRating = 0;
    
    /**
     * Initialiser les étoiles quand le modal est ouvert
     * Cela garantit que les étoiles reflètent la note actuelle de la chanson
     */
    $(document).on('shown.bs.modal', '#songOptionsModal', function() {
        // Récupérer la notation actuelle depuis l'affichage
        // Assurer que nous avons une valeur valide en utilisant la valeur stockée dans le bouton de menu
        let rating = parseInt($('#current-rating-display').text());
        if (isNaN(rating)) {
            // Rechercher la notation dans les attributs du bouton qui a ouvert le modal
            const mp3MenuButton = $('.mp3-menu-button[data-id="' + $('#option-song-id').val() + '"]');
            if (mp3MenuButton.length) {
                rating = parseInt(mp3MenuButton.data('rating')) || 0;
                console.log('Notation récupérée du bouton:', rating);
                // Mettre à jour l'affichage pour être sûr
                $('#current-rating-display').text(rating);
            } else {
                rating = 0;
            }
        }
        
        // Stocker la notation actuelle dans notre variable
        currentRating = rating;
        console.log('Modal ouvert, notation initiale:', currentRating);
        
        // Mettre à jour l'apparence des étoiles
        updateStarsDisplay(currentRating);
    });
    
    /**
     * Gestion du survol des étoiles de notation
     */
    $(document).on('mouseenter', '.rating-big-star', function() {
        const hoverRating = $(this).data('rating');
        
        // Mettre à jour l'apparence des étoiles au survol
        $('.rating-big-star').each(function() {
            const starRating = $(this).data('rating');
            
            // Si l'étoile est inférieure ou égale à celle survolée, la remplir
            if (starRating <= hoverRating) {
                $(this).removeClass('far').addClass('fas star-hover');
            } else {
                $(this).removeClass('fas star-hover').addClass('far');
            }
        });
    });
    
    /**
     * Gestion de la sortie du survol (restaurer l'état précédent)
     */
    $(document).on('mouseleave', '.big-stars', function() {
        console.log('Fin du survol, restauration avec la note:', currentRating);
        
        // Restaurer l'état des étoiles selon la note actuelle stockée
        updateStarsDisplay(currentRating);
    });
    
    /**
     * Gestion du clic sur une étoile pour l'animation
     * Note: La mise à jour de la note elle-même est gérée dans muz.js
     */
    $(document).on('click', '.rating-big-star', function() {
        // Ajouter une classe pour l'animation
        $(this).addClass('star-selected');
        
        // Retirer la classe après l'animation
        setTimeout(() => {
            $(this).removeClass('star-selected');
        }, 300);
        
        // Mettre à jour immédiatement l'affichage des étoiles
        const clickedRating = $(this).data('rating');
        // Mettre à jour notre variable de notation actuelle
        currentRating = clickedRating;
        console.log('Nouvelle notation sélectionnée:', currentRating);
        updateStarsDisplay(clickedRating);
    });
    
    /**
     * Fonction utilitaire pour mettre à jour l'affichage des étoiles
     * @param {number} rating - La note à afficher (0-5)
     */
    function updateStarsDisplay(rating) {
        // S'assurer que la note est un nombre valide
        rating = parseInt(rating) || 0;
        console.log('Mise à jour de l\'affichage des étoiles avec la note:', rating);
        
        $('.rating-big-star').each(function() {
            const starRating = parseInt($(this).data('rating'));
            $(this).removeClass('star-hover');
            
            if (starRating <= rating) {
                $(this).removeClass('far').addClass('fas');
            } else {
                $(this).removeClass('fas').addClass('far');
            }
        });
    }
});