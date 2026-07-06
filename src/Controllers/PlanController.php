<?php

declare(strict_types=1);

namespace ProLab\Controllers;

use ProLab\Content\PlanCatalog;
use ProLab\Core\Request;
use ProLab\Core\Response;

final class PlanController
{
    /** Metadados do catálogo: objetivos e níveis disponíveis. */
    public static function index(Request $request): never
    {
        $objectives = [];

        foreach (PlanCatalog::OBJECTIVES as $key => $meta) {
            $objectives[] = ['key' => $key] + $meta;
        }

        $levels = [];

        foreach (PlanCatalog::LEVELS as $key => $label) {
            $levels[] = ['key' => $key, 'label' => $label];
        }

        Response::json([
            'success' => true,
            'objectives' => $objectives,
            'levels' => $levels,
        ]);
    }

    public static function show(Request $request): never
    {
        $objective = $request->params['objective'] ?? '';
        $level = $request->params['level'] ?? '';

        $plan = PlanCatalog::plan($objective, $level);

        if ($plan === null) {
            Response::error('Plano não encontrado: combinação de objetivo/nível inválida.', 404);
        }

        Response::json(['success' => true, 'plan' => $plan]);
    }
}
