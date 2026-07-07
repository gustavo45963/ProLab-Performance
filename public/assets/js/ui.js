/**
 * Fundações de UI: tabs, navegação mobile, reveal, tilt 3D, parallax,
 * toast, diálogos e utilidades de formatação.
 */

import { state, PREF_TAB, emit } from "./state.js";

export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

export const reduceMotion =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const numberFormat = new Intl.NumberFormat("pt-PT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatNumber(n) {
  return numberFormat.format(n);
}

/** Converte "72,5" / "72.5" / 72.5 em número (ou null). */
export function parseLocaleNumber(input) {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;

  const normalized = input.trim().replace(",", ".");
  if (normalized === "") return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/* ---------- Toast ---------- */

let toastTimer = 0;

export function toast(message, variant = "info", duration = 2800) {
  const el = $("#toast");
  if (!el) return;

  el.textContent = message;
  el.classList.remove("is-error", "is-success");
  if (variant === "error") el.classList.add("is-error");
  if (variant === "success") el.classList.add("is-success");

  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), duration);
}

/* ---------- Tabs (SPA) ---------- */

const PROTECTED_TABS = new Set(["planos", "ferramentas", "perfil"]);

const tabButtons = () => $$("[role='tab']");
const tabPanels = () => $$("[role='tabpanel']");

export function openTab(name, { focus = false, updateHash = true } = {}) {
  if (PROTECTED_TABS.has(name) && !state.user) {
    toast("Faz login para aceder a esta área.", "error");
    openDialog($("#loginDialog"));
    return;
  }

  const buttons = tabButtons();
  const target = buttons.find((b) => b.dataset.tab === name);
  if (!target) return;

  buttons.forEach((btn) => {
    const active = btn === target;
    btn.setAttribute("aria-selected", String(active));
    btn.tabIndex = active ? 0 : -1;
  });

  tabPanels().forEach((panel) => {
    panel.hidden = panel.dataset.tabpanel !== name;
  });

  localStorage.setItem(PREF_TAB, name);

  if (updateHash) {
    history.replaceState(null, "", `#${name}`);
  }

  if (focus) target.focus({ preventScroll: true });

  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  observeReveals();
  emit("tab", name);
}

export function activeTab() {
  return tabButtons().find((b) => b.getAttribute("aria-selected") === "true")
    ?.dataset.tab ?? "home";
}

export function initTabs() {
  const list = $("[role='tablist']");

  tabButtons().forEach((btn) => {
    btn.addEventListener("click", () => {
      openTab(btn.dataset.tab);
      closeNav();
    });
  });

  list?.addEventListener("keydown", (e) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;

    e.preventDefault();
    const visible = tabButtons().filter((b) => !b.hidden);
    let idx = visible.indexOf(document.activeElement);
    if (idx < 0) idx = 0;

    if (e.key === "ArrowLeft") idx = (idx - 1 + visible.length) % visible.length;
    if (e.key === "ArrowRight") idx = (idx + 1) % visible.length;
    if (e.key === "Home") idx = 0;
    if (e.key === "End") idx = visible.length - 1;

    openTab(visible[idx].dataset.tab, { focus: true });
  });

  window.addEventListener("hashchange", () => {
    const name = location.hash.replace("#", "");
    if (name) openTab(name, { updateHash: false });
  });

  // Botões espalhados pela página: abrir aba / scroll para secção.
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open-tab]");
    if (!opener) return;

    openTab(opener.dataset.openTab);

    const scrollTo = opener.dataset.scrollTo;
    if (scrollTo) {
      requestAnimationFrame(() => {
        $(scrollTo)?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    }
  });
}

/** Aba inicial: hash > preferência guardada > home. */
export function restoreTab() {
  const fromHash = location.hash.replace("#", "");
  const saved = localStorage.getItem(PREF_TAB);
  const candidate = fromHash || saved || "home";

  const name = PROTECTED_TABS.has(candidate) && !state.user ? "home" : candidate;
  openTab(name, { updateHash: Boolean(fromHash) });
}

/* ---------- Navegação mobile ---------- */

export function closeNav() {
  document.body.classList.remove("nav-open");
  $("#navToggle")?.setAttribute("aria-expanded", "false");
}

export function initNav() {
  const toggle = $("#navToggle");

  toggle?.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  $("#navBackdrop")?.addEventListener("click", closeNav);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });
}

/* ---------- Reveal on scroll ---------- */

let revealObserver = null;

export function observeReveals() {
  const els = $$("[data-reveal]:not(.is-visible)").filter(
    (el) => el.closest("[role='tabpanel']")?.hidden !== true
  );

  if (!("IntersectionObserver" in window) || reduceMotion) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  revealObserver ??= new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  els.forEach((el) => {
    el.style.setProperty("--reveal-delay", el.dataset.delay ?? "0");
    revealObserver.observe(el);
  });
}

/* ---------- Tilt 3D (cards de objetivo) ---------- */

export function initTilt(container) {
  if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;

  const MAX_DEG = 7;

  container.addEventListener("pointermove", (e) => {
    const card = e.target.closest(".objective-card");
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    card.style.setProperty("--ry", `${(px - 0.5) * MAX_DEG * 2}deg`);
    card.style.setProperty("--rx", `${(0.5 - py) * MAX_DEG * 2}deg`);
    card.style.setProperty("--gx", `${px * 100}%`);
    card.style.setProperty("--gy", `${py * 100}%`);
  });

  container.addEventListener(
    "pointerleave",
    (e) => {
      const card = e.target.closest?.(".objective-card");
      if (!card) return;
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    },
    true
  );
}

/* ---------- Parallax (chips do hero) ---------- */

export function initParallax() {
  if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;

  const scene = $("#orbitScene");
  if (!scene) return;

  const chips = $$("[data-parallax]", scene);

  scene.closest(".hero")?.addEventListener("pointermove", (e) => {
    const rect = scene.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const dy = (e.clientY - rect.top - rect.height / 2) / rect.height;

    chips.forEach((chip) => {
      const depth = Number(chip.dataset.parallax) || 16;
      chip.style.transform = `translate(${dx * depth}px, ${dy * depth}px)`;
    });
  });
}

/* ---------- Botão "voltar ao topo" ---------- */

export function initTopBtn() {
  const btn = $("#topBtn");
  if (!btn) return;

  let ticking = false;

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        btn.classList.toggle("is-visible", window.scrollY > 480);
        ticking = false;
      });
    },
    { passive: true }
  );

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });
}

/* ---------- Diálogos ---------- */

export function openDialog(dialog) {
  if (!dialog || dialog.open) return;
  dialog.showModal();
}

export function initDialogs() {
  $$("dialog").forEach((dialog) => {
    $$("[data-close-dialog]", dialog).forEach((btn) => {
      btn.addEventListener("click", () => dialog.close());
    });

    // Clique no backdrop fecha.
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  });
}
