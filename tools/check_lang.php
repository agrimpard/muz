<?php
// Vérifie que toutes les langues ont les mêmes clés que fr.php
// Usage: php tools/check_lang.php

error_reporting(E_ALL);

$root = dirname(__DIR__);
$langDir = $root . DIRECTORY_SEPARATOR . 'lang';
$refFile = $langDir . DIRECTORY_SEPARATOR . 'fr.php';

// Charger i18n pour la sortie du script
require_once $root . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'boot_i18n.php';

if (!file_exists($refFile)) {
    fwrite(STDERR, t('lang_ref_fr_missing') . "\n");
    exit(1);
}

$ref = include $refFile;
if (!is_array($ref)) {
    fwrite(STDERR, t('lang_fr_not_array') . "\n");
    exit(1);
}

$refKeys = array_keys($ref);
sort($refKeys);

$files = glob($langDir . DIRECTORY_SEPARATOR . '*.php');

$overallOk = true;
foreach ($files as $file) {
    $code = basename($file, '.php');
    $arr = include $file;
    if (!is_array($arr)) {
        echo "[WARN] $code.php " . t('lang_not_array') . "\n";
        $overallOk = false;
        continue;
    }
    $keys = array_keys($arr);
    $missing = array_values(array_diff($refKeys, $keys));
    $extra = array_values(array_diff($keys, $refKeys));

    if ($missing || $extra) {
        $overallOk = false;
        echo "=== $code ===\n";
        if ($missing) {
            echo t('lang_missing') . ' (' . count($missing) . "):\n - " . implode("\n - ", $missing) . "\n";
        }
        if ($extra) {
            echo t('lang_extra') . ' (' . count($extra) . "):\n - " . implode("\n - ", $extra) . "\n";
        }
        echo "\n";
    }
}

if ($overallOk) {
    echo t('lang_all_ok') . ' (' . count($refKeys) . ' ' . t('lang_keys') . ").\n";
}

exit($overallOk ? 0 : 2);
?>
