// ─── CONFIG ───────────────────────────────────────────────────────────────────
export const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─── HEADERS ──────────────────────────────────────────────────────────────────
export const authHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// ─── SAFE FETCH ───────────────────────────────────────────────────────────────
async function request(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── API ──────────────────────────────────────────────────────────────────────
export const api = {
  // ── STUDY LOGS ────────────────────────────────────────────────────────────
  getLogs: (token) =>
    request(`${BASE_URL}/study`, { headers: authHeaders(token) }),

  addLog: (token, data) =>
    request(`${BASE_URL}/study`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  deleteLog: (token, id) =>
    request(`${BASE_URL}/study/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    }),

  // ── GOALS ─────────────────────────────────────────────────────────────────
  getGoal: (token) =>
    request(`${BASE_URL}/goals`, { headers: authHeaders(token) }),

  setGoal: (token, data) =>
    request(`${BASE_URL}/goals`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  // ── SCHEDULE ──────────────────────────────────────────────────────────────
  getSchedule: (token) =>
    request(`${BASE_URL}/schedule`, { headers: authHeaders(token) }),

  addScheduleEvent: (token, data) =>
    request(`${BASE_URL}/schedule`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  updateScheduleEvent: (token, id, data) =>
    request(`${BASE_URL}/schedule/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  deleteScheduleEvent: (token, id) =>
    request(`${BASE_URL}/schedule/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    }),

  // ── LIFE LOGS (Gym / Food / Budget) ───────────────────────────────────────
  addLifeLog: (token, logType, textContent, date) =>
    request(`${BASE_URL}/lifelog`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ textContent, date, logType }),
    }),

  getLifeLogs: (token, logType) =>
    request(`${BASE_URL}/lifelog/${logType}`, {
      headers: authHeaders(token),
    }),

  // ── WEIGHT ────────────────────────────────────────────────────────────────
  addWeight: (token, weight, date) =>
    request(`${BASE_URL}/weight`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ weight, date }),
    }),

  getWeight: (token) =>
    request(`${BASE_URL}/weight`, { headers: authHeaders(token) }),

  // ── VTOP ──────────────────────────────────────────────────────────────────
  initVtopSync: (token) =>
    request(`${BASE_URL}/vtop/init`, { headers: authHeaders(token) }),

  submitVtopSync: (token, payload) =>
    request(`${BASE_URL}/vtop/sync`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  // ── DASHBOARD ANALYTICS (single request) ──────────────────────────────────
  getDashboard: (token) =>
    request(`${BASE_URL}/analytics/dashboard`, {
      headers: authHeaders(token),
    }),
};