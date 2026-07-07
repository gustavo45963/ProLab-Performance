/**
 * Objetivos + planos: cards renderizados do catálogo da API,
 * plano e rotina pedidos ao backend a cada combinação objetivo/nível.
 */

import { api } from "./api.js";
import {
  state,
  prefs,
  emit,
  on,
  isLoggedIn,
  currentObjective,
  currentLevel,
  buildProfilePayload,
} from "./state.js";
import { $, $$, escapeHtml, toast, observeReveals, initTilt, reduceMotion } from "./ui.js";

const OBJECTIVE_ICONS = {
  hipertrofia:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 9v6M4 10.5v3M17.5 9v6M20 10.5v3M6.5 12h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  emagrecimento:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3c.7 2.6-.9 4-2.2 5.3C8.3 9.7 7 11.2 7 13.6A5 5 0 0 0 17 14c0-2-1-3.6-2-5 .4 1-.5 2-1.4 2.2.8-2 .2-5.2-1.6-8.2Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  resistencia:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-5 4 10 2-5h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  forca:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const planCache = new Map();

/* ---------- Cards de objetivo ---------- */

function renderObjectiveCards() {
  const grid = $("#objectiveGrid");
  if (!grid || !state.catalog) return;

  grid.innerHTML = state.catalog.objectives
    .map(
      (obj, i) => `
      <button class="objective-card" type="button" role="radio"
              aria-checked="false" tabindex="${i === 0 ? 0 : -1}"
              data-objective="${escapeHtml(obj.key)}">
        <span class="objective-icon" aria-hidden="true">${OBJECTIVE_ICONS[obj.key] ?? ""}</span>
        <span class="objective-title">${escapeHtml(obj.label)}</span>
        <span class="objective-desc">${escapeHtml(obj.description)}</span>
      </button>`
    )
    .join("");

  syncObjectiveUI();
}

function syncObjectiveUI() {
  const selected = currentObjective();

  $$("#objectiveGrid .objective-card").forEach((card) => {
    const checked = card.dataset.objective === selected;
    card.setAttribute("aria-checked", String(checked));
  });
}

async function selectObjective(key) {
  if (isLoggedIn()) {
    const saved = await api.saveProfile(buildProfilePayload({ objective: key }));
    state.profile = saved.profile;
    emit("profile", state.profile);
  } else {
    prefs.objective = key;
  }

  syncObjectiveUI();
  await renderPlan();

  const label = state.catalog?.objectives.find((o) => o.key === key)?.label ?? key;
  toast(`Objetivo: ${label}`, "success");
}

function initObjectiveGrid() {
  const grid = $("#objectiveGrid");
  if (!grid) return;

  initTilt(grid);

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".objective-card");
    if (card) selectObjective(card.dataset.objective).catch(showSaveError);
  });

  grid.addEventListener("keydown", (e) => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(e.key)) return;

    e.preventDefault();
    const cards = $$(".objective-card", grid);
    let idx = cards.indexOf(document.activeElement);
    if (idx < 0) idx = 0;

    if (e.key === "ArrowLeft" || e.key === "ArrowUp") idx = (idx - 1 + cards.length) % cards.length;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") idx = (idx + 1) % cards.length;
    if (e.key === "Home") idx = 0;
    if (e.key === "End") idx = cards.length - 1;

    cards.forEach((c, i) => (c.tabIndex = i === idx ? 0 : -1));
    cards[idx].focus();
    selectObjective(cards[idx].dataset.objective).catch(showSaveError);
  });
}

function showSaveError(err) {
  toast(err?.message ?? "Não foi possível guardar.", "error");
}

/* ---------- Nível (segmented control) ---------- */

function syncLevelUI() {
  const level = currentLevel();

  $$("#levelGroup .seg-btn").forEach((btn) => {
    const checked = btn.dataset.level === level;
    btn.setAttribute("aria-checked", String(checked));
    btn.tabIndex = checked ? 0 : -1;
  });
}

async function selectLevel(level) {
  if (isLoggedIn()) {
    const saved = await api.saveProfile(buildProfilePayload({ level }));
    state.profile = saved.profile;
    emit("profile", state.profile);
  } else {
    prefs.level = level;
  }

  syncLevelUI();
  await renderPlan();
}

