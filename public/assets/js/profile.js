/**
 * Perfil: formulário de dados, estatísticas e gráfico de evolução (API real).
 */

import { api, ApiError } from "./api.js";
import { state, on, emit, isLoggedIn, buildProfilePayload, currentObjective, currentLevel } from "./state.js";
import { $, parseLocaleNumber, formatNumber, toast } from "./ui.js";
import { computeIMC } from "./tools.js";

/* ---------- Formulário ---------- */

function fillForm(profile) {
  $("#profileName").value = profile?.name ?? "";
  $("#profileAge").value = profile?.age ?? "";
  $("#profileWeight").value = profile?.weight_kg != null ? formatNumber(profile.weight_kg) : "";
  $("#profileHeight").value = profile?.height_m != null ? formatNumber(profile.height_m) : "";
}

function initForm() {
  const form = $("#profileForm");
  const msg = $("#profileMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!isLoggedIn()) {
      toast("Faz login para guardar o perfil.", "error");
      return;
    }

    const payload = buildProfilePayload({
      name: $("#profileName").value.trim() || null,
      age: $("#profileAge").value !== "" ? Number($("#profileAge").value) : null,
      weight_kg: parseLocaleNumber($("#profileWeight").value),
      height_m: parseLocaleNumber($("#profileHeight").value),
    });

    const submitBtn = form.querySelector("[type='submit']");
    submitBtn.disabled = true;
    msg.textContent = "A guardar…";

    try {
      const saved = await api.saveProfile(payload);
      state.profile = saved.profile;
      emit("profile", state.profile);

      msg.textContent = "";
      toast(saved.message ?? "Perfil guardado.", "success");

      if (state.user && saved.profile.name && saved.profile.name !== state.user.name) {
        state.user = { ...state.user, name: saved.profile.name };
        $("#userName").textContent = saved.profile.name;
        $("#userAvatar").textContent = saved.profile.name[0].toUpperCase();
      }

      await renderSparkline();
    } catch (err) {
      msg.textContent = err instanceof ApiError ? err.message : "Não foi possível guardar.";
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/* ---------- Estatísticas ---------- */

function renderStats() {
  const profile = state.profile;
  const calc = computeIMC(profile?.weight_kg, profile?.height_m);

  $("#statIMC").textContent = calc ? formatNumber(calc.imc) : "—";
  $("#statIMCText").textContent = calc ? calc.label : "Preenche peso e altura no perfil.";

  const objectiveKey = currentObjective();
  const objective = state.catalog?.objectives.find((o) => o.key === objectiveKey);
  $("#statObjective").textContent = objective?.label ?? "—";

  const level = state.catalog?.levels.find((l) => l.key === currentLevel());
  $("#statLevel").textContent = level?.label ?? "—";
}

/* ---------- Gráfico de evolução (SVG) ---------- */

const VIEW_W = 600;
const VIEW_H = 160;
const PAD_X = 14;
const PAD_Y = 22;

async function renderSparkline() {
  const svg = $("#sparkline");
  const empty = $("#sparkEmpty");
  const last = $("#sparkLast");
  if (!svg || !isLoggedIn()) return;

  let measurements = [];

  try {
    ({ measurements } = await api.getMeasurements());
  } catch {
    return;
  }

  const points = measurements.filter((m) => m.weight_kg != null);

  if (points.length === 0) {
    svg.hidden = true;
    empty.hidden = false;
    last.textContent = "";
    return;
  }

  const latest = points[points.length - 1];
  const date = new Date(latest.created_at.replace(" ", "T") + "Z");
  const dateLabel = Number.isNaN(date.getTime())
    ? ""
    : ` · ${date.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}`;
  last.textContent = `Última: ${formatNumber(latest.weight_kg)} kg${dateLabel}`;

  empty.hidden = true;
  svg.hidden = false;

  const weights = points.map((p) => p.weight_kg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min || 1;

  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? VIEW_W / 2
        : PAD_X + (i / (points.length - 1)) * (VIEW_W - PAD_X * 2);
    const y = VIEW_H - PAD_Y - ((p.weight_kg - min) / span) * (VIEW_H - PAD_Y * 2);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });

  const lineData = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const baseline = VIEW_H - 6;
  const areaData =
    `M ${coords[0][0]},${baseline} ` +
    coords.map(([x, y]) => `L ${x},${y}`).join(" ") +
    ` L ${coords[coords.length - 1][0]},${baseline} Z`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="sparkStroke" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#E7FF9A"/>
        <stop offset="1" stop-color="#CBFB45"/>
      </linearGradient>
      <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(203,251,69,0.2)"/>
        <stop offset="1" stop-color="rgba(203,251,69,0)"/>
      </linearGradient>
    </defs>
    <path d="${areaData}" fill="url(#sparkFill)"></path>
    <polyline points="${lineData}" fill="none" stroke="url(#sparkStroke)"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              vector-effect="non-scaling-stroke"></polyline>
    ${coords
      .map(
        ([x, y], i) =>
          `<circle cx="${x}" cy="${y}" r="${i === coords.length - 1 ? 4.5 : 3}"
                   fill="${i === coords.length - 1 ? "#CBFB45" : "#0a0b0d"}"
                   stroke="url(#sparkStroke)" stroke-width="2"></circle>`
      )
      .join("")}`;
}

/* ---------- Init ---------- */

export function initProfile() {
  initForm();

  on("profile", (e) => {
    fillForm(e.detail);
    renderStats();
  });

  on("catalog", renderStats);

  on("auth", (e) => {
    if (e.detail) {
      renderSparkline();
    } else {
      fillForm(null);
      renderStats();

      const svg = $("#sparkline");
      const empty = $("#sparkEmpty");
      if (svg) svg.hidden = true;
      if (empty) empty.hidden = false;
      $("#sparkLast").textContent = "";
    }
  });
}
