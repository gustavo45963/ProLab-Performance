<?php

declare(strict_types=1);

namespace ProLab\Repositories;

use ProLab\Database\Connection;

final class UserRepository
{
    /** @return array{id: int, name: string, email: string, password_hash: string}|null */
    public static function findByEmail(string $email): ?array
    {
        $stmt = Connection::pdo()->prepare(
            'SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1'
        );
        $stmt->execute([$email]);
        $row = $stmt->fetch();

        return $row ? self::cast($row) : null;
    }

    /** @return array{id: int, name: string, email: string, password_hash: string}|null */
    public static function findById(int $id): ?array
    {
        $stmt = Connection::pdo()->prepare(
            'SELECT id, name, email, password_hash FROM users WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row ? self::cast($row) : null;
    }

    public static function create(string $name, string $email, string $passwordHash): int
    {
        $pdo = Connection::pdo();
        $stmt = $pdo->prepare(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
        );
        $stmt->execute([$name, $email, $passwordHash]);

        return (int) $pdo->lastInsertId();
    }

    public static function updateName(int $id, string $name): void
    {
        $stmt = Connection::pdo()->prepare('UPDATE users SET name = ? WHERE id = ?');
        $stmt->execute([$name, $id]);
    }

    public static function updatePasswordHash(int $id, string $passwordHash): void
    {
        $stmt = Connection::pdo()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $stmt->execute([$passwordHash, $id]);
    }

    /**
     * @param array<string, mixed> $row
     * @return array{id: int, name: string, email: string, password_hash: string}
     */
    private static function cast(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'email' => (string) $row['email'],
            'password_hash' => (string) $row['password_hash'],
        ];
    }
}
