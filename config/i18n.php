<?php
// Petit utilitaire i18n pour les messages côté config/CLI
if (!function_exists('t_cfg')) {
    function t_cfg($key, $default = null) {
        static $cache = null;
        if ($cache === null) {
            // Charger la langue depuis conf.ini
            $confPath = dirname(__DIR__, 1) . '/conf.ini';
            $langCode = 'fr';
            if (file_exists($confPath)) {
                $ini = @parse_ini_file($confPath, true);
                if (is_array($ini) && isset($ini['app']['lang']) && $ini['app']['lang']) {
                    $langCode = str_replace('-', '_', trim($ini['app']['lang']));
                }
            }
            // Charger le fichier de langue
            $langFile = dirname(__DIR__, 1) . '/lang/' . $langCode . '.php';
            $fallbackFr = dirname(__DIR__, 1) . '/lang/fr.php';
            $fallbackEn = dirname(__DIR__, 1) . '/lang/en.php';
            $arr = [];
            if (file_exists($fallbackEn)) {
                $tmp = include $fallbackEn; if (is_array($tmp)) $arr = $tmp; unset($tmp);
            }
            if (file_exists($fallbackFr)) {
                $tmp = include $fallbackFr; if (is_array($tmp)) $arr = array_merge($arr, $tmp); unset($tmp);
            }
            if (file_exists($langFile)) {
                $tmp = include $langFile; if (is_array($tmp)) $arr = array_merge($arr, $tmp); unset($tmp);
            }
            $cache = $arr;
        }
        if (isset($cache[$key])) return $cache[$key];
        return $default !== null ? $default : $key;
    }
}
