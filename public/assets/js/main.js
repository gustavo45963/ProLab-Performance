/**
 * Ponto de entrada — orquestra o arranque da aplicação.
 */

import { api } from "./api.js";
import { initNav, initTabs, initDialogs, initTopBtn, initParallax, restoreTab, observeReveals, toast } from "./ui.js";
import { initAuth, bootstrapSession } from "./auth.js";
import { initPlans, loadCatalog } from "./plans.js";
import { initTools } from "./tools.js";
import { initProfile } from "./profile.js";

/** Estado real do backend no rodapé (GET /api/health). */
async function paintApiStatus() {
  const wrap = document.querySelector("#apiStatus");
  const text = document.querySelector("#apiStatusText");
  if (!wrap || !text) return;

  try {
    const health = await api.health();
    wrap.classList.add("is-ok");
    text.textContent = `API operacional · ${health.driver}`;
  } catch {
    wrap.classList.add("is-down");
    text.textContent = "API indisponível";
  }
}

async function boot() {
  // Fundações de UI
  initNav();
  initTabs();
  initDialogs();
  initTopBtn();
  initParallax();

  // Funcionalidades
  initAuth();
  initPlans();
  initTools();
  initProfile();

  // Dados: sessão + catálogo em paralelo (a sessão decide as abas visíveis).
  const [catalogResult] = await Promise.allSettled([loadCatalog(), bootstrapSession()]);

  if (catalogResult.status === "rejected") {
    const grid = document.querySelector("#objectiveGrid");
    if (grid) {
      grid.innerHTML =
        '<p class="loading-note">Não foi possível carregar os objetivos. Recarrega a página.</p>';
    }
    toast("Servidor indisponível. Algumas áreas podem não carregar.", "error");
  }

  restoreTab();
  observeReveals();
  paintApiStatus();
}

boot();
