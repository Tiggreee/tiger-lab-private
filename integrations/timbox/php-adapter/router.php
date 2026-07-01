<?php

declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$publicRoot = __DIR__ . '/public';
$targetFile = realpath($publicRoot . $uri);

if ($targetFile !== false && str_starts_with($targetFile, realpath($publicRoot)) && is_file($targetFile)) {
    return false;
}

require $publicRoot . '/index.php';
