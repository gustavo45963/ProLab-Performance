<?php

declare(strict_types=1);

namespace ProLab\Repositories;

use ProLab\Database\Connection;

final class ProfileRepository
{
    /** @return array<string, mixed> Perfil (com nome/e-mail da conta), campos null quando ainda não preenchidos. */
    public static function forUser(int $userId): array
    {
        $stmt = Connection::pdo()->prepare(
            'SELECT u.name, u.email, p.age, p.weight_kg, p.height_m, p.objective, p.level
             FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id
             WHERE u.id = ?
             LIMIT 1'
        );
        $stmt->execute([$userId]);
        $row = $stmt->fetch() ?: [];

        return [
            'name' => (string) ($row['name'] ?? ''),
            'email' => (string) ($row['email'] ?? ''),
            'age' => isset($row['age']) ? (int) $row['age'] : null,
            'weight_kg' => isset($row['weight_kg']) ? (float) $row['weight_kg'] : null,
            'height_m' => isset($row['height_m']) ? (float) $row['height_m'] : null,
            'objective' => isset($row['objective']) ? (string) $row['objective'] : null,
            'level' => (string) ($row['level'] ?? 'iniciante'),
        ];
    }

    public static function upsert(
        int $userId,
        ?int $age,
        ?float $weightKg,
        ?float $heightM,
        ?string $objective,
        string $level,
    ): void {
        $sql = Connection::upsertSql(
            'profiles',
            ['user_id', 'age', 'weight_kg', 'height_m', 'objective', 'level'],
            ['user_id'],
            ['age', 'weight_kg', 'height_m', 'objective', 'level']
        );

        Connection::pdo()->prepare($sql)->execute([
            $userId,
            $age,
            $weightKg,
            $heightM,
            $objective,
            $level,
        ]);
    }
}