function initLevelGroup() {
  const group = $("#levelGroup");
  if (!group) return;

  group.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-level]");
    if (btn) selectLevel(btn.dataset.level).catch(showSaveError);
  });

  group.addEventListener("keydown", (e) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;

    e.preventDefault();
    const buttons = $$("[data-level]", group);
    let idx = buttons.indexOf(document.activeElement);
    if (idx < 0) idx = Math.max(0, buttons.findIndex((b) => b.getAttribute("aria-checked") === "true"));

    if (e.key === "ArrowLeft") idx = (idx - 1 + buttons.length) % buttons.length;
    if (e.key === "ArrowRight") idx = (idx + 1) % buttons.length;
    if (e.key === "Home") idx = 0;
    if (e.key === "End") idx = buttons.length - 1;

    buttons[idx].focus();
    selectLevel(buttons[idx].dataset.level).catch(showSaveError);
  });
}

/* ---------- Plano + rotina ---------- */

async function fetchPlan(objective, level) {
  const key = `${objective}/${level}`;

  if (!planCache.has(key)) {
    const { plan } = await api.getPlan(objective, level);
    planCache.set(key, plan);
  }

  return planCache.get(key);
}

export async function renderPlan() {
  const card = $("#planCard");
  const routineBody = $("#routineBody");
  if (!card || !routineBody) return;

  syncLevelUI();

  const objective = currentObjective();

  if (!objective) {
    card.innerHTML = `
      <div class="plan-empty">
        <p class="plan-empty-title">Ainda não escolheste um objetivo.</p>
        <p class="plan-empty-text">Vai à aba <strong>Home</strong>, seleciona um objetivo e volta aqui.</p>
      </div>`;
    routineBody.innerHTML =
      "<tr><td>—</td><td>Seleciona um objetivo para gerar a rotina.</td></tr>";
    return;
  }

  let plan;

  try {
    plan = await fetchPlan(objective, currentLevel());
  } catch (err) {
    card.innerHTML = `
      <div class="plan-empty">
        <p class="plan-empty-title">Não foi possível carregar o plano.</p>
        <p class="plan-empty-text">${escapeHtml(err?.message ?? "Tenta novamente.")}</p>
      </div>`;
    return;
  }

  if (!reduceMotion) {
    card.classList.remove("is-updating");
    void card.offsetWidth;
    card.classList.add("is-updating");
  }

  card.innerHTML = `
    <div class="plan-head">
      <p class="plan-kicker">${escapeHtml(plan.objectiveLabel)} • ${escapeHtml(plan.levelLabel)}</p>
      <h3 class="plan-title">Plano de ${escapeHtml(plan.objectiveLabel)} (${escapeHtml(plan.levelLabel)})</h3>
      <p class="plan-meta">
        <span class="chip">${plan.daysPerWeek} dias/semana</span>
        <span class="chip chip-soft">Foco: ${escapeHtml(plan.focus)}</span>
        <span class="chip chip-soft">Ciclo: 6–12 semanas</span>
      </p>
    </div>

    <div class="plan-body">
      <ul class="plan-list">
        ${plan.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
      </ul>
      <div class="plan-note">
        <p><strong>Dica:</strong> ${escapeHtml(plan.note)}</p>
      </div>
    </div>`;

  routineBody.innerHTML = plan.routine
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.day)}</td><td>${escapeHtml(row.session)}</td></tr>`
    )
    .join("");
}

/* ---------- Init ---------- */

export async function loadCatalog() {
  const catalog = await api.getCatalog();
  state.catalog = catalog;
  emit("catalog", catalog);
}

export function initPlans() {
  initObjectiveGrid();
  initLevelGroup();

  $("#printPlan")?.addEventListener("click", () => window.print());

  on("catalog", () => {
    renderObjectiveCards();
    observeReveals();
    renderPlan();
  });

  on("auth", (e) => {
    // Catálogo pode ter falhado no arranque (backend desligado): no login
    // demo, recarrega — o modo demo serve o catálogo localmente.
    if (e.detail && !state.catalog) {
      loadCatalog().catch(() => {});
    }

    syncObjectiveUI();
    renderPlan();
  });

  on("profile", () => {
    syncObjectiveUI();
    syncLevelUI();
  });
}
