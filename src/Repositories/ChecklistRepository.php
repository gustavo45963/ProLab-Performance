<?php

declare(strict_types=1);

namespace ProLab\Repositories;

use ProLab\Database\Connection;

final class ChecklistRepository
{
    /** @return bool[] Sete booleanos, um por dia da semana. */
    public static function get(int $userId, string $weekKey): array
    {
        $stmt = Connection::pdo()->prepare(
            'SELECT items FROM checklists WHERE user_id = ? AND week_key = ? LIMIT 1'
        );
        $stmt->execute([$userId, $weekKey]);
        $row = $stmt->fetch();

        if (!$row) {
            return array_fill(0, 7, false);
        }

        $items = json_decode((string) $row['items'], true);

        if (!is_array($items) || count($items) !== 7) {
            return array_fill(0, 7, false);
        }

        return array_map(static fn (mixed $v): bool => (bool) $v, array_values($items));
    }

    /** @param bool[] $items */
    public static function put(int $userId, string $weekKey, array $items): void
    {
        $sql = Connection::upsertSql(
            'checklists',
            ['user_id', 'week_key', 'items'],
            ['user_id', 'week_key'],
            ['items']
        );

        Connection::pdo()->prepare($sql)->execute([
            $userId,
            $weekKey,
            json_encode($items),
        ]);
    }
}
