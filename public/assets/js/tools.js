/**
 * Ferramentas: IMC, temporizador HIIT, checklist semanal (API) e quiz.
 */

import { api } from "./api.js";
import { state, on, isLoggedIn } from "./state.js";
import { $, $$, parseLocaleNumber, formatNumber, toast } from "./ui.js";

/* ---------- IMC ---------- */

export function computeIMC(weightKg, heightM) {
  if (!weightKg || !heightM || weightKg <= 0 || heightM <= 0) return null;

  const imc = weightKg / (heightM * heightM);
  let label = "Obesidade";

  if (imc < 18.5) label = "Abaixo do peso";
  else if (imc < 25) label = "Peso normal";
  else if (imc < 30) label = "Excesso de peso";

  return { imc: Math.round(imc * 100) / 100, label };
}

function initIMC() {
  const form = $("#imcForm");
  const result = $("#imcResult");
  if (!form || !result) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const weight = parseLocaleNumber($("#imcWeight").value);
    const height = parseLocaleNumber($("#imcHeight").value);
    const calc = computeIMC(weight, height);

    if (!calc) {
      result.textContent = "Preenche peso e altura corretamente (valores > 0).";
      result.classList.add("is-error");
      return;
    }

    result.classList.remove("is-error");
    result.textContent = `IMC: ${formatNumber(calc.imc)} — ${calc.label}`;
  });

  // Pré-preenche com os dados do perfil quando disponíveis.
  on("profile", (e) => {
    const profile = e.detail;
    if (!profile) return;

    if (profile.weight_kg && !$("#imcWeight").value) {
      $("#imcWeight").value = formatNumber(profile.weight_kg);
    }
    if (profile.height_m && !$("#imcHeight").value) {
      $("#imcHeight").value = formatNumber(profile.height_m);
    }
  });
}

/* ---------- Temporizador HIIT ---------- */

const HIIT_DURATION = 30_000;
const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function initTimer() {
  const ring = $("#timerRing");
  const progress = $("#timerProgress");
  const value = $("#timerValue");
  const phase = $("#timerPhase");
  const startBtn = $("#timerStart");
  const resetBtn = $("#timerReset");
  if (!ring || !progress || !startBtn) return;

  progress.style.strokeDasharray = String(RING_CIRCUMFERENCE);

  let running = false;
  let startTs = 0;
  let pausedElapsed = 0;
  let raf = 0;
  let cycle = 1;

  function paint(elapsed) {
    const remainingMs = Math.max(0, HIIT_DURATION - (elapsed % HIIT_DURATION));
    const seconds = Math.ceil(remainingMs / 1000);
    const fraction = remainingMs / HIIT_DURATION;

    progress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - fraction));
    value.textContent = String(seconds);
    ring.setAttribute("aria-valuenow", String(seconds));

    const currentCycle = Math.floor(elapsed / HIIT_DURATION) + 1;

    if (currentCycle !== cycle) {
      cycle = currentCycle;
      phase.textContent = `Ciclo ${cycle} (30s)`;
    }
  }

  function tick(now) {
    if (!running) return;
    paint(now - startTs + pausedElapsed);
    raf = requestAnimationFrame(tick);
  }

  function setRunning(next) {
    running = next;
    startBtn.textContent = running ? "Pausar" : "Iniciar";
    startBtn.setAttribute("aria-pressed", String(running));
  }

  startBtn.addEventListener("click", () => {
    if (running) {
      pausedElapsed += performance.now() - startTs;
      cancelAnimationFrame(raf);
      setRunning(false);
      return;
    }

    startTs = performance.now();
    setRunning(true);
    raf = requestAnimationFrame(tick);
  });

  resetBtn.addEventListener("click", () => {
    cancelAnimationFrame(raf);
    setRunning(false);
    pausedElapsed = 0;
    cycle = 1;
    phase.textContent = "Ciclo (30s)";
    paint(0);
  });

  paint(0);
}

/* ---------- Checklist semanal (persistida na API) ---------- */

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86_400_000 + 1) / 7);

  return {
    year: d.getUTCFullYear(),
    week,
    key: `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`,
  };
}

function initChecklist() {
  const listEl = $("#checklist");
  const barEl = $("#checklistBar");
  const metaEl = $("#checklistMeta");
  const weekEl = $("#weekLabel");
  const resetBtn = $("#resetChecklist");
  if (!listEl) return;

  const { year, week, key } = isoWeek();
  let items = Array(7).fill(false);
  let saveTimer = 0;

  weekEl.textContent = `Semana ${week} · ${year}`;

  function paint() {
    const done = items.filter(Boolean).length;

    barEl.style.width = `${Math.round((done / 7) * 100)}%`;
    metaEl.textContent = `${done}/7 concluídos`;

    $$(".check-item", listEl).forEach((item, i) => {
      item.classList.toggle("is-checked", items[i]);
      item.querySelector(".check-box").textContent = items[i] ? "✓" : "";
      item.querySelector("input").checked = items[i];
    });
  }

  function render() {
    listEl.innerHTML = DAYS.map(
      (day, i) => `
      <label class="check-item">
        <input type="checkbox" data-day="${i}" />
        <span class="check-box" aria-hidden="true"></span>
        <span class="check-label">${day}</span>
      </label>`
    ).join("");

    paint();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await api.saveChecklist(key, items);
      } catch (err) {
        toast(err?.message ?? "Não foi possível guardar a checklist.", "error");
      }
    }, 450);
  }

  listEl.addEventListener("change", (e) => {
    const input = e.target.closest("input[data-day]");
    if (!input) return;

    items[Number(input.dataset.day)] = input.checked;
    paint();
    scheduleSave();
  });

  resetBtn.addEventListener("click", () => {
    items = Array(7).fill(false);
    paint();
    scheduleSave();
    toast("Semana reposta.", "info");
  });

  async function load() {
    try {
      const data = await api.getChecklist(key);
      items = data.items;
      paint();
    } catch {
      // 401 quando não autenticado — a aba está protegida, nada a fazer.
    }
  }

  render();

  on("auth", () => {
    if (isLoggedIn()) {
      load();
    } else {
      items = Array(7).fill(false);
      paint();
    }
  });
}

/* ---------- Quiz ---------- */

function initQuiz() {
  const form = $("#quizForm");
  const scoreEl = $("#quizScore");
  const resetBtn = $("#resetQuiz");
  if (!form) return;

  const answered = new Set();

  function updateScore() {
    const correct = $$(".quiz-q.is-correct", form).length;
    scoreEl.textContent = String(correct);
  }

  form.addEventListener("change", (e) => {
    const input = e.target.closest("input[type='radio']");
    if (!input) return;

    const fieldset = input.closest(".quiz-q");
    const feedback = fieldset.querySelector(".feedback");
    const isCorrect = input.value === fieldset.dataset.answer;

    fieldset.classList.toggle("is-correct", isCorrect);
    fieldset.classList.toggle("is-wrong", !isCorrect);
    feedback.textContent = isCorrect
      ? "Certo! ✔"
      : "Não é essa. Tenta outra opção.";

    answered.add(fieldset.dataset.q);
    updateScore();
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    answered.clear();

    $$(".quiz-q", form).forEach((q) => {
      q.classList.remove("is-correct", "is-wrong");
      q.querySelector(".feedback").textContent = "";
    });

    updateScore();
  });
}

/* ---------- Init ---------- */

export function initTools() {
  initIMC();
  initTimer();
  initChecklist();
  initQuiz();
}
