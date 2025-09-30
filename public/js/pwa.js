// pwa service worker
jQuery(window).on('load', function(){

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('sw.js') .then(function(registration) {
			console.log('ServiceWorker enregistré sur : ', registration.scope);
		}).catch(function(err) {
			console.log('ServiceWorker non enregistré ', err);
		});
	}	  
    
});