const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "request_failed" }));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => request("/api/health"),
  listVendors: () => request("/api/vendors"),
  getVendor: (id) => request(`/api/vendors/${id}`),
  createVendor: (data) => request("/api/vendors", { method: "POST", body: JSON.stringify(data) }),
  listRequisitions: () => request("/api/requisitions"),
  getRequisition: (id) => request(`/api/requisitions/${id}`),
  createRequisition: (data) => request("/api/requisitions", { method: "POST", body: JSON.stringify(data) }),
  chat: (message, history = []) => request("/api/chat", { method: "POST", body: JSON.stringify({ message, history }) }),
};
