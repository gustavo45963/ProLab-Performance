<?php

declare(strict_types=1);

namespace ProLab\Controllers;

use ProLab\Core\Auth;
use ProLab\Core\Request;
use ProLab\Core\Response;
use ProLab\Repositories\MeasurementRepository;

final class MeasurementController
{
    public static function index(Request $request): never
    {
        $userId = Auth::requireId();

        Response::json([
            'success' => true,
            'measurements' => MeasurementRepository::historyForUser($userId),
        ]);
    }
}
