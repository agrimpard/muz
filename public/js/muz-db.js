$(function(){
  // Import DB
  $('#form-import-db').on('submit', function(e){
    e.preventDefault();
    const $status = $('#import-db-status').text(window.i18n?.importing || 'Import en cours...');
    const fd = new FormData(this);
    $.ajax({
      url: 'api/import-db.php',
      method: 'POST',
      data: fd,
      processData: false,
      contentType: false
    }).done(function(resp){
      if (resp && resp.success) {
        $status.text((window.i18n?.import_success || 'Import réussi. Rechargement...'));
        setTimeout(function(){ location.reload(); }, 800);
      } else {
        const errLabel = window.i18n?.import_error || 'Erreur: ';
        const unk = window.i18n?.unknown_error || 'inconnue';
        $status.text(errLabel + (resp && resp.error ? resp.error : unk));
      }
    }).fail(function(){
      $status.text(window.i18n?.network_error_import || 'Erreur réseau pendant l\'import');
    });
  });

  // Upload unifié : mp3 ou image
  function uploadFiles(files) {
    const $status = $('#upload-music-status');
    const $progress = $('<div class="upload-progress"></div>').text(window.i18n?.uploading || 'Upload en cours...');
    $status.prepend($progress);
    if (!files || files.length === 0) return;

    // Normaliser types autorisés
    const isImage = (f) => {
      const type = (f.type || '').toLowerCase();
      const name = (f.name || '').toLowerCase();
      return type === 'image/png' || type === 'image/jpeg' || type === 'image/webp'
        || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp');
    };
    const isMp3 = (f) => {
      const type = (f.type || '').toLowerCase();
      const name = (f.name || '').toLowerCase();
      return type === 'audio/mpeg' || type === 'audio/mp3' || name.endsWith('.mp3');
    };

    const all = Array.from(files);
    const imageFiles = all.filter(isImage);
    const mp3Files = all.filter(isMp3);
    const unknownFiles = all.filter(f => !isImage(f) && !isMp3(f));

    // Helpers d'affichage (prepend pour voir les derniers en haut)
    const showSuccess = (html) => { $status.prepend('<div class="text-success">' + html + '</div>'); };
    const showError = (html) => { $status.prepend('<div class="text-danger">' + html + '</div>'); };

    // Signaler les fichiers inconnus
    if (unknownFiles.length > 0) {
      unknownFiles.forEach(f => {
        showError('✗ ' + (window.i18n?.unsupported_type || 'Type de fichier non supporté') + ' - ' + (f.name || '?'));
      });
    }

    // Construire la liste des tâches réseau (images: 1 par fichier, mp3: en lots)
    const tasks = [];

    // Images: séquentiel pour éviter la surcharge réseau
    imageFiles.forEach((file) => {
      tasks.push(() => new Promise((resolve) => {
        const fd = new FormData();
        fd.append('image', file);
        $.ajax({
          url: 'api/upload-image.php',
          method: 'POST',
          data: fd,
          processData: false,
          contentType: false
        }).done(function(resp){
          if (resp && resp.success) {
            const inDir = window.i18n?.in_images_dir || ' (dans /public/img/gp/)';
            showSuccess('✓ ' + resp.filename + ' ' + inDir);
          } else {
            const unk = window.i18n?.unknown_error || 'Erreur inconnue';
            showError('✗ ' + (file && file.name ? (file.name + ': ') : '') + (resp && resp.error ? resp.error : unk));
          }
        }).fail(function(){
          const base = (window.i18n?.network_error_upload || 'Erreur réseau pendant l\'upload');
          showError('✗ ' + (file && file.name ? (file.name + ': ') : '') + base);
        }).always(function(){ resolve(); });
      }));
    });

    // Helper récursif: upload d'un sous-ensemble de MP3, fallback en sous-chunks si échec réseau
    function processMp3Chunk(filesChunk) {
      return new Promise((resolve) => {
        if (!filesChunk || filesChunk.length === 0) return resolve();
        const fd = new FormData();
        for (let i = 0; i < filesChunk.length; i++) {
          fd.append('files[]', filesChunk[i]);
        }
        $.ajax({
          url: 'api/upload-music.php',
          method: 'POST',
          data: fd,
          processData: false,
          contentType: false
        }).done(function(resp){
          const uploaded = Array.isArray(resp?.uploaded) ? resp.uploaded : [];
          const errors = Array.isArray(resp?.errors) ? resp.errors : [];
          if (uploaded.length > 0) {
            const uploadedList = uploaded.map(f => '<span class="text-success">✓ ' + f + '</span>').join('<br>');
            $status.prepend('<div>' + uploadedList + '</div>');
          }
          if (errors.length > 0) {
            showError('✗ ' + errors.join('<br>'));
          }
          if (uploaded.length === 0 && errors.length === 0) {
            showError('✗ ' + (window.i18n?.unknown_error || 'Erreur inconnue'));
          }
          resolve();
        }).fail(function(){
          // Sur échec réseau, si plusieurs fichiers dans le chunk, le scinder et réessayer
          if (filesChunk.length > 1) {
            const mid = Math.floor(filesChunk.length / 2);
            const first = filesChunk.slice(0, mid);
            const second = filesChunk.slice(mid);
            // Exécuter séquentiellement les sous-chunks
            processMp3Chunk(first).then(() => processMp3Chunk(second)).then(resolve);
          } else {
            // Un seul fichier: afficher son nom dans l'erreur
            const base = (window.i18n?.network_error_upload || 'Erreur réseau pendant l\'upload');
            const one = filesChunk[0];
            showError('✗ ' + (one && one.name ? (one.name + ': ') : '') + base);
            resolve();
          }
        });
      });
    }

    // MP3: découpage en lots de 10 pour éviter post trop gros et rester robuste
    const chunkSize = 10;
    for (let start = 0; start < mp3Files.length; start += chunkSize) {
      const chunk = mp3Files.slice(start, start + chunkSize);
      tasks.push(() => processMp3Chunk(chunk));
    }

    // Exécuter les tâches séquentiellement
    (function runSequential(i){
      if (i >= tasks.length) {
        $progress.remove();
        $('#music-file-input').val('');
        // Proposer de recharger la page une fois tous les uploads terminés
        if (tasks.length > 0) {
          const msg = (window.i18n?.reload_prompt) || 'Upload finished. Reload the page now?';
          setTimeout(function(){
            if (window.confirm(msg)) {
              window.location.reload();
            }
          }, 200);
        }
        return;
      }
      try {
        const task = tasks[i];
        task().then(() => runSequential(i + 1));
      } catch(e) {
        // Continuer même si une tâche jette une exception
        runSequential(i + 1);
      }
    })(0);

    // Si rien à uploader (que des inconnus), retirer le progress immédiatement
    if (tasks.length === 0) {
      $progress.remove();
    }
  }

  // Submit du formulaire
  $('#form-upload-music').on('submit', function(e){
    e.preventDefault();
    const files = $('#music-file-input')[0].files;
    if (files && files.length > 0) {
      uploadFiles(files);
    }
  });
  
  // Upload automatique quand on sélectionne des fichiers
  $('#music-file-input').on('change', function(){
    const files = this.files;
    if (files && files.length > 0) {
      uploadFiles(files);
    }
  });

  // Drag & drop for music upload
  const $drop = $('#music-dropzone');
  const $fileInput = $('#music-file-input');
  
  // Empêcher la propagation du click de l'input vers la dropzone
  $fileInput.on('click', function(e){
    e.stopPropagation();
  });
  
  $drop.on('click', function(e){
    // Ne pas réagir si on clique directement sur l'input
    if (e.target === $fileInput[0]) return;
    e.preventDefault();
    $fileInput[0].click(); // Utiliser DOM natif au lieu de trigger
  });
  
  $drop.on('dragenter dragover', function(e){
    e.preventDefault();
    e.stopPropagation();
    $drop.addClass('border-primary');
  });
  
  $drop.on('dragleave dragend', function(e){
    e.preventDefault();
    e.stopPropagation();
    $drop.removeClass('border-primary');
  });
  
  $drop.on('drop', function(e){
    e.preventDefault();
    e.stopPropagation();
    $drop.removeClass('border-primary');
    
    const dt = e.originalEvent.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      uploadFiles(dt.files);
    }
  });
});