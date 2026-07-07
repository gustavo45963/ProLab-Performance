<?php

declare(strict_types=1);

namespace ProLab\Controllers;

use ProLab\Content\PlanCatalog;
use ProLab\Core\Auth;
use ProLab\Core\Request;
use ProLab\Core\Response;
use ProLab\Repositories\MeasurementRepository;
use ProLab\Repositories\ProfileRepository;
use ProLab\Repositories\UserRepository;

final class ProfileController
{
    public static function show(Request $request): never
    {
        $userId = Auth::requireId();

        Response::json([
            'success' => true,
            'profile' => ProfileRepository::forUser($userId),
        ]);
    }

    public static function update(Request $request): never
    {
        $userId = Auth::requireId();

        $age = self::intOrNull($request->input('age'));
        $weightKg = self::floatOrNull($request->input('weight_kg'));
        $heightM = self::floatOrNull($request->input('height_m'));
        $objective = self::stringOrNull($request->input('objective'));
        $level = self::stringOrNull($request->input('level')) ?? 'iniciante';
        $name = self::stringOrNull($request->input('name'));

        if ($age !== null && ($age < 1 || $age > 120)) {
            Response::error('Idade inválida (1–120).', 422);
        }

        if ($weightKg !== null && ($weightKg < 20 || $weightKg > 400)) {
            Response::error('Peso inválido (20–400 kg).', 422);
        }

        if ($heightM !== null && ($heightM < 0.5 || $heightM > 2.8)) {
            Response::error('Altura inválida (0,50–2,80 m).', 422);
        }

        if ($objective !== null && !PlanCatalog::isValidObjective($objective)) {
            Response::error('Objetivo inválido.', 422);
        }

        if (!PlanCatalog::isValidLevel($level)) {
            Response::error('Nível inválido.', 422);
        }

        if ($name !== null) {
            $name = trim($name);

            if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
                Response::error('O nome deve ter entre 2 e 100 caracteres.', 422);
            }

            UserRepository::updateName($userId, $name);
        }

        ProfileRepository::upsert($userId, $age, $weightKg, $heightM, $objective, $level);

        // Cada gravação com peso alimenta o histórico de medidas (gráfico de evolução).
        if ($weightKg !== null) {
            $bmi = null;

            if ($heightM !== null && $heightM > 0) {
                $bmi = round($weightKg / ($heightM * $heightM), 2);
            }

            MeasurementRepository::add($userId, $weightKg, $heightM, $bmi);
        }

        Response::json([
            'success' => true,
            'message' => 'Perfil guardado com sucesso.',
            'profile' => ProfileRepository::forUser($userId),
        ]);
    }

    private static function intOrNull(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (int) $value : null;
    }

    private static function floatOrNull(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        // Aceita vírgula decimal ("72,5") vinda de inputs em pt.
        if (is_string($value)) {
            $value = str_replace(',', '.', trim($value));
        }

        return is_numeric($value) ? (float) $value : null;
    }

    private static function stringOrNull(mixed $value): ?string
    {
        return (is_string($value) && trim($value) !== '') ? trim($value) : null;
    }
}
