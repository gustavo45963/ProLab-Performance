<?php

declare(strict_types=1);

namespace ProLab\Content;

/**
 * Catálogo de planos de treino — servido pela API para manter o frontend "burro"
 * e permitir evoluir o conteúdo (ou movê-lo para a base de dados) sem tocar no cliente.
 */
final class PlanCatalog
{
    public const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

    public const OBJECTIVES = [
        'hipertrofia' => [
            'label' => 'Hipertrofia',
            'description' => 'Ganho de massa, volume e progressão.',
        ],
        'emagrecimento' => [
            'label' => 'Emagrecimento',
            'description' => 'Força + condicionamento + consistência.',
        ],
        'resistencia' => [
            'label' => 'Resistência',
            'description' => 'Base aeróbica e intervalos controlados.',
        ],
        'forca' => [
            'label' => 'Força',
            'description' => 'Cargas altas, técnica e descanso.',
        ],
    ];

    public const LEVELS = [
        'iniciante' => 'Iniciante',
        'intermedio' => 'Intermédio',
        'avancado' => 'Avançado',
    ];

    private const PLANS = [
        'hipertrofia' => [
            'focus' => 'Volume + progressão',
            'bullets' => [
                'Básicos primeiro (supino, agacho, remada).',
                'Progressão semanal pequena e consistente.',
                'Técnica e amplitude controladas.',
            ],
            'note' => 'Mantém 1–2 repetições em reserva (RIR). Sobe carga quando atingires o topo das reps com técnica limpa.',
            'routine' => [
                'iniciante' => ['Full-body A', 'Descanso/Mobilidade', 'Full-body B', 'Descanso', 'Full-body C', 'Caminhada leve', 'Descanso'],
                'intermedio' => ['Peito + tríceps', 'Costas + bíceps', 'Descanso/Mobilidade', 'Pernas', 'Ombros + core', 'Cardio leve', 'Descanso'],
                'avancado' => ['Peito + tríceps', 'Costas + bíceps', 'Pernas', 'Ombros', 'Upper + acessórios', 'Cardio leve', 'Descanso'],
            ],
            'daysPerWeek' => ['iniciante' => 3, 'intermedio' => 4, 'avancado' => 5],
        ],
        'emagrecimento' => [
            'focus' => 'Força + condicionamento',
            'bullets' => [
                'Força para manter massa (full-body / básicos).',
                'Cardio intervalado curto e controlado (HIIT).',
                'Aumenta passos e consistência semanal.',
            ],
            'note' => 'O fator #1 é consistência: mantém o plano simples e repetível. Sono e proteína fazem diferença.',
            'routine' => [
                'iniciante' => ['Full-body + 10min cardio', 'Caminhada', 'Circuito (HIIT leve)', 'Descanso', 'Full-body + core', 'Cardio leve', 'Descanso'],
                'intermedio' => ['Full-body', 'HIIT 10–15min', 'Descanso/Mobilidade', 'Full-body', 'Cardio zona 2', 'Caminhada', 'Descanso'],
                'avancado' => ['Full-body (pesado)', 'HIIT 12–18min', 'Lower + core', 'Cardio zona 2', 'Upper + acessórios', 'Caminhada', 'Descanso'],
            ],
            'daysPerWeek' => ['iniciante' => 3, 'intermedio' => 4, 'avancado' => 5],
        ],
        'resistencia' => [
            'focus' => 'Base aeróbica + intervalos',
            'bullets' => [
                'Zona 2 para criar base (conversável).',
                '1 sessão intervalada por semana.',
                'Força leve/média para suporte estrutural.',
            ],
            'note' => 'Aumenta volume gradualmente. Primeiro base, depois intensidade. Recuperação ativa ajuda a manter consistência.',
            'routine' => [
                'iniciante' => ['Zona 2 (20–30min)', 'Mobilidade', 'Força leve (full)', 'Descanso', 'Intervalos curtos', 'Caminhada leve', 'Descanso'],
                'intermedio' => ['Zona 2 (30–45min)', 'Força (full)', 'Intervalos (6×2min)', 'Descanso', 'Zona 2 (curto)', 'Longo fácil', 'Descanso'],
                'avancado' => ['Zona 2', 'Intervalos', 'Força (full)', 'Zona 2', 'Ritmo moderado', 'Longo fácil', 'Descanso'],
            ],
            'daysPerWeek' => ['iniciante' => 3, 'intermedio' => 5, 'avancado' => 6],
        ],
        'forca' => [
            'focus' => 'Cargas altas + técnica',
            'bullets' => [
                'Básicos com 3–5 reps (força).',
                'Descanso maior nos exercícios principais.',
                'Acessórios para estabilidade e core.',
            ],
            'note' => 'Descansa 2–4 min nos básicos. Mantém técnica perfeita e progressão pequena (2.5–5%).',
            'routine' => [
                'iniciante' => ['Força A (agacho/supino)', 'Descanso', 'Força B (terra/press)', 'Mobilidade', 'Acessórios + core', 'Descanso', 'Descanso'],
                'intermedio' => ['Lower (força)', 'Upper (força)', 'Descanso', 'Lower (volume)', 'Upper (volume)', 'Mobilidade', 'Descanso'],
                'avancado' => ['Lower (força)', 'Upper (força)', 'Lower (assist.)', 'Upper (assist.)', 'Técnica + core', 'Mobilidade', 'Descanso'],
            ],
            'daysPerWeek' => ['iniciante' => 3, 'intermedio' => 4, 'avancado' => 5],
        ],
    ];

    public static function isValidObjective(string $objective): bool
    {
        return isset(self::OBJECTIVES[$objective]);
    }

    public static function isValidLevel(string $level): bool
    {
        return isset(self::LEVELS[$level]);
    }

    /** @return array<string, mixed>|null Plano completo pronto para renderização. */
    public static function plan(string $objective, string $level): ?array
    {
        if (!self::isValidObjective($objective) || !self::isValidLevel($level)) {
            return null;
        }

        $plan = self::PLANS[$objective];
        $routine = $plan['routine'][$level];

        return [
            'objective' => $objective,
            'objectiveLabel' => self::OBJECTIVES[$objective]['label'],
            'level' => $level,
            'levelLabel' => self::LEVELS[$level],
            'focus' => $plan['focus'],
            'bullets' => $plan['bullets'],
            'note' => $plan['note'],
            'daysPerWeek' => $plan['daysPerWeek'][$level],
            'routine' => array_map(
                static fn (string $day, string $session): array => [
                    'day' => $day,
                    'session' => $session,
                ],
                self::DAYS,
                $routine
            ),
        ];
    }
}
