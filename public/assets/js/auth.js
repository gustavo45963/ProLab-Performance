/**
 * Autenticação: sessão, login, registo, logout e estado visual.
 */

import { api, ApiError } from "./api.js";
import { state, prefs, emit, buildProfilePayload } from "./state.js";
import { $, openTab, activeTab, openDialog, toast, closeNav } from "./ui.js";

const PROTECTED = new Set(["planos", "ferramentas", "perfil"]);

function applyAuthUI() {
  const loggedIn = state.user !== null;

  document.body.classList.toggle("logged-in", loggedIn);
  document.body.classList.toggle("logged-out", !loggedIn);

  $("#openLogin").hidden = loggedIn;
  $("#openRegister").hidden = loggedIn;
  $("#logoutButton").hidden = !loggedIn;
  $("#userChip").hidden = !loggedIn;

  ["planos", "ferramentas", "perfil"].forEach((name) => {
    const tabBtn = $(`#tab-${name}`);
    if (tabBtn) tabBtn.hidden = !loggedIn;
  });

  if (loggedIn) {
    $("#userName").textContent = state.user.name;
    $("#userAvatar").textContent = (state.user.name?.[0] ?? "?").toUpperCase();
  } else if (PROTECTED.has(activeTab())) {
    openTab("home");
  }
}

/** Carrega o perfil e sincroniza preferências escolhidas como convidado. */
async function loadProfile() {
  const { profile } = await api.getProfile();
  state.profile = profile;

  if (!profile.objective && prefs.objective) {
    const saved = await api.saveProfile(
      buildProfilePayload({ objective: prefs.objective, level: prefs.level })
    );
    state.profile = saved.profile;
  }

  emit("profile", state.profile);
}

async function afterAuth(user) {
  state.user = user;
  applyAuthUI();
  emit("auth", user);
  await loadProfile();
}

function setFormMessage(el, message, isError) {
  el.textContent = message ?? "";
  el.classList.toggle("is-error", Boolean(isError));
  el.classList.toggle("is-success", Boolean(message) && !isError);
}

function wireForm(form, msgEl, action, dialog) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());
    const submitBtn = form.querySelector("[type='submit']");

    submitBtn.disabled = true;
    setFormMessage(msgEl, "A processar…", false);

    try {
      const result = await action(data);
      dialog.close();
      form.reset();
      setFormMessage(msgEl, "", false);
      await afterAuth(result.user);
      toast(`Bem-vindo, ${result.user.name}!`, "success");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Algo correu mal. Tenta novamente.";
      setFormMessage(msgEl, message, true);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

export async function bootstrapSession() {
  try {
    const session = await api.session();

    if (session.authenticated) {
      await afterAuth(session.user);
      return;
    }
  } catch {
    // Servidor indisponível — arranca como convidado.
  }

  state.user = null;
  state.profile = null;
  applyAuthUI();
  emit("auth", null);
}

export function initAuth() {
  const loginDialog = $("#loginDialog");
  const registerDialog = $("#registerDialog");

  const openLogin = () => {
    closeNav();
    openDialog(loginDialog);
  };
  const openRegister = () => {
    closeNav();
    openDialog(registerDialog);
  };

  $("#openLogin").addEventListener("click", openLogin);
  $("#openRegister").addEventListener("click", openRegister);

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-login]")) openLogin();
    if (e.target.closest("[data-open-register]")) openRegister();
  });

  wireForm($("#loginForm"), $("#loginMsg"), (data) => api.login(data), loginDialog);
  wireForm($("#registerForm"), $("#registerMsg"), (data) => api.register(data), registerDialog);

  // Conta de demonstração (seedada pelo backend): preenche e entra num clique.
  $("#fillDemo")?.addEventListener("click", () => {
    $("#loginEmail").value = "demo@prolab.dev";
    $("#loginPassword").value = "demo1234";
    $("#loginForm").requestSubmit();
  });

  $("#logoutButton").addEventListener("click", async () => {
    try {
      await api.logout();
    } catch {
      // Mesmo que a chamada falhe, limpamos o estado local.
    }

    state.user = null;
    state.profile = null;
    applyAuthUI();
    emit("auth", null);
    emit("profile", null);
    closeNav();
    toast("Sessão terminada. Até já!", "info");
  });
}
