// UI logic: auth screen, tracker, sync status, PWA install + service worker.
(function () {
  const { STAGES, BRANDS, ALL_REELS, TOTAL_REELS, TOTAL_STAGES } = IDA;
  const $ = id => document.getElementById(id);

  let user = null;            // { id, email }
  let progress = {};          // { reelId: stagesDone (0-5) }
  let activeBrand = "bizbuddy";
  let authMode = "login";     // "login" | "signup"
  let deferredInstall = null;

  const done = id => progress[id] || 0;

  /* ---------- view switching ---------- */
  function showView(name) {
    $("authView").hidden = name !== "auth";
    $("appView").hidden = name !== "app";
  }

  function setSync(state, text) {
    const el = $("saveStatus");
    el.textContent = text;
    el.className = "saved" + (state ? " " + state : "");
  }

  /* ---------- auth screen ---------- */
  function setAuthMode(mode) {
    authMode = mode;
    const signup = mode === "signup";
    $("loginTab").setAttribute("aria-selected", String(!signup));
    $("signupTab").setAttribute("aria-selected", String(signup));
    $("nameField").hidden = !signup;
    $("authSubmit").textContent = signup ? "Create account" : "Log in";
    $("authSub").textContent = signup ? "Create an account to save your reel progress." : "Log in to see your reel workflow.";
    $("authPassword").autocomplete = signup ? "new-password" : "current-password";
    setAuthMsg("");
  }

  function setAuthMsg(text, ok) {
    const el = $("authMsg");
    el.textContent = text;
    el.className = "form-msg" + (ok ? " ok" : "");
  }

  function friendlyError(err) {
    const m = (err && err.message) || "Something went wrong. Try again.";
    if (/invalid login credentials/i.test(m)) return "Email or password is incorrect.";
    if (/already registered/i.test(m)) return "This email already has an account. Log in instead.";
    if (/email not confirmed/i.test(m)) return "Confirm your email first. Check your inbox for the link.";
    if (/failed to fetch|network/i.test(m)) return "No connection. Check your internet and try again.";
    return m;
  }

  async function onAuthSubmit(e) {
    e.preventDefault();
    if (!IDA.db.configured) { setAuthMsg("Supabase isn’t connected. Add your keys in js/config.js."); return; }
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    if (!email || !password) { setAuthMsg("Enter your email and password."); return; }
    if (password.length < 6) { setAuthMsg("Password must be at least 6 characters."); return; }
    setAuthMsg("");
    $("authSubmit").disabled = true;
    try {
      if (authMode === "login") {
        await IDA.auth.signIn(email, password);
      } else {
        const res = await IDA.auth.signUp(email, password, $("authName").value.trim());
        if (!res.session) {
          setAuthMode("login");
          setAuthMsg("Account created. Check your email to confirm it, then log in.", true);
        }
      }
    } catch (err) {
      setAuthMsg(friendlyError(err));
    } finally {
      $("authSubmit").disabled = false;
    }
  }

  /* ---------- session handling ---------- */
  async function enterApp(u) {
    user = u;
    $("userEmail").textContent = u.email || "";
    $("footNote").textContent = u.id === "guest" ? "Guest mode: saved on this device only." : "Changes save to your account automatically.";
    progress = IDA.db.loadLocal(u.id);
    showView("app");
    render(); updateProgress();
    if (u.id === "guest") { setSync("", "Saved on this device"); return; }
    setSync("pending", navigator.onLine ? "Syncing…" : "Offline — showing saved copy");
    const res = await IDA.db.pull(u.id);
    if (!user || user.id !== u.id) return;
    progress = res.progress;
    render(); updateProgress();
    setSync(res.ok ? "" : "pending", res.ok ? "Synced" : "Offline — will sync later");
  }

  function leaveApp() {
    user = null; progress = {};
    $("authPassword").value = "";
    showView("auth");
  }

  function handleSession(session) {
    if (session && session.user) {
      if (user && user.id === session.user.id) return;   // token refresh, nothing to do
      enterApp({ id: session.user.id, email: session.user.email });
    } else if (!user || user.id !== "guest") {
      leaveApp();
    }
  }

  /* ---------- tracker ---------- */
  function statusFor(n) { return n === STAGES.length ? "complete" : n > 0 ? "progress" : "not-started"; }

  function render() {
    const query = $("search").value.trim().toLocaleLowerCase();
    const list = $("reelList");
    list.replaceChildren();
    const reels = ALL_REELS.filter(r => r.brand === activeBrand && r.name.toLocaleLowerCase().includes(query));
    $("listTitle").textContent = BRANDS[activeBrand].title;
    $("visibleCount").textContent = `${reels.length} ${reels.length === 1 ? "reel" : "reels"}`;
    list.setAttribute("aria-labelledby", activeBrand === "bizbuddy" ? "bizTab" : "idaTab");

    if (!reels.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No reels match your search. Try a different word.";
      list.append(empty);
      return;
    }

    reels.forEach(reel => {
      const n = done(reel.id);
      const state = statusFor(n);
      const card = document.createElement("article");
      card.className = "reel";

      const top = document.createElement("div"); top.className = "reel-top";
      const nameWrap = document.createElement("div"); nameWrap.className = "reel-name";
      const num = document.createElement("span"); num.className = "number"; num.textContent = String(reel.index + 1).padStart(2, "0");
      const name = document.createElement("div"); name.className = "name"; name.textContent = reel.name;
      nameWrap.append(num, name);
      const badge = document.createElement("span");
      badge.className = "status" + (state === "progress" ? " progress" : state === "complete" ? " complete" : "");
      badge.textContent = state === "complete" ? "Complete" : state === "progress" ? "In progress" : "Not started";
      top.append(nameWrap, badge);

      const stages = document.createElement("div"); stages.className = "stages";
      STAGES.forEach((stage, i) => {
        const label = document.createElement("label"); label.className = "stage";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = i < n;
        input.setAttribute("aria-label", `${reel.name}: ${stage}`);
        input.addEventListener("change", () => onToggle(reel, i, input.checked));
        const text = document.createElement("span"); text.textContent = stage;
        label.append(input, text);
        stages.append(label);
      });

      card.append(top, stages);
      list.append(card);
    });
  }

  // Stages run in order: ticking one ticks everything before it; unticking clears it and everything after.
  async function onToggle(reel, stageIndex, checked) {
    progress[reel.id] = checked ? stageIndex + 1 : stageIndex;
    render(); updateProgress();
    setSync("pending", "Saving…");
    const result = await IDA.db.save(user.id, progress, reel.id);
    if (result === "synced") setSync("", "Saved to your account");
    else if (result === "queued") setSync("pending", navigator.onLine ? "Saved here — will retry sync" : "Offline — will sync later");
    else setSync("", "Saved on this device");
  }

  function updateProgress() {
    const doneStages = ALL_REELS.reduce((sum, r) => sum + done(r.id), 0);
    const doneReels = ALL_REELS.filter(r => done(r.id) === STAGES.length).length;
    const percent = Math.round(doneStages / TOTAL_STAGES * 100);
    const left = TOTAL_STAGES - doneStages;
    $("doneStages").textContent = doneStages;
    $("doneReels").textContent = doneReels;
    $("percent").textContent = `${percent}%`;
    $("remaining").textContent = `${left} ${left === 1 ? "stage" : "stages"} remaining`;
    $("progressFill").style.width = `${percent}%`;
    $("progressBar").setAttribute("aria-valuenow", String(percent));
  }

  /* ---------- PWA ---------- */
  function setupPWA() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(err => console.warn("Service worker failed:", err));
      });
    }
    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault();
      deferredInstall = e;
      $("installBtn").hidden = false;
    });
    window.addEventListener("appinstalled", () => { deferredInstall = null; $("installBtn").hidden = true; });
    $("installBtn").addEventListener("click", async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null;
      $("installBtn").hidden = true;
    });
  }

  /* ---------- init ---------- */
  async function init() {
    $("totalStages").textContent = TOTAL_STAGES;
    $("totalReels").textContent = TOTAL_REELS;
    $("bizCount").textContent = BRANDS.bizbuddy.reels.length;
    $("idaCount").textContent = BRANDS.ida.reels.length;

    $("loginTab").addEventListener("click", () => setAuthMode("login"));
    $("signupTab").addEventListener("click", () => setAuthMode("signup"));
    $("authForm").addEventListener("submit", onAuthSubmit);

    $("logoutBtn").addEventListener("click", async () => {
      if (user && user.id === "guest") { leaveApp(); return; }
      await IDA.auth.signOut();
      leaveApp();
    });

    document.querySelectorAll("#appView .tab[data-brand]").forEach(tab => tab.addEventListener("click", () => {
      activeBrand = tab.dataset.brand;
      document.querySelectorAll("#appView .tab[data-brand]").forEach(o => o.setAttribute("aria-selected", String(o === tab)));
      render();
    }));
    $("search").addEventListener("input", render);

    window.addEventListener("online", async () => {
      if (!user) return;
      setSync("pending", "Back online — syncing…");
      const ok = await IDA.db.flush(user.id);
      setSync(ok ? "" : "pending", ok ? "Synced" : "Will retry sync");
    });
    window.addEventListener("offline", () => { if (user && user.id !== "guest") setSync("pending", "Offline — changes will sync later"); });

    setupPWA();
    setAuthMode("login");

    if (!IDA.db.configured) {
      $("configNotice").hidden = false;
      $("guestBtn").hidden = false;
      $("guestBtn").addEventListener("click", () => enterApp({ id: "guest", email: "Guest (this device only)" }));
      showView("auth");
      return;
    }

    IDA.auth.onChange((event, session) => handleSession(session));
    handleSession(await IDA.auth.getSession());
    if (!user) showView("auth");
  }

  init();
})();
