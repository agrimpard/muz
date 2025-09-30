/**
 * Script pour vérifier l'existence d'une image et la charger si elle existe
 */

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les diacritiques
        .replace(/\s+/g, '-')            // Remplacer les espaces par -
        .replace(/[^\w\-]+/g, '')        // Enlever les caractères non alphanumériques
        .replace(/\-\-+/g, '-')          // Remplacer les tirets multiples par un seul
        .replace(/^-+/, '')              // Enlever les tirets au début
        .replace(/-+$/, '');             // Enlever les tirets à la fin
}

function checkAndLoadArtistImage(artistName) {
    if (!artistName) {
        // Si pas d'artiste sélectionné, masquer le conteneur d'image
        $('#artist-image-container').removeClass('d-block').addClass('d-none');
        return;
    }
    
    // Slugifier le nom de l'artiste
    const slugifiedArtist = slugify(artistName);
    
    // Construire le chemin de l'image
    const imagePath = `img/gp/${slugifiedArtist}.webp`;
    
    // Vérifier si l'image existe
    $.ajax({
        url: imagePath,
        type: 'HEAD',
        success: function() {
            // Précharger l'image avec un objet Image pour éviter le clignotement
            const img = new Image();
            img.onload = function() {
                // L'image est chargée, maintenant on l'affiche
                $('#artist-image').attr('src', imagePath);
                $('#artist-image-title').text(artistName);
                $('#artist-image-container').removeClass('d-none').addClass('d-block');
            };
            img.src = imagePath;
        },
        error: function() {
            // L'image n'existe pas, masquer le conteneur
            $('#artist-image-container').removeClass('d-block').addClass('d-none');
            console.log(`Image non trouvée pour l'artiste "${artistName}" (slug: ${slugifiedArtist})`);
        }
    });
}

// Exécuter uniquement au chargement de la page
$(document).ready(function() {
    // Vérifier si un artiste est déjà sélectionné (via URL)
    const urlParams = new URLSearchParams(window.location.search);
    const selectedArtist = urlParams.get('artist');
    
    if (selectedArtist) {
        checkAndLoadArtistImage(selectedArtist);
    }
    
    // Nous ne gérons plus l'événement onChange car la page se recharge de toute façon
    // quand un artiste est sélectionné
});