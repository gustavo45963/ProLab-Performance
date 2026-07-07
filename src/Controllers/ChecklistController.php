<?php

declare(strict_types=1);

namespace ProLab\Controllers;

use ProLab\Core\Auth;
use ProLab\Core\Request;
use ProLab\Core\Response;
use ProLab\Repositories\ChecklistRepository;

final class ChecklistController
{
    private const WEEK_PATTERN = '/^\d{4}-W\d{2}$/';

    public static function show(Request $request): never
    {
        $userId = Auth::requireId();
        $week = $request->queryParam('week') ?? self::currentWeek();

        if (!preg_match(self::WEEK_PATTERN, $week)) {
            Response::error('Semana inválida. Formato esperado: 2026-W27.', 422);
        }

        $items = ChecklistRepository::get($userId, $week);

        Response::json([
            'success' => true,
            'week' => $week,
            'items' => $items,
            'completed' => count(array_filter($items)),
        ]);
    }

    public static function update(Request $request): never
    {
        $userId = Auth::requireId();

        $week = (string) $request->input('week', self::currentWeek());
        $items = $request->input('items');

        if (!preg_match(self::WEEK_PATTERN, $week)) {
            Response::error('Semana inválida. Formato esperado: 2026-W27.', 422);
        }

        if (!is_array($items) || count($items) !== 7) {
            Response::error('A checklist deve ter exatamente 7 itens.', 422);
        }

        $items = array_map(static fn (mixed $v): bool => (bool) $v, array_values($items));

        ChecklistRepository::put($userId, $week, $items);

        Response::json([
            'success' => true,
            'week' => $week,
            'items' => $items,
            'completed' => count(array_filter($items)),
        ]);
    }

    /** Semana ISO atual, ex.: 2026-W27. */
    private static function currentWeek(): string
    {
        return date('o') . '-W' . date('W');
    }
}
