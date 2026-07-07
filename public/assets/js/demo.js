/**
 * Modo demo — conta de demonstração 100% client-side.
 *
 * Login com demo@prolab.dev nunca toca na API: perfil, medidas, checklist
 * e planos vêm deste módulo e persistem em localStorage. Permite testar o
 * frontend completo sem backend a correr.
 */

import { ApiError } from "./errors.js";

export const DEMO_EMAIL = "demo@prolab.dev";
export const DEMO_PASSWORD = "demo1234";

const DEMO_USER = { id: 0, name: "Atleta Demo", email: DEMO_EMAIL };

const SESSION_KEY = "prolab.demo.session";
const STORE_KEY = "prolab.demo.store";

/* ---------- Catálogo local (espelho de src/Content/PlanCatalog.php) ---------- */

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const OBJECTIVES = [
  { key: "hipertrofia", label: "Hipertrofia", description: "Ganho de massa, volume e progressão." },
  { key: "emagrecimento", label: "Emagrecimento", description: "Força + condicionamento + consistência." },
  { key: "resistencia", label: "Resistência", description: "Base aeróbica e intervalos controlados." },
  { key: "forca", label: "Força", description: "Cargas altas, técnica e descanso." },
];

const LEVELS = [
  { key: "iniciante", label: "Iniciante" },
  { key: "intermedio", label: "Intermédio" },
  { key: "avancado", label: "Avançado" },
];

const PLANS = {
  hipertrofia: {
    focus: "Volume + progressão",
    bullets: [
      "Básicos primeiro (supino, agacho, remada).",
      "Progressão semanal pequena e consistente.",
      "Técnica e amplitude controladas.",
    ],
    note: "Mantém 1–2 repetições em reserva (RIR). Sobe carga quando atingires o topo das reps com técnica limpa.",
    routine: {
      iniciante: ["Full-body A", "Descanso/Mobilidade", "Full-body B", "Descanso", "Full-body C", "Caminhada leve", "Descanso"],
      intermedio: ["Peito + tríceps", "Costas + bíceps", "Descanso/Mobilidade", "Pernas", "Ombros + core", "Cardio leve", "Descanso"],
      avancado: ["Peito + tríceps", "Costas + bíceps", "Pernas", "Ombros", "Upper + acessórios", "Cardio leve", "Descanso"],
    },
    daysPerWeek: { iniciante: 3, intermedio: 4, avancado: 5 },
  },
  emagrecimento: {
    focus: "Força + condicionamento",
    bullets: [
      "Força para manter massa (full-body / básicos).",
      "Cardio intervalado curto e controlado (HIIT).",
      "Aumenta passos e consistência semanal.",
    ],
    note: "O fator #1 é consistência: mantém o plano simples e repetível. Sono e proteína fazem diferença.",
    routine: {
      iniciante: ["Full-body + 10min cardio", "Caminhada", "Circuito (HIIT leve)", "Descanso", "Full-body + core", "Cardio leve", "Descanso"],
      intermedio: ["Full-body", "HIIT 10–15min", "Descanso/Mobilidade", "Full-body", "Cardio zona 2", "Caminhada", "Descanso"],
      avancado: ["Full-body (pesado)", "HIIT 12–18min", "Lower + core", "Cardio zona 2", "Upper + acessórios", "Caminhada", "Descanso"],
    },
    daysPerWeek: { iniciante: 3, intermedio: 4, avancado: 5 },
  },
  resistencia: {
    focus: "Base aeróbica + intervalos",
    bullets: [
      "Zona 2 para criar base (conversável).",
      "1 sessão intervalada por semana.",
      "Força leve/média para suporte estrutural.",
    ],
    note: "Aumenta volume gradualmente. Primeiro base, depois intensidade. Recuperação ativa ajuda a manter consistência.",
    routine: {
      iniciante: ["Zona 2 (20–30min)", "Mobilidade", "Força leve (full)", "Descanso", "Intervalos curtos", "Caminhada leve", "Descanso"],
      intermedio: ["Zona 2 (30–45min)", "Força (full)", "Intervalos (6×2min)", "Descanso", "Zona 2 (curto)", "Longo fácil", "Descanso"],
      avancado: ["Zona 2", "Intervalos", "Força (full)", "Zona 2", "Ritmo moderado", "Longo fácil", "Descanso"],
    },
    daysPerWeek: { iniciante: 3, intermedio: 5, avancado: 6 },
  },
  forca: {
    focus: "Cargas altas + técnica",
    bullets: [
      "Básicos com 3–5 reps (força).",
      "Descanso maior nos exercícios principais.",
      "Acessórios para estabilidade e core.",
    ],
    note: "Descansa 2–4 min nos básicos. Mantém técnica perfeita e progressão pequena (2.5–5%).",
    routine: {
      iniciante: ["Força A (agacho/supino)", "Descanso", "Força B (terra/press)", "Mobilidade", "Acessórios + core", "Descanso", "Descanso"],
      intermedio: ["Lower (força)", "Upper (força)", "Descanso", "Lower (volume)", "Upper (volume)", "Mobilidade", "Descanso"],
      avancado: ["Lower (força)", "Upper (força)", "Lower (assist.)", "Upper (assist.)", "Técnica + core", "Mobilidade", "Descanso"],
    },
    daysPerWeek: { iniciante: 3, intermedio: 4, avancado: 5 },
  },
};

