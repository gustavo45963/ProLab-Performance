<?php

declare(strict_types=1);

namespace ProLab\Repositories;

use ProLab\Database\Connection;

final class MeasurementRepository
{
    public static function add(int $userId, ?float $weightKg, ?float $heightM, ?float $bmi): void
    {
        $stmt = Connection::pdo()->prepare(
            'INSERT INTO measurements (user_id, weight_kg, height_m, bmi) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $weightKg, $heightM, $bmi]);
    }

    /** @return array<int, array<string, mixed>> Histórico ascendente (mais antigo primeiro). */
    public static function historyForUser(int $userId, int $limit = 50): array
    {
        $limit = max(1, min(200, $limit));

        // Últimas N por data, devolvidas em ordem cronológica para o gráfico.
        $stmt = Connection::pdo()->prepare(
            "SELECT weight_kg, height_m, bmi, created_at
             FROM measurements
             WHERE user_id = ?
             ORDER BY created_at DESC, id DESC
             LIMIT {$limit}"
        );
        $stmt->execute([$userId]);
        $rows = array_reverse($stmt->fetchAll());

        return array_map(static fn (array $row): array => [
            'weight_kg' => isset($row['weight_kg']) ? (float) $row['weight_kg'] : null,
            'height_m' => isset($row['height_m']) ? (float) $row['height_m'] : null,
            'bmi' => isset($row['bmi']) ? (float) $row['bmi'] : null,
            'created_at' => (string) $row['created_at'],
        ], $rows);
    }
}
