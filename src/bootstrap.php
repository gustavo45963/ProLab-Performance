<?php

declare(strict_types=1);

/**
 * Bootstrap da aplicação.
 * - Autoloader PSR-4 (ProLab\ → src/)
 * - Carregamento de variáveis de ambiente (.env em dev)
 * - Tratamento global de erros → respostas JSON consistentes
 */

spl_autoload_register(static function (string $class): void {
    $prefix = 'ProLab\\';

    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';

    if (is_file($path)) {
        require $path;
    }
});

date_default_timezone_set('UTC');

ProLab\Core\Env::load(dirname(__DIR__) . '/.env');

$isProduction = ProLab\Core\Env::get('APP_ENV', 'production') === 'production';

error_reporting(E_ALL);
ini_set('display_errors', $isProduction ? '0' : '1');
ini_set('log_errors', '1');

// Warnings e notices viram exceções: nada passa silenciosamente.
set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }

    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(static function (Throwable $e) use ($isProduction): void {
    error_log(sprintf(
        '[ProLab] %s: %s em %s:%d',
        $e::class,
        $e->getMessage(),
        $e->getFile(),
        $e->getLine()
    ));

    $payload = ['success' => false, 'message' => 'Erro interno do servidor.'];

    if (!$isProduction) {
        $payload['debug'] = $e->getMessage();
    }

    ProLab\Core\Response::json($payload, 500);
});
