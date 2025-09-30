// Fonctions pour gérer les opérations sur les playlists

/**
 * Affiche une notification à l'utilisateur
 * 
 * @param {string} message Message à afficher
 * @param {string} type Type de notification (success, info, warning, error)
 * @param {boolean} autoDismiss Détermine si la notification se fermera automatiquement
 * @param {number} delay Délai en ms avant la fermeture automatique (défaut: 5000)
 */
function showNotification(message, type = 'info', autoDismiss = true, delay = 5000) {
    // Créer l'élément de notification s'il n'existe pas
    if ($('#notification-container').length === 0) {
        $('body').append('<div id="notification-container" style="position: fixed; top: 20px; right: 20px; z-index: 9999;"></div>');
    }
    
    // Définir la classe en fonction du type
    let alertClass = 'alert-info';
    switch (type) {
        case 'success': alertClass = 'alert-success'; break;
        case 'warning': alertClass = 'alert-warning'; break;
        case 'error': alertClass = 'alert-danger'; break;
    }
    
    // Créer la notification
    const notificationId = 'notification-' + Date.now();
    const notification = $(`
        <div id="${notificationId}" class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `);
    
    // Ajouter au conteneur
    $('#notification-container').append(notification);
    
    // Fermer automatiquement après le délai spécifié si autoDismiss est true
    if (autoDismiss) {
        setTimeout(function() {
            // Utiliser la méthode Bootstrap pour fermer l'alerte
            const alertInstance = new bootstrap.Alert(notification[0]);
            alertInstance.close();
        }, delay);
    }
}

function renamePlaylist(playlistId, newName) {
    $.ajax({
        url: 'api/rename-playlist.php',
        type: 'POST',
        data: {
            playlist_id: playlistId,
            name: newName
        },
        success: function(response) {
            if (response.success) {
                // Recharger la page pour voir les changements
                window.location.reload();
            } else {
                showNotification('Erreur: ' + response.error, 'error');
            }
        },
        error: function() {
            showNotification('Erreur de communication avec le serveur', 'error');
        }
    });
}

function duplicatePlaylist(playlistId, newName) {
    // Afficher une notification de chargement
    showNotification('Duplication en cours...', 'info');
    
    $.ajax({
        url: 'api/duplicate-playlist.php',
        type: 'POST',
        data: {
            playlist_id: playlistId,
            name: newName
        },
        success: function(response) {
            if (response.success) {
                showNotification('Playlist dupliquée avec succès', 'success');
                // Rediriger vers la nouvelle playlist
                window.location.href = 'index.php?playlist=' + response.playlist_id;
            } else {
                showNotification('Erreur: ' + response.error, 'error');
            }
        },
        error: function() {
            showNotification('Erreur de communication avec le serveur', 'error');
        }
    });
}