async function call(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return json;
}

export const getConfig = () => call("/api/config").catch(() => ({ sync: false, ai: false }));
export const getPlan = (code) => call(`/api/plan?code=${encodeURIComponent(code)}`);
export const putPlan = (code, data) => call("/api/plan", { method: "PUT", body: JSON.stringify({ code, data }) });
export const getPhotos = (code) => call(`/api/photos?code=${encodeURIComponent(code)}`);
export const putPhoto = (code, id, src) => call("/api/photos", { method: "PUT", body: JSON.stringify({ code, id, src }) });
export const askIdea = (body) => call("/api/idea", { method: "POST", body: JSON.stringify(body) });

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
