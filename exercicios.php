<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

// Apenas aceita pedidos GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $pdo = getDB();

    // Vai buscar os exercícios ordenados por ordem alfabética
    $stmt = $pdo->query('SELECT id, nome, grupo_muscular FROM exercicios ORDER BY nome ASC');
    $exercicios = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'exercicios' => $exercicios,
    ]);
}
?>