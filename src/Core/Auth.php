<?php

declare(strict_types=1);

namespace ProLab\Core;

/**
 * Sessão e autenticação — cookies endurecidos, id regenerado no login.
 */
final class Auth
{
    private const SESSION_NAME = 'prolab_session';

    public static function start(): void
    {
        if (session_status() !== PHP_SESSION_NONE) {
            return;
        }

        session_name(self::SESSION_NAME);
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'httponly' => true,
            'secure' => self::isHttps(),
            'samesite' => 'Lax',
        ]);

        session_start();
    }

    public static function login(int $userId): void
    {
        session_regenerate_id(true);
        $_SESSION['user_id'] = $userId;
    }

    public static function logout(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(self::SESSION_NAME, '', [
                'expires' => time() - 42000,
                'path' => $p['path'],
                'domain' => $p['domain'],
                'secure' => $p['secure'],
                'httponly' => $p['httponly'],
                'samesite' => $p['samesite'],
            ]);
        }

        session_destroy();
    }

    public static function id(): ?int
    {
        $id = $_SESSION['user_id'] ?? null;

        return is_int($id) ? $id : null;
    }

    public static function requireId(): int
    {
        $id = self::id();

        if ($id === null) {
            Response::error('Faz login para continuar.', 401);
        }

        return $id;
    }

    private static function isHttps(): bool
    {
        if (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off') {
            return true;
        }

        // Atrás do proxy do Render o TLS termina antes do container.
        return ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    }
}
