<?php

declare(strict_types=1);

/**
 * Front controller da API — único ponto de entrada para /api/*.
 * O rewrite (.htaccess em produção, server.php em dev) encaminha tudo para aqui.
 */

require dirname(__DIR__) . '/src/bootstrap.php';

use ProLab\Controllers\AuthController;
use ProLab\Controllers\ChecklistController;
use ProLab\Controllers\HealthController;
use ProLab\Controllers\MeasurementController;
use ProLab\Controllers\PlanController;
use ProLab\Controllers\ProfileController;
use ProLab\Core\Auth;
use ProLab\Core\Request;
use ProLab\Core\Router;

Auth::start();

$router = new Router();

// Infraestrutura
$router->get('/api/health', [HealthController::class, 'check']);

// Autenticação
$router->post('/api/auth/register', [AuthController::class, 'register']);
$router->post('/api/auth/login', [AuthController::class, 'login']);
$router->post('/api/auth/logout', [AuthController::class, 'logout']);
$router->get('/api/auth/session', [AuthController::class, 'session']);

// Perfil + histórico de medidas (requer sessão)
$router->get('/api/profile', [ProfileController::class, 'show']);
$router->put('/api/profile', [ProfileController::class, 'update']);
$router->get('/api/measurements', [MeasurementController::class, 'index']);

// Catálogo de planos (público)
$router->get('/api/plans', [PlanController::class, 'index']);
$router->get('/api/plans/{objective}/{level}', [PlanController::class, 'show']);

// Checklist semanal (requer sessão)
$router->get('/api/checklist', [ChecklistController::class, 'show']);
$router->put('/api/checklist', [ChecklistController::class, 'update']);

$router->dispatch(Request::capture());
