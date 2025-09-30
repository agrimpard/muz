<?php
// Bootstrap i18n pour les scripts de config/CLI afin d'utiliser la même fonction t() que l'app
if (!function_exists('t')) {
    // Charger la langue depuis conf.ini et préparer $GLOBALS['lang']
    (function() {
        $confPath = dirname(__DIR__, 1) . '/conf.ini';
        $langCode = 'fr';
        if (file_exists($confPath)) {
            $ini = @parse_ini_file($confPath, true);
            if (is_array($ini) && isset($ini['app']['lang']) && $ini['app']['lang']) {
                $langCode = str_replace('-', '_', trim($ini['app']['lang']));
            }
        }
        $langFile = dirname(__DIR__, 1) . '/lang/' . $langCode . '.php';
        if (file_exists($langFile)) {
            $lang = include $langFile;
        } else {
            $lang = include dirname(__DIR__, 1) . '/lang/fr.php';
        }
        if (!is_array($lang)) { $lang = include dirname(__DIR__, 1) . '/lang/fr.php'; }
        $GLOBALS['lang'] = $lang;
    })();

    function t($key) {
        $lang = $GLOBALS['lang'] ?? [];
        if (is_array($lang) && array_key_exists($key, $lang)) {
            return $lang[$key];
        }
        static $fallback = null;
        if ($fallback === null) {
            $fallbackFile = dirname(__DIR__, 1) . '/lang/fr.php';
            if (file_exists($fallbackFile)) {
                $tmp = include $fallbackFile;
                $fallback = is_array($tmp) ? $tmp : [];
            } else {
                $fallback = [];
            }
        }
        return array_key_exists($key, $fallback) ? $fallback[$key] : $key;
    }
}
