/**
 * Estado partilhado + bus de eventos.
 * localStorage guarda apenas preferências de UI (nunca dados de conta).
 */

export const state = {
  user: null,       // { id, name, email } | null
  profile: null,    // perfil vindo da API | null
  catalog: null,    // { objectives, levels } vindo de /api/plans
};

export const bus = new EventTarget();

export function emit(name, detail = null) {
  bus.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on(name, handler) {
  bus.addEventListener(name, handler);
}

/* --- Preferências locais de convidado (sincronizadas no login) --- */

const PREF_OBJECTIVE = "prolab.pref.objective";
const PREF_LEVEL = "prolab.pref.level";
export const PREF_TAB = "prolab.activeTab";

export const prefs = {
  get objective() {
    return localStorage.getItem(PREF_OBJECTIVE);
  },
  set objective(value) {
    if (value) localStorage.setItem(PREF_OBJECTIVE, value);
    else localStorage.removeItem(PREF_OBJECTIVE);
  },
  get level() {
    return localStorage.getItem(PREF_LEVEL) ?? "iniciante";
  },
  set level(value) {
    localStorage.setItem(PREF_LEVEL, value);
  },
};

/* --- Seletores derivados --- */

export function isLoggedIn() {
  return state.user !== null;
}

/** Objetivo efetivo: perfil (autenticado) ou preferência local (convidado). */
export function currentObjective() {
  return isLoggedIn() ? (state.profile?.objective ?? null) : prefs.objective;
}

/** Nível efetivo: perfil (autenticado) ou preferência local (convidado). */
export function currentLevel() {
  return isLoggedIn() ? (state.profile?.level ?? "iniciante") : prefs.level;
}

/**
 * Payload completo para PUT /api/profile.
 * O backend grava o registo inteiro, por isso enviamos sempre o estado
 * atual mesclado com as alterações — nunca campos soltos.
 */
export function buildProfilePayload(overrides = {}) {
  const p = state.profile ?? {};

  return {
    name: p.name ?? state.user?.name ?? null,
    age: p.age ?? null,
    weight_kg: p.weight_kg ?? null,
    height_m: p.height_m ?? null,
    objective: p.objective ?? null,
    level: p.level ?? "iniciante",
    ...overrides,
  };
}
