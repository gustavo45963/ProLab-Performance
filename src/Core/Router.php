<?php

declare(strict_types=1);

namespace ProLab\Core;

/**
 * Router minimalista: método + padrão com placeholders {nome}.
 */
final class Router
{
    /** @var array<int, array{0: string, 1: string, 2: callable}> */
    private array $routes = [];

    public function get(string $pattern, callable $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, callable $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    public function put(string $pattern, callable $handler): void
    {
        $this->add('PUT', $pattern, $handler);
    }

    public function add(string $method, string $pattern, callable $handler): void
    {
        $regex = preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern);
        $this->routes[] = [strtoupper($method), '#^' . $regex . '$#u', $handler];
    }

    public function dispatch(Request $request): never
    {
        $pathMatched = false;

        foreach ($this->routes as [$method, $regex, $handler]) {
            if (!preg_match($regex, $request->path, $matches)) {
                continue;
            }

            if ($method !== $request->method) {
                $pathMatched = true;
                continue;
            }

            $request->params = array_map(
                'rawurldecode',
                array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY)
            );

            $handler($request);
            exit;
        }

        if ($pathMatched) {
            Response::error('Método não permitido.', 405);
        }

        Response::error('Endpoint não encontrado.', 404);
    }
}
