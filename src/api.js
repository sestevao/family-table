async function call(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

const post = (path, body, method = "POST") => call(path, { method, body: JSON.stringify(body) });

export const getConfig = () => call("/api/config").catch(() => ({ sync: false, ai: false, reminders: false }));
export const getPlan = (code) => call(`/api/plan?code=${encodeURIComponent(code)}`);

// Resolves { version } when saved, or { conflict: true, data, version } when someone else saved first
export async function putPlan(code, data, base) {
  try {
    return await post("/api/plan", { code, data, base }, "PUT");
  } catch (e) {
    if (e.status === 409) return e.body;
    throw e;
  }
}

export const getPhotos = (code) => call(`/api/photos?code=${encodeURIComponent(code)}`);
export const putPhoto = (code, id, src) => post("/api/photos", { code, id, src }, "PUT");
export const askIdea = (body) => post("/api/idea", body);
export const importRecipe = (body) => post("/api/import", body);
export const savePush = (code, subscription) => post("/api/push", { code, subscription });
export const removePush = (code, endpoint) => post("/api/push", { code, endpoint }, "DELETE");

export function newFamilyCode() {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  const s = Array.from(bytes, (b) => abc[b % abc.length]).join("");
  return `fam-${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10)}`;
}

// Browser storage helpers: never throw
export const local = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
