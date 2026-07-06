<?php

declare(strict_types=1);

/**
 * Router para o servidor embutido do PHP — APENAS desenvolvimento local.
 * Uso: php -S 127.0.0.1:8000 -t public server.php
 * Em produção (Render/Apache) quem faz este papel é o public/.htaccess.
 */

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (preg_match('#^/api(/|$)#', $path)) {
    require __DIR__ . '/public/api.php';
    return true;
}

if ($path !== '/' && is_file(__DIR__ . '/public' . $path)) {
    return false; // Servir o ficheiro estático diretamente.
}

header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/public/index.html');
return true;
