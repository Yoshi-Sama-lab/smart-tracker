// frontend/src/lib/api.jsx

// Adjust this if your backend runs on a different port or you use an environment variable
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export const api = {
  // ---- STUDY LOGS ----
  getLogs: async (token) => {
    // Changed from /logs to /study
    const res = await fetch(`${BASE_URL}/study`, { headers: getHeaders(token) });
    if (!res.ok) throw new Error("Failed to fetch logs");
    return res.json();
  },
  addLog: async (token, data) => {
    // Changed from /logs to /study
    const res = await fetch(`${BASE_URL}/study`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to add log");
    return res.json();
  },
  deleteLog: async (token, id) => {
    // Changed from /logs to /study
    const res = await fetch(`${BASE_URL}/study/${id}`, {
      method: "DELETE",
      headers: getHeaders(token),
    });
    if (!res.ok) throw new Error("Failed to delete log");
    return res.json();
  },

  // ---- GOALS ----
  getGoal: async (token) => {
    const res = await fetch(`${BASE_URL}/goals`, { headers: getHeaders(token) });
    if (!res.ok) throw new Error("Failed to fetch goal");
    return res.json();
  },
  setGoal: async (token, data) => {
    const res = await fetch(`${BASE_URL}/goals`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to set goal");
    return res.json();
  },

  // ---- SCHEDULE ----
  getSchedule: async (token) => {
    const res = await fetch(`${BASE_URL}/schedule`, { headers: getHeaders(token) });
    if (!res.ok) throw new Error("Failed to fetch schedule");
    return res.json();
  },
  addScheduleEvent: async (token, data) => {
    const res = await fetch(`${BASE_URL}/schedule`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to add schedule event");
    return res.json();
  },
  updateScheduleEvent: async (token, id, data) => {
    const res = await fetch(`${BASE_URL}/schedule/${id}`, {
      method: "PATCH", // Changed to PATCH to match your backend
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update schedule event");
    return res.json();
  },

  // ---- VTOP SCRAPING INTEGRATION ----
  initVtopSync: async (token) => {
    const res = await fetch(`${BASE_URL}/vtop/init`, { 
      headers: getHeaders(token) 
    });
    if (!res.ok) throw new Error("Failed to initialize VTOP connection");
    return res.json();
  },
  submitVtopSync: async (token, payload) => {
    const res = await fetch(`${BASE_URL}/vtop/sync`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(payload), // payload contains { sessionId, regNo, password, captcha }
    });
    if (!res.ok) throw new Error("Failed to sync VTOP schedule");
    return res.json();
  }
};