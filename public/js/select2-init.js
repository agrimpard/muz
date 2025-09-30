// Initialisation centralisée de Select2 avec i18n issu de window.i18n
(function($){
  $(function(){
    if (!$.fn || !$.fn.select2) return;

    // Adapter les textes Select2 selon window.i18n
    const lang = {
      errorLoading: function () { return (window.i18n && window.i18n.error_loading) || 'The results could not be loaded.'; },
      inputTooLong: function (args) {
        const overChars = args.input.length - args.maximum;
        // Message générique, court et neutre
        return (window.i18n && window.i18n.input_too_long) || (`${overChars} character${overChars>1?'s':''} too many`);
      },
      inputTooShort: function (args) {
        return (window.i18n && window.i18n.input_too_short) || 'Please enter 1 or more characters';
      },
      loadingMore: function () { return (window.i18n && window.i18n.loading_more) || 'Loading more results…'; },
      maximumSelected: function (args) { return (window.i18n && window.i18n.maximum_selected) || `You can only select ${args.maximum} item${args.maximum>1?'s':''}`; },
      noResults: function () { return (window.i18n && (window.i18n.no_results_artists || window.i18n.no_results_found)) || 'No results found'; },
      searching: function () { return (window.i18n && window.i18n.searching) || 'Searching…'; },
      removeAllItems: function () { return (window.i18n && window.i18n.remove_all_items) || 'Remove all items'; }
    };

    // Appliquer Select2 là où nécessaire
    try {
      $('.select2-search').each(function(){
        const $el = $(this);
        if ($el.data('select2')) return; // éviter double init
        $el.select2({
          width: '100%',
          placeholder: (window.i18n && window.i18n.all_artists_placeholder) || 'All artists',
          language: lang,
          allowClear: true
        });
      });
    } catch (e) {
      // Silencieux: si Select2 n'est pas utilisé, ne rien casser
      // console.warn('Select2 init warning:', e);
    }
  });
})(jQuery);
