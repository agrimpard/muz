/**
 * Muz - Script JavaScript pour la gestion de la bibliothèque musicale
 */

$(document).ready(function() {
    // Variables globales
    let currentSong = null;
    let currentSongId = null; // Stocke l'ID de la chanson en cours de lecture
    let audioElement = document.getElementById('audio-player');
    let audioPlayer = null; // Stockera l'instance Plyr
    let shuffleMode = false;
    let alphabeticalOrder = false;
    let randomOrder = false;
    let playlistMode = false;
    let customStartTime = null;
    let startTimeEnabled = false; // Indique si le démarrage à un temps spécifique est activé
    let songsList = [];
    let playHistory = []; // Historique des chansons jouées
    let activeFilters = {}; // Stocke les filtres actifs
    let currentBackgroundIndex = 0; // Indice du fond d'écran actuel (1-17)
    
    // Variables pour l'animation du titre
    let titleAnimationId = null; // Identifiant de l'intervalle pour l'animation du titre
    let documentTitleDefault = 'Muz - Bibliothèque musicale'; // Titre par défaut de la page
    let documentTitleCurrent = ''; // Titre courant pour l'animation
    
    // Charger le fond d'écran préféré ou en utiliser un aléatoire
    const savedBackgroundIndex = localStorage.getItem('muz-background-index');
    if (savedBackgroundIndex !== null) {
        const backgroundIndex = parseInt(savedBackgroundIndex);
        $('#background-select').val(backgroundIndex);
        setBackground(backgroundIndex === 0 ? null : backgroundIndex);
    } else {
        setBackground(null); // Utiliser un background aléatoire au démarrage
    }
    
    // Gérer l'écran de chargement existant dans le HTML
    const loadingScreen = $('#loading-screen');
    
    /**
     * Démarre l'animation du titre de la page
     */
    function startTitleAnimation() {
        // Arrêter toute animation existante
        stopTitleAnimation();
        
        // Démarrer une nouvelle animation
        titleAnimationId = setInterval(function() {
            if (documentTitleCurrent && documentTitleCurrent.length > 0) {
                // Faire tourner les caractères du titre
                const firstChar = documentTitleCurrent.charAt(0);
                const restOfTitle = documentTitleCurrent.slice(1);
                documentTitleCurrent = restOfTitle + firstChar;
                document.title = documentTitleCurrent;
            }
        }, 300);
    }
    
    /**
     * Arrête l'animation du titre et restaure le titre par défaut
     */
    function stopTitleAnimation() {
        if (titleAnimationId) {
            clearInterval(titleAnimationId);
            titleAnimationId = null;
        }
        document.title = documentTitleDefault;
    }
    
    // Fermeture au clic sur l'écran de chargement
    loadingScreen.on('click', function() {
        fadeOutLoadingScreen();
    });
    
    // Fonction pour masquer l'écran de chargement avec transition
    function fadeOutLoadingScreen() {
        loadingScreen.css('opacity', 0);
        setTimeout(function() {
            loadingScreen.css('display', 'none');
        }, 500);
    }
    
    // Masquer l'écran de chargement après 2 secondes avec une transition douce
    setTimeout(function() {
        fadeOutLoadingScreen();
    }, 1000);
    
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
    
    /**
     * Initialisation du lecteur et affichage des informations de la première chanson
     */
    function loadFirstSongInfo() {
        // S'assurer que la liste des chansons est chargée
        if (!songsList || songsList.length === 0) {
            refreshSongsList();
        }
        
        // Vérifier si nous avons des chansons
        if (songsList && songsList.length > 0) {
            // Récupérer les informations de la première chanson
            const firstSong = songsList[0];
            const artist = firstSong.artist;
            const title = firstSong.title;
            
            // Mettre à jour les spans dans le lecteur
            $('.player-g').text(artist);
            $('.player-t').text(title);
            
            console.log('Informations de la première chanson chargées:', artist, '-', title);
        }
    }
    
    /**
     * Ajout d'un tag à l'interface utilisateur
     * 
     * @param {number} songId ID de la chanson
     * @param {number} tagId ID du tag
     * @param {string} tagName Nom du tag
     */
    function addTagUI(songId, tagId, tagName) {
        const tagsContainer = $('#tags-' + songId);
        
        // Vérifier si le tag existe déjà
        if ($('#tag-' + songId + '-' + tagId).length > 0) {
            return;
        }
        
        // Créer l'élément caché pour stocker les données
        const isArtist = '0';
        const hiddenTagElement = $('<span id="tag-' + songId + '-' + tagId + '" class="d-none">' +
            '</span>')
            .attr('data-tag-id', tagId)
            .attr('data-tag-name', tagName)
            .attr('data-is-artist', isArtist);
        
        // Ajouter le tag caché au conteneur
        tagsContainer.append(hiddenTagElement);
        
        // Si le modal est ouvert avec cette chanson, mettre à jour l'affichage des tags
        if ($('#option-song-id').val() == songId) {
            const badgeClass = 'badge-info';
            const tagBadge = $('<span class="badge ' + badgeClass + ' tag-badge mr-1">' + 
                tagName + 
                ' <a href="#" class="tag-remove" data-song-id="' + songId + '" data-tag-id="' + tagId + '">'+
                '<i class="fas fa-times"></i></a></span>');
                
            $('#song-tags-list').append(tagBadge);
        }
    }
	
    function initAudioPlayer() {
        // Initialiser Plyr avec les options définies dans plyr-init.js ou des options par défaut
        const options = typeof plyrDefaultOptions !== 'undefined' ? plyrDefaultOptions : {
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
            toggleIconEnabled: true,
            tooltips: { controls: true, seek: true },
            keyboard: { focused: true, global: false }
        };
        
        // Créer l'instance Plyr
        audioPlayer = new Plyr('#audio-player', options);
        try {
            // Exposer l'élément media réel de Plyr pour le visualizer
            window.muzAudioEl = audioPlayer?.media || document.getElementById('audio-player');
            window.dispatchEvent(new Event('muz:audio-el-ready'));
            console.log('[Visualizer] muzAudioEl set:', !!window.muzAudioEl);
        } catch(_) {}

        // Démarrer/arrêter le visualizer en fonction des événements Plyr
        try {
            audioPlayer.on('canplay', function(){
                try { window.muzAudioEl = audioPlayer.media; window.dispatchEvent(new Event('muz:audio-el-ready')); } catch(_) {}
            });
            audioPlayer.on('playing', function(){
                try { window.muzAudioEl = audioPlayer.media; window.dispatchEvent(new Event('muz:audio-el-ready')); } catch(_) {}
                if (typeof window.vizStart === 'function') window.vizStart();
            });
            audioPlayer.on('pause', function(){
                if (typeof window.vizFreeze === 'function') window.vizFreeze();
            });
            audioPlayer.on('ended', function(){ if (typeof window.vizStop === 'function') window.vizStop(); });
        } catch(_) {}
               
        // S'assurer que les informations de la première chanson sont affichées
        // après que la liste des chansons soit rafraîchie
        refreshSongsList();
        loadFirstSongInfo();
        
        // Événement de fin de lecture - lecture automatique de la chanson suivante
        audioPlayer.on('ended', function() {
            // Ne plus réinitialiser le temps de démarrage spécifique automatiquement
            // On garde le mode activé jusqu'à ce que l'utilisateur le désactive manuellement
            playNextSong();
        });
        
        // Événement de mise à jour du temps
        audioPlayer.on('timeupdate', function() {
            updateTimeDisplay();
        });
        
        // Événement de chargement des métadonnées
        audioPlayer.on('loadedmetadata', function() {
            updateDuration();
        });
        
        // Événements pour gérer l'animation du titre
        audioPlayer.on('pause', function() {
            stopTitleAnimation();
            document.title = documentTitleCurrent; // Garder le titre actuel mais arrêter l'animation
        });
        
        audioPlayer.on('play', function() {
            if (currentSongId) { // S'assurer qu'une chanson est en cours
                startTitleAnimation();
            }
        });
        
        // Boutons précédent/suivant
        $('#prev-song').click(function() {
            playPrevSong();
        });
        
        $('#next-song').click(function() {
            playNextSong();
        });
        
        // Sélecteur de fond d'écran
        $('#background-select').change(function() {
            const backgroundIndex = parseInt($(this).val());
            // Si 0, fond aléatoire, sinon fond spécifique
            if (backgroundIndex === 0) {
                setBackground(null);
            } else {
                setBackground(backgroundIndex);
                updateBackgroundPreview(backgroundIndex);
            }
            
            // Sauvegarder la préférence dans localStorage
            localStorage.setItem('muz-background-index', backgroundIndex);
        });
        
        // Clic sur la prévisualisation pour voir l'image en grand dans un nouvel onglet
        $('.background-preview').click(function() {
            if (currentBackgroundIndex > 0) {
                window.open(`img/plyr/bg-${currentBackgroundIndex}.jpg`, '_blank');
            }
        });
        
        // Bouton de mode aléatoire
        $('#toggle-shuffle').click(function() {
            shuffleMode = !shuffleMode;
            $(this).toggleClass('active', shuffleMode);
        });
        
        // Gestion du select de tri
        $('#sort-select').change(function() {
            const sortType = $(this).val();
            console.log('Tri demandé:', sortType);
            
            // Mettre à jour l'URL pour refléter le tri sélectionné
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('sort', sortType);
            
            // Créer une nouvelle URL avec le type de tri
            const newUrl = window.location.pathname + '?' + urlParams.toString();
            
            // Mettre à jour l'URL sans recharger la page
            window.history.pushState({}, '', newUrl);
            
            // S'assurer que la liste des chansons est à jour
            refreshSongsList();
            
            // Effectuer le tri approprié
            switch (sortType) {
                case 'alpha':
                    console.log('Tri alphabétique');
                    alphabeticalOrder = true;
                    randomOrder = false;
                    sortSongsAlphabetically();
                    break;
                case 'recent':
                    console.log('Tri par date');
                    alphabeticalOrder = false;
                    randomOrder = false;
                    sortSongsByRecent();
                    break;
                case 'random':
                    console.log('Tri aléatoire');
                    alphabeticalOrder = false;
                    randomOrder = true;
                    sortSongsRandomly();
                    break;
            }
        });
        
        // Bouton de la barre latérale pour démarrer à un temps spécifique
        $('#sidebar-start-time').click(function() {
            console.log('Bouton temps spécifique cliqué depuis la barre latérale');
            if (currentSongId) {
                // Récupérer les valeurs
                var minutes = parseInt($('#sidebar-start-minutes').val()) || 0;
                var seconds = parseInt($('#sidebar-start-seconds').val()) || 0;
                
                // Appeler la fonction startAtTime
                startAtTime(minutes, seconds);
            } else {
                showNotification('Aucune chanson en cours. Sélectionnez d\'abord une chanson.', 'warning');
            }
        });
        
        // Bouton de la barre latérale pour réinitialiser le temps spécifique
        $('#sidebar-reset-time').click(function() {
            console.log('Réinitialisation du temps spécifique');
            if (startTimeEnabled) {
                // Désactiver le démarrage à temps spécifique
                startTimeEnabled = false;
                customStartTime = null;
                $('#sidebar-start-time').removeClass('btn-dark text-white').addClass('btn-outline-info');
                showNotification('Démarrage à temps spécifique désactivé', 'info');
            }
        });
        
        // Initialiser la liste des chansons
        refreshSongsList();
        
        // Initialiser l'état de la sidebar depuis le localStorage
        initSidebarState();
        
        // Intercepter l'événement play pour lancer la première chanson si aucune n'est en cours
        $(audioPlayer.elements.container).find('.plyr__controls button[data-plyr="play"]').on('click', function() {
            if (!currentSongId && (!audioPlayer.source || audioPlayer.source === '')) {
                console.log('Aucune chanson sélectionnée. Lancement de la première chanson...');
                
                // S'assurer que la liste des chansons est chargée
                if (!songsList || songsList.length === 0) {
                    refreshSongsList();
                }
                
                // Vérifier à nouveau si la liste est disponible
                if (songsList && songsList.length > 0) {
                    // Jouer la première chanson de la liste
                    const firstSong = songsList[0];
                    playSong(firstSong.id, firstSong.filename);
                } else {
                    showNotification('Aucune chanson disponible dans la liste.', 'warning');
                }
            }
        });
	}
    
    /**
     * Initialise l'état de la sidebar en fonction du localStorage
     */
    function initSidebarState() {
        // Vérifier si le localStorage est disponible
        if (typeof localStorage !== 'undefined') {
            // Récupérer l'état de la sidebar
            const sidebarHidden = localStorage.getItem('muz-sidebar-hidden') === 'true';
            
            // Appliquer l'état
            if (sidebarHidden) {
                $('.sidebar').addClass('sidebar-hidden');
                $('#toggle-sidebar').addClass('active');
            }
            
            // Ajouter l'événement de clic sur le bouton
            $('#toggle-sidebar').click(function() {
                $('.sidebar').toggleClass('sidebar-hidden');
                $(this).toggleClass('active');
                
                // Sauvegarder l'état dans le localStorage
                const isHidden = $('.sidebar').hasClass('sidebar-hidden');
                localStorage.setItem('muz-sidebar-hidden', isHidden);
            });
        }
    }
    
    /**
     * Définit un background pour le lecteur audio
     * Utilise les images plyr/bg-1.jpg à plyr/bg-17.jpg
     * @param {number|null} index - Indice spécifique du background (1-17), ou null pour un choix aléatoire
     */
    function setBackground(index = null) {
        const totalBackgrounds = 18; // Mise à jour à 18 backgrounds (1-18)
        
        if (index === null) {
            // Générer un nombre aléatoire entre 1 et 18
            currentBackgroundIndex = Math.floor(Math.random() * totalBackgrounds) + 1;
        } else {
            // Utiliser l'indice spécifié, avec validation
            if (index < 1 || index > totalBackgrounds) {
                index = 1; // Revenir au premier si hors limites
            }
            currentBackgroundIndex = index;
        }
        
        const backgroundImage = `url(img/plyr/bg-${currentBackgroundIndex}.jpg)`;
        
        // Appliquer le background
        $('.audio-container').css('background-image', backgroundImage);
        
        // Mettre à jour la prévisualisation
        updateBackgroundPreview(currentBackgroundIndex);
        
        // Mettre à jour le sélecteur si nécessaire
        if ($('#background-select').val() != (index === null ? '0' : String(currentBackgroundIndex))) {
            $('#background-select').val(index === null ? '0' : currentBackgroundIndex);
        }
        
        console.log('Background appliqué:', backgroundImage, 'Indice:', currentBackgroundIndex);
    }
    
    /**
     * Met à jour la prévisualisation du fond d'écran
     * @param {number} index - Indice du background à prévisualiser
     */
    function updateBackgroundPreview(index) {
        if (index > 0 && index <= 18) {
            const previewImage = `url(img/plyr/bg-${index}.jpg)`;
            $('.background-preview').css('background-image', previewImage);
        } else {
            $('.background-preview').css('background-image', 'none');
        }
    }
    
    /**
     * Définit un background aléatoire pour le lecteur audio
     * Pour compatibilité avec le code existant
     */
    function setRandomBackground() {
        setBackground(null);
    }
    
    // La fonction changeBackground a été remplacée par la sélection directe via le sélecteur

    function loadSongTags(songId) {
        $('#song-tags-list').empty();
        
        // Parcourir les tags cachés de la chanson
        $('#tags-' + songId + ' span').each(function() {
            const tagId = $(this).attr('data-tag-id');
            const tagName = $(this).attr('data-tag-name');
            const isArtist = $(this).attr('data-is-artist') === '1';
            
            if (tagId && tagName) {
                // Créer le badge du tag
                const badgeClass = isArtist ? 'badge-danger' : 'badge-info';
                const tagBadge = $('<span class="badge ' + badgeClass + ' tag-badge mr-1">' + 
                    tagName + 
                    ' <a href="#" class="tag-remove" data-song-id="' + songId + '" data-tag-id="' + tagId + '">'+
                    '<i class="fas fa-times"></i></a></span>');
                    
                $('#song-tags-list').append(tagBadge);
            }
        });
    }
    
    /**
     * Rafraîchit la liste des chansons en mémoire
     */
    function refreshSongsList() {
        // Sauvegarde de l'ancien nombre de chansons pour débogage
        const oldLength = songsList ? songsList.length : 0;
        
        songsList = [];
        
        // Log pour débogage
        console.log('Rafraîchissement de la liste des chansons...');
        
        // Parcourir uniquement les éléments MP3 visibles dans le DOM
        $('.mp3-item:visible').each(function() {
            try {
                const songId = $(this).data('id');
                const filename = $(this).data('filename');
                const artist = $(this).find('.mp3-artist').text().trim();
                const title = $(this).find('.mp3-title').text().trim();
                const dateAdded = parseInt($(this).data('date-added')) || 0;
                
                if (songId && filename) {
                    songsList.push({
                        id: songId,
                        filename: filename,
                        artist: artist,
                        title: title,
                        element: $(this),
                        dateAdded: dateAdded
                    });
                } else {
                    console.warn('MP3 ignoré car ID ou filename manquant:', songId, filename);
                }
            } catch (e) {
                console.error('Erreur lors du traitement d\'un élément MP3:', e);
            }
        });
        
        // Log pour débogage
        console.log('Liste des chansons mise à jour:', songsList.length, 'chansons (précédemment:', oldLength, ')');
        
        return songsList.length > 0;
    }

    // Exposer pour que les autres modules (filtres/recherche) puissent forcer la MAJ
    window.refreshSongsList = refreshSongsList;
    
    /**
     * Trie les chansons par ordre alphabétique d'artiste puis de titre
     */
    function sortSongsAlphabetically() {
        const songsContainer = $('.mp3-grid');
        // Construire la liste complète (y compris masqués) pour ne pas perdre d'éléments
        const allItems = [];
        $('.mp3-item').each(function() {
            allItems.push({
                element: $(this),
                artist: $(this).find('.mp3-artist').text().trim(),
                title: $(this).find('.mp3-title').text().trim()
            });
        });
        // Trier la liste complète
        allItems.sort(function(a, b) {
            const artistCompare = a.artist.localeCompare(b.artist);
            if (artistCompare !== 0) return artistCompare;
            return a.title.localeCompare(b.title);
        });
        // Réorganiser les chansons dans le DOM
        songsContainer.empty();
        for (const item of allItems) {
            songsContainer.append(item.element);
        }
        // Mettre à jour la playlist visible pour le lecteur
        if (typeof window.refreshSongsList === 'function') window.refreshSongsList();
    }
    
    /**
     * Trie les chansons par date d'ajout (du plus récent au plus ancien)
     */
    function sortSongsByRecent() {
        const songsContainer = $('.mp3-grid');
        const allItems = [];
        $('.mp3-item').each(function() {
            allItems.push({
                element: $(this),
                dateAdded: parseInt($(this).data('date-added')) || 0
            });
        });
        allItems.sort(function(a, b) { return b.dateAdded - a.dateAdded; });
        songsContainer.empty();
        for (const item of allItems) {
            songsContainer.append(item.element);
        }
        if (typeof window.refreshSongsList === 'function') window.refreshSongsList();
    }
    
    /**
     * Trie les chansons de façon aléatoire
     */
    function sortSongsRandomly() {
        const songsContainer = $('.mp3-grid');
        const allItems = [];
        $('.mp3-item').each(function() {
            allItems.push({ element: $(this) });
        });
        for (let i = allItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
        }
        songsContainer.empty();
        for (const item of allItems) {
            songsContainer.append(item.element);
        }
        if (typeof window.refreshSongsList === 'function') window.refreshSongsList();
    }
    
    /**
     * Choisit une chanson aléatoire qui n'est pas la chanson actuelle
     */
    function getRandomSong() {
        console.log("Récupération d'une chanson aléatoire...");
        
        // Vérifier si la liste est vide ou non initialisée
        if (!songsList || songsList.length === 0) {
            // Tenter de rafraîchir la liste
            console.log("Liste de chansons vide, actualisation...");
            refreshSongsList();
            if (songsList.length === 0) {
                console.error("Pas de chansons disponibles après actualisation");
                showNotification("Aucune chanson disponible", "error");
                return null;
            }
        }
        
        // Si une seule chanson dans la liste
        if (songsList.length === 1) {
            console.log("Une seule chanson disponible, sélection automatique");
            return songsList[0];
        }
        
        // Filtrer pour exclure la chanson actuelle
        let availableSongs = songsList.filter(song => song.id != currentSong);
        
        // Si après filtrage, aucune chanson différente n'est disponible
        if (availableSongs.length === 0) {
            console.log("Aucune chanson différente disponible, utilisation de la première chanson");
            return songsList[0];
        }
        
        // Sélectionner une chanson aléatoire
        let randomIndex = Math.floor(Math.random() * availableSongs.length);
        let randomSong = availableSongs[randomIndex];
        
        if (!randomSong || !randomSong.id) {
            console.error("Chanson aléatoire invalide sélectionnée");
            return songsList[0]; // Fallback à la première chanson
        }
        
        console.log("Chanson aléatoire sélectionnée:", 
            randomSong.artist ? (randomSong.artist + " - " + randomSong.title) : randomSong.title, 
            "(ID:", randomSong.id, ")");
        
        return randomSong;
    }
    
    /**
     * Met à jour l'affichage du temps de lecture
     */
    function updateTimeDisplay() {
        // S'assurer que l'instance Plyr existe
        if (!audioPlayer) return;
        
        // Utiliser l'API Plyr pour obtenir le temps actuel
        const currentTime = formatTime(audioPlayer.currentTime);
        $('#current-time').text(currentTime);
        
        // Mettre à jour la barre de progression (Plyr gère déjà sa propre barre)
        if (audioPlayer.duration) {
            const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            $('.progress-bar').css('width', percentage + '%');
            
            // Mettre à jour l'indicateur de progression sur l'élément MP3
            if (currentSongId) {
                $('#song-' + currentSongId).find('::after').css('width', percentage + '%');
                // Solution alternative avec une règle CSS
                document.documentElement.style.setProperty('--mp3-progress', percentage + '%');
            }
        }
    }
    
    /**
     * Met à jour la durée totale du morceau
     */
    function updateDuration() {
        // S'assurer que l'instance Plyr existe
        if (!audioPlayer) return;
        
        // Utiliser l'API Plyr pour obtenir la durée
        if (audioPlayer.duration) {
            const duration = formatTime(audioPlayer.duration);
            $('#duration').text(duration);
        }
    }
    
    /**
     * Formate le temps en minutes:secondes
     */
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }
    
    /**
     * Joue la chanson suivante dans la liste
     */
    function playNextSong() {
        console.log("playNextSong appelé. État actuel:", {
            currentSongId: currentSongId,
            songsListLength: songsList ? songsList.length : 0,
            shuffleMode: shuffleMode
        });
        
        // Vérifier s'il y a des chansons disponibles
        if (!songsList || songsList.length === 0) {
            refreshSongsList();
            if (songsList.length === 0) {
                console.error("Impossible de jouer la chanson suivante : liste vide");
                showNotification("Aucune chanson disponible", "error");
                return;
            }
        }
        
        let nextSong = null;
        
        if (shuffleMode) {
            // Mode aléatoire
            nextSong = getRandomSong();
            if (nextSong) {
                // Ajouter la chanson actuelle à l'historique si elle existe
                if (currentSongId) playHistory.push(currentSongId);
                
                // Lire la chanson aléatoire
                playSong(nextSong.id, nextSong.filename);
            } else {
                console.error("Impossible de trouver une chanson aléatoire");
                showNotification("Aucune chanson aléatoire disponible", "error");
            }
        } else {
            // Mode normal (ou alphabétique)
            // Si aucune chanson n'est en cours, prendre la première
            if (!currentSongId) {
                if (songsList.length > 0) {
                    nextSong = songsList[0];
                    playSong(nextSong.id, nextSong.filename);
                }
                return;
            }
            
            // Trouver l'index de la chanson actuelle
            let currentIndex = -1;
            for (let i = 0; i < songsList.length; i++) {
                if (songsList[i].id == currentSongId) {
                    currentIndex = i;
                    break;
                }
            }
            
            // Passer à la chanson suivante
            if (currentIndex !== -1) {
                const nextIndex = (currentIndex + 1) % songsList.length;
                nextSong = songsList[nextIndex];
                playSong(nextSong.id, nextSong.filename);
            } else {
                // Si la chanson actuelle n'est pas trouvée, prendre la première
                if (songsList.length > 0) {
                    nextSong = songsList[0];
                    playSong(nextSong.id, nextSong.filename);
                } else {
                    console.error("Pas de chansons disponibles");
                    showNotification("Aucune chanson disponible", "error");
                }
            }
        }
    }
    
    /**
     * Joue la chanson précédente dans la liste
     */
    function playPrevSong() {
        console.log("playPrevSong appelé. État actuel:", {
            currentSongId: currentSongId,
            songsListLength: songsList ? songsList.length : 0,
            shuffleMode: shuffleMode
        });
        
        // Vérifier s'il y a des chansons disponibles
        if (!songsList || songsList.length === 0) {
            refreshSongsList();
            if (songsList.length === 0) {
                console.error("Impossible de jouer la chanson précédente : liste vide");
                showNotification("Aucune chanson disponible", "error");
                return;
            }
        }
        
        let prevSong = null;
        
        if (shuffleMode) {
            // En mode aléatoire, on joue simplement une autre chanson aléatoire
            // ou la dernière chanson de l'historique si disponible
            if (playHistory.length > 0) {
                const lastSongId = playHistory.pop(); // Retirer la dernière chanson de l'historique
                
                // Trouver la chanson dans la liste
                for (const song of songsList) {
                    if (song.id == lastSongId) {
                        prevSong = song;
                        break;
                    }
                }
                
                if (prevSong) {
                    playSong(prevSong.id, prevSong.filename);
                } else {
                    // Si la chanson n'est pas trouvée dans la liste, en prendre une aléatoire
                    prevSong = getRandomSong();
                    if (prevSong) {
                        playSong(prevSong.id, prevSong.filename);
                    }
                }
            } else {
                // Si l'historique est vide, prendre une chanson aléatoire
                prevSong = getRandomSong();
                if (prevSong) {
                    playSong(prevSong.id, prevSong.filename);
                }
            }
        } else {
            // Mode normal (ou alphabétique)
            // Si aucune chanson n'est en cours, prendre la dernière
            if (!currentSongId) {
                if (songsList.length > 0) {
                    prevSong = songsList[songsList.length - 1];
                    playSong(prevSong.id, prevSong.filename);
                }
                return;
            }
            
            // Trouver l'index de la chanson actuelle
            let currentIndex = -1;
            for (let i = 0; i < songsList.length; i++) {
                if (songsList[i].id == currentSongId) {
                    currentIndex = i;
                    break;
                }
            }
            
            // Passer à la chanson précédente
            if (currentIndex !== -1) {
                const prevIndex = (currentIndex - 1 + songsList.length) % songsList.length;
                prevSong = songsList[prevIndex];
                playSong(prevSong.id, prevSong.filename);
            } else {
                // Si la chanson actuelle n'est pas trouvée, prendre la dernière
                if (songsList.length > 0) {
                    prevSong = songsList[songsList.length - 1];
                    playSong(prevSong.id, prevSong.filename);
                } else {
                    console.error("Pas de chansons disponibles");
                    showNotification("Aucune chanson disponible", "error");
                }
            }
        }
    }
    
    /**
     * Lecture d'une chanson
     * 
     * @param {number} songId ID de la chanson
     * @param {string} filename Nom du fichier
     * @param {number|null} startTime Temps de démarrage en secondes (optionnel)
     */
    function playSong(songId, filename, startTime = null) {
        currentSongId = songId;
        
        // Mémoriser si nous allons démarrer à un temps spécifique
        // Priorité : 1. startTime explicit, 2. Mode persistant (startTimeEnabled), 3. null (début de chanson)
        const timeToStart = startTime !== null ? startTime : (startTimeEnabled ? customStartTime : null);
        console.log('playSong: songId=', songId, 'timeToStart=', timeToStart);
        
        // Construire l'URL de la source audio
        let audioSrc;
        
        // Extraire uniquement le nom du fichier (gestion des chemins avec / ou \)
        const fileBaseName = filename.split('/').pop().split('\\').pop();
        
        // Toujours utiliser file-stream.php pour prendre en charge les chemins multiples
        audioSrc = 'file-stream.php?file=' + encodeURIComponent(fileBaseName);
        
        // Mettre à jour l'apparence du bouton selon l'état du mode temps spécifique
        if (startTimeEnabled) {
            $('#sidebar-start-time').removeClass('btn-outline-info').addClass('btn-dark text-white');
        } else {
            $('#sidebar-start-time').removeClass('btn-dark text-white').addClass('btn-outline-info');
        }
        
    // Préparer le visualizer au changement de piste (attendra un vrai mouvement pour s'afficher)
    try { if (typeof window.vizPrepareTrack === 'function') window.vizPrepareTrack(); } catch(_) {}

    // Arrêter toute lecture en cours avant de changer de source (évite des aborts inutiles)
        try { if (audioPlayer && typeof audioPlayer.pause === 'function') { audioPlayer.pause(); } } catch(e) { /* noop */ }

        // Avec Plyr, on met à jour la source via l'API
        audioPlayer.source = {
            type: 'audio',
            sources: [{
                src: audioSrc,
                type: 'audio/mp3'
            }]
        };
        
        // Définir le gestionnaire d'événements pour le chargement une seule fois
        // Ce handler sera appelé quand le média sera prêt à être lu
        if (timeToStart !== null) {
            console.log('Préparation du démarrage à la position:', timeToStart, 'secondes');
            
            // Ne pas afficher de notification ici car celle-ci sera gérée par startAtTime()
            // Définir une fonction pour appliquer le temps de départ
            // Cette fonction est exécutée une seule fois quand le média est prêt, puis se détache
            // Cela évite les problèmes de double chargement/saccades
            const applyStartTime = function() {
                try {
                    if (audioPlayer && audioPlayer.media) {
                        console.log('Application du temps de départ:', timeToStart);
                        audioPlayer.currentTime = timeToStart;
                    }
                    // Détacher l'événement après utilisation pour éviter les appels multiples
                    audioPlayer.off('canplay', applyStartTime);
                } catch (e) {
                    console.error("Erreur lors de l'application du temps de départ:", e);
                }
            };
            
            // Nettoyer les événements existants pour éviter les doublons et les chargements multiples
            // C'est essentiel pour éviter que plusieurs gestionnaires ne tentent de définir la position
            audioPlayer.off('canplay');
            
            // Écouter l'événement canplay pour appliquer le temps après chargement
            audioPlayer.on('canplay', applyStartTime);
        }
        
        // Lire la chanson avec Plyr (après un micro-délai pour laisser la source s'initialiser)
        setTimeout(() => {
            audioPlayer.play()
                .catch(error => {
                    const msg = (error && error.message) ? error.message : String(error);
                    // Ignorer l'erreur bénigne d'abandon de ressource lors d'un changement de source
                    if (msg.includes('The fetching process for the media resource was aborted') || (error && error.name === 'AbortError')) {
                        console.warn('Lecture interrompue pendant changement de source (sans gravité).');
                        return;
                    }
                    console.error("Erreur lors de la lecture:", error);
                    showNotification("Erreur lors de la lecture: " + msg, "error");
                });
        }, 0);
        
        // Mettre en évidence la chanson active
        $('.mp3-item').removeClass('playing');
        $('#song-' + songId).addClass('playing');
        
        // Afficher le titre en cours
        const artist = $('#song-' + songId + ' .mp3-artist').text();
        const title = $('#song-' + songId + ' .mp3-title').text();
        
        // Mise à jour de l'info de la chanson en cours
        $('.current-song-info').html('<strong>' + artist + '</strong> - ' + title);
        
        // Mettre à jour le titre et démarrer l'animation
        const newTitle = "♫ "+artist+" - "+title+" ";
        documentTitleCurrent = newTitle;
        document.title = newTitle;
        startTitleAnimation();
        
        // Mise à jour des spans player-g et player-t dans le lecteur
        $('.player-g').text(artist);
        $('.player-t').text(title);
    }
    
    /**
     * Démarre la lecture à un temps spécifique
     * Cette fonction active le mode de position spécifique persistant et l'applique à la chanson en cours
     * Le réglage sera conservé pour toutes les chansons suivantes jusqu'à désactivation
     * Déclarée en tant que variable globale pour être accessible depuis l'extérieur
     */
    // Variable pour suivre si une notification a déjà été affichée pour le réglage actuel
    let positionNotificationShown = false;
    
    window.startAtTime = function(minutes, seconds) {
        console.log('startAtTime appelé avec minutes:', minutes, 'secondes:', seconds, 'currentSongId:', currentSongId, 'audioPlayer:', !!audioPlayer);
        
        if (!currentSongId) {
            showNotification('Aucune chanson en cours. Sélectionnez d\'abord une chanson.', 'warning');
            return;
        }
        
        if (!audioPlayer) {
            console.error('Instance Plyr non initialisée');
            showNotification('Erreur: Lecteur audio non initialisé', 'error');
            return;
        }
        
        // Convertir en nombre pour éviter les erreurs
        minutes = parseInt(minutes) || 0;
        seconds = parseInt(seconds) || 0;
        
        // Sauvegarder le temps de démarrage pour les lectures futures
        customStartTime = (minutes * 60) + seconds;
        startTimeEnabled = true; // Activer le mode temps spécifique pour toutes les chansons
        
        // Réinitialiser le drapeau de notification
        positionNotificationShown = false;
        
        // Mettre à jour l'apparence du bouton dans la barre latérale
        $('#sidebar-start-time').removeClass('btn-outline-info').addClass('btn-dark text-white');
        console.log('Temps spécifique activé et persistant:', customStartTime, 'secondes');
        
        // S'assurer que le temps n'est pas supérieur à la durée de la chanson
        if (audioPlayer && audioPlayer.duration && customStartTime > audioPlayer.duration) {
            customStartTime = 0;
            showNotification('Temps de démarrage supérieur à la durée de la chanson. La lecture commence au début.', 'warning');
        }
        
        try {
            // Mettre en pause avant de changer la position
            audioPlayer.pause();
            
            // Définir le nouveau temps
            audioPlayer.currentTime = customStartTime;
            
            // Afficher une notification indiquant la persistance du mode (une seule fois)
            if (!positionNotificationShown) {
                showNotification('Lecture positionnée à ' + minutes + ':' + 
                    (seconds < 10 ? '0' : '') + seconds + 
                    ' (ce réglage sera appliqué à toutes les chansons jusqu\'à désactivation)', 'info');
                positionNotificationShown = true;
            }
            
            // Après un court délai pour permettre au lecteur de traiter le changement
            setTimeout(() => {
                // Relancer la lecture
                audioPlayer.play()
                    .catch(error => {
                        console.error("Erreur lors de la reprise de lecture:", error);
                        showNotification("Erreur lors de la reprise: " + error.message, "error");
                    });
            }, 100);
            
            console.log('Lecture positionnée à:', minutes, 'min', seconds, 'sec');
        } catch (error) {
            console.error("Erreur lors du positionnement du temps:", error);
            showNotification("Erreur lors du positionnement: " + error.message, "error");
        }
    }
    
    /**
     * Mise à jour de la note d'une chanson
     * 
     * @param {number} songId ID de la chanson
     * @param {number} rating Note (1-5)
     */
    function updateRating(songId, rating) {
        $.ajax({
            url: 'api/set-rating.php',
            type: 'POST',
            data: {
                song_id: songId,
                rating: rating
            },
            success: function(response) {
                if (response.success) {
                    // Mettre à jour l'interface utilisateur
                    updateRatingUI(songId, rating);
                } else {
                    alert('Erreur : ' + response.error);
                }
            },
            error: function() {
                alert('Erreur lors de la mise à jour de la note');
            }
        });
    }
    
    /**
     * Mise à jour de l'interface utilisateur pour la note
     * 
     * @param {number} songId ID de la chanson
     * @param {number} rating Note (1-5)
     */
    function updateRatingUI(songId, rating) {
        // Mettre à jour l'affichage de la note dans l'élément MP3
        const mp3Item = $('#song-' + songId);
        const ratingContainer = mp3Item.find('.mp3-rating');
        
        if (ratingContainer.length === 0) {
            // Créer le conteneur de notes s'il n'existe pas
            const newRatingContainer = $('<div class="mp3-rating"></div>');
            for (let i = 1; i <= rating; i++) {
                newRatingContainer.append('<i class="fas fa-star rating-star-small"></i>');
            }
            mp3Item.append(newRatingContainer);
        } else {
            // Mettre à jour le conteneur existant
            ratingContainer.empty();
            for (let i = 1; i <= rating; i++) {
                ratingContainer.append('<i class="fas fa-star rating-star-small"></i>');
            }
            
            // Si la note est 0, supprimer le conteneur
            if (rating === 0) {
                ratingContainer.remove();
            }
        }
        
        // Mettre à jour l'attribut data de l'élément du menu
        mp3Item.find('.mp3-menu-button').attr('data-rating', rating);
    }
    
    /**
     * Ajout d'un tag à une chanson
     * 
     * @param {number} songId ID de la chanson
     * @param {string} tagName Nom du tag
     */
    function addTag(songId, tagName) {
        $.ajax({
            url: 'api/add-tag.php',
            type: 'POST',
            dataType: 'json',
            data: {
                song_id: songId,
                tag_name: tagName
            },
            success: function(response) {
                if (response && response.success) {
                    // Ajouter le tag à l'interface utilisateur
                    addTagUI(songId, response.tag.id, response.tag.name);
                    // Ajouter le tag aux filtres latéraux si absent
                    if (typeof window.addFilterTag === 'function') {
                        window.addFilterTag(response.tag.id, response.tag.name);
                    }
                    
                    // Vider le champ de saisie
                    $('#tag-input-' + songId).val('');
                } else {
                    const err = (response && response.error) ? response.error : (window.i18n?.unknown_error || 'Erreur inconnue');
                    alert((window.i18n?.error || 'Erreur') + ' : ' + err);
                }
            },
            error: function() {
                alert(window.i18n?.add_tag_error || 'Erreur lors de l\'ajout du tag');
            }
        });
    }
    
    /**
     * Suppression d'un tag d'une chanson
     * 
     * @param {number} songId ID de la chanson
     * @param {number} tagId ID du tag
     */
    function removeTag(songId, tagId) {
        $.ajax({
            url: 'api/remove-tag.php',
            type: 'POST',
            dataType: 'json',
            data: {
                song_id: songId,
                tag_id: tagId
            },
            success: function(response) {
                if (response && response.success) {
                    // Supprimer le tag de l'interface utilisateur (élément caché et affichage modal)
                    $('#tag-' + songId + '-' + tagId).remove();
                    
                    // Mettre à jour l'icône des tags sur l'élément MP3
                    updateTagsIcon(songId);
                    
                    // Si le modal est ouvert avec cette chanson, mettre à jour l'affichage
                    if ($('#option-song-id').val() == songId) {
                        // Chercher le tag dans la liste affichée et le supprimer
                        $('#song-tags-list').find('a.tag-remove').each(function() {
                            if ($(this).data('song-id') == songId && $(this).data('tag-id') == tagId) {
                                $(this).closest('span.badge').remove();
                            }
                        });
                    }
                } else {
                    const err = (response && response.error) ? response.error : (window.i18n?.unknown_error || 'Erreur inconnue');
                    alert((window.i18n?.error || 'Erreur') + ' : ' + err);
                }
            },
            error: function() {
                alert(window.i18n?.remove_tag_error || 'Erreur lors de la suppression du tag');
            }
        });
    }
    
    /**
     * Ajout d'un tag à l'interface utilisateur
     * 
     * @param {number} songId ID de la chanson
     * @param {number} tagId ID du tag
     * @param {string} tagName Nom du tag
     */
    function addTagUI(songId, tagId, tagName) {
        const tagsContainer = $('#tags-' + songId);
        
        // Vérifier si le tag existe déjà
        if ($('#tag-' + songId + '-' + tagId).length > 0) {
            return;
        }
        
        // Créer l'élément caché pour stocker les données
        const isArtist = '0';
        const hiddenTagElement = $('<span id="tag-' + songId + '-' + tagId + '" class="d-none"></span>')
            .attr('data-tag-id', tagId)
            .attr('data-tag-name', tagName)
            .attr('data-is-artist', isArtist);
        
        // Ajouter le tag caché au conteneur
        tagsContainer.append(hiddenTagElement);
        
        // Mettre à jour l'icône des tags sur l'élément MP3
        updateTagsIcon(songId);
        
        // Si le modal est ouvert avec cette chanson, mettre à jour l'affichage des tags
        if ($('#option-song-id').val() == songId) {
            const badgeClass = 'badge-info';
            const tagBadge = $('<span class="badge ' + badgeClass + ' tag-badge mr-1">' + 
                tagName + 
                ' <a href="#" class="tag-remove" data-song-id="' + songId + '" data-tag-id="' + tagId + '">'+
                '<i class="fas fa-times"></i></a></span>');
                
            $('#song-tags-list').append(tagBadge);
        }
    }
    
    /**
     * Renommage d'une chanson
     * 
     * @param {number} songId ID de la chanson
     * @param {string} artist Nouvel artiste
     * @param {string} title Nouveau titre
     */
    function renameSong(songId, artist, title) {
        $.ajax({
            url: 'api/rename-song.php',
            type: 'POST',
            data: {
                song_id: songId,
                artist: artist,
                title: title
            },
            success: function(response) {
                if (response.success) {
                    // Mettre à jour l'interface utilisateur
                    const songItem = $('#song-' + songId);
                    songItem.find('.mp3-artist').text(response.song.artist);
                    songItem.find('.mp3-title').text(response.song.title);
                    
                    // Mettre à jour les attributs data-* du bouton de menu
                    songItem.find('.mp3-menu-button')
                        .data('artist', response.song.artist)
                        .data('title', response.song.title)
                        .attr('data-artist', response.song.artist)
                        .attr('data-title', response.song.title);
                        
                    // Mettre à jour l'attribut data-filename
                    songItem
                        .data('filename', response.song.filename)
                        .attr('data-filename', response.song.filename);
                    
                    // Fermer le modal
                    $('#renameModal').modal('hide');
                    
                    // Mettre à jour la liste des chansons en mémoire
                    refreshSongsList();
                    
                    // Si tri alphabétique actif, retrier
                    if (alphabeticalOrder) {
                        sortSongsAlphabetically();
                    }
                } else {
                    alert('Erreur : ' + response.error);
                }
            },
            error: function() {
                alert('Erreur lors du renommage de la chanson');
            }
        });
    }
    
    /**
     * Création d'une playlist
     * 
     * @param {string} name Nom de la playlist
     * @param {string} description Description de la playlist
     */
    function createPlaylist(name, description) {
        // Validation des données
        if (!name || name.trim() === '') {
            showNotification(window.i18n?.playlist_name_required || 'Le nom de la playlist ne peut pas être vide', 'error');
            return;
        }
        
        console.log('Tentative de création de playlist:', {name, description});
        
        // Afficher un indicateur de chargement
        const createBtn = $('#create-playlist-submit');
        const originalText = createBtn.text();
    createBtn.prop('disabled', true).text(window.i18n?.creating || 'Création en cours...');
        
        // Utiliser le chemin API correct - relatif par rapport au document HTML actuel
        const apiUrl = 'api/create-playlist.php'; // Depuis /muz/ai/public/ vers /muz/ai/public/api/
        console.log('URL de l\'API:', apiUrl);
        
        // Créer un formulaire FormData pour envoyer des données multipart/form-data
        // Cela est plus fiable pour les serveurs PHP que le format application/x-www-form-urlencoded
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        
        // Effectuer une requête "à l'ancienne" pour plus de compatibilité
        const xhr = new XMLHttpRequest();
        xhr.open('POST', apiUrl, true);
        
        xhr.onload = function() {
            // Réinitialiser le bouton
            createBtn.prop('disabled', false).text(originalText);
            
            if (xhr.status >= 200 && xhr.status < 300) {
                // Nettoyer BOM + espaces en début
                let raw = xhr.responseText || '';
                if (raw.charCodeAt(0) === 0xFEFF) { raw = raw.slice(1); }
                const cleaned = raw.replace(/^\uFEFF/, '').trimStart();

                // Vérifier Content-Type et/ou signature HTML
                const ct = (xhr.getResponseHeader('Content-Type') || '').toLowerCase();
                const looksHtml = cleaned.startsWith('<!DOCTYPE') || cleaned.startsWith('<html');
                if (ct.indexOf('application/json') === -1 && looksHtml) {
                    console.error('Erreur: La réponse est une page HTML au lieu de JSON');
                    console.log('Début de la réponse HTML:', cleaned.substring(0, 200));
                    showNotification((window.i18n?.server_returned_html || 'Erreur: Le serveur a renvoyé une page HTML au lieu de JSON'), 'error');
                    return;
                }
                
                // Tenter de parser la réponse comme JSON
                try {
                    const response = JSON.parse(cleaned);
                    console.log('Réponse JSON parsée avec succès:', response);
                    
                    if (response.success) {
                        if (response.playlist && response.playlist.id && response.playlist.name) {
                            // Créer manuellement l'élément de playlist dans l'interface utilisateur
                            // au lieu d'utiliser addPlaylistUI pour éviter d'autres problèmes
                            const playlistId = response.playlist.id;
                            const playlistName = response.playlist.name;
                            
                            if ($('#playlist-select option[value="' + playlistId + '"]').length === 0) {
                                const safePlaylistName = playlistName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                
                                // Ajouter l'option au select
                                const playlistOption = $('<option value="' + playlistId + '" data-name="' + safePlaylistName + '">' + safePlaylistName + '</option>');
                                $('#playlist-select').append(playlistOption);
                                
                                // Ajouter à la liste cachée pour compatibilité
                                const hiddenPlaylistItem = $('<li data-id="' + playlistId + '" data-name="' + safePlaylistName + '"></li>');
                                $('#playlists-list').append(hiddenPlaylistItem);
                                
                                // Ajouter aussi dans le modal song options pour sélection sans reload
                                if ($('#modal-playlists-list li .add-to-playlist-btn[data-playlist-id="' + playlistId + '"]').length === 0) {
                                    const $li = $('<li class="list-group-item d-flex justify-content-between align-items-center rounded"></li>');
                                    $li.append(document.createTextNode(playlistName));
                                    const $btn = $('<button class="btn btn-sm btn-outline-primary add-to-playlist-btn" data-playlist-id="' + playlistId + '"></button>')
                                        .text(window.i18n?.add_to_playlist || 'Ajouter')
                                        .attr('data-playlist-id', playlistId);
                                    $li.append($btn);
                                    $('#modal-playlists-list').append($li);
                                }
                            }
                            
                            // Fermer le modal et nettoyer les champs
                            $('#createPlaylistModal').modal('hide');
                            $('#playlist-name').val('');
                            $('#playlist-description').val('');
                            
                            const createdMsg = (window.i18n?.playlist_created || 'Playlist créée');
                            showNotification(createdMsg + ' "' + playlistName + '"', 'success');
                        } else {
                            console.error('Données de playlist incomplètes:', response);
                            showNotification(window.i18n?.incomplete_playlist_data || 'Erreur: Données de playlist incomplètes', 'error');
                        }
                    } else {
                        const errorMsg = response.error || (window.i18n?.unknown_error || 'Erreur inconnue');
                        showNotification((window.i18n?.error || 'Erreur') + ': ' + errorMsg, 'error');
                    }
                } catch (e) {
                    console.error('Erreur de parsing JSON:', e);
                    console.log('Réponse brute complète:', xhr.responseText);
                    showNotification(window.i18n?.invalid_server_response || 'Erreur: Réponse serveur non valide', 'error');
                }
            } else {
                console.error('Erreur HTTP:', xhr.status, xhr.statusText);
                const httpMsg = (window.i18n?.http_error || 'Erreur HTTP') + ' ' + xhr.status + ': ' + xhr.statusText;
                showNotification(httpMsg, 'error');
            }
        };
        
        xhr.onerror = function() {
            createBtn.prop('disabled', false).text(originalText);
            console.error('Erreur réseau');
            showNotification(window.i18n?.network_error_communication || 'Erreur réseau lors de la communication avec le serveur', 'error');
        };
        
        xhr.send(formData);
    }
    
    /**
     * Suppression d'une playlist
     * 
     * @param {number} playlistId ID de la playlist
     */
    function deletePlaylist(playlistId) {
        $.ajax({
            url: 'api/delete-playlist.php',
            type: 'POST',
            data: {
                playlist_id: playlistId
            },
            success: function(response) {
                if (response.success) {
                    // Si on est sur la page de la playlist supprimée, rediriger vers la page d'accueil
                    const currentPlaylistId = new URLSearchParams(window.location.search).get('playlist');
                    if (currentPlaylistId == playlistId) {
                        window.location.href = 'index.php';
                    } else {
                        // Supprimer la playlist du menu déroulant et de la liste cachée
                        $(`#playlist-select option[value="${playlistId}"]`).remove();
                        $(`#playlists-list li[data-id="${playlistId}"]`).remove();
                        showNotification('Playlist supprimée', 'success');
                    }
                } else {
                    showNotification('Erreur : ' + (response.error || 'Une erreur est survenue'), 'error');
                }
            },
            error: function() {
                alert('Erreur lors de la suppression de la playlist');
            }
        });
    }
    
    /**
     * Ajout d'une chanson à une playlist
     * 
     * @param {number} songId ID de la chanson
     * @param {number} playlistId ID de la playlist
     */
    function addSongToPlaylist(songId, playlistId) {
        $.ajax({
            url: 'api/add-to-playlist.php',
            type: 'POST',
            data: {
                song_id: songId,
                playlist_id: playlistId
            },
            success: function(response) {
                if (response.success) {
                    // Utiliser la notification au lieu d'une alerte
                    showNotification('Chanson ajoutée à la playlist avec succès', 'success');
                    
                    // Mettre à jour le bouton pour montrer que la chanson est dans la playlist
              const button = $('#modal-playlists-list li .add-to-playlist-btn[data-playlist-id="' + playlistId + '"]');
              button.removeClass('btn-outline-primary')
                  .addClass('btn-danger')
                  .text(window.i18n?.remove_from_playlist || 'Retirer')
                  .data('in-playlist', true);

                    // Mettre à jour l'attribut data-playlist-ids de l'élément MP3
                    const $item = $('#song-' + songId);
                    let ids = ($item.attr('data-playlist-ids') || '').trim();
                    let arr = ids ? ids.split(',').map(s => s.trim()).filter(Boolean) : [];
                    if (!arr.includes(String(playlistId))) {
                        arr.push(String(playlistId));
                        $item.attr('data-playlist-ids', arr.join(','));
                    }

                    // Si un filtre playlist est actif, refiltrer pour rendre visible
                    if (typeof window.getPlaylistFilter === 'function' && typeof window.filterMp3Items === 'function') {
                        const activePl = window.getPlaylistFilter();
                        if (activePl) {
                            window.filterMp3Items();
                        }
                    }
                } else {
                    const errorMsg = response.error || 'Erreur inconnue';
                    showNotification('Erreur : ' + errorMsg, 'error');
                }
            },
            error: function(xhr, status, error) {
                console.error('Erreur AJAX:', error);
                showNotification('Erreur lors de l\'ajout de la chanson à la playlist', 'error');
            }
        });
    }
    
    /**
     * Suppression d'une chanson d'une playlist
     * 
     * @param {number} songId ID de la chanson
     * @param {number} playlistId ID de la playlist
     */
    function removeSongFromPlaylist(songId, playlistId) {
        $.ajax({
            url: 'api/remove-from-playlist.php',
            type: 'POST',
            data: {
                song_id: songId,
                playlist_id: playlistId
            },
            success: function(response) {
                if (response.success) {
                    // Supprimer la chanson de l'interface utilisateur
                    $('#song-' + songId).remove();
                    
                    // Mettre à jour le compteur de titres dans l'en-tête
                    try {
                        const wrapper = document.querySelector('.songs-container h3 .playlist-title');
                        const isPlaylist = !!wrapper;
                        const count = document.querySelectorAll('.mp3-grid .mp3-item').length;
                        const tracksWord = (window.i18n?.tracks || 'titres');
                        if (isPlaylist) {
                            const el = document.querySelector('.songs-container h3 .playlist-title');
                            if (el) {
                                el.parentElement.innerHTML = el.parentElement.innerHTML.replace(/\([^)]*\)/, '(' + count + ' ' + tracksWord + ')');
                            }
                        } else {
                            const el = document.querySelector('.songs-container h3 .playlist-title');
                            if (el) {
                                el.parentElement.innerHTML = el.parentElement.innerHTML.replace(/\([^)]*\)/, '(' + count + ' ' + tracksWord + ')');
                            }
                        }
                    } catch(e) { /* noop */ }
                    
                    // Mettre à jour la liste des chansons en mémoire
                    refreshSongsList();
                } else {
                    alert('Erreur : ' + response.error);
                }
            },
            error: function() {
                alert('Erreur lors de la suppression de la chanson de la playlist');
            }
        });
    }
    
    /**
     * Vérifie si une chanson est présente dans des playlists et met à jour l'interface
     * 
     * @param {number} songId ID de la chanson
     */
    function checkSongInPlaylists(songId) {
        // Réinitialiser l'état de tous les boutons de playlist dans le modal
        $('#modal-playlists-list li').each(function() {
            const button = $(this).find('.add-to-playlist-btn');
        button.removeClass('btn-success btn-danger btn-outline-primary')
            .addClass('btn-outline-primary')
            .text(window.i18n?.add_to_playlist || 'Ajouter')
                  .data('in-playlist', false);
        });
        
        // Récupérer les playlists contenant cette chanson
        $.ajax({
            url: 'api/get-song-playlists.php',
            type: 'GET',
            data: {
                song_id: songId
            },
            success: function(response) {
                if (response.success && response.playlists) {
                    // Marquer les playlists qui contiennent déjà la chanson
                    response.playlists.forEach(function(playlistId) {
                const button = $('#modal-playlists-list li .add-to-playlist-btn[data-playlist-id="' + playlistId + '"]');
                button.removeClass('btn-outline-primary btn-success')
                    .addClass('btn-danger')
                    .text(window.i18n?.remove_from_playlist || 'Retirer')
                    .data('in-playlist', true);
                    });
                }
            },
            error: function() {
                console.error('Erreur lors de la récupération des playlists de la chanson');
            }
        });
    }
    
    /**
     * Ajout d'une playlist à l'interface utilisateur
     * 
     * @param {number} playlistId ID de la playlist
     * @param {string} playlistName Nom de la playlist
     */
    function addPlaylistUI(playlistId, playlistName) {
        if (!playlistId || !playlistName) {
            console.error('addPlaylistUI: paramètres invalides', playlistId, playlistName);
            return;
        }
        
        // Échapper les caractères spéciaux pour éviter les problèmes d'insertion HTML
        const safePlaylistName = $('<div>').text(playlistName).html();
        
        // Vérifier si la playlist existe déjà dans le select
        if ($('#playlist-select option[value="' + playlistId + '"]').length > 0) {
            console.log('La playlist existe déjà dans l\'interface');
            return;
        }
        
        // Ajouter la playlist à la liste cachée pour la compatibilité
        const hiddenPlaylistItem = $('<li data-id="' + playlistId + '" data-name="' + safePlaylistName + '"></li>');
        $('#playlists-list').append(hiddenPlaylistItem);
        
        // Ajouter la playlist au menu déroulant
        const playlistOption = $('<option value="' + playlistId + '" data-name="' + safePlaylistName + '">' + safePlaylistName + '</option>');
        $('#playlist-select').append(playlistOption);
        
        console.log('Playlist ajoutée à l\'interface:', playlistId, playlistName);
    }
    
    // -------------------------------------------------------------------------
    // Événements
    // -------------------------------------------------------------------------
    
    // Lecture d'une chanson ou pause en cliquant sur un MP3
    $(document).on('click', '.mp3-item', function(e) {
        // Ne pas déclencher si on a cliqué sur le bouton de menu
        if ($(e.target).hasClass('mp3-menu-button') || $(e.target).closest('.mp3-menu-button').length) {
            return;
        }
        
        const songId = $(this).data('id');
        const filename = $(this).data('filename');
        
        // Si on clique sur la chanson déjà en cours, alterner lecture/pause
        if (currentSongId == songId) {
            if (audioPlayer.paused) {
                audioPlayer.play()
                    .catch(error => {
                        console.error("Erreur lors de la reprise de lecture:", error);
                        showNotification("Erreur lors de la reprise: " + error.message, "error");
                    });
            } else {
                audioPlayer.pause();
            }
        } else {
            // Sinon, lancer la nouvelle chanson
            // Le mode temps spécifique est maintenu entre les chansons
            console.log('Changement de chanson, conservation du mode temps spécifique:', startTimeEnabled, customStartTime);
            
            playSong(songId, filename);
        }
    });
    
    // Notation d'une chanson (clic sur une étoile)
    // Note: le style et l'animation sont gérés par muz-rating.js
    // Ici on ne gère que la mise à jour de la BDD
    $(document).on('click', '.rating-big-star', function() {
        const songId = $('#option-song-id').val();
        const rating = $(this).data('rating');
        
        // Enregistrer la note dans la base de données
        updateRating(songId, rating);
        
        // Mettre à jour l'affichage du texte
        $('#current-rating-display').text(rating);
    });
    
    // Soumission du formulaire d'ajout de tag
    $(document).on('submit', '#add-tag-form', function(e) {
        e.preventDefault();
        
        const songId = $('#option-song-id').val();
        const tagInput = $('#new-tag-input').val().trim();
        
        if (tagInput !== '') {
            // Séparer les tags par espace
            const tags = tagInput.split(' ').filter(tag => tag !== '');
            
            // Ajouter chaque tag individuellement
            tags.forEach(function(tag) {
                if (tag !== '') {
                    addTag(songId, tag);
                }
            });
            
            $('#new-tag-input').val(''); // Vider le champ
        }
    });
    
    // Suppression d'un tag
    $(document).on('click', '.tag-remove', function(e) {
        e.preventDefault();
        
        const songId = $(this).data('song-id');
        const tagId = $(this).data('tag-id');
        
        removeTag(songId, tagId);
        // Mettre à jour l'icône des tags immédiatement (sans attendre la réponse AJAX)
        updateTagsIcon(songId);
    });
    
    // Clic sur un tag suggéré pour l'ajouter au champ de saisie
    $(document).on('click', '.suggested-tag', function(e) {
        e.preventDefault();
        
        const tagName = $(this).text();
        const songId = $('#option-song-id').val();
        
        // Ajouter le tag directement
        if (tagName && songId) {
            addTag(songId, tagName);
        }
    });
    
    // Clic sur le bouton de menu d'un MP3
    $(document).on('click', '.mp3-menu-button', function(e) {
        e.stopPropagation();
        
        const songId = $(this).data('id');
        const artist = $(this).data('artist');
        const title = $(this).data('title');
        const rating = $(this).data('rating');
        const filename = $(this).data('filename');
        
        // Remplir les données du modal
        $('#option-song-id').val(songId);
        $('#option-song-filename').val(filename);
        $('#rename-artist').val(artist);
        $('#rename-title').val(title);
        $('#current-rating-display').text(rating);
        
        // Pas besoin d'initialiser les étoiles ici, muz-rating.js le fera lors de l'ouverture du modal
        
        // Charger les tags de la chanson
        loadSongTags(songId);
        
        // Vérifier dans quelles playlists la chanson est déjà présente
        checkSongInPlaylists(songId);
        
        // Afficher le modal
        $('#songOptionsModal').modal('show');
    });
    
    // Soumission du formulaire de renommage
    $('#rename-form').submit(function(e) {
        e.preventDefault();
        
        const songId = $('#option-song-id').val();
        const artist = $('#rename-artist').val().trim();
        const title = $('#rename-title').val().trim();
        
        if (artist !== '' && title !== '') {
            renameSong(songId, artist, title);
        }
    });
    
    // Ouverture du modal de création de playlist
    $(document).on('click', '#create-playlist-btn', function() {
        $('#createPlaylistModal').modal('show');
    });
    
    // Soumission du formulaire de création de playlist
    $('#create-playlist-form').submit(function(e) {
        e.preventDefault();
        
        const name = $('#playlist-name').val().trim();
        const description = $('#playlist-description').val().trim();
        
        if (name !== '') {
            createPlaylist(name, description);
        }
    });
    
    // Changement de playlist via le select
    $('#playlist-select').change(function() {
        const playlistId = $(this).val();
        
        if (playlistId === '') {
            // Si "Pas de playlist" est sélectionné
            window.location.href = 'index.php';
        } else {
            // Redirection vers la playlist sélectionnée
            window.location.href = 'index.php?playlist=' + playlistId;
        }
    });
    
    // Changement d'artiste via le select
    $('#artist-select').change(function() {
        const artist = $(this).val();
        
        // Exigence: activer tous les tags, désélectionner la note et la playlist
        try {
            // Réinitialiser exclusions de tags
            if (typeof window.localStorage !== 'undefined') {
                localStorage.setItem('muz-excluded-tags', JSON.stringify([]));
                localStorage.setItem('muz-rating-filter', '');
                localStorage.removeItem('muz-playlist-filter');
            }
            // Mettre à jour UI côté client si présents
            if (typeof window.updateTagStyles === 'function') window.updateTagStyles();
            if ($('#rating-select').length) $('#rating-select').val('');
            if ($('#playlist-select').length) $('#playlist-select').val('');
        } catch(e) { /* noop */ }

        if (artist === '') {
            // Si "Tous les artistes" est sélectionné, on supprime le filtre
            let url = window.location.pathname;
            
            // Conserver les autres paramètres
            const params = new URLSearchParams(window.location.search);
            params.delete('artist');
            
            if (params.toString()) {
                url += '?' + params.toString();
            }
            
            window.location.href = url;
            return;
        }
        
        // Sinon, on filtre par l'artiste sélectionné
        // Construire nouvelle URL avec uniquement l'artiste (sans rating/tag/playlist)
        let url = window.location.pathname + '?artist=' + encodeURIComponent(artist);
        window.location.href = url;
    });
    
    // Ouverture du modal de suppression de playlist (ancien bouton)
    $(document).on('click', '#delete-current-playlist', function(e) {
        e.stopPropagation();
        
        const playlistId = $('#playlist-select').val();
        const playlistName = $('#playlist-select option:selected').text();
        
        if (playlistId) {
            $('#playlist-to-delete-id').val(playlistId);
            $('#playlist-to-delete-name').text(playlistName);
            $('#deletePlaylistModal').modal('show');
        } else {
            showNotification('Aucune playlist sélectionnée', 'warning');
        }
    });
    
    // Gestionnaire pour le bouton de suppression dans le songs-container
    $(document).on('click', '.delete-playlist-btn', function(e) {
        e.preventDefault();
        
        // Récupérer l'ID et le nom directement depuis les attributs data
        const playlistId = $(this).data('playlist-id');
        const playlistName = $(this).data('playlist-name');
        
        if (playlistId) {
            $('#playlist-to-delete-id').val(playlistId);
            $('#playlist-to-delete-name').text(playlistName);
            $('#deletePlaylistModal').modal('show');
        } else {
            showNotification('Erreur: impossible d\'identifier la playlist', 'error');
        }
    });
    
    // Gestionnaire pour le bouton de renommage de playlist
    $(document).on('click', '.rename-playlist-btn', function(e) {
        e.preventDefault();
        
        // Récupérer l'ID et le nom directement depuis les attributs data
        const playlistId = $(this).data('playlist-id');
        const playlistName = $(this).data('playlist-name');
        
        if (playlistId) {
            $('#playlist-to-rename-id').val(playlistId);
            $('#new-playlist-name').val(playlistName);
            $('#renamePlaylistModal').modal('show');
        } else {
            showNotification('Erreur: impossible d\'identifier la playlist', 'error');
        }
    });
    
    // Gestionnaire pour le bouton de duplication de playlist
    $(document).on('click', '.duplicate-playlist-btn', function(e) {
        e.preventDefault();
        
        // Récupérer l'ID et le nom directement depuis les attributs data
        const playlistId = $(this).data('playlist-id');
        const playlistName = $(this).data('playlist-name');
        
        if (playlistId) {
            const now = new Date();
            const formattedDate = now.getFullYear() + '-' + 
                String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                String(now.getDate()).padStart(2, '0') + ' ' + 
                String(now.getHours()).padStart(2, '0') + ':' + 
                String(now.getMinutes()).padStart(2, '0') + ':' + 
                String(now.getSeconds()).padStart(2, '0');
                
            duplicatePlaylist(playlistId, playlistName + ' clone ' + formattedDate);
        } else {
            showNotification('Erreur: impossible d\'identifier la playlist', 'error');
        }
    });
    
    // Soumission du formulaire de renommage de playlist
    $('#rename-playlist-form').on('submit', function(e) {
        e.preventDefault();
        
        const playlistId = $('#playlist-to-rename-id').val();
        const newName = $('#new-playlist-name').val();
        
        if (playlistId && newName) {
            renamePlaylist(playlistId, newName);
            $('#renamePlaylistModal').modal('hide');
        }
    });
    
    // Confirmation de suppression de playlist
    $('#confirm-delete-playlist').click(function() {
        const playlistId = $('#playlist-to-delete-id').val();
        
        deletePlaylist(playlistId);
        $('#deletePlaylistModal').modal('hide');
    });
    
    // Ajout ou suppression d'une chanson à/de la playlist
    $(document).on('click', '.add-to-playlist-btn', function(e) {
        e.preventDefault();
        
        // Récupérer l'ID de la chanson depuis le modal
        const songId = $('#option-song-id').val();
        const playlistId = $(this).data('playlist-id');
        const inPlaylist = $(this).data('in-playlist');
        
        if (songId && playlistId) {
            if (inPlaylist) {
                // La chanson est déjà dans la playlist, donc on la retire
                console.log('Suppression de la chanson', songId, 'de la playlist', playlistId);
                
                $.ajax({
                    url: 'api/remove-from-playlist.php',
                    type: 'POST',
                    data: {
                        song_id: songId,
                        playlist_id: playlistId
                    },
                    success: function(response) {
                        if (response.success) {
                            // Mettre à jour l'apparence du bouton
                            const button = $('.add-to-playlist-btn[data-playlist-id="' + playlistId + '"]');
                            button.removeClass('btn-danger')
                                  .addClass('btn-outline-primary')
                                  .text('Ajouter')
                                  .data('in-playlist', false);
                                  
                            showNotification('Chanson retirée de la playlist', 'success');
                        } else {
                            const errorMsg = response.error || 'Erreur inconnue';
                            showNotification('Erreur : ' + errorMsg, 'error');
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('Erreur AJAX:', error);
                        showNotification('Erreur lors du retrait de la chanson de la playlist', 'error');
                    }
                });
            } else {
                // La chanson n'est pas dans la playlist, donc on l'ajoute
                console.log('Ajout de la chanson', songId, 'à la playlist', playlistId);
                addSongToPlaylist(songId, playlistId);
            }
        } else {
            console.error('ID de chanson ou de playlist manquant');
            showNotification('Erreur: Impossible d\'identifier la chanson ou la playlist', 'error');
        }
    });
    
    // Suppression d'une chanson d'une playlist
    $(document).on('click', '.remove-from-playlist', function(e) {
        e.preventDefault();
        
        const songId = $(this).data('song-id');
        const playlistId = $(this).data('playlist-id');
        
        if (confirm('Êtes-vous sûr de vouloir retirer cette chanson de la playlist ?')) {
            removeSongFromPlaylist(songId, playlistId);
        }
    });
    
    // Charger les tags d'une chanson pour le modal
    function loadSongTags(songId) {
        $('#song-tags-list').empty();
        
        // Parcourir les tags cachés de la chanson
        $('#tags-' + songId + ' span').each(function() {
            const tagId = $(this).attr('data-tag-id');
            const tagName = $(this).attr('data-tag-name');
            const isArtist = $(this).attr('data-is-artist') === '1';
            
            if (tagId && tagName) {
                // Créer le badge du tag
                const badgeClass = isArtist ? 'badge-danger' : 'badge-info';
                const tagBadge = $('<span class="badge ' + badgeClass + ' tag-badge mr-1">' + 
                    tagName + 
                    ' <a href="#" class="tag-remove" data-song-id="' + songId + '" data-tag-id="' + tagId + '">' +
                    '<i class="fas fa-times"></i></a></span>');
                    
                $('#song-tags-list').append(tagBadge);
            }
        });
    }
    
    // Le gestionnaire pour le bouton de démarrage à une position spécifique
    // est déjà dans home.php, il n'est pas nécessaire de le dupliquer ici
    
    // Écouter l'événement personnalisé pour le démarrage à un temps spécifique (fallback)
    $(document).on('startAtTime', function(e) {
        if (e.detail && typeof e.detail.minutes !== 'undefined' && typeof e.detail.seconds !== 'undefined') {
            console.log('Evénement startAtTime reçu:', e.detail);
            startAtTime(e.detail.minutes, e.detail.seconds);
        }
    });
    
    /**
     * Mise à jour de l'icône de tags pour un MP3
     * 
     * @param {number} songId ID de la chanson
     */
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
     * Vérifie si des filtres sont actifs et affiche/masque le bouton de réinitialisation
     */
    function checkFiltersActive() {
        const urlParams = new URLSearchParams(window.location.search);
        const hasFilters = urlParams.has('tag') || urlParams.has('tags') || urlParams.has('rating') || urlParams.has('artist');
        
        // Stocker les filtres actifs
        activeFilters = {
            tags: urlParams.getAll('tags'),
            tag: urlParams.get('tag'), // Pour la rétrocompatibilité
            rating: urlParams.get('rating'),
            artist: urlParams.get('artist')
        };
        
        // Afficher ou masquer le bouton de réinitialisation
        $('.reset-container').toggle(hasFilters);
        
        return hasFilters;
    }
    
    // Appeler la fonction au chargement de la page
    checkFiltersActive();
    
    // Initialiser le tri actif si défini dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const sortParam = urlParams.get('sort');
    if (sortParam) {
        $('#sort-select').val(sortParam);
        
        // Ne pas trier côté client, le serveur s'en occupe déjà
        switch (sortParam) {
            case 'alpha':
                alphabeticalOrder = true;
                randomOrder = false;
                break;
            case 'recent':
                alphabeticalOrder = false;
                randomOrder = false;
                break;
            case 'random':
                alphabeticalOrder = false;
                randomOrder = true;
                break;
        }
        
        // Actualiser la liste des chansons sans tenter de les trier à nouveau
        refreshSongsList();
    }
    
    // Charger les informations de la première chanson pour les afficher dans le lecteur
    loadFirstSongInfo();
    
    // Filtrage par note avec select
    $('#rating-select').change(function() {
        const rating = $(this).val();
        let url = window.location.pathname;
        
        // Construire l'URL avec les paramètres existants
        const urlParams = new URLSearchParams(window.location.search);
        
        if (rating) {
            urlParams.set('rating', rating);
        } else {
            urlParams.delete('rating');
        }
        
        // S'assurer que le paramètre sort est conservé
        const currentSort = urlParams.get('sort');
        if (currentSort) {
            urlParams.set('sort', currentSort);
        }
        
        // Conserver les autres paramètres
        if (urlParams.toString()) {
            url += '?' + urlParams.toString();
        }
        
        window.location.href = url;
    });
    
    // Le filtrage par tag est maintenant géré dans muz-tags.js
    
    
    // Réinitialiser les filtres
    $('.reset-filters').click(function(e) {
        e.preventDefault();
        
        // Si on est dans une playlist, garder la playlist dans l'URL
        const playlistId = new URLSearchParams(window.location.search).get('playlist');
        const sortType = new URLSearchParams(window.location.search).get('sort');
        let url = window.location.pathname;
        let params = [];
        
        // Préserver la playlist et le tri
        if (playlistId) {
            params.push('playlist=' + playlistId);
        }
        if (sortType) {
            params.push('sort=' + sortType);
        }
        
        // Reconstruire l'URL
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        window.location.href = url;
    });
    
    // Raccourcis clavier
    $(document).keydown(function(e) {
        // Espace pour lecture/pause
        if (e.keyCode === 32 && !$(e.target).is('input, textarea, button, select')) {
            e.preventDefault();
            if (audioPlayer && audioPlayer.paused) {
                audioPlayer.play();
            } else if (audioPlayer) {
                audioPlayer.pause();
            }
        }
        
        // Flèche droite pour chanson suivante
        if (e.keyCode === 39 && !$(e.target).is('input, textarea, button, select')) {
            e.preventDefault();
            playNextSong();
        }
        
        // Flèche gauche pour chanson précédente
        if (e.keyCode === 37 && !$(e.target).is('input, textarea, button, select')) {
            e.preventDefault();
            playPrevSong();
        }
    });
    
    // Initialisation de Select2 pour le sélecteur d'artistes (i18n)
    if ($.fn.select2) {
        $('#artist-select').select2({
            theme: 'default', // Utilisation du thème par défaut au lieu de bootstrap-5
            width: '100%',
            placeholder: (window.i18n && window.i18n.all_artists_placeholder) ? window.i18n.all_artists_placeholder : "-- Tous les artistes --",
            allowClear: true,
            dropdownParent: $('.artist-filters'),
            language: {
                noResults: function() {
                    return (window.i18n && window.i18n.no_results_artists) ? window.i18n.no_results_artists : "Aucun groupe/artiste trouvé";
                },
                searching: function() {
                    return (window.i18n && window.i18n.searching) ? window.i18n.searching : "Recherche en cours...";
                },
                inputTooShort: function() {
                    return (window.i18n && window.i18n.input_too_short) ? window.i18n.input_too_short : "Veuillez saisir au moins 1 caractère";
                },
                removeAllItems: function() {
                    return (window.i18n && window.i18n.remove_all_items) ? window.i18n.remove_all_items : "Supprimer tous les éléments";
                }
            },
            escapeMarkup: function(markup) {
                return markup;
            }
        });
        
        // Ajouter des écouteurs d'événements pour Select2
        $('#artist-select').on('select2:open', function() {
            // Ajouter une classe pour le mode sombre
            $('.select2-dropdown').addClass('select2-dropdown-dark');
            
            // Focus automatiquement sur le champ de recherche et ajouter l'attribut data-bs-theme="dark"
            setTimeout(function() {
                $('.select2-search__field').attr('data-bs-theme', 'dark').focus();
            }, 100);
        });
        
        // Corriger le problème de z-index avec Bootstrap modals
        $(document).on('shown.bs.modal', function() {
            $('.select2-dropdown').parent().css('z-index', 1060);
        });
    }
    
    // Initialisation
    initAudioPlayer();
    
    // Préparation de playlist
    $('#playlist-prep-btn').click(function() {
        // Afficher la barre de progression
        $('#playlist-prep-progress').removeClass('d-none');
        
        // Déterminer quelles chansons copier
        let songIds = [];
        
        // En mode playlist, récupérer les IDs des chansons de la playlist actuelle
        $('.mp3-item').each(function() {
            songIds.push($(this).data('id'));
        });
        
        if (songIds.length === 0) {
            showNotification('Aucune chanson à préparer', 'warning', true);
            $('#playlist-prep-progress').addClass('d-none');
            return;
        }
        
        // Récupérer l'ID de la playlist si on est en mode playlist
        const urlParams = new URLSearchParams(window.location.search);
        const playlistId = urlParams.get('playlist');
        
        // Préparer les données à envoyer
        const postData = {
            songs: songIds
        };
        
        // Ajouter l'ID de playlist si disponible
        if (playlistId) {
            postData.playlist_id = playlistId;
        }
        
        // Mettre à jour l'indicateur de progression pour montrer le début du traitement
        $('#playlist-prep-progress .progress-bar').css('width', '10%');
        
        // Simuler une progression pendant le traitement
        let progressInterval = setInterval(function() {
            let currentWidth = parseInt($('#playlist-prep-progress .progress-bar').css('width'));
            let containerWidth = parseInt($('#playlist-prep-progress').css('width'));
            let percentage = (currentWidth / containerWidth) * 100;
            
            // Augmenter progressivement jusqu'à 90% (le 100% sera atteint à la fin réelle)
            if (percentage < 90) {
                $('#playlist-prep-progress .progress-bar').css('width', (percentage + 2) + '%');
            } else {
                clearInterval(progressInterval);
            }
        }, 300);
        
        // Log de débogage pour les données envoyées
        console.log('Préparation de playlist - Données envoyées:', postData);
        
        // Appel AJAX pour préparer la playlist
        $.ajax({
            url: 'api/prepare-playlist.php', // URL relative correcte
            type: 'POST',
            data: postData, // Utiliser les données préparées
            dataType: 'json',
            success: function(response) {
                console.log('Réponse de préparation playlist:', response);
                
                // Variables pour stocker les messages de notification
                let notificationType = 'error';
                let notificationMsg = '';
                let successMsg = '';
                
                if (response) {
                    if (response.success) {
                        const folderName = response.folderName || 'dossier playlist';
                        // Utiliser le chemin de base dynamique ou un chemin par défaut si non fourni
                        const basePath = response.basePath || 'ma-playlist';
                        
                        // Normaliser les slashs pour qu'ils soient tous dans le même format (backslash pour Windows)
                        // Remplacer d'abord tous les forward slashs par des backslashs
                        const normalizedPath = (basePath + '\\' + folderName).replace(/\//g, '\\');
                        
                        // Créer le message de succès mais le stocker pour l'afficher plus tard
                        successMsg = '<div class="ext-center"><div class="fw-bold text-center fs-3">Votre playlist est prête !</div><hr><code>' + normalizedPath + '</code></div>';
                        
                        // Mettre à jour le type de notification
                        notificationType = 'success';
                        notificationMsg = successMsg;
                        
                        // Afficher les erreurs éventuelles dans la console
                        if (response.errors && response.errors.length > 0) {
                            console.warn('Erreurs pendant la copie (' + response.errors.length + '):', response.errors);
                        }
                    } 
                    else if (response.emptyDatabase) {
                        console.warn('La base de données songs.json est vide ou ne contient pas les chansons demandées.');
                        notificationMsg = 'Aucune chanson trouvée dans la base de données. Un dossier vide a été créé: "' + (response.folderName || 'dossier playlist') + '"';
                        notificationType = 'warning';
                    } else if (response.missingSongs && response.missingSongs > 0) {
                        console.warn('Des chansons demandées n\'existent pas dans la base de données:', response.errors);
                        notificationMsg = 'Chansons introuvables dans la base de données. Vérifiez que la base est à jour.';
                        notificationType = 'warning';
                    } else if (response.errors && response.errors.length > 0) {
                        console.error('Détails des erreurs:', response.errors);
                        notificationMsg = 'Erreur lors de la préparation de la playlist';
                        if (response.message) {
                            notificationMsg += ': ' + response.message;
                        }
                    } else {
                        notificationMsg = 'Erreur lors de la préparation de la playlist';
                        if (response.message) {
                            notificationMsg += ': ' + response.message;
                        }
                    }
                } else {
                    notificationMsg = 'Erreur de communication avec le serveur. Réponse invalide.';
                }
                
                // Mettre à jour la barre de progression à 100%
                $('#playlist-prep-progress .progress-bar').css('width', '100%');
                
                // Cacher la barre après un délai ET AFFICHER LA NOTIFICATION
                setTimeout(function() {
                    $('#playlist-prep-progress').addClass('d-none');
                    $('#playlist-prep-progress .progress-bar').css('width', '0%');
                    
                    // Afficher la notification une fois que la barre de progression est masquée
                    showNotification(notificationMsg, notificationType, false);
                    
                    // Afficher les erreurs éventuelles dans la console et une notification
                    if (response.success && response.errors && response.errors.length > 0 && response.total > response.copied) {
                        setTimeout(function() {
                            showNotification('Attention: ' + response.errors.length + ' fichiers n\'ont pas pu être copiés. Consultez la console pour plus de détails.', 'warning', false);
                        }, 500); // Léger délai pour que les notifications ne se chevauchent pas
                    }
                }, 1500);
            },
            error: function(xhr, status, error) {
                console.error('Erreur AJAX:', error, xhr.responseText);
                
                let errorMsg = 'Erreur lors de la préparation de la playlist';
                
                // Vérifier si la réponse contient des avertissements PHP avant le JSON
                let jsonResponse = xhr.responseText;
                if (xhr.responseText.indexOf('<br />') === 0 || xhr.responseText.indexOf('<b>Warning</b>') >= 0) {
                    // Essayer de trouver le début du JSON
                    const jsonStartIndex = xhr.responseText.indexOf('{"');
                    if (jsonStartIndex >= 0) {
                        jsonResponse = xhr.responseText.substring(jsonStartIndex);
                        console.log('JSON extrait des avertissements PHP:', jsonResponse);
                    }
                }
                
                try {
                    const response = JSON.parse(jsonResponse);
                    if (response && response.message) {
                        errorMsg += ': ' + response.message;
                    }
                    
                    // Si nous avons réussi à extraire le JSON malgré les avertissements,
                    // traiter comme un succès avec le JSON extrait
                    if (response && response.success) {
                        console.log('Réponse extraite avec succès malgré les avertissements PHP');
                        // Réutiliser la même logique que dans le callback success
                        let successMsg = '';
                        if (response.folderName) {
                            const folderName = response.folderName || 'dossier playlist';
                            const basePath = response.basePath || 'ma-playlist';
                            const normalizedPath = (basePath + '\\' + folderName).replace(/\//g, '\\');
                            successMsg = '<div class="ext-center"><div class="fw-bold text-center fs-3">Votre playlist est prête !</div><hr><code>' + normalizedPath + '</code></div>';
                        }
                        
                        // Afficher la notification de succès
                        showNotification(successMsg || 'Playlist préparée avec succès', 'success', true);
                        
                        // Terminer la progression
                        $('#playlist-prep-progress .progress-bar').css('width', '100%');
                        
                        // Cacher la barre de progression après un délai
                        setTimeout(function() {
                            $('#playlist-prep-progress').addClass('d-none');
                        }, 1500);
                        
                        return;
                    }
                } catch (e) {
                    // Erreur de parsing JSON - analyser la réponse pour trouver les erreurs PHP
                    console.error('Impossible de parser la réponse JSON:', e);
                    
                    // Afficher la réponse brute pour le débogage
                    if (xhr.responseText) {
                        // Rechercher les erreurs PHP connues dans la réponse
                        const phpErrors = [
                            { regex: /Call to private (.+?) from global scope/i, message: 'Erreur de constructeur privé' },
                            { regex: /Uncaught Error: (.+?)</i, message: 'Erreur PHP non gérée' },
                            { regex: /Fatal error/i, message: 'Erreur PHP fatale' },
                            { regex: /Warning:/i, message: 'Avertissement PHP' },
                            { regex: /Notice:/i, message: 'Notice PHP' }
                        ];
                        
                        const responseText = xhr.responseText.substring(0, 500);
                        console.error('Réponse brute:', responseText);
                        
                        // Chercher des messages d'erreur plus précis
                        for (const errorPattern of phpErrors) {
                            if (errorPattern.regex.test(responseText)) {
                                const match = responseText.match(errorPattern.regex);
                                if (match && match[1]) {
                                    errorMsg += ': ' + errorPattern.message + ' - ' + match[1];
                                } else {
                                    errorMsg += ': ' + errorPattern.message;
                                }
                                break;
                            }
                        }
                    }
                }
                
                showNotification(errorMsg, 'error');
                $('#playlist-prep-progress').addClass('d-none');
            }
        });
    });
});