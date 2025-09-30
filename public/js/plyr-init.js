/**
 * Configuration de Plyr pour Muz
 * 
 * Ce fichier contient des configurations supplémentaires pour Plyr,
 * mais l'initialisation principale est faite dans muz.js pour éviter
 * la duplication d'instances.
 */

// Définir les options par défaut que le script muz.js pourra utiliser
const plyrDefaultOptions = {
    controls: [
        'play',
        'progress',
        'current-time',
        'mute',
        'volume'
    ],
    seekTime: 10,
    volume: 0.33,
    muted: false,
	invertTime: true,
    toggleIconEnabled: true,
    tooltips: { controls: true, seek: true },
    keyboard: { focused: true, global: false }
};
// Ne pas initialiser ici, car cela sera fait dans muz.js
// L'instance Plyr est stockée dans la variable globale audioPlayer dans muz.js