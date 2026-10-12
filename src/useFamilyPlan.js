import { useCallback, useEffect, useRef, useState } from "react";
import { getConfig, getPlan, putPlan, getPhotos, putPhoto, newFamilyCode, local } from "./api.js";
import { normalise } from "./plan.js";

const CODE_RE = /fam-[a-z0-9-]{12,40}/;
const POLL_MS = 20000;

// Holds the plan, saves it on this device, and keeps it in sync with the family when storage is connected
export function useFamilyPlan() {
  const [state, setState] = useState(() => normalise(local.get("ft-state")));
  const [photos, setPhotos] = useState(() => local.get("ft-photos") || {});
  const [config, setConfig] = useState({ sync: false, ai: false, loaded: false });
  const [code, setCode] = useState(() => local.get("ft-family"));
  const [status, setStatus] = useState("Saved on this phone");

  const stateRef = useRef(state);
  const codeRef = useRef(code);
  const dirty = useRef(false);
  const saving = useRef(false);
  const timer = useRef(null);
  const lastUpdated = useRef(0);
  stateRef.current = state;
  codeRef.current = code;

  const canSync = config.sync && Boolean(code);

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

  const push = useCallback(async () => {
    clearTimeout(timer.current);
    if (!codeRef.current) return;
    if (saving.current) {
      dirty.current = true;
      return;
    }
    saving.current = true;
    dirty.current = false;
    setStatus("Saving…");
    try {
      const { updatedAt } = await putPlan(codeRef.current, stateRef.current);
      lastUpdated.current = updatedAt;
      setStatus("Synced");
    } catch {
      dirty.current = true;
      setStatus("Offline · saved on this phone");
    }
    saving.current = false;
    if (dirty.current) timer.current = setTimeout(push, 4000);
  }, []);

  const pull = useCallback(async () => {
    if (!codeRef.current || dirty.current || saving.current) return;
    try {
      const res = await getPlan(codeRef.current);
      if (dirty.current || saving.current) return; // a local edit happened while we were loading
      if (res.data) {
        if (res.updatedAt !== lastUpdated.current) {
          lastUpdated.current = res.updatedAt;
          setState(normalise(res.data));
        }
        setStatus("Synced");
      } else {
        await push(); // brand-new family: upload this phone's plan
      }
    } catch {
      setStatus("Offline · saved on this phone");
    }
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
    lastUpdated.current = 0;
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

  // Change the plan: update(s => { s.adults = 2 })
  const update = useCallback(
    (fn) => {
      setState((prev) => {
        const next = structuredClone(prev);
        fn(next);
        return next;
      });
      if (config.sync && codeRef.current) {
        dirty.current = true;
        setStatus("Saving…");
        clearTimeout(timer.current);
        timer.current = setTimeout(push, 700);
      }
    },
    [config.sync, push]
  );

  const replaceState = useCallback((s) => update((d) => Object.assign(d, normalise(s))), [update]);

  const startFamily = useCallback(() => {
    const c = newFamilyCode();
    local.set("ft-family", c);
    codeRef.current = c;
    setCode(c);
    return push();
  }, [push]);

  const joinFamily = useCallback((text) => {
    const m = String(text || "").match(CODE_RE);
    if (!m) return false;
    local.set("ft-family", m[0]);
    dirty.current = false;
    setCode(m[0]);
    return true;
  }, []);

  const leaveFamily = useCallback(() => {
    local.remove("ft-family");
    setCode(null);
  }, []);

  const savePhoto = useCallback(
    async (id, src) => {
      setPhotos((p) => {
        const n = { ...p, [id]: src };
        local.set("ft-photos", n);
        return n;
      });
      if (config.sync && codeRef.current) await putPhoto(codeRef.current, id, src);
    },
    [config.sync]
  );

  return { state, update, replaceState, photos, savePhoto, config, code, status, startFamily, joinFamily, leaveFamily };
}
