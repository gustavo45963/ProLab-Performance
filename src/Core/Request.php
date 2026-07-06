<?php

declare(strict_types=1);

namespace ProLab\Core;

/**
 * Representação imutável do pedido HTTP atual.
 */
final class Request
{
    /** @param array<string, string> $params Parâmetros extraídos da rota, ex.: {objective} */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $body,
        public array $params = [],
    ) {
    }

    public static function capture(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $path = rtrim($path, '/') ?: '/';

        $body = [];
        $raw = file_get_contents('php://input');

        if ($raw !== false && $raw !== '') {
            $decoded = json_decode($raw, true);

            if (is_array($decoded)) {
                $body = $decoded;
            }
        }

        return new self($method, $path, $_GET, $body);
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function queryParam(string $key, ?string $default = null): ?string
    {
        $value = $this->query[$key] ?? null;

        return is_string($value) && $value !== '' ? $value : $default;
    }
}
