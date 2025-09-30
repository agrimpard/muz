/**
 * Script pour gérer la suppression des MP3
 */

/**
 * Affiche une notification à l'utilisateur
 * @param {string} message - Le message à afficher
 * @param {string} type - Le type de notification (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // Définir les classes en fonction du type
    let bgClass = 'bg-info';
    let icon = 'fa-info-circle';
    
    switch (type) {
        case 'success':
            bgClass = 'bg-success';
            icon = 'fa-check-circle';
            break;
        case 'error':
            bgClass = 'bg-danger';
            icon = 'fa-exclamation-circle';
            break;
        case 'warning':
            bgClass = 'bg-warning';
            icon = 'fa-exclamation-triangle';
            break;
    }
    
    // Créer le HTML de la notification
    const notificationId = 'notification-' + Date.now();
    const notificationHtml = `
        <div id="${notificationId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas ${icon} me-2"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    // Ajouter au conteneur de notifications (le créer s'il n'existe pas)
    if (!$('#notifications-container').length) {
        $('body').append('<div id="notifications-container" class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 11000;"></div>');
    }
    
    // Ajouter la notification
    $('#notifications-container').append(notificationHtml);
    
    // Afficher la notification
    const toast = new bootstrap.Toast(document.getElementById(notificationId), {
        delay: 3000
    });
    toast.show();
    
    // Supprimer la notification du DOM après sa disparition
    $(`#${notificationId}`).on('hidden.bs.toast', function() {
        $(this).remove();
    });
}

$(document).ready(function() {
    // Gérer le clic sur le bouton de suppression de MP3 dans le modal
    $('#delete-song-btn').click(function() {
        // Récupérer les informations du MP3 à supprimer
        const songId = $('#option-song-id').val();
        const songFilename = $('#option-song-filename').val();
        const songArtist = $('#rename-artist').val();
        const songTitle = $('#rename-title').val();
        
        // Afficher le nom complet du MP3 dans le modal de confirmation
        $('#song-to-delete-info').text(`${songArtist} - ${songTitle}`);
        
        // Stocker les ID et nom de fichier pour la suppression
        $('#song-to-delete-id').val(songId);
        $('#song-to-delete-filename').val(songFilename);
        
        // Fermer le modal de gestion
        $('#songOptionsModal').modal('hide');
        
        // Afficher le modal de confirmation
        $('#deleteSongModal').modal('show');
    });
    
    // Gérer le clic sur le bouton de confirmation de suppression
    $('#confirm-delete-song').click(function() {
        // Récupérer l'ID et le nom du fichier
        const songId = $('#song-to-delete-id').val();
        const songFilename = $('#song-to-delete-filename').val();
        
        // Désactiver le bouton pendant la suppression
        $(this).prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Suppression...');
        
        // Faire la requête AJAX pour supprimer le MP3
        $.ajax({
            url: 'api/delete-song.php',
            type: 'POST',
            data: {
                song_id: songId,
                filename: songFilename
            },
            success: function(response) {
                if (response.success) {
                    // Fermer le modal
                    $('#deleteSongModal').modal('hide');
                    
                    // Supprimer l'élément MP3 de l'interface
                    $('#song-' + songId).fadeOut(300, function() {
                        $(this).remove();
                        
                        // Mettre à jour le compteur de titres dans l'en-tête (i18n)
                        const remainingSongs = $('.mp3-item').length;
                        const tracksWord = (window.i18n && window.i18n.tracks) ? window.i18n.tracks : 'titres';
                        const $title = $('.playlist-title');
                        if ($title.length) {
                            const text = $title.text();
                            const replacement = `(${remainingSongs} ${tracksWord})`;
                            const newText = /\(\s*\d+\s*[^)]*\)/.test(text)
                                ? text.replace(/\(\s*\d+\s*[^)]*\)/, replacement)
                                : `${text} ${replacement}`;
                            $title.text(newText);
                        }
                        
                        // Notification de succès
                        showNotification('Le MP3 a été supprimé avec succès', 'success');
                    });
                } else {
                    // Réactiver le bouton
                    $('#confirm-delete-song').prop('disabled', false).html('Supprimer');
                    
                    // Afficher l'erreur
                    showNotification('Erreur lors de la suppression : ' + (response.error || 'Une erreur est survenue'), 'error');
                }
            },
            error: function(xhr, status, error) {
                // Réactiver le bouton
                $('#confirm-delete-song').prop('disabled', false).html('Supprimer');
                
                console.error('Erreur AJAX :', error);
                showNotification('Erreur lors de la communication avec le serveur', 'error');
            }
        });
    });
    
    // Réinitialiser le bouton lorsque le modal de confirmation est fermé
    $('#deleteSongModal').on('hidden.bs.modal', function() {
        $('#confirm-delete-song').prop('disabled', false).html('Supprimer');
    });
});