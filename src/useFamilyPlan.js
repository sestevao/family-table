import { useCallback, useEffect, useRef, useState } from "react";
import { getConfig, getPlan, putPlan, getPhotos, putPhoto, newFamilyCode, local } from "./api.js";
import { normalise } from "./plan.js";

const CODE_RE = /fam-[a-z0-9-]{12,40}/;
const POLL_MS = 20000;

const apply = (s, fn) => {
  const next = structuredClone(s);
  fn(next);
  return next;
};

/*
  Holds the plan, saves it on this phone, and syncs it with the family.

  Every change is a small function (e.g. "tick the eggs"). Changes not yet saved wait in a queue.
  If someone else saved first, we take their version and replay our queued changes on top,
  so two people ticking items at the same time never undo each other.
*/
export function useFamilyPlan() {
  const [state, setState] = useState(() => normalise(local.get("ft-state")));
  const [photos, setPhotos] = useState(() => local.get("ft-photos") || {});
  const [config, setConfig] = useState({ sync: false, ai: false, reminders: false, loaded: false });
  const [code, setCode] = useState(() => local.get("ft-family"));
  const [status, setStatus] = useState("Saved on this phone");
  const [ready, setReady] = useState(false); // true once the family's latest plan has loaded

  const stateRef = useRef(state);
  const codeRef = useRef(code);
  const syncRef = useRef(false);
  const base = useRef(null); // last version confirmed by the server
  const version = useRef(null);
  const queue = useRef([]); // changes not yet saved
  const saving = useRef(false);
  const timer = useRef(null);
  stateRef.current = state;
  codeRef.current = code;

  const canSync = config.sync && Boolean(code);
  syncRef.current = canSync;

  // Invite links look like https://your-app.vercel.app/?family=fam-xxxxx-xxxxx-xxxxx
  useEffect(() => {
    const m = new URLSearchParams(location.search).get("family")?.match(CODE_RE);
    if (m) {
      setCode(m[0]);
      local.set("ft-family", m[0]);
      history.replaceState(null, "", location.pathname);
    }
    getConfig().then((c) => setConfig({ ...c, loaded: true }));
  }, []);

  useEffect(() => local.set("ft-state", state), [state]);
  useEffect(() => {
    if (config.loaded && !canSync) setReady(true);
  }, [config.loaded, canSync]);

  const show = (s) => {
    stateRef.current = s;
    setState(s);
  };

  const push = useCallback(async (attempt = 0) => {
    clearTimeout(timer.current);
    if (!syncRef.current || !codeRef.current || !base.current) return;
    if (saving.current) return;
    const n = queue.current.length;
    if (!n && version.current) return;
    saving.current = true;
    setStatus("Saving…");
    const snapshot = queue.current.reduce(apply, base.current);
    try {
      const res = await putPlan(codeRef.current, snapshot, version.current);
      if (res.conflict) {
        // Someone else saved first: rebuild on top of their version and try again
        base.current = normalise(res.data);
        version.current = res.version;
        show(queue.current.reduce(apply, base.current));
        saving.current = false;
        if (attempt < 5) return push(attempt + 1);
      } else {
        base.current = snapshot;
        version.current = res.version;
        queue.current.splice(0, n);
        setStatus("Synced");
      }
    } catch {
      setStatus("Offline · saved on this phone");
      timer.current = setTimeout(push, 5000);
    }
    saving.current = false;
    if (queue.current.length) timer.current = setTimeout(push, 700);
  }, []);

  const pull = useCallback(async () => {
    if (!codeRef.current || saving.current || queue.current.length) return;
    try {
      const res = await getPlan(codeRef.current);
      if (saving.current || queue.current.length) return; // a local change happened while loading
      if (res.data) {
        if (res.version !== version.current) {
          base.current = normalise(res.data);
          version.current = res.version;
          show(base.current);
        }
        setStatus("Synced");
      } else {
        // Brand-new family: this phone's plan becomes the family plan
        base.current = stateRef.current;
        version.current = null;
        await push();
      }
    } catch {
      setStatus("Offline · saved on this phone");
    }
    setReady(true);
  }, [push]);

  const pullPhotos = useCallback(async () => {
    if (!codeRef.current) return;
    try {
      const { photos: p } = await getPhotos(codeRef.current);
      setPhotos(p);
      local.set("ft-photos", p);
    } catch {}
  }, []);

  // Load on start, then check for family changes every 20 seconds while the app is open
  useEffect(() => {
    if (!canSync) {
      setStatus("Saved on this phone");
      return;
    }
    base.current = null;
    version.current = null;
    queue.current = [];
    setReady(false);
    pull();
    pullPhotos();
    const id = setInterval(() => document.visibilityState === "visible" && pull(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        pull();
        pullPhotos();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [canSync, code, pull, pullPhotos]);

  // Change the plan: update(s => { s.adults = 2 }). Read any values from events BEFORE calling update.
  const update = useCallback(
    (fn) => {
      show(apply(stateRef.current, fn));
      if (syncRef.current && base.current) {
        queue.current.push(fn);
        setStatus("Saving…");
        clearTimeout(timer.current);
        timer.current = setTimeout(push, 700);
      }
    },
    [push]
  );

  const replaceState = useCallback(
    (s) => {
      const clean = normalise(s);
      update((d) => {
        Object.keys(d).forEach((k) => delete d[k]);
        Object.assign(d, structuredClone(clean));
      });
    },
    [update]
  );

  const startFamily = useCallback(async () => {
    const c = newFamilyCode();
    local.set("ft-family", c);
    codeRef.current = c;
    setCode(c);
  }, []);

  const joinFamily = useCallback((text) => {
    const m = String(text || "").match(CODE_RE);
    if (!m) return false;
    local.set("ft-family", m[0]);
    setCode(m[0]);
    return true;
  }, []);

  const leaveFamily = useCallback(() => {
    local.remove("ft-family");
    setCode(null);
  }, []);

  const savePhoto = useCallback(async (id, src) => {
    let stored = src;
    if (syncRef.current && codeRef.current) stored = (await putPhoto(codeRef.current, id, src)).src || src;
    setPhotos((p) => {
      const n = { ...p, [id]: stored };
      local.set("ft-photos", n);
      return n;
    });
  }, []);

  return { state, update, replaceState, photos, savePhoto, config, code, status, ready, startFamily, joinFamily, leaveFamily };
}