/* ---------- Store local (persistido em localStorage) ---------- */

function toSqlDate(date) {
  const pad = (n) => String(n).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function currentWeekKey(now = new Date()) {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86_400_000 + 1) / 7);

  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function bmiOf(weightKg, heightM) {
  if (!weightKg || !heightM) return null;

  return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
}

/** 8 semanas de medidas + perfil preenchido: a demo nunca abre vazia. */
function defaultStore() {
  const heightM = 1.75;
  const weights = [78.2, 77.6, 77.1, 76.4, 75.9, 75.3, 74.9, 74.5];
  const now = Date.now();

  return {
    profile: {
      name: DEMO_USER.name,
      email: DEMO_EMAIL,
      age: 24,
      weight_kg: 74.5,
      height_m: heightM,
      objective: "hipertrofia",
      level: "intermedio",
    },
    measurements: weights.map((weight, i) => {
      const weeksAgo = weights.length - 1 - i;

      return {
        weight_kg: weight,
        height_m: heightM,
        bmi: bmiOf(weight, heightM),
        created_at: toSqlDate(new Date(now - weeksAgo * 7 * 86_400_000)),
      };
    }),
    checklists: {
      [currentWeekKey()]: [true, true, false, true, false, false, false],
    },
  };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Store corrompido — recomeça do zero.
  }

  const store = defaultStore();
  saveStore(store);
  return store;
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

/* ---------- Interface compatível com o cliente da API ---------- */

export const demo = {
  active: () => localStorage.getItem(SESSION_KEY) === "1",

  isDemoEmail: (email) =>
    String(email ?? "").trim().toLowerCase() === DEMO_EMAIL,

  async login({ password }) {
    if (password !== DEMO_PASSWORD) {
      throw new ApiError("E-mail ou palavra-passe incorretos.", 401, null);
    }

    localStorage.setItem(SESSION_KEY, "1");
    loadStore(); // garante seed no primeiro login

    return { success: true, user: { ...DEMO_USER } };
  },

  async logout() {
    localStorage.removeItem(SESSION_KEY);

    return { success: true, message: "Sessão terminada." };
  },

  async session() {
    return { success: true, authenticated: true, user: { ...DEMO_USER } };
  },

  async getProfile() {
    return { success: true, profile: { ...loadStore().profile } };
  },

  async saveProfile(data) {
    const store = loadStore();

    store.profile = {
      ...store.profile,
      name: data.name ?? store.profile.name,
      age: data.age ?? null,
      weight_kg: data.weight_kg ?? null,
      height_m: data.height_m ?? null,
      objective: data.objective ?? null,
      level: data.level ?? "iniciante",
    };

    // Mesma regra do backend: gravação com peso alimenta o histórico.
    if (data.weight_kg != null) {
      store.measurements.push({
        weight_kg: data.weight_kg,
        height_m: data.height_m ?? null,
        bmi: bmiOf(data.weight_kg, data.height_m),
        created_at: toSqlDate(new Date()),
      });
    }

    saveStore(store);

    return {
      success: true,
      message: "Perfil guardado (modo demo).",
      profile: { ...store.profile },
    };
  },

  async getMeasurements() {
    return { success: true, measurements: [...loadStore().measurements] };
  },

  async getCatalog() {
    return { success: true, objectives: OBJECTIVES, levels: LEVELS };
  },

  async getPlan(objective, level) {
    const plan = PLANS[objective];
    const levelMeta = LEVELS.find((l) => l.key === level);
    const objectiveMeta = OBJECTIVES.find((o) => o.key === objective);

    if (!plan || !levelMeta || !objectiveMeta) {
      throw new ApiError("Plano não encontrado: combinação de objetivo/nível inválida.", 404, null);
    }

    return {
      success: true,
      plan: {
        objective,
        objectiveLabel: objectiveMeta.label,
        level,
        levelLabel: levelMeta.label,
        focus: plan.focus,
        bullets: plan.bullets,
        note: plan.note,
        daysPerWeek: plan.daysPerWeek[level],
        routine: DAYS.map((day, i) => ({ day, session: plan.routine[level][i] })),
      },
    };
  },

  async getChecklist(week) {
    const items = loadStore().checklists[week] ?? Array(7).fill(false);

    return {
      success: true,
      week,
      items,
      completed: items.filter(Boolean).length,
    };
  },

  async saveChecklist(week, items) {
    const store = loadStore();
    store.checklists[week] = items.map(Boolean);
    saveStore(store);

    return {
      success: true,
      week,
      items: store.checklists[week],
      completed: store.checklists[week].filter(Boolean).length,
    };
  },
};
