<?php

declare(strict_types=1);

namespace ProLab\Database;

use PDO;
use ProLab\Core\Env;
use RuntimeException;

/**
 * Ligação PDO única, configurada via DATABASE_URL.
 *
 * Formatos aceites:
 *   postgres://user:pass@host:5432/dbname   (Render PostgreSQL)
 *   mysql://user:pass@host:3306/dbname      (MySQL/MariaDB local)
 *   sqlite:./data/prolab.sqlite             (default — zero configuração)
 */
final class Connection
{
    private static ?PDO $pdo = null;
    private static string $driver = 'sqlite';

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $url = Env::get('DATABASE_URL') ?? 'sqlite:' . dirname(__DIR__, 2) . '/data/prolab.sqlite';
        [$dsn, $user, $pass] = self::parseUrl($url);

        self::$pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        if (self::$driver === 'sqlite') {
            self::$pdo->exec('PRAGMA foreign_keys = ON');
            self::$pdo->exec('PRAGMA journal_mode = WAL');
        }

        Schema::migrate(self::$pdo, self::$driver);

        return self::$pdo;
    }

    /** Driver ativo: sqlite | mysql | pgsql */
    public static function driver(): string
    {
        self::pdo();

        return self::$driver;
    }

    /**
     * SQL de upsert compatível com os três drivers.
     *
     * @param string[] $insertColumns
     * @param string[] $conflictColumns
     * @param string[] $updateColumns
     */
    public static function upsertSql(
        string $table,
        array $insertColumns,
        array $conflictColumns,
        array $updateColumns,
    ): string {
        $cols = implode(', ', $insertColumns);
        $placeholders = implode(', ', array_fill(0, count($insertColumns), '?'));
        $sql = "INSERT INTO {$table} ({$cols}) VALUES ({$placeholders})";

        if (self::driver() === 'mysql') {
            $updates = implode(', ', array_map(
                static fn (string $c): string => "{$c} = VALUES({$c})",
                $updateColumns
            ));

            return "{$sql} ON DUPLICATE KEY UPDATE {$updates}";
        }

        $conflict = implode(', ', $conflictColumns);
        $updates = implode(', ', array_map(
            static fn (string $c): string => "{$c} = excluded.{$c}",
            $updateColumns
        ));

        return "{$sql} ON CONFLICT ({$conflict}) DO UPDATE SET {$updates}";
    }

    /** @return array{0: string, 1: ?string, 2: ?string} */
    private static function parseUrl(string $url): array
    {
        if (str_starts_with($url, 'sqlite:')) {
            self::$driver = 'sqlite';
            $path = substr($url, strlen('sqlite:'));

            if ($path !== ':memory:') {
                $dir = dirname($path);

                if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
                    throw new RuntimeException("Não foi possível criar o diretório de dados: {$dir}");
                }
            }

            return ['sqlite:' . $path, null, null];
        }

        $parts = parse_url($url);

        if ($parts === false || !isset($parts['scheme'], $parts['host'])) {
            throw new RuntimeException('DATABASE_URL inválida.');
        }

        $scheme = strtolower($parts['scheme']);
        $dbName = ltrim($parts['path'] ?? '', '/');
        $user = isset($parts['user']) ? rawurldecode($parts['user']) : null;
        $pass = isset($parts['pass']) ? rawurldecode($parts['pass']) : null;

        if (in_array($scheme, ['postgres', 'postgresql', 'pgsql'], true)) {
            self::$driver = 'pgsql';
            $dsn = sprintf(
                'pgsql:host=%s;port=%d;dbname=%s',
                $parts['host'],
                $parts['port'] ?? 5432,
                $dbName
            );

            // Query string (ex.: ?sslmode=require) é repassada ao DSN.
            if (isset($parts['query'])) {
                parse_str($parts['query'], $queryParams);

                foreach ($queryParams as $k => $v) {
                    if (is_string($v) && preg_match('/^\w+$/', (string) $k)) {
                        $dsn .= ";{$k}={$v}";
                    }
                }
            }

            return [$dsn, $user, $pass];
        }

        if (in_array($scheme, ['mysql', 'mariadb'], true)) {
            self::$driver = 'mysql';
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                $parts['host'],
                $parts['port'] ?? 3306,
                $dbName
            );

            return [$dsn, $user, $pass];
        }

        throw new RuntimeException("Driver de base de dados não suportado: {$scheme}");
    }
}
