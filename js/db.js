// Supabase client + progress storage.
// Local-first: every change is saved on the device immediately, then synced to Supabase.
// If the device is offline the change is queued and sent when the connection returns.
(function () {
  const cfg = window.APP_CONFIG || {};
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !String(cfg.SUPABASE_URL).startsWith("YOUR_") && !String(cfg.SUPABASE_ANON_KEY).startsWith("YOUR_"));

  let client = null;
  if (configured && window.supabase) {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  const progKey = uid => `ida-progress-v2:${uid}`;
  const pendKey = uid => `ida-pending-v2:${uid}`;

  function readJSON(key) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "{}");
      return v && typeof v === "object" && !Array.isArray(v) ? v : {};
    } catch (_) { return {}; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; }
  }
  const clamp = n => Math.max(0, Math.min(IDA.STAGES.length, Number(n) || 0));

  const db = {
    client,
    configured: !!client,

    loadLocal(uid) {
      const raw = readJSON(progKey(uid));
      const out = {};
      Object.keys(raw).forEach(id => { out[id] = clamp(raw[id]); });
      return out;
    },

    // Save one reel's progress. Resolves to "synced" | "queued" | "local".
    async save(uid, progress, reelId) {
      writeJSON(progKey(uid), progress);
      if (!client || uid === "guest") return "local";
      const pending = readJSON(pendKey(uid));
      pending[reelId] = progress[reelId] || 0;
      writeJSON(pendKey(uid), pending);
      return (await db.flush(uid)) ? "synced" : "queued";
    },

    // Send queued changes to Supabase. Returns true when nothing is left waiting.
    async flush(uid) {
      if (!client || uid === "guest") return true;
      const pending = readJSON(pendKey(uid));
      const ids = Object.keys(pending);
      if (!ids.length) return true;
      if (!navigator.onLine) return false;
      const now = new Date().toISOString();
      const rows = ids.map(id => ({ user_id: uid, reel_id: id, stages_done: clamp(pending[id]), updated_at: now }));
      try {
        const { error } = await client.from("reel_progress").upsert(rows, { onConflict: "user_id,reel_id" });
        if (error) throw error;
        const latest = readJSON(pendKey(uid));
        ids.forEach(id => { if (latest[id] === pending[id]) delete latest[id]; });
        writeJSON(pendKey(uid), latest);
        return Object.keys(latest).length === 0;
      } catch (err) {
        console.warn("Sync failed:", err.message || err);
        return false;
      }
    },

    // Fetch the latest progress from Supabase and merge with anything still queued.
    async pull(uid) {
      const local = db.loadLocal(uid);
      if (!client || uid === "guest") return { progress: local, ok: true };
      if (!navigator.onLine) return { progress: local, ok: false };
      await db.flush(uid);
      try {
        const { data, error } = await client.from("reel_progress").select("reel_id, stages_done");
        if (error) throw error;
        const merged = {};
        (data || []).forEach(row => { merged[row.reel_id] = clamp(row.stages_done); });
        const pending = readJSON(pendKey(uid));
        Object.keys(pending).forEach(id => { merged[id] = clamp(pending[id]); });
        writeJSON(progKey(uid), merged);
        return { progress: merged, ok: true };
      } catch (err) {
        console.warn("Could not load from Supabase:", err.message || err);
        return { progress: local, ok: false };
      }
    }
  };

  window.IDA = window.IDA || {};
  IDA.db = db;
})();
