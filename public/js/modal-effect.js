/**
 * Script pour gérer l'effet de flou lors de l'ouverture/fermeture des modals
 */

$(document).ready(function() {
    // Ajouter la classe do-blur au body quand un modal s'ouvre
    $(document).on('show.bs.modal', '.modal', function() {
        $('body').addClass('do-blur');
    });
    
    // Retirer la classe do-blur du body quand un modal se ferme
    $(document).on('hidden.bs.modal', '.modal', function() {
        // Vérifier si d'autres modals sont toujours ouverts
        if ($('.modal.show').length === 0) {
            $('body').removeClass('do-blur');
        }
    });
});