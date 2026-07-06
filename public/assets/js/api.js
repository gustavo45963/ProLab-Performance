/**
 * Cliente da API — todas as chamadas passam por aqui.
 *
 * Exceção única: a conta demo (demo@prolab.dev) nunca toca na API —
 * é servida por ./demo.js, 100% client-side (ver esse módulo).
 * Qualquer outra conta fala sempre com o backend real.
 */

import { ApiError } from "./errors.js";
import { demo } from "./demo.js";

export { ApiError };

async function request(path, { method = "GET", body } = {}) {
  let response;

  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Sem ligação ao servidor. Tenta novamente.", 0, null);
  }

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    // Resposta sem corpo JSON — payload fica null.
  }

  if (!response.ok) {
    throw new ApiError(payload?.message ?? `Erro ${response.status}.`, response.status, payload);
  }

  return payload;
}

export const api = {
  health: () => request("api/health"),

  // Autenticação
  session: () =>
    demo.active() ? demo.session() : request("api/auth/session"),

  register: (data) => {
    if (demo.isDemoEmail(data.email)) {
      return Promise.reject(
        new ApiError("Este e-mail é reservado para a conta de demonstração.", 409, null)
      );
    }

    return request("api/auth/register", { method: "POST", body: data });
  },

  login: (data) =>
    demo.isDemoEmail(data.email)
      ? demo.login(data)
      : request("api/auth/login", { method: "POST", body: data }),

  logout: () =>
    demo.active() ? demo.logout() : request("api/auth/logout", { method: "POST", body: {} }),

  // Perfil + medidas
  getProfile: () =>
    demo.active() ? demo.getProfile() : request("api/profile"),

  saveProfile: (data) =>
    demo.active() ? demo.saveProfile(data) : request("api/profile", { method: "PUT", body: data }),

  getMeasurements: () =>
    demo.active() ? demo.getMeasurements() : request("api/measurements"),

  // Catálogo de planos
  getCatalog: () =>
    demo.active() ? demo.getCatalog() : request("api/plans"),

  getPlan: (objective, level) =>
    demo.active()
      ? demo.getPlan(objective, level)
      : request(`api/plans/${encodeURIComponent(objective)}/${encodeURIComponent(level)}`),

  // Checklist semanal
  getChecklist: (week) =>
    demo.active()
      ? demo.getChecklist(week)
      : request(`api/checklist?week=${encodeURIComponent(week)}`),

  saveChecklist: (week, items) =>
    demo.active()
      ? demo.saveChecklist(week, items)
      : request("api/checklist", { method: "PUT", body: { week, items } }),
};
