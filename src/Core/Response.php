<?php

declare(strict_types=1);

namespace ProLab\Core;

/**
 * Respostas JSON padronizadas — todos os endpoints devolvem o mesmo formato.
 */
final class Response
{
    /** @param array<string, mixed> $data */
    public static function json(array $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store');

        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /** @param array<string, mixed> $extra */
    public static function error(string $message, int $status, array $extra = []): never
    {
        self::json(['success' => false, 'message' => $message] + $extra, $status);
    }
}
