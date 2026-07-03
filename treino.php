<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

// Garante que só utilizadores logados acedem a esta rota
$userId = requireLogin();
$pdo = getDB();

// ---------------------------------------------------------
// MÉTODO GET: Devolve o histórico de treinos do utilizador
// ---------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // 1. Vai buscar as sessões de treino ordenadas pela mais recente
    $stmt = $pdo->prepare('
        SELECT id, data_sessao, tipo_treino, duracao_minutos, criado_em
        FROM sessoes_treino
        WHERE utilizador_id = ?
        ORDER BY data_sessao DESC, criado_em DESC
    ');
    $stmt->execute([$userId]);
    $sessoes = $stmt->fetchAll();

    // 2. Para cada sessão, vai buscar as séries e os exercícios realizados
    foreach ($sessoes as &$sessao) {
        $stmtSeries = $pdo->prepare('
            SELECT sr.carga_kg, sr.repeticoes, e.nome AS exercicio_nome, e.grupo_muscular
            FROM series_realizadas sr
            JOIN exercicios e ON sr.exercicio_id = e.id
            WHERE sr.sessao_id = ?
        ');
        $stmtSeries->execute([$sessao['id']]);
        $sessao['series'] = $stmtSeries->fetchAll();
    }

    jsonResponse([
        'success' => true,
        'sessoes' => $sessoes,
    ]);
}

// ---------------------------------------------------------
// MÉTODO POST: Regista um novo treino e as suas séries
// ---------------------------------------------------------
requirePost();
$body = readJsonBody();

// Extrai os dados principais da sessão
$dataSessao = $body['data_sessao'] ?? date('Y-m-d');
$tipoTreino = trim((string)($body['tipo_treino'] ?? ''));
$duracao = isset($body['duracao_minutos']) && $body['duracao_minutos'] !== '' ? (int)$body['duracao_minutos'] : null;
$series = $body['series'] ?? []; // Array com as séries realizadas

if ($tipoTreino === '') {
    jsonResponse(['success' => false, 'message' => 'O tipo de treino é obrigatório.']);
}

// Usamos uma Transação (Transaction) para garantir que ou grava tudo (Sessão + Séries) ou não grava nada
try {
    $pdo->beginTransaction();

    // 1. Insere a sessão de treino na tabela sessoes_treino
    $stmtSessao = $pdo->prepare('
        INSERT INTO sessoes_treino (utilizador_id, data_sessao, tipo_treino, duracao_minutos)
        VALUES (?, ?, ?, ?)
    ');
    $stmtSessao->execute([$userId, $dataSessao, $tipoTreino, $duracao]);

    // Recupera o ID da sessão que acabou de ser criada
    $sessaoId = (int)$pdo->lastInsertId();

    // 2. Insere as séries na tabela series_realizadas, conectando ao ID da sessão
    if (is_array($series) && count($series) > 0) {
        $stmtSerie = $pdo->prepare('
            INSERT INTO series_realizadas (sessao_id, exercicio_id, carga_kg, repeticoes)
            VALUES (?, ?, ?, ?)
        ');

        foreach ($series as $serie) {
            $exId = (int)($serie['exercicio_id'] ?? 0);
            $carga = (float)($serie['carga_kg'] ?? 0);
            $reps = (int)($serie['repeticoes'] ?? 0);

            // Só grava a série se tiver um exercício e repetições válidas
            if ($exId > 0 && $reps > 0) {
                $stmtSerie->execute([$sessaoId, $exId, $carga, $reps]);
            }
        }
    }

    // Confirma as alterações na base de dados
    $pdo->commit();
    jsonResponse(['success' => true, 'message' => 'Treino registado com sucesso!']);

} catch (Exception $e) {
    // Se der erro a gravar as séries, ele reverte a criação da sessão
    $pdo->rollBack();
    jsonResponse(['success' => false, 'message' => 'Erro interno ao guardar o treino.'], 500);
}