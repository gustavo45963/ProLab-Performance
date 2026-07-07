<?php

declare(strict_types=1);

namespace ProLab\Controllers;

use ProLab\Core\Request;
use ProLab\Core\Response;
use ProLab\Database\Connection;
use Throwable;

final class HealthController
{
    /** Health check usado pelo Render (healthCheckPath: /api/health). */
    public static function check(Request $request): never
    {
        $database = 'ok';
        $status = 200;

        try {
            Connection::pdo()->query('SELECT 1');
        } catch (Throwable) {
            $database = 'unavailable';
            $status = 503;
        }

        Response::json([
            'success' => $status === 200,
            'service' => 'prolab-performance',
            'database' => $database,
            'driver' => $status === 200 ? Connection::driver() : null,
            'time' => gmdate('c'),
        ], $status);
    }
}
