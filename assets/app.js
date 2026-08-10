/* Korea Compass
 * A static, local-first planner. No account, analytics, or backend is required.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "korea-compass-plan-v1";
  const DATA_BASE = new URL("data/", document.baseURI).href;
  const app = document.querySelector("#app");
  const modalRoot = document.querySelector("#modal-root");
  const toastRoot = document.querySelector("#toast-root");
  const savedCount = document.querySelector("#saved-count");
  const syncNote = document.querySelector("#sync-note");

  const TYPE_META = {
    place: { collection: "places", label: "Place", plural: "Places", planType: "Visit" },
    event: { collection: "events", label: "Event", plural: "Events", planType: "Event" },
    activity: { collection: "activities", label: "Idea", plural: "Ideas", planType: "Activity" },
    food: { collection: "food", label: "Food", plural: "Food", planType: "Food" },
    hotel: { collection: "hotels", label: "Stay", plural: "Stays", planType: "Stay" },
    route: { collection: "routes", label: "Route", plural: "Transit", planType: "Transit" },
    saving: { collection: "savingsGuides", label: "Saving", plural: "Savings", planType: "Booking" },
  };

  const VIEW_LABELS = {
    dashboard: "Overview",
    discover: "Discover",
    itineraries: "Route options",
    plan: "My plan",
    bookings: "Bookings",
    toolkit: "Transit kit",
    safety: "Safety",
    saved: "Saved ideas",
    sources: "Sources",
  };

  const DEFAULT_STATE = {
    profile: {
      name: "My Korea trip",
      startDate: "",
      endDate: "",
      travelers: 2,
      walking: "medium",
      pace: "balanced",
      interests: [],
      cities: [],
    },
    itinerary: [],
    saved: [],
    reminders: [],
    tasks: {},
  };

  let catalog = null;
  let state = loadState();
  let currentView = "dashboard";
  const ui = {
    discover: { type: "all", city: "", query: "", limit: 18, duringTrip: false },
    itineraryId: "seoul-daejeon-busan",
    decisionWeights: { experience: 3, convenience: 3, value: 3, flexibility: 3 },
    weatherMode: "normal",
    weather: { status: "idle", cities: [] },
  };

  // Large collections load on demand after the small data/index.json arrives.
  const LAZY_COLLECTIONS = {
    events: "collections/events.json",
    activities: "collections/activities.json",
    food: "collections/food.json",
    hotels: "collections/hotels.json",
    savingsGuides: "collections/savingsGuides.json",
    itineraryBlueprints: "collections/blueprints.json",
  };
  const collectionPromises = {};

  function ensureCollection(name) {
    if (!catalog) return Promise.resolve();
    if (!LAZY_COLLECTIONS[name]) return Promise.resolve();
    if (!collectionPromises[name]) {
      collectionPromises[name] = fetch(new URL(LAZY_COLLECTIONS[name], DATA_BASE).href)
        .then((response) => {
          if (!response.ok) throw new Error(`Collection ${name} failed (${response.status})`);
          return response.json();
        })
        .then((items) => { catalog[name] = Array.isArray(items) ? items : []; })
        .catch((error) => {
          console.error(error);
          catalog[name] = [];
          showToast("One research collection could not load. Refresh to retry.", "warning");
        });
    }
    return collectionPromises[name];
  }

  function ensureCollections(names) {
    return Promise.all([...new Set(names)].map((name) => ensureCollection(name)));
  }

  init();

  async function init() {
    bindGlobalEvents();
    registerServiceWorker();
    try {
      const response = await fetch(new URL("index.json", DATA_BASE).href, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Catalog index request failed (${response.status})`);
      catalog = await response.json();
      Object.keys(LAZY_COLLECTIONS).forEach((name) => { catalog[name] = []; });
      await showView(viewFromHash());
    } catch (error) {
      console.error(error);
      app.className = "view";
      app.innerHTML = `
        <section class="empty-state" role="alert">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>The planning catalog could not load.</h3>
          <p>Try refreshing. If you are opening this file directly, run a local web server instead so the browser can load <code>data/index.json</code>.</p>
          <button class="button" type="button" data-action="reload">Refresh planner</button>
        </section>`;
      syncNote.textContent = "Catalog unavailable";
    }
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    const updateConnectionStatus = () => {
      syncNote.textContent = navigator.onLine ? "Online · local planner ready" : "Offline · cached planner";
    };
    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);
    updateConnectionStatus();
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then(() => updateConnectionStatus()).catch((error) => {
        console.warn("Offline mode unavailable:", error);
      });
    });
  }

  function bindGlobalEvents() {
    document.addEventListener("click", async (event) => {
      const viewButton = event.target.closest("[data-view]");
      if (viewButton) {
        event.preventDefault();
        navigate(viewButton.dataset.view);
        return;
      }

      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) return;
      event.preventDefault();
      await handleAction(actionButton);
    });

    document.addEventListener("submit", async (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.id === "profile-form") {
        event.preventDefault();
        submitProfile(form);
      }
      if (form.id === "plan-item-form") {
        event.preventDefault();
        submitPlanItem(form);
      }
      if (form.id === "import-form") {
        event.preventDefault();
        await importPlan(form);
      }
    });

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.matches("input[data-decision-weight]")) {
        ui.decisionWeights[target.dataset.decisionWeight] = Number(target.value);
        renderCurrentView();
        return;
      }
      if (!target.matches("input[data-task]")) return;
      state.tasks[target.dataset.task] = target.checked;
      persistState();
      target.closest(".check-row")?.classList.toggle("is-done", target.checked);
      updateChecklistProgress(target.dataset.checklist);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modalRoot.hidden) closeModal();
      // "/" jumps to Discover search from anywhere outside a form field.
      if (event.key === "/" && modalRoot.hidden) {
        const active = document.activeElement;
        const typing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT" || active.isContentEditable);
        if (!typing) {
          event.preventDefault();
          navigate("discover");
          window.requestAnimationFrame(() => document.querySelector("#discover-search")?.focus());
        }
      }
    });

    window.addEventListener("hashchange", () => {
      const view = viewFromHash();
      if (view !== currentView) showView(view);
    });

    modalRoot.addEventListener("click", (event) => {
      if (event.target === modalRoot) closeModal();
    });
  }

  function viewFromHash() {
    const [view, extra] = window.location.hash.replace(/^#\/?/, "").split("/");
    if (view === "itineraries" && extra) ui.itineraryId = extra;
    return VIEW_LABELS[view] ? view : "dashboard";
  }

  function viewHash(view) {
    return `#/${view}`;
  }

  function defaultState() {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      console.warn("Could not read local planner data", error);
      return defaultState();
    }
  }

  function normalizeState(input) {
    const base = defaultState();
    const profile = input && typeof input.profile === "object" ? input.profile : {};
    base.profile = {
      ...base.profile,
      name: cleanText(profile.name || base.profile.name, 90),
      startDate: validDate(profile.startDate) ? profile.startDate : "",
      endDate: validDate(profile.endDate) ? profile.endDate : "",
      travelers: clampInteger(profile.travelers, 1, 20, 2),
      walking: ["low", "medium", "high"].includes(profile.walking) ? profile.walking : "medium",
      pace: ["slow", "balanced", "full"].includes(profile.pace) ? profile.pace : "balanced",
      interests: Array.isArray(profile.interests) ? profile.interests.slice(0, 8).map((item) => cleanText(item, 40)) : [],
      cities: Array.isArray(profile.cities)
        ? [...new Set(profile.cities.filter((city) => typeof city === "string" && city.length < 50))]
        : [],
    };
    base.saved = Array.isArray(input?.saved)
      ? [...new Set(input.saved.filter((key) => typeof key === "string" && key.length < 180))]
      : [];
    base.reminders = Array.isArray(input?.reminders) ? input.reminders.filter((item) => item && typeof item === "object").slice(0, 100).map((item) => ({ id: cleanText(item.id || uniqueId("reminder"), 100), label: cleanText(item.label || "Reminder", 160), date: validDate(item.date) ? item.date : "", done: Boolean(item.done) })) : [];
    base.tasks = input?.tasks && typeof input.tasks === "object" ? input.tasks : {};
    base.itinerary = Array.isArray(input?.itinerary)
      ? input.itinerary
          .filter((item) => item && typeof item === "object")
          .slice(0, 500)
          .map((item) => ({
            id: cleanText(item.id || uniqueId("plan"), 100),
            date: validDate(item.date) ? item.date : "",
            time: /^\d{2}:\d{2}$/.test(item.time || "") ? item.time : "",
            title: cleanText(item.title || "Untitled plan item", 180),
            city: cleanText(item.city || "", 70),
            type: cleanText(item.type || "Note", 40),
            notes: cleanText(item.notes || "", 2000),
            neighborhood: cleanText(item.neighborhood || "", 90),
            energy: ["low", "medium", "high"].includes(item.energy) ? item.energy : "medium",
            duration: cleanText(item.duration || "", 40),
            indoor: Boolean(item.indoor),
            mealType: cleanText(item.mealType || "", 40),
            recommendedWindow: cleanText(item.recommendedWindow || "", 80),
            closureNote: cleanText(item.closureNote || "", 180),
            reservationRequired: Boolean(item.reservationRequired),
            referenceType: TYPE_META[item.referenceType] ? item.referenceType : "",
            referenceId: cleanText(item.referenceId || "", 180),
            createdAt: cleanText(item.createdAt || "", 60),
          }))
      : [];
    return base;
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Could not save planner data", error);
      showToast("Your browser could not save this change locally.", "warning");
    }
  }

  function cleanText(value, maxLength) {
    return String(value ?? "").trim().slice(0, maxLength);
  }

  function clampInteger(value, min, max, fallback) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  function uniqueId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function navigate(view) {
    if (!VIEW_LABELS[view] || !catalog) return;
    if (window.location.hash === viewHash(view)) {
      showView(view);
    } else {
      window.location.hash = viewHash(view);
    }
  }

  function collectionsForView(view) {
    if (view === "discover") {
      if (ui.discover.type !== "all") return collectionsForType(ui.discover.type);
      return Object.keys(LAZY_COLLECTIONS);
    }
    if (view === "itineraries") return ["itineraryBlueprints"];
    if (view === "saved") return collectionsForSaved();
    if (view === "dashboard") return [...new Set(["events", ...collectionsForSaved()])];
    return [];
  }

  function collectionsForType(type) {
    const collection = TYPE_META[type]?.collection;
    return collection && LAZY_COLLECTIONS[collection] ? [collection] : [];
  }

  function collectionsForSaved() {
    return state.saved
      .map((key) => collectionsForType(key.split(":")[0]))
      .flat()
      .filter(Boolean);
  }

  async function showView(view) {
    if (!VIEW_LABELS[view] || !catalog) return;
    currentView = view;
    if (view === "discover") ui.discover.limit = 18;
    try {
      await ensureCollections(collectionsForView(view));
    } catch (error) {
      console.error(error);
    }
    if (currentView !== view) return; // The user moved on while loading.
    renderCurrentView();
    if (window.matchMedia?.("(max-width: 900px)")?.matches) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function renderCurrentView() {
    if (!catalog) return;
    const renderers = {
      dashboard: renderDashboard,
      discover: renderDiscover,
      itineraries: renderItineraries,
      plan: renderPlan,
      bookings: renderBookings,
      toolkit: renderToolkit,
      safety: renderSafety,
      saved: renderSaved,
      sources: renderSources,
    };
    app.className = "";
    app.innerHTML = renderers[currentView]();
    updateChrome();
    if (currentView === "discover") bindDiscoverControls();
    if (currentView === "bookings") updateChecklistProgress("pre");
    if (currentView === "safety") updateChecklistProgress("during");
    if (currentView === "dashboard") loadWeatherSnapshot();
  }

  function updateChrome() {
    const count = state.saved.length;
    savedCount.textContent = count > 99 ? "99+" : String(count);
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === currentView);
    });

    const dateLabel = profileDateLabel();
    const connection = navigator.onLine === false ? "Offline · cached planner" : "Online · local planner";
    syncNote.textContent = hasTripDates()
      ? `${connection} · ${dateLabel}`
      : `${connection} · set dates when ready`;
  }

  function renderReadinessDashboard() {
    const dated = state.itinerary.filter((item) => item.date);
    const checks = [
      ["Trip foundation", hasTripDates() && selectedCities().length >= 3, "Set dates and keep Seoul, Busan, and one middle city"],
      ["Route choice", state.itinerary.length > 0, "Choose a blueprint and load it into My Plan"],
      ["Daily coverage", dated.length >= Math.max(1, Math.min(tripLength() || 1, 5)), "Add dates and daily anchors"],
      ["Verification notes", state.itinerary.some((item) => item.closureNote || item.recommendedWindow || item.reservationRequired), "Add live-check notes to time-sensitive items"],
      ["Weather backups", state.itinerary.length > 0 && state.itinerary.some((item) => item.indoor), "Tag at least one indoor alternative"],
      ["Open decisions", state.reminders.filter((item) => !item.done).length === 0, "Review or complete local reminders"],
    ];
    const done = checks.filter((item) => item[1]).length;
    return `<section class="readiness-panel"><div><span class="section-kicker">Plan completeness</span><h2>${Math.round((done / checks.length) * 100)}% ready for final review</h2><p>Scores planning foundations by category. Optional activities do not count against you.</p></div><div class="readiness-list">${checks.map(([label, complete, next]) => `<div class="readiness-row ${complete ? "is-ready" : ""}"><span>${complete ? "✓" : "○"}</span><strong>${e(label)}</strong><small>${complete ? "Ready" : e(next)}</small></div>`).join("")}</div></section>`;
  }

  function renderWeatherSnapshot() {
    const cityNames = ["Seoul", ...state.profile.cities.filter((city) => !["Seoul", "Busan"].includes(city)), "Busan"].filter((city, index, list) => list.indexOf(city) === index).slice(0, 4);
    const cards = cityNames.map((city) => `<article class="weather-card"><strong>${e(city)}</strong><span>${e(ui.weather.status === "ready" ? (ui.weather.cities.find((item) => item.name === city)?.summary || "Weather loaded") : ui.weather.status === "offline" ? "Offline — verify forecast later" : "Loading weather…")}</span></article>`).join("");
    return `<section id="weather-snapshot" class="weather-snapshot panel"><div class="section-head"><div><div class="section-kicker">Live weather snapshot</div><h2>Check conditions before committing outdoor time</h2><p>Uses a no-key weather service when online. Forecasts for November are not available this far ahead, so recheck closer to departure.</p></div><span class="meta-chip accent">${navigator.onLine === false ? "Offline" : "Current conditions"}</span></div><div class="weather-grid">${cards}</div></section>`;
  }

  async function loadWeatherSnapshot() {
    if (ui.weather.status === "loading" || ui.weather.status === "ready") return;
    ui.weather.status = navigator.onLine === false ? "offline" : "loading";
    const coords = { Seoul: [37.5665, 126.978], Busan: [35.1796, 129.0756], Daejeon: [36.3504, 127.3845], Cheonan: [36.8151, 127.1139] };
    const cities = ["Seoul", ...state.profile.cities.filter((city) => !["Seoul", "Busan"].includes(city)), "Busan"].filter((city, index, list) => list.indexOf(city) === index).slice(0, 4);
    try {
      const results = await Promise.all(cities.map(async (name) => {
        const point = coords[name] || coords.Seoul;
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${point[0]}&longitude=${point[1]}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia%2FSeoul`);
        if (!response.ok) throw new Error("weather request failed");
        const data = await response.json();
        const current = data.current || {};
        return { name, summary: `${Math.round(current.temperature_2m ?? 0)}°C · feels ${Math.round(current.apparent_temperature ?? 0)}°C · wind ${Math.round(current.wind_speed_10m ?? 0)} km/h` };
      }));
      ui.weather = { status: "ready", cities: results };
    } catch (error) {
      console.warn("Weather unavailable", error);
      ui.weather = { status: "offline", cities: [] };
    }
    if (currentView === "dashboard") renderCurrentView();
  }

  function renderDashboard() {
    const cities = selectedCities();
    const planItems = sortedPlanItems();
    const savedItems = resolveSavedItems();
    const featured = savedItems.length ? savedItems.slice(0, 3) : featuredItems().slice(0, 3);
    const planningStatus = hasTripDates()
      ? `${tripLength()} ${tripLength() === 1 ? "day" : "days"} · ${state.profile.travelers} ${state.profile.travelers === 1 ? "traveler" : "travelers"}`
      : "Dates and group size are still open";

    return `<section class="view dashboard-view">
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">A calm start, not a crowded spreadsheet</span>
          <h1 class="hero-title">Build your Korea trip one confident choice at a time.</h1>
          <p>Everything from your six research repositories now has a shared home: places, stays, food, transit, safety notes, and source links. Two detailed 21-night route options are ready to compare; your final itinerary can stay flexible.</p>
          <div class="button-row">
            <button class="button" type="button" data-action="open-profile">Set up my trip <span aria-hidden="true">→</span></button>
            <button class="button button-quiet" type="button" data-view="itineraries">Compare 2 route options</button>
          </div>
        </div>
        <aside class="trip-pulse" aria-label="Trip snapshot">
          <span class="trip-pulse-label">Your trip snapshot</span>
          <h2 class="trip-pulse-title">${e(state.profile.name || "My Korea trip")}</h2>
          <p class="trip-pulse-text"><strong>${e(profileDateLabel())}</strong><br>${e(planningStatus)}${cities.length ? `<br>${e(cities.map((city) => city.name).join(" · "))}` : ""}</p>
        </aside>
      </section>

      ${renderTripCountdown()}
      ${renderReadinessDashboard()}
      ${renderWeatherSnapshot()}

      <section class="stat-grid" aria-label="Planner overview">
        ${metricCard("Trip window", hasTripDates() ? `${tripLength()} days` : "Not set", hasTripDates() ? profileDateLabel() : "Choose dates when you are ready")}
        ${metricCard("Cities", cities.length, cities.length ? cities.map((city) => city.name).join(" · ") : "Pick only the places that fit")}
        ${metricCard("Saved ideas", state.saved.length, state.saved.length ? "Your personal shortlist" : "Keep possibilities here")}
        ${metricCard("Plan items", planItems.length, planItems.length ? "A flexible, editable outline" : "No auto-generated schedule")}
      </section>

      <section class="content-grid content-grid-wide">
        <div class="stack">
          <article class="panel">
            <div class="section-head">
              <div>
                <div class="section-kicker">Start here</div>
                <h2>Four simple moves</h2>
                <p>Use these in any order. The planner stays useful even before dates are fixed.</p>
              </div>
            </div>
            <div class="start-grid">
              ${startCard("✦", "Tell it the basics", "Dates, travelers, and your likely cities — all editable.", "open-profile")}
              ${startCard("⌕", "Save possibilities", "Search 1,000+ imported ideas without committing to them.", "go-discover")}
              ${startCard("▤", "Make a gentle outline", "Add one anchor at a time; leave room for discoveries.", "go-plan")}
              ${startCard("✚", "Prepare the essentials", "Keep transit, entry and offline safety notes close.", "go-safety")}
            </div>
          </article>

          <article class="panel">
            <div class="section-head">
              <div>
                <div class="section-kicker">On your desk</div>
                <h2>${savedItems.length ? "Your saved shortlist" : "A few easy starting points"}</h2>
                <p>${savedItems.length ? "Open a detail, add it to a day, or keep it as a maybe." : "These are research starting points, not a prescribed itinerary."}</p>
              </div>
              <button class="button button-link" type="button" data-view="${savedItems.length ? "saved" : "discover"}">${savedItems.length ? "View saved" : "Explore all"}</button>
            </div>
            <div class="mini-list">
              ${featured.map((entry) => miniItem(entry)).join("")}
            </div>
          </article>
        </div>

        <aside class="stack">
          <article class="panel panel-tint">
            <div class="section-head">
              <div>
                <div class="section-kicker">Why this workspace works</div>
                <h2>Research first. Itinerary later.</h2>
              </div>
            </div>
            <div class="prose">
              <p>Nothing has been forced into a day-by-day schedule. When you share your itinerary, it can be layered onto this tidy structure instead of starting from scratch.</p>
              <p><strong>Tip:</strong> Save every good maybe now. Sorting by city, date, or neighborhood is easier after your route is real.</p>
            </div>
            <div class="separator"></div>
            <button class="button button-soft button-small" type="button" data-action="copy-brief">Copy planning brief</button>
          </article>
          <article class="alert-strip">
            <span class="alert-icon" aria-hidden="true">i</span>
            <div><strong>Always verify before you buy.</strong><p>Dates, prices, event status, entry policy, and availability are source snapshots — use each official link for the final check.</p></div>
          </article>
        </aside>
      </section>

      <section class="panel" style="margin-top:18px">
        <div class="section-head">
          <div>
            <div class="section-kicker">Your route, at a glance</div>
            <h2>${cities.length ? "Cities you are considering" : "Choose a few cities when you are ready"}</h2>
            <p>${cities.length ? "This is a loose route signal, not a booking commitment." : "Seoul and Busan are common starts; the rest can be a meaningful detour or skipped entirely."}</p>
          </div>
          <button class="button button-quiet button-small" type="button" data-action="open-profile">${cities.length ? "Edit cities" : "Choose cities"}</button>
        </div>
        ${cities.length ? `<div class="city-grid">${cities.map(cityCard).join("")}</div>` : renderNoCityState()}
      </section>
    </section>`;
  }

  function metricCard(label, value, note) {
    return `<article class="metric-card"><span class="metric-label">${e(label)}</span><strong class="metric-value">${e(value)}</strong><span class="metric-note">${e(note)}</span></article>`;
  }

  function todayLocalIso() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function diffDays(fromIso, toIso) {
    return Math.round((parseDate(toIso) - parseDate(fromIso)) / 86400000);
  }

  function renderTripCountdown() {
    if (!hasTripDates()) return "";
    const today = todayLocalIso();
    const { startDate, endDate } = state.profile;
    const prep = checklistSummary(catalog.emergency.preDeparture, "pre");
    const percent = prep.total ? Math.round((prep.done / prep.total) * 100) : 0;
    let big;
    let label;
    if (today < startDate) {
      const days = diffDays(today, startDate);
      big = String(days);
      label = days === 1 ? "day to go" : "days to go";
    } else if (today <= endDate) {
      big = `Day ${diffDays(startDate, today) + 1}`;
      label = `of ${diffDays(startDate, endDate) + 1} on trip`;
    } else {
      big = "✓";
      label = "trip complete";
    }
    return `<section class="countdown-strip" aria-label="Trip countdown">
      <div class="countdown-days"><strong>${e(big)}</strong><span>${e(label)}</span></div>
      <div class="countdown-copy"><strong>Arrive ${e(formatDate(startDate))} · depart ${e(formatDate(endDate))}</strong><p>${e(state.profile.travelers)} ${state.profile.travelers === 1 ? "traveler" : "travelers"} · ${e(tripLength())} day${tripLength() === 1 ? "" : "s"} · ${e(selectedCities().map((city) => city.name).join(" · ") || "cities still open")}</p></div>
      <div class="countdown-prep"><span class="countdown-prep-label">Prep checklist · ${prep.done}/${prep.total} checked</span><div class="progress-line"><span style="width:${percent}%"></span></div><button class="button button-quiet button-small" type="button" data-view="bookings">Open bookings & prep</button></div>
    </section>`;
  }

  function startCard(icon, title, copy, action) {
    const actionMap = {
      "open-profile": "open-profile",
      "go-discover": "go-discover",
      "go-plan": "go-plan",
      "go-safety": "go-safety",
    };
    return `<button class="start-card" type="button" data-action="${actionMap[action]}">
      <span class="start-card-icon" aria-hidden="true">${icon}</span>
      <span><strong>${e(title)}</strong><span>${e(copy)}</span></span>
    </button>`;
  }

  function miniItem(entry) {
    const { item, type } = entry;
    const title = itemTitle(item, type);
    const secondary = miniSecondary(item, type);
    return `<div class="mini-item">
      <span class="mini-dot" aria-hidden="true"></span>
      <div class="mini-copy"><strong title="${e(title)}">${e(title)}</strong><span>${e(secondary)}</span></div>
      <button class="button button-link mini-action" type="button" data-action="show-detail" data-type="${type}" data-id="${e(item.id)}">Details</button>
    </div>`;
  }

  function miniSecondary(item, type) {
    if (type === "event") return `${item.city} · ${formatDateRange(item.startDate, item.endDate)}`;
    if (type === "food") return `${item.city} · ${item.neighborhood}`;
    if (type === "hotel") return `${item.city} · ${formatHotelPrice(item)}`;
    if (type === "route") return `${item.duration} · ${formatKrw(item.cost_krw_per_person)} per person`;
    return `${item.city || item.category || TYPE_META[type].label}${item.category ? ` · ${item.category}` : ""}`;
  }

  function cityCard(city) {
    return `<article class="city-card">
      <div class="city-card-head"><h3>${e(city.name)}</h3><span class="city-pill">${e(city.label)}</span></div>
      <p>${e(city.short)}</p>
      <button class="button button-link" type="button" data-action="discover-city" data-city="${e(city.name)}" style="margin-top:10px;font-size:11px">See ideas</button>
    </article>`;
  }

  function renderNoCityState() {
    return `<div class="empty-state"><div class="empty-state-icon" aria-hidden="true">◌</div><h3>No cities are pinned yet</h3><p>Add cities that sound good, not cities you feel obliged to visit. You can change the route as you learn more.</p><button class="button button-small" type="button" data-action="open-profile">Choose cities</button></div>`;
  }

  function renderDiscover() {
    return `<section class="view">
      <header class="view-head">
        <div class="view-head-copy">
          <span class="eyebrow">Your imported research library</span>
          <h1 class="page-title">Discover at your own pace.</h1>
          <p class="page-subtitle">Search across stays, food, events, transit, activity ideas and savings notes. Save any promising option — this is your judgment-free maybe list.</p>
        </div>
        <div class="head-actions"><button class="button button-quiet" type="button" data-view="saved">♡ Saved ideas <span class="visually-hidden">(${state.saved.length})</span></button></div>
      </header>

      <section class="panel panel-soft">
        <div class="discover-controls" aria-label="Discovery filters">
          <div class="search-field"><label class="visually-hidden" for="discover-search">Search the planner</label><input class="input" id="discover-search" type="search" autocomplete="off" placeholder="Search food, neighborhoods, temples, hotels…  (press / anywhere)" value="${e(ui.discover.query)}"></div>
          <div class="field"><label class="visually-hidden" for="discover-type">Type</label><select class="select" id="discover-type">${discoverTypeOptions()}</select></div>
          <div class="field"><label class="visually-hidden" for="discover-city">City</label><select class="select" id="discover-city">${discoverCityOptions()}</select></div>
          <label class="check-inline" title="${hasTripDates() ? "Show only events whose dates overlap your trip window" : "Set your trip dates in Trip setup to enable this filter"}"><input type="checkbox" id="discover-during" ${ui.discover.duringTrip && hasTripDates() ? "checked" : ""} ${hasTripDates() ? "" : "disabled"}><span>During my trip dates</span></label>
        </div>
        <div class="results-meta"><span id="discover-count"></span><span class="filter-note">${hasTripDates() ? "Tip: event labels such as “TBA” and “Watch” need an official re-check." : "Tip: set trip dates to filter events happening during your stay."}</span></div>
        <div id="discover-results"></div>
      </section>
    </section>`;
  }

  function renderItineraries() {
    const blueprints = Array.isArray(catalog.itineraryBlueprints) ? catalog.itineraryBlueprints : [];
    if (!blueprints.length) {
      return `<section class="view"><section class="empty-state"><div class="empty-state-icon" aria-hidden="true">⇄</div><h3>Route blueprints are not available yet</h3><p>The planner catalog loaded without the detailed route data. Refresh the page after rebuilding the catalog.</p></section></section>`;
    }
    const selected = blueprints.find((item) => item.id === ui.itineraryId) || blueprints[0];
    const trip = catalog.itineraryBlueprintMeta?.trip || {};
    const importantDates = Array.isArray(trip.importantDates) ? trip.importantDates : [];

    return `<section class="view route-options-view">
      <div class="print-only"><h1>Korea Compass · Route overview</h1><p>${e(selected.title)} — ${e(selected.routeLabel)} · arrive ICN 21:00 Nov 1, 2026 · depart ICN 13:00 Nov 22, 2026</p></div>
      <header class="view-head">
        <div class="view-head-copy">
          <span class="eyebrow">Two detailed, source-aware planning blueprints</span>
          <h1 class="page-title">Choose the middle chapter that fits you.</h1>
          <p class="page-subtitle">Both routes use the corrected Korea-based window: arrive at ICN at <strong>21:00 on Sun, Nov 1, 2026</strong>; depart ICN at <strong>13:00 on Sun, Nov 22, 2026</strong>. Every day now has explicit target time windows, operational notes, and a weather/energy fallback.</p>
        </div>
        <div class="head-actions"><button class="button button-quiet" type="button" data-action="print-itinerary">Save selected route as PDF</button><button class="button button-quiet" type="button" data-action="export-blueprint-doc" data-id="${e(selected.id)}">Word (.doc)</button><button class="button button-quiet" type="button" data-action="export-blueprint-txt" data-id="${e(selected.id)}">Text (.txt)</button><button class="button button-quiet" type="button" data-action="copy-itinerary" data-id="${e(selected.id)}">Copy selected itinerary</button><button class="button" type="button" data-action="adopt-itinerary" data-id="${e(selected.id)}">Use as my editable plan</button></div>
      </header>

      <section class="route-guidance">
        <div><span class="route-guidance-label">Same trip structure</span><strong>${e(trip.nights || 21)} nights · Seoul bookend · direct KTX city changes · one base per city</strong></div>
        <p>${e(trip.flightReconciliation || trip.sourceNote || "Verify all time-sensitive details before booking.")}</p>
      </section>

      ${renderRoutePrepFacts(trip)}
      ${renderDecisionTools(blueprints)}
      ${renderRouteEfficiency(blueprints)}
      ${renderDayComparison(blueprints)}

      <section class="route-comparison-grid" aria-label="Compare route blueprints">
        ${blueprints.map((item) => renderRouteOptionCard(item, item.id === selected.id)).join("")}
      </section>

      <section class="route-detail-panel">
        <div class="route-detail-head">
          <div><span class="eyebrow">Selected route</span><h2>${e(selected.title)}</h2><p>${e(selected.decisionSummary)}</p></div>
          <span class="route-badge">${e(selected.badge)}</span>
        </div>
        <div class="route-decision-grid">
          <article><span>Choose this when</span><p>${e(selected.recommendation || selected.bestFor)}</p></article>
          <article><span>Best for</span><p>${e(selected.bestFor)}</p></article>
          <article><span>Tradeoff</span><p>${e(selected.tradeoff)}</p></article>
        </div>
        <div class="route-scorecard">${(selected.scorecard || []).map((score) => `<div class="route-score ${e(score.tone || "")}"><span>${e(score.label)}</span><strong>${e(score.value)}</strong></div>`).join("")}</div>
      </section>

      <section class="route-layout">
        <div class="route-main">
          <section class="panel itinerary-day-panel">
            <div class="section-head"><div><div class="section-kicker">Day-by-day blueprint</div><h2>22 calendar days, 21 nights</h2><p>Every transfer day has a lighter arrival plan; every sightseeing day has a weather or energy fallback. Open a day for the full sequence.</p></div><button class="button button-soft button-small" type="button" data-action="adopt-itinerary" data-id="${e(selected.id)}">Load into My plan</button></div>
            <div class="blueprint-days">${(selected.days || []).map((day, index) => renderBlueprintDay(day, index < 2)).join("")}</div>
          </section>
        </div>
        <aside class="route-side">
          <section class="panel"><div class="section-kicker">Hotel-base strategy</div><h2 style="margin:0 0 9px;font-size:17px">Sleep where the route works</h2><div class="base-stack">${(selected.bases || []).map(renderRouteBase).join("")}</div></section>
          ${renderRouteBudget(selected, trip)}
          <section class="panel panel-tint"><div class="section-kicker">KTX and airport moves</div><h2 style="margin:0 0 9px;font-size:17px">Why this routing stays calm</h2><div class="transfer-stack">${(selected.transfers || []).map(renderRouteTransfer).join("")}</div></section>
          <section class="panel panel-warn"><div class="section-kicker">Book in this order</div><h2 style="margin:0 0 9px;font-size:17px">Protect the hard edges</h2><ol class="priority-list">${(selected.bookingPriorities || []).map((item) => `<li>${e(item)}</li>`).join("")}</ol></section>
          <section class="panel"><div class="section-kicker">Time-sensitive checks</div><h2 style="margin:0 0 9px;font-size:17px">Confirm close to travel</h2><div class="detail-list">${importantDates.map((item) => `<div class="detail-row"><strong>${e(formatDate(item.date))} · ${e(item.label)}</strong><p>${e(item.note)}</p></div>`).join("")}</div></section>
        </aside>
      </section>
    </section>`;
  }

  function routeDecisionScores(route) {
    const daejeon = route.id.includes("daejeon");
    return { experience: daejeon ? 5 : 3, convenience: daejeon ? 3 : 5, value: 4, flexibility: daejeon ? 5 : 3 };
  }

  function renderDecisionTools(blueprints) {
    const labels = { experience: "Middle-city experience", convenience: "Rail / logistics ease", value: "Value potential", flexibility: "Weather and plan flexibility" };
    const weights = ui.decisionWeights;
    const rows = Object.entries(labels).map(([key, label]) => `<div class="decision-weight"><label for="weight-${key}">${label}<output>${weights[key]}/5</output></label><input id="weight-${key}" type="range" min="1" max="5" value="${weights[key]}" data-decision-weight="${key}"></div>`).join("");
    const totals = blueprints.map((route) => {
      const score = routeDecisionScores(route);
      const total = Object.keys(labels).reduce((sum, key) => sum + score[key] * weights[key], 0);
      return { route, total, score };
    });
    const winner = [...totals].sort((a, b) => b.total - a.total)[0];
    return `<section class="decision-tools panel panel-tint"><div class="section-head"><div><div class="section-kicker">Personal decision lens</div><h2>Weight what matters to you</h2><p>These are planning judgments, not objective facts. Adjust the sliders and use the result as a conversation starter.</p></div><span class="meta-chip accent">Suggested: ${e(winner.route.shortTitle)}</span></div><div class="decision-tool-grid"><div class="decision-weights">${rows}</div><div class="decision-results">${totals.map(({ route, total, score }) => `<article><strong>${e(route.shortTitle)}</strong><span class="decision-total">${total}/100</span><p>${e(route.id.includes("daejeon") ? "More depth and flexibility; longer rail leg." : "Easier rail flow; lighter middle-city commitment.")}</p><div class="decision-bars">${Object.entries(labels).map(([key, label]) => `<div><span>${e(label)}</span><b style="width:${score[key] * 20}%"></b></div>`).join("")}</div></article>`).join("")}</div></div></section>`;
  }

  function renderRouteEfficiency(blueprints) {
    const details = blueprints.map((route) => {
      const middle = route.bases?.find((base) => !["Seoul", "Busan"].includes(base.city));
      const transfers = route.transfers || [];
      const rail = transfers.filter((item) => /KTX|rail|train/i.test(`${item.title} ${item.detail || ""}`)).length;
      return `<article><span class="section-kicker">${e(middle?.city || route.shortTitle)}</span><h3>${e(route.id.includes("daejeon") ? "More destination, more transfer time" : "Simpler middle-city logistics")}</h3><p>${rail || 1} planned rail movement${rail === 1 ? "" : "s"} in the route-transfer plan. ${e(route.tradeoff || "Compare the detailed days before booking.")}</p></article>`;
    }).join("");
    return `<section class="route-efficiency"><div class="section-head"><div><div class="section-kicker">Efficiency check</div><h2>Where the route spends your energy</h2><p>Use this to decide whether the middle city earns its hotel move. The detailed days below remain the source of truth.</p></div></div><div class="route-efficiency-grid">${details}</div></section>`;
  }

  function renderDayComparison(blueprints) {
    if (blueprints.length < 2) return "";
    const left = blueprints[0];
    const right = blueprints[1];
    const rows = (left.days || []).map((day, index) => {
      const other = right.days?.[index] || {};
      return `<tr><th>${e(day.day)}<small>${e(day.date)}</small></th><td><strong>${e(day.city || "")}</strong><br>${e(day.anchor || day.title || "Open day")}</td><td><strong>${e(other.city || "")}</strong><br>${e(other.anchor || other.title || "Open day")}</td></tr>`;
    }).join("");
    return `<section class="route-day-compare panel"><div class="section-head"><div><div class="section-kicker">Day-by-day decision view</div><h2>Compare the middle-city days at a glance</h2><p>Same trip window, two different ways to spend the flexible middle chapter. Open either route below for full schedules and Plan B details.</p></div></div><div class="table-scroll"><table class="day-compare-table"><thead><tr><th>Day</th><th>${e(left.shortTitle)}</th><th>${e(right.shortTitle)}</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }

  function renderRoutePrepFacts(trip) {
    const weather = Array.isArray(trip.weatherAndPacking) ? trip.weatherAndPacking : [];
    const budget = Array.isArray(trip.budgetFrame) ? trip.budgetFrame : [];
    return `<section class="route-prep-grid">
      <article class="route-prep-card"><span class="section-kicker">Flight-date reconciliation</span><h2>Make the flight date make sense first</h2><p>${e(trip.flightReconciliation || "Confirm your airline ticket and local Korea arrival date.")}</p></article>
      <article class="route-prep-card"><span class="section-kicker">November conditions</span><h2>Pack for flexible outdoor days</h2><ul>${weather.map((item) => `<li>${e(item)}</li>`).join("")}</ul></article>
      <article class="route-prep-card"><span class="section-kicker">Value without false precision</span><h2>Spend on the things that change the trip</h2><ul>${budget.map((item) => `<li><b>${e(item.label)}:</b> ${e(item.detail)}</li>`).join("")}</ul></article>
    </section>`;
  }

  function renderRouteBudget(route, trip) {
    const scenarios = Array.isArray(route.budgetScenarios) ? route.budgetScenarios : [];
    if (!scenarios.length) return "";
    return `<section class="panel panel-soft route-budget"><div class="section-kicker">Accommodation worksheet</div><h2 style="margin:0 0 7px;font-size:17px">Hotel math, not a quote</h2><p class="text-note">${e(trip.budgetMethodNote || "Use live hotel quotes before booking.")}</p><div class="detail-list" style="margin-top:10px">${scenarios.map((scenario) => `<div class="detail-row"><strong>${e(scenario.label)}</strong><p class="route-budget-total">${e(scenario.subtotal)}</p><p>${e(scenario.assumptions)}</p><small>${e(scenario.note)}</small></div>`).join("")}</div></section>`;
  }

  function renderRouteOptionCard(item, selected) {
    const cities = (item.bases || []).map((base) => base.city).join(" → ");
    return `<article class="route-option-card ${selected ? "is-selected" : ""}">
      <div class="route-option-top"><span class="card-type type-route">${e(item.badge)}</span>${selected ? `<span class="route-selected">Viewing</span>` : ""}</div>
      <h2>${e(item.shortTitle)}</h2>
      <p class="route-path">${e(item.routeLabel)}</p>
      <p>${e(item.bestFor)}</p>
      <div class="route-city-chips">${cities.split(" → ").map((city) => `<span>${e(city)}</span>`).join("")}</div>
      <div class="route-option-bottom"><button class="button ${selected ? "button-soft" : "button-quiet"} button-small" type="button" data-action="select-itinerary" data-id="${e(item.id)}">${selected ? "Viewing this route" : "View detailed route"}</button><button class="button button-link" type="button" data-action="adopt-itinerary" data-id="${e(item.id)}">Use it</button></div>
    </article>`;
  }

  function renderRouteBase(base) {
    return `<article class="route-base"><div><strong>${e(base.city)} <span>${e(base.nights)} nights</span></strong><small>${e(base.dates)}</small></div><p><b>${e(base.recommendedArea)}</b> — ${e(base.why)}</p><div class="route-hotel-ideas">${(base.hotelIdeas || []).map((hotel) => `<span>${e(hotel)}</span>`).join("")}</div></article>`;
  }

  function renderRouteTransfer(transfer) {
    return `<article class="route-transfer"><strong>${e(formatDate(transfer.date))}</strong><span>${e(transfer.leg)}</span><p>${e(transfer.recommended)}</p><small>${e(transfer.why)}</small></article>`;
  }

  function renderBlueprintDay(day, open) {
    const dayNumber = dateParts(day.date).day;
    const schedule = Array.isArray(day.schedule) ? day.schedule : [];
    return `<details class="blueprint-day" ${open ? "open" : ""}>
      <summary><span class="blueprint-date"><b>${e(day.day)}</b><strong>${e(dayNumber)}</strong><small>${e(dateParts(day.date).month)}</small></span><span class="blueprint-summary"><span>${e(day.phase)}</span><strong>${e(day.title)}</strong><small>${e(day.city)} · ${e(day.stay)}</small></span><span class="blueprint-toggle" aria-hidden="true">⌄</span></summary>
      <div class="blueprint-body">
        <div class="blueprint-anchor"><span>Day anchor</span><strong>${e(day.anchor)}</strong></div>
        <div class="blueprint-schedule"><span class="blueprint-section-label">${e(day.scheduleLabel || "Target schedule windows")}</span>${schedule.map((item) => `<article><time>${e(item.time)}</time><div><strong>${e(item.title)}</strong><p>${e(item.detail)}</p>${item.logistics ? `<small>${e(item.logistics)}</small>` : ""}</div></article>`).join("")}</div>
        <div class="blueprint-blocks"><span class="blueprint-section-label">Why this sequence works</span>${(day.blocks || []).map((block) => `<article><span>${e(block.label)}</span><p>${e(block.text)}</p></article>`).join("")}</div>
        <div class="blueprint-footnotes"><div><span>Food rhythm</span><p>${e(day.food || "Choose nearby based on current hours.")}</p></div><div><span>Reserve / verify</span><p>${e(day.reservationNote || "Verify live details.")}</p></div><div><span>Cost posture</span><p>${e(day.costNote || "Use current official prices.")}</p></div><div><span>Watch for</span><p>${e(day.watchouts || "Verify live details.")}</p></div><div><span>Plan B</span><p>${e(day.planB || "Keep a flexible indoor option.")}</p></div></div>
      </div>
    </details>`;
  }

  function discoverTypeOptions() {
    // Use the stable meta counts: lazy collections may not be loaded yet.
    const counts = catalog.meta.counts;
    const typeCounts = {
      all: counts.places + counts.events + counts.activities + counts.food + counts.hotels + counts.routes + counts.savingsGuides,
      place: counts.places,
      event: counts.events,
      activity: counts.activities,
      food: counts.food,
      hotel: counts.hotels,
      route: counts.routes,
      saving: counts.savingsGuides,
    };
    const options = [["all", "Everything"], ...Object.entries(TYPE_META).map(([key, value]) => [key, value.plural])];
    return options.map(([value, label]) => `<option value="${value}" ${ui.discover.type === value ? "selected" : ""}>${e(label)} (${formatNumber(typeCounts[value])})</option>`).join("");
  }

  function discoverCityOptions() {
    // Built from the index data only, so it works before collections load.
    const cities = [...new Set(catalog.cities.map((city) => city.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return [`<option value="">All locations</option>`, ...cities.map((city) => `<option value="${e(city)}" ${ui.discover.city === city ? "selected" : ""}>${e(city)}</option>`)].join("");
  }

  function bindDiscoverControls() {
    const search = document.querySelector("#discover-search");
    const type = document.querySelector("#discover-type");
    const city = document.querySelector("#discover-city");
    const during = document.querySelector("#discover-during");
    search?.addEventListener("input", () => {
      ui.discover.query = search.value;
      ui.discover.limit = 18;
      renderDiscoverResults();
    });
    type?.addEventListener("change", async () => {
      ui.discover.type = type.value;
      ui.discover.limit = 18;
      await ensureCollections(collectionsForView("discover"));
      renderDiscoverResults();
    });
    city?.addEventListener("change", () => {
      ui.discover.city = city.value;
      ui.discover.limit = 18;
      renderDiscoverResults();
    });
    during?.addEventListener("change", () => {
      ui.discover.duringTrip = during.checked;
      ui.discover.limit = 18;
      renderDiscoverResults();
    });
    renderDiscoverResults();
  }

  function renderDiscoverResults() {
    const results = document.querySelector("#discover-results");
    const counter = document.querySelector("#discover-count");
    if (!results || !counter) return;
    const entries = filteredDiscoverEntries();
    const visible = entries.slice(0, ui.discover.limit);
    counter.innerHTML = entries.length
      ? `<strong>${formatNumber(entries.length)}</strong> matching ${entries.length === 1 ? "option" : "options"} · showing ${formatNumber(visible.length)}`
      : "No matches yet";
    results.innerHTML = entries.length
      ? `<div class="card-grid">${visible.map((entry) => renderCatalogCard(entry.item, entry.type)).join("")}</div>${entries.length > visible.length ? `<div class="show-more-row"><button class="button button-quiet" type="button" data-action="show-more">Show 18 more</button></div>` : ""}`
      : `<div class="empty-state"><div class="empty-state-icon" aria-hidden="true">⌕</div><h3>No matching ideas</h3><p>Try a broader word, another city, or switch the type filter. The raw research remains in the Sources desk if you need a deeper look.</p><button class="button button-small" type="button" data-action="clear-discover-filters">Clear filters</button></div>`;
  }

  function allDiscoverEntries() {
    const lists = [
      ["place", catalog.places],
      ["event", catalog.events],
      ["hotel", catalog.hotels],
      ["food", catalog.food],
      ["activity", catalog.activities],
      ["route", catalog.routes],
      ["saving", catalog.savingsGuides],
    ];
    return lists.flatMap(([type, items]) => items.map((item) => ({ item, type })));
  }

  function filteredDiscoverEntries() {
    let entries = allDiscoverEntries();
    if (ui.discover.type !== "all") entries = entries.filter((entry) => entry.type === ui.discover.type);
    if (ui.discover.city) entries = entries.filter((entry) => cityMatches(entry.item, ui.discover.city));
    if (ui.discover.duringTrip && hasTripDates()) {
      entries = entries.filter((entry) => entry.type === "event" && eventDuringTrip(entry.item));
    }

    const query = ui.discover.query.trim().toLocaleLowerCase();
    if (query) {
      const terms = query.split(/\s+/).filter(Boolean);
      const scored = entries
        .map((entry) => ({ entry, score: relevanceScore(entry, terms) }))
        .filter((pair) => pair.score > 0)
        .sort((a, b) => b.score - a.score
          || typeRank(a.entry.type) - typeRank(b.entry.type)
          || itemTitle(a.entry.item, a.entry.type).localeCompare(itemTitle(b.entry.item, b.entry.type)));
      return scored.map((pair) => pair.entry);
    }

    return entries.sort((a, b) => {
      if (a.type === "event" && b.type === "event") return String(a.item.startDate).localeCompare(String(b.item.startDate));
      if (a.type !== b.type) return typeRank(a.type) - typeRank(b.type);
      return itemTitle(a.item, a.type).localeCompare(itemTitle(b.item, b.type));
    });
  }

  function relevanceScore(entry, terms) {
    const haystack = searchHaystack(entry.item, entry.type);
    const title = itemTitle(entry.item, entry.type).toLocaleLowerCase();
    const city = itemCity(entry.item, entry.type).toLocaleLowerCase();
    let score = 0;
    for (const term of terms) {
      if (!haystack.includes(term)) return 0; // every word must match somewhere
      if (title.includes(term)) score += 30;
      if (title.startsWith(term)) score += 12;
      if (city.includes(term)) score += 15;
      score += 5;
    }
    if (terms.length > 1 && title.includes(terms.join(" "))) score += 25;
    return score;
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightText(value) {
    const text = String(value ?? "");
    const terms = ui.discover.query.trim().toLocaleLowerCase().split(/\s+/).filter((term) => term.length > 1);
    if (!terms.length) return e(text);
    const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
    const marked = text.replace(pattern, "\u0001$1\u0002");
    return e(marked).replaceAll("\u0001", "<mark>").replaceAll("\u0002", "</mark>");
  }

  function eventDuringTrip(item) {
    if (!hasTripDates() || !validDate(item.startDate)) return false;
    const tripStart = state.profile.startDate;
    const tripEnd = state.profile.endDate;
    const eventEnd = validDate(item.endDate) ? item.endDate : item.startDate;
    return item.startDate <= tripEnd && eventEnd >= tripStart;
  }

  function typeRank(type) {
    return ["place", "event", "hotel", "food", "activity", "route", "saving"].indexOf(type);
  }

  function cityMatches(item, city) {
    const itemCity = String(item.city || "");
    if (itemCity === city) return true;
    if (city === "Daejeon" && itemCity.includes("Daejeon")) return true;
    if (city === "Cheonan" && itemCity.includes("Cheonan")) return true;
    return false;
  }

  function searchHaystack(item, type) {
    const flatten = (value) => {
      if (Array.isArray(value)) return value.map(flatten).join(" ");
      if (value && typeof value === "object") return Object.values(value).map(flatten).join(" ");
      return String(value || "");
    };
    return `${TYPE_META[type].label} ${flatten(item)}`.toLocaleLowerCase();
  }

  function renderCatalogCard(item, type) {
    const title = itemTitle(item, type);
    const city = itemCity(item, type);
    const description = itemDescription(item, type);
    const chips = itemChips(item, type);
    const saved = isSaved(type, item.id);
    const url = itemUrl(item, type);
    const planable = ["place", "event", "activity", "food", "hotel", "route"].includes(type);
    const status = item.status ? statusBadge(item.status) : "";
    const urlLabel = type === "food" ? "Open map ↗" : type === "hotel" ? "Official site ↗" : type === "route" ? "Check route ↗" : "Official link ↗";

    return `<article class="catalog-card">
      <div class="catalog-card-top">
        <span class="card-type type-${type}">${e(TYPE_META[type].label)}</span>
        <div style="display:flex;align-items:center;gap:5px">${status}<button class="save-button ${saved ? "is-saved" : ""}" type="button" data-action="toggle-save" data-type="${type}" data-id="${e(item.id)}" aria-label="${saved ? "Remove from saved ideas" : "Save this idea"}" aria-pressed="${saved}">${saved ? "♥" : "♡"}</button></div>
      </div>
      <h3 title="${e(title)}">${highlightText(title)}</h3>
      ${city ? `<div class="card-location"><span>●</span> ${e(city)}</div>` : ""}
      <p class="card-description">${highlightText(description)}</p>
      <div class="card-meta">${chips.map((chip) => `<span class="meta-chip ${chip.tone || ""}" title="${e(chip.label)}">${e(chip.label)}</span>`).join("")}</div>
      <div class="card-actions">
        <button class="button button-link" type="button" data-action="show-detail" data-type="${type}" data-id="${e(item.id)}">Details</button>
        ${planable ? `<button class="button button-link" type="button" data-action="add-to-plan" data-type="${type}" data-id="${e(item.id)}">Add to plan</button>` : ""}
        ${url ? `<a href="${e(safeUrl(url))}" target="_blank" rel="noreferrer">${urlLabel}</a>` : ""}
      </div>
    </article>`;
  }

  function itemTitle(item, type) {
    if (type === "food") return item.name;
    if (type === "hotel") return item.name;
    if (type === "route") return `${item.from} → ${item.to}`;
    return item.title || item.name || "Untitled";
  }

  function itemCity(item, type) {
    if (["place", "event", "food", "hotel", "activity"].includes(type)) return item.city || "";
    if (type === "route") return item.segment || "Transit";
    return item.category || "";
  }

  function itemDescription(item, type) {
    switch (type) {
      case "place": return item.autumn_highlight || item.category || "Imported destination note.";
      case "event": return item.notes || `${item.venue || "Venue to confirm"}. ${item.hours || ""}`;
      case "activity": return item.snippet || "Activity detail is available in the source guide.";
      case "food": return `${item.category} in ${item.neighborhood}. ${item.koreanName ? `Korean: ${item.koreanName}.` : ""}`;
      case "hotel": return item.fitReason || item.why || item.neighborhood || "Hotel research record.";
      case "route": return item.recommendation || "Compare this route with your actual departure time.";
      case "saving": return item.snippet || "Savings note from the source research.";
      default: return "";
    }
  }

  function itemChips(item, type) {
    switch (type) {
      case "place": return [
        { label: item.category || "Place", tone: "accent" },
        item.nearest_station ? { label: shorten(item.nearest_station, 35) } : null,
        item.est_cost_two_travelers_krw ? { label: `${formatKrw(item.est_cost_two_travelers_krw)} / 2`, tone: "price" } : null,
      ].filter(Boolean);
      case "event": return [
        { label: formatDateRange(item.startDate, item.endDate), tone: "accent" },
        eventDuringTrip(item) ? { label: "During your trip", tone: "during" } : null,
        item.category ? { label: shorten(item.category, 27) } : null,
        item.price ? { label: shorten(item.price, 28), tone: "price" } : null,
      ].filter(Boolean);
      case "activity": return [
        item.category ? { label: shorten(item.category, 28), tone: "accent" } : null,
        item.status ? { label: item.status, tone: item.status === "TBA" || item.status === "Watch" ? "warning" : "" } : null,
      ].filter(Boolean);
      case "food": return [
        { label: item.category || "Food", tone: "accent" },
        item.priceTier ? { label: item.priceTier, tone: "price" } : null,
      ].filter(Boolean);
      case "hotel": return [
        { label: `${item.stars || ""}★ · ${item.tier || "stay"}`, tone: "accent" },
        { label: formatHotelPrice(item), tone: "price" },
        item.stationWalkTime ? { label: shorten(item.stationWalkTime, 22) } : null,
      ].filter(Boolean);
      case "route": return [
        { label: item.mode || "Transit", tone: "accent" },
        item.duration ? { label: item.duration } : null,
        item.cost_krw_per_person ? { label: `${formatKrw(item.cost_krw_per_person)} pp`, tone: "price" } : null,
      ].filter(Boolean);
      case "saving": return [
        { label: item.category || "Savings", tone: "accent" },
        { label: "Verify eligibility", tone: "warning" },
      ];
      default: return [];
    }
  }

  function statusBadge(status) {
    const normalized = String(status).toLocaleLowerCase().replace(/\s+/g, "-");
    return `<span class="status-badge ${e(normalized)}" title="Source status: ${e(status)}">${e(status)}</span>`;
  }

  function renderPlan() {
    const range = getDateRange();
    const inRangeItems = range.length ? state.itinerary.filter((item) => range.includes(item.date)) : [];
    const unassigned = state.itinerary.filter((item) => !item.date || !range.includes(item.date));
    const days = range.map((date) => renderDay(date, inRangeItems.filter((item) => item.date === date))).join("");

    return `<section class="view">
      <div class="print-only"><h1>Korea Compass · My plan</h1><p>${e(state.profile.name || "My Korea trip")} · ${e(profileDateLabel())} · ${state.profile.travelers} ${state.profile.travelers === 1 ? "traveler" : "travelers"} · printed from your local planner</p><div class="print-essentials-only"><p><strong>Essentials:</strong> Verify hotel Korean addresses, flight terminal, KTX times, event status, weather, entry requirements, and emergency contacts before acting.</p></div></div>
      <header class="view-head">
        <div class="view-head-copy">
          <span class="eyebrow">A flexible outline, not a rigid itinerary</span>
          <h1 class="page-title">My plan</h1>
          <p class="page-subtitle">Add only what feels useful. A plan item can be a booking, a meal, a transit leg, or a loose reminder — it never has to be final.</p>
        </div>
        <div class="head-actions">
          <button class="button button-quiet" type="button" data-action="print-plan">Save as PDF</button>
          <button class="button button-quiet" type="button" data-action="export-plan-doc">Word (.doc)</button>
          <button class="button button-quiet" type="button" data-action="export-plan-txt">Text (.txt)</button>
          <button class="button button-quiet" type="button" data-action="copy-brief">Copy planning brief</button>
          <button class="button" type="button" data-action="open-plan-item">+ Add plan item</button>
        </div>
      </header>

      ${hasTripDates() ? `<div class="plan-layout"><div class="timeline">${days || renderPlanNoDates()}</div>${renderPlanSidebar()}</div>` : renderPlanNoDates()}
      ${unassigned.length ? `<section class="panel unassigned"><div class="section-head"><div><div class="section-kicker">Needs a date</div><h2>Loose notes and undated items</h2><p>These stay safe here until you know where they belong.</p></div></div><div class="mini-list">${unassigned.map(renderLoosePlanItem).join("")}</div></section>` : ""}
    </section>`;
  }

  function renderPlanNoDates() {
    const items = sortedPlanItems();
    return `<section class="empty-state"><div class="empty-state-icon" aria-hidden="true">▤</div><h3>${items.length ? "Your notes are saved, but the trip window is open" : "Set a trip window when you are ready"}</h3><p>${items.length ? "Choose dates to lay your saved plan items onto a simple day-by-day timeline." : "You can still save ideas and add undated notes now. Dates only create the timeline view."}</p><button class="button" type="button" data-action="open-profile">${items.length ? "Add dates" : "Set trip basics"}</button></section>`;
  }

  function setPacePreset(pace) {
    if (!["slow", "balanced", "full"].includes(pace)) return;
    state.profile.pace = pace;
    persistState();
    renderCurrentView();
    showToast(`${pace === "slow" ? "Relaxed" : pace === "full" ? "Ambitious" : "Balanced"} pace saved to trip setup.`);
  }

  function addPlanTemplate(template) {
    const date = state.profile.startDate || "";
    const templates = {
      slow: [
        { title: "Slow morning and neighborhood breakfast", type: "Activity", energy: "low", mealType: "Breakfast", indoor: true },
        { title: "One flexible local anchor", type: "Visit", energy: "medium", notes: "Choose one nearby place; leave the rest open." },
        { title: "Early dinner and reset", type: "Food", energy: "low", mealType: "Dinner", indoor: true },
      ],
      rain: [
        { title: "Indoor museum, market, or café option", type: "Activity", energy: "medium", indoor: true, notes: "Confirm current hours and closures." },
        { title: "Indoor meal near the day’s anchor", type: "Food", energy: "low", mealType: "Lunch", indoor: true },
      ],
      food: [
        { title: "Breakfast or bakery stop", type: "Food", energy: "low", mealType: "Breakfast" },
        { title: "Market or neighborhood food crawl", type: "Food", energy: "medium", mealType: "Lunch" },
        { title: "Dinner reservation or saved favorite", type: "Food", energy: "medium", mealType: "Dinner", notes: "Verify hours, queue, and reservation policy." },
      ],
      coastal: [
        { title: "Coastal walk or viewpoint", type: "Visit", energy: "high", notes: "Weather-dependent; use an indoor backup if needed." },
        { title: "Nearby seafood or café stop", type: "Food", energy: "low", mealType: "Lunch" },
      ],
    };
    const items = templates[template] || [];
    items.forEach((item, index) => state.itinerary.push({ id: uniqueId("template"), date, time: "", title: item.title, city: "", type: item.type, notes: item.notes || "", neighborhood: "", energy: item.energy, duration: "", indoor: Boolean(item.indoor), mealType: item.mealType || "", referenceType: "", referenceId: "", createdAt: new Date().toISOString() }));
    persistState();
    renderCurrentView();
    showToast(`${items.length} ${template} template items added. Edit or remove anything you do not need.`);
  }

  function duplicateScenario() {
    if (!state.itinerary.length) { showToast("Add or load a plan before creating an experiment.", "warning"); return; }
    const copy = state.itinerary.map((item) => ({ ...item, id: uniqueId("scenario"), title: `${item.title} [experiment]` }));
    state.itinerary.push(...copy);
    persistState();
    renderCurrentView();
    showToast("A duplicate experiment was added. Edit or remove the copy to test an alternative.");
  }

  function exportHandoff() {
    const openReminders = state.reminders.filter((item) => !item.done);
    const report = [
      `KOREA TRIP HANDOFF REPORT — ${state.profile.name || "My Korea trip"}`,
      profileDateLabel(), `${state.profile.travelers} travelers`, `Pace: ${state.profile.pace || "balanced"}`, "",
      "ROUTE AND PLAN", planExportText(), "",
      "OPEN DECISIONS / REMINDERS", ...(openReminders.length ? openReminders.map((item) => `- ${item.label}${item.date ? ` (${item.date})` : ""}`) : ["- None recorded"]), "",
      "FINAL CHECKS", "- Confirm flights and terminals", "- Confirm hotel addresses and late check-in", "- Verify KTX timetable, fares, and station", "- Recheck events, hours, weather, and entry rules", "- Share emergency contacts and insurance details", "",
      "This report is a planning snapshot, not a booking confirmation.",
    ].join("\n");
    downloadBlob(new Blob([report], { type: "text/plain;charset=utf-8" }), `${slug(state.profile.name || "korea-trip")}-handoff-report.txt`);
    showToast("Trip handoff report exported.");
  }

  function exportOfflinePack() {
    const pack = [
      `Korea Compass offline trip pack — ${state.profile.name || "Korea trip"}`,
      profileDateLabel(), "", planExportText(), "",
      "IMPORTANT LIVE CHECKS", "Verify flight terminal, hotel address, KTX times, event status, weather, entry requirements, and emergency information close to travel.",
      "HOTEL / ADDRESS NOTES", ...sortedPlanItems().filter((item) => item.type === "Stay" || /hotel|address/i.test(item.notes)).map((item) => `- ${item.title}: ${item.notes}`),
      "\nThis offline pack is a planning snapshot, not a booking confirmation.",
    ].join("\n");
    downloadBlob(new Blob([pack], { type: "text/plain;charset=utf-8" }), `${slug(state.profile.name || "korea-trip")}-offline-pack.txt`);
    showToast("Offline trip pack exported as text.");
  }

  function renderDependencyWarnings() {
    const dated = sortedPlanItems().filter((item) => item.date);
    const warnings = [];
    dated.forEach((item, index) => {
      const next = dated[index + 1];
      if (!next || next.date !== item.date) return;
      if (item.type === "Transit" && next.type === "Food" && item.time && next.time && next.time < item.time) warnings.push(`${item.title} appears after ${next.title} on the same day.`);
      if (item.type === "Transit" && next.energy === "high") warnings.push(`High-energy activity follows ${item.title}; leave extra arrival buffer.`);
    });
    const open = warnings.length ? warnings.slice(0, 3).map((warning) => `<li>${e(warning)}</li>`).join("") : "<li>No obvious same-day conflicts found.</li>";
    return `<article class="panel panel-warn"><div class="section-kicker">Plan checks</div><h3 style="margin:0 0 7px;font-size:14px">Dependency warnings</h3><ul class="dependency-list">${open}</ul><small>These are heuristics. Confirm against live travel times and reservations.</small></article>`;
  }

  function renderReminders() {
    const reminders = [...state.reminders].sort((a, b) => `${a.done}-${a.date}`.localeCompare(`${b.done}-${b.date}`));
    return `<article class="panel panel-soft"><div class="section-kicker">Local reminders</div><h3 style="margin:0 0 7px;font-size:14px">Keep the next check visible</h3><div class="reminder-list">${reminders.length ? reminders.map((item) => `<div class="reminder-row ${item.done ? "is-done" : ""}"><label><input type="checkbox" data-action="toggle-reminder" data-id="${e(item.id)}" ${item.done ? "checked" : ""}><span>${e(item.label)}${item.date ? ` · ${e(item.date)}` : ""}</span></label><button class="icon-button danger" type="button" data-action="delete-reminder" data-id="${e(item.id)}">×</button></div>`).join("") : `<p class="text-note">No reminders yet. Add live checks for flights, KTX, hotels, or events.</p>`}</div><button class="button button-link" type="button" data-action="add-reminder">+ Add local reminder</button></article>`;
  }

  function addReminder() {
    const label = window.prompt("Reminder", "Verify a live trip detail");
    if (!label) return;
    const date = window.prompt("Due date (YYYY-MM-DD, optional)", "") || "";
    state.reminders.push({ id: uniqueId("reminder"), label: cleanText(label, 160), date: validDate(date) ? date : "", done: false });
    persistState(); renderCurrentView(); showToast("Local reminder added.");
  }

  function toggleReminder(id) {
    const item = state.reminders.find((entry) => entry.id === id); if (!item) return;
    item.done = !item.done; persistState(); renderCurrentView();
  }

  function deleteReminder(id) {
    state.reminders = state.reminders.filter((entry) => entry.id !== id); persistState(); renderCurrentView();
  }

  function renderDailyEfficiency() {
    const dated = state.itinerary.filter((item) => item.date);
    const counts = Object.entries(dated.reduce((map, item) => { map[item.date] = (map[item.date] || 0) + 1; return map; }, {}));
    const busiest = counts.sort((a, b) => b[1] - a[1])[0];
    const energyPoints = dated.reduce((sum, item) => sum + ({ low: 1, medium: 2, high: 3 }[item.energy] || 2), 0);
    const highDays = counts.filter(([date]) => dated.filter((item) => item.date === date).reduce((sum, item) => sum + ({ low: 1, medium: 2, high: 3 }[item.energy] || 2), 0) >= 7).length;
    const rainReady = dated.filter((item) => item.indoor).length;
    const openDays = hasTripDates() ? getDateRange().filter((date) => !dated.some((item) => item.date === date)).length : 0;
    return `<article class="panel panel-soft"><div class="section-kicker">Daily efficiency</div><h3 style="margin:0 0 7px;font-size:14px">Protect your best days</h3><p class="text-note">${dated.length ? `${dated.length} dated items across ${counts.length} days.` : "Load a route or add items to see pacing."} ${busiest && busiest[1] > 3 ? `Your busiest day has ${busiest[1]} items — consider moving one.` : ""}</p>${dated.length ? `<p class="text-note"><strong>${energyPoints}</strong> total energy points · <strong>${highDays}</strong> demanding day${highDays === 1 ? "" : "s"} · <strong>${rainReady}</strong> rain-friendly item${rainReady === 1 ? "" : "s"}.</p>` : ""}${hasTripDates() ? `<p class="text-note"><strong>${openDays}</strong> open day${openDays === 1 ? "" : "s"} remain for weather, rest, or discoveries.</p>` : ""}</article>`;
  }

  function renderPlanSidebar() {
    const cities = selectedCities();
    return `<aside class="plan-side">
      <article class="planning-principle"><h3>Keep the plan breathable</h3><p>For a first draft, one anchor per day is enough: a must-see, a transport leg, or a reservation.</p><p>Leave open time for the weather, your energy, and small discoveries.</p></article>
      <article class="panel panel-soft"><div class="section-head"><div><div class="section-kicker">Trip snapshot</div><h3>${e(profileDateLabel())}</h3></div></div><div class="detail-list"><div class="detail-row"><strong>${state.profile.travelers} ${state.profile.travelers === 1 ? "traveler" : "travelers"}</strong><p>Change this at any time in trip setup.</p></div><div class="detail-row"><strong>${cities.length ? e(cities.map((city) => city.name).join(" · ")) : "No cities pinned"}</strong><p>City choices help organize discovery; they do not create bookings.</p></div></div><button class="button button-quiet button-small" type="button" data-action="open-profile" style="margin-top:14px">Edit trip setup</button></article>
      <article class="panel panel-soft planning-tools"><div class="section-kicker">Planning tools</div><h3 style="margin:0 0 7px;font-size:14px">Build a better day</h3><p class="text-note">Add a starting template, then edit or remove anything that does not fit.</p><div class="button-row" style="margin-top:10px"><span class="tool-label">Pace</span><button class="button button-quiet button-small" type="button" data-action="set-pace" data-pace="slow">Relaxed</button><button class="button button-quiet button-small" type="button" data-action="set-pace" data-pace="balanced">Balanced</button><button class="button button-quiet button-small" type="button" data-action="set-pace" data-pace="full">Ambitious</button></div><div class="button-row" style="margin-top:10px"><button class="button button-quiet button-small" type="button" data-action="add-template" data-template="slow">Slow day</button><button class="button button-quiet button-small" type="button" data-action="add-template" data-template="rain">Rain plan</button><button class="button button-quiet button-small" type="button" data-action="add-template" data-template="food">Food day</button><button class="button button-quiet button-small" type="button" data-action="add-template" data-template="coastal">Coastal day</button><button class="button button-link" type="button" data-action="toggle-weather">${ui.weatherMode === "rain" ? "Use regular plan" : "Show rain-friendly notes"}</button></div><div class="button-row" style="margin-top:8px"><button class="button button-link" type="button" data-action="duplicate-scenario">Duplicate as experiment</button><button class="button button-link" type="button" data-action="export-offline-pack">Export offline pack</button></div><div class="button-row" style="margin-top:8px"><button class="button button-link" type="button" data-action="export-handoff">Handoff report</button><button class="button button-link" type="button" data-action="print-compact">Compact print</button><button class="button button-link" type="button" data-action="print-transfers">Transfer days</button><button class="button button-link" type="button" data-action="print-food">Meals</button><button class="button button-link" type="button" data-action="print-essentials">Essentials</button></div></article>
      ${renderDailyEfficiency()}
      ${renderReminders()}
      ${renderDependencyWarnings()}
      <article class="panel panel-tint"><div class="section-kicker">Take it with you</div><h3 style="margin:0 0 7px;font-size:14px">Your data stays portable</h3><p class="text-note">Take the editable plan with you as PDF, Word, plain text, JSON, calendar, or CSV. PDF uses your browser’s print dialog so you can choose “Save to PDF.”</p><div class="button-row" style="margin-top:12px"><button class="button button-soft button-small" type="button" data-action="print-plan">PDF</button><button class="button button-soft button-small" type="button" data-action="export-plan-doc">Word</button><button class="button button-soft button-small" type="button" data-action="export-plan-txt">TXT</button><button class="button button-soft button-small" type="button" data-action="export-plan">JSON</button><button class="button button-soft button-small" type="button" data-action="export-ics">Calendar</button><button class="button button-soft button-small" type="button" data-action="export-csv">CSV</button><button class="button button-link" type="button" data-action="import-plan">Import</button></div></article>
    </aside>`;
  }

  function renderDay(date, items) {
    const day = dateParts(date);
    return `<article class="day-card">
      <div class="day-date"><strong class="day-date-day">${day.day}</strong><span class="day-date-month">${e(day.month)}</span><span class="day-date-weekday">${e(day.weekday)}</span></div>
      <div class="day-content"><div class="day-content-head"><span>${items.length ? `${items.length} ${items.length === 1 ? "item" : "items"}` : "Open day"}${items.some((item) => item.mealType) ? ` · ${items.filter((item) => item.mealType).length} meal slot${items.filter((item) => item.mealType).length === 1 ? "" : "s"}` : ""}</span><button class="button button-link" type="button" data-action="open-plan-item" data-date="${date}">+ Add</button></div>
      ${ui.weatherMode === "rain" ? `<p class="weather-mode-note">Rain mode: favor indoor items, cafés, museums, markets, and flexible transit. ${items.some((item) => item.indoor) ? "An indoor option is already tagged for this day." : "Add an indoor backup before committing."}</p>` : ""}${items.length ? items.sort(sortPlanByTime).map(renderPlanEntry).join("") : `<p class="day-empty">Nothing pinned — leave it open or add one gentle anchor.</p>`}</div>
    </article>`;
  }

  function renderPlanEntry(item) {
    return `<div class="plan-entry plan-type-${slug(item.type)} ${item.reservationRequired ? "has-reservation" : ""}"><span class="plan-time">${e(item.time || "Anytime")}</span><div class="plan-entry-copy"><strong>${e(item.title)}</strong><span>${e([item.type, item.city, item.neighborhood, item.mealType, item.duration, item.recommendedWindow, item.indoor ? "Indoor backup" : "", item.reservationRequired ? "Reservation needed" : "", item.notes].filter(Boolean).join(" · "))}</span>${item.closureNote ? `<small class="plan-warning">Verify: ${e(item.closureNote)}</small>` : ""}</div><div class="entry-actions"><button class="icon-button" type="button" title="Edit ${e(item.title)}" data-action="edit-plan-item" data-id="${e(item.id)}">✎</button><button class="icon-button danger" type="button" title="Remove ${e(item.title)}" data-action="delete-plan-item" data-id="${e(item.id)}">×</button></div></div>`;
  }

  function renderLoosePlanItem(item) {
    return `<div class="mini-item"><span class="mini-dot" aria-hidden="true"></span><div class="mini-copy"><strong>${e(item.title)}</strong><span>${e([item.type, item.city, item.notes].filter(Boolean).join(" · ") || "No date chosen")}</span></div><button class="button button-link mini-action" type="button" data-action="edit-plan-item" data-id="${e(item.id)}">Place it</button></div>`;
  }

  function renderTravelStressChecker() {
    const stages = [
      ["ICN arrival night", "Late arrival · immigration · luggage · hotel late check-in", "No sightseeing or timed dinner; save hotel Korean address."],
      ["Seoul → middle city", "Checkout · station transfer · KTX · luggage · check-in", "Keep the first evening light and stay near the station or arrange a taxi."],
      ["Middle city → Busan", "Morning checkout · direct rail · new hotel base", "Protect the train as the day’s anchor; do not add a far-away morning activity."],
      ["Busan → final Seoul", "KTX · final hotel · airline and ICN review", "Treat this as departure insurance, not a missed sightseeing day."],
      ["ICN departure", "Hotel exit · airport transfer · terminal · check-in", "Target airport arrival around three hours before the international departure."],
    ];
    return `<section class="stress-checker panel"><div class="section-head"><div><div class="section-kicker">Airport and train-day stress checker</div><h2>Protect the high-consequence moments</h2><p>Use the calmest option on transfer days. Check each stage against the actual ticket, hotel, luggage, and current operating details.</p></div></div><div class="stress-grid">${stages.map(([title, detail, advice]) => `<article><span class="stress-dot">○</span><strong>${e(title)}</strong><small>${e(detail)}</small><p>${e(advice)}</p></article>`).join("")}</div></section>`;
  }

  function renderBookings() {
    const preTasks = catalog.emergency.preDeparture;
    const complete = checklistSummary(preTasks, "pre");
    const routeSuggestions = catalog.routes.filter((route) => route.segment === "Airport transfer").slice(0, 3);
    return `<section class="view">
      <header class="view-head">
        <div class="view-head-copy"><span class="eyebrow">Move from ideas to confirmed details</span><h1 class="page-title">Bookings & prep</h1><p class="page-subtitle">This is the calm checklist between research and reservations. It helps you stage critical checks without pretending that a source snapshot is a confirmed booking.</p></div>
        <div class="head-actions"><button class="button button-quiet" type="button" data-action="open-profile">Trip setup</button><button class="button" type="button" data-action="open-plan-item" data-type="Booking">+ Add a booking note</button></div>
      </header>
      ${renderTravelStressChecker()}
      <section class="content-grid content-grid-wide">
        <article class="panel">
          <div class="section-head"><div><div class="section-kicker">Before departure</div><h2>Prep checklist</h2><p>Imported from the emergency research and kept editable only as your personal completion state.</p></div><span class="meta-chip accent">${complete.done}/${complete.total} checked</span></div>
          ${renderProgress("pre", complete)}
          <div class="separator"></div>
          ${renderChecklist(preTasks, "pre")}
        </article>
        <aside class="stack">
          <article class="panel panel-warn"><div class="section-kicker">Booking sequence</div><h2 style="margin:0 0 10px;font-size:16px">A simple order of operations</h2><div class="detail-list"><div class="detail-row"><strong>1. Verify the rules</strong><p>Entry documents, event status, cancellation terms, and eligibility should come from the official source — close to travel.</p></div><div class="detail-row"><strong>2. Lock the hard edges</strong><p>Flights, stays, key rail legs, and time-sensitive tickets first. Save confirmations as plan notes.</p></div><div class="detail-row"><strong>3. Keep the rest flexible</strong><p>Food, parks, neighborhood walks, and most discovery can remain a saved idea until you are on the ground.</p></div></div></article>
          <article class="panel panel-tint"><div class="section-kicker">Reminder</div><h2 style="margin:0 0 7px;font-size:16px">No automatic purchases</h2><p class="text-note">This planner never books anything or sends your information away. It only points back to source and official links.</p><button class="button button-soft button-small" type="button" data-action="copy-brief" style="margin-top:12px">Copy planning brief</button></article>
        </aside>
      </section>
      <section class="panel" style="margin-top:18px"><div class="section-head"><div><div class="section-kicker">Arrival decision helper</div><h2>Airport transfer options in the imported research</h2><p>Compare against your arrival time, luggage, terminal and hotel before booking.</p></div><button class="button button-link" type="button" data-view="toolkit">Open transit kit</button></div><div class="route-list">${routeSuggestions.map(renderRouteRow).join("")}</div></section>
    </section>`;
  }

  function renderChecklist(tasks, key) {
    const groups = new Map();
    tasks.forEach((task, index) => {
      if (!groups.has(task.section)) groups.set(task.section, []);
      groups.get(task.section).push({ task, index });
    });
    return `<div class="checklist" data-checklist="${key}">${[...groups.entries()].map(([section, entries]) => `<section class="checklist-group"><h3>${e(section)}</h3>${entries.map(({ task, index }) => {
      const taskKey = `${key}-${index}`;
      const checked = Boolean(state.tasks[taskKey]);
      return `<label class="check-row ${checked ? "is-done" : ""}"><input type="checkbox" data-task="${taskKey}" data-checklist="${key}" ${checked ? "checked" : ""}><span>${e(task.label)}</span></label>`;
    }).join("")}</section>`).join("")}</div>`;
  }

  function renderProgress(key, summary) {
    const percent = summary.total ? Math.round((summary.done / summary.total) * 100) : 0;
    return `<div data-progress="${key}"><div class="progress-line"><span style="width:${percent}%"></span></div><div class="progress-copy"><span>${summary.done} of ${summary.total} checked</span><span>${percent}%</span></div></div>`;
  }

  function updateChecklistProgress(key) {
    if (!catalog || !key) return;
    const taskKey = key === "pre" ? "preDeparture" : "duringTrip";
    const summary = checklistSummary(catalog.emergency[taskKey], key);
    const percent = summary.total ? Math.round((summary.done / summary.total) * 100) : 0;
    document.querySelectorAll(`[data-progress="${key}"]`).forEach((node) => {
      node.innerHTML = `<div class="progress-line"><span style="width:${percent}%"></span></div><div class="progress-copy"><span>${summary.done} of ${summary.total} checked</span><span>${percent}%</span></div>`;
    });
  }

  function checklistSummary(tasks, key) {
    const total = tasks.length;
    const done = tasks.reduce((count, task, index) => count + (state.tasks[`${key}-${index}`] ? 1 : 0), 0);
    return { total, done };
  }

  function renderToolkit() {
    const airport = catalog.routes.filter((route) => route.segment === "Airport transfer");
    const intercity = catalog.routes.filter((route) => route.segment === "Intercity");
    const cards = catalog.cards;
    const apps = catalog.apps.slice(0, 6);
    return `<section class="view">
      <header class="view-head"><div class="view-head-copy"><span class="eyebrow">Practical travel confidence</span><h1 class="page-title">Transit kit</h1><p class="page-subtitle">The imported transit research, reduced to a few useful decision points. Open the source or official links for final, live details.</p></div><div class="head-actions"><button class="button button-quiet" type="button" data-view="discover">Search all transit</button></div></header>
      <section class="tool-grid">
        ${toolCard("↗", "Arrival transfer", "Use your actual arrival time, terminal, luggage, and hotel neighborhood to compare the airport options below.", "Jump to options", "jump-airport")}
        ${toolCard("◉", "Transit payments", "The research includes T-money, WOWPASS and visitor pass notes. Confirm current coverage and loading rules before travel.", "Compare cards", "jump-cards")}
        ${toolCard("⌕", "Essential apps", "Local mapping and taxi apps are a major beginner advantage. Save hotel addresses in Korean once booked.", "See apps", "jump-apps")}
      </section>
      <section id="airport-options" class="content-grid content-grid-wide" style="margin-top:18px"><article class="panel"><div class="section-head"><div><div class="section-kicker">Airport transfer</div><h2>ICN to central Seoul</h2><p>Costs are source estimates. Compare real-time operating hours and your hotel before travel.</p></div></div><div class="route-list">${airport.map(renderRouteRow).join("")}</div></article><aside class="panel panel-tint"><div class="section-kicker">A useful default</div><h2 style="margin:0 0 8px;font-size:17px">Choose ease after a long flight</h2><p class="text-note">The transit source treats comfort, luggage and transfer count as real costs — not just the fare. That is a good beginner rule.</p><div class="separator"></div><div class="detail-list">${catalog.logistics.sweet_spot_comparisons.slice(0, 2).map((comparison) => `<div class="detail-row"><strong>${e(comparison.scenario)}</strong><p>${e(comparison.sweet_spot_option?.why_sweet_spot || "Compare options before deciding.")}</p></div>`).join("")}</div></aside></section>
      <section class="content-grid" style="margin-top:18px"><article id="cards-panel" class="panel"><div class="section-head"><div><div class="section-kicker">Payment & passes</div><h2>Cards in the research library</h2><p>Pick for your real route; no card is automatically right for every traveler.</p></div></div><div class="tool-grid">${cards.map((item) => transitCard(item)).join("")}</div></article><aside class="panel"><div class="section-head"><div><div class="section-kicker">Stations & luggage</div><h2>Useful hub notes</h2></div></div><div class="detail-list">${catalog.stations.map((station) => `<div class="detail-row"><strong>${e(station.name)}</strong><p>${e(station.wowpass_tmoney_location || station.category || "See source for navigation notes.")}</p></div>`).join("")}</div></aside></section>
      <section class="content-grid" style="margin-top:18px"><article class="panel"><div class="section-head"><div><div class="section-kicker">Intercity choices</div><h2>Routes to compare</h2><p>Duration and fare are estimates from the source snapshot.</p></div></div><div class="route-list">${intercity.map(renderRouteRow).join("")}</div></article><aside id="apps-panel" class="panel"><div class="section-head"><div><div class="section-kicker">Phone before you land</div><h2>Apps noted by the transit research</h2></div></div><div class="detail-list">${apps.map((item) => `<div class="detail-row"><strong>${e(item.name)}</strong><p>${e(item.beginner_tip || item.why_essential)}</p>${item.app_store_url ? `<a class="detail-link" href="${e(safeUrl(item.app_store_url))}" target="_blank" rel="noreferrer">Open link ↗</a>` : ""}</div>`).join("")}</div></aside></section>
    </section>`;
  }

  function toolCard(icon, title, copy, actionLabel, action) {
    return `<article class="tool-card"><div class="tool-card-head"><span class="tool-icon" aria-hidden="true">${icon}</span><h3>${e(title)}</h3></div><p>${e(copy)}</p><div class="button-row"><button class="button button-link" type="button" data-action="${action}">${e(actionLabel)} →</button></div></article>`;
  }

  function transitCard(item) {
    return `<article class="tool-card"><div class="tool-card-head"><span class="tool-icon" aria-hidden="true">◉</span><h3>${e(item.name)}</h3></div><p>${e(item.best_for || item.coverage || "See source for current terms.")}</p><div class="card-meta"><span class="meta-chip accent">${item.price_krw ? `${formatKrw(item.price_krw)} source price` : "Check source"}</span></div>${item.official_site ? `<a class="detail-link" href="${e(safeUrl(item.official_site))}" target="_blank" rel="noreferrer">Official site ↗</a>` : ""}</article>`;
  }

  function renderRouteRow(route) {
    return `<article class="route-row"><div><h3>${e(route.from)} <span class="muted">→</span> ${e(route.to)}</h3><p><strong>${e(route.mode)}</strong> · ${e(route.duration || "Time to confirm")}${route.recommendation ? ` · ${e(shorten(route.recommendation, 180))}` : ""}</p><div class="card-actions" style="margin-top:7px"><button class="button button-link" type="button" data-action="show-detail" data-type="route" data-id="${e(route.id)}">Details</button>${route.booking_site ? `<a href="${e(safeUrl(route.booking_site))}" target="_blank" rel="noreferrer">Check route ↗</a>` : ""}</div></div><div class="route-cost">${route.cost_krw_per_person ? formatKrw(route.cost_krw_per_person) : "Check fare"}<small>per person · source estimate</small></div></article>`;
  }

  function renderSafety() {
    const duringTasks = catalog.emergency.duringTrip;
    const complete = checklistSummary(duringTasks, "during");
    return `<section class="view">
      <header class="view-head"><div class="view-head-copy"><span class="eyebrow">Practical, offline-minded preparation</span><h1 class="page-title">Safety & essentials</h1><p class="page-subtitle">Keep a few critical details easy to reach. The source material is a preparedness framework, not legal, medical, or insurance advice.</p></div><div class="head-actions"><button class="button button-quiet" type="button" data-action="print">Print this page</button></div></header>
      <section class="alert-strip"><span class="alert-icon" aria-hidden="true">!</span><div><strong>For a real emergency, call local services first.</strong><p>The numbers below were imported from the emergency research. Save them offline and verify your embassy, insurance, entry, and medical details before travel.</p></div></section>
      <section class="content-grid content-grid-wide" style="margin-top:18px"><article class="panel panel-danger"><div class="section-head"><div><div class="section-kicker">Quick dial</div><h2>Emergency contacts</h2><p>Tap a number on a phone-capable device to dial. Re-check close to departure.</p></div></div><div class="contact-grid">${catalog.emergency.contacts.map(renderContact).join("")}</div><div class="safety-actions"><a class="button button-danger button-small" href="${e(safeUrl(catalog.emergency.printCard))}" target="_blank" rel="noreferrer">Open printable emergency card</a><a class="button button-quiet button-small" href="${e(safeUrl(catalog.emergency.scenariosPath))}" target="_blank" rel="noreferrer">Read scenario guide</a></div></article><aside class="panel panel-tint"><div class="section-kicker">Make it usable</div><h2 style="margin:0 0 10px;font-size:17px">Your five-minute offline kit</h2><div class="detail-list"><div class="detail-row"><strong>Save your hotel address in Korean</strong><p>Keep it in your phone, your shared plan, and on paper — especially useful for taxis.</p></div><div class="detail-row"><strong>Keep two payment methods separate</strong><p>Do not let one lost wallet take away every way to pay.</p></div><div class="detail-row"><strong>Share the plan with a home contact</strong><p>Include arrival, lodging, emergency contact, and insurance details.</p></div><div class="detail-row"><strong>Download maps before travel</strong><p>Offline access is the point, not just convenience.</p></div></div></aside></section>
      <section class="content-grid" style="margin-top:18px"><article class="panel"><div class="section-head"><div><div class="section-kicker">During the trip</div><h2>Small, useful checks</h2><p>Use this as a personal readiness list; completed boxes stay only in this browser.</p></div><span class="meta-chip accent">${complete.done}/${complete.total} checked</span></div>${renderProgress("during", complete)}<div class="separator"></div>${renderChecklist(duringTasks, "during")}</article><aside class="stack"><article class="panel"><div class="section-kicker">Official information</div><h2 style="margin:0 0 8px;font-size:16px">Verify critical rules</h2><p class="text-note">Entry requirements, medication rules, weather, air quality, transport operations, and embassy advice can change. Use the emergency source register and official sites before travel.</p><a class="source-link" href="${e(safeUrl("research/sources/emergency/docs/sources.md"))}" target="_blank" rel="noreferrer">Open source register →</a></article><article class="panel panel-warn"><div class="section-kicker">Crowds & disruptions</div><h2 style="margin:0 0 8px;font-size:16px">Leave a little time buffer</h2><p class="text-note">The source includes weather, crowd, transport, and test-day considerations. Treat time-sensitive notices as prompts to confirm rather than fixed facts.</p><a class="source-link" href="${e(safeUrl("research/sources/emergency/docs/06-holidays-traffic-dates.md"))}" target="_blank" rel="noreferrer">Open traffic/date notes →</a></article></aside></section>
    </section>`;
  }

  function renderContact(contact) {
    const number = contact.number;
    const tel = `tel:${number.replace(/[^+\d]/g, "")}`;
    return `<article class="contact-card"><a class="contact-number" href="${e(tel)}">${e(number)}</a><strong>${e(contact.label)}</strong><p>${e(contact.note)}</p></article>`;
  }

  function renderSaved() {
    const entries = resolveSavedItems();
    return `<section class="view"><header class="view-head"><div class="view-head-copy"><span class="eyebrow">Your private maybe list</span><h1 class="page-title">Saved ideas</h1><p class="page-subtitle">A good trip often begins with a loose collection. Keep what excites you, then turn only the right things into plan items.</p></div><div class="head-actions">${entries.length ? `<button class="button button-quiet" type="button" data-action="clear-saved">Clear saved</button>` : ""}<button class="button" type="button" data-view="discover">Discover more</button></div></header>${entries.length ? `<section class="panel panel-soft"><div class="results-meta"><span><strong>${entries.length}</strong> saved ${entries.length === 1 ? "idea" : "ideas"}</span><span class="filter-note">Saving is local to this browser.</span></div><div class="card-grid">${entries.map((entry) => renderCatalogCard(entry.item, entry.type)).join("")}</div></section>` : `<section class="empty-state"><div class="empty-state-icon" aria-hidden="true">♡</div><h3>Your list is pleasantly empty</h3><p>Search the master library and tap the heart on anything you might want to revisit.</p><button class="button" type="button" data-view="discover">Browse ideas</button></section>`}</section>`;
  }

  function renderSources() {
    const counts = catalog.meta.counts;
    return `<section class="view"><header class="view-head"><div class="view-head-copy"><span class="eyebrow">Provenance over mystery</span><h1 class="page-title">Sources & research vault</h1><p class="page-subtitle">Every master-library record points back to a user-provided repository or a local source snapshot. The planner is deliberately transparent about what was imported.</p></div></header>
      <section class="panel panel-tint"><div class="section-head"><div><div class="section-kicker">GitHub Pages ready</div><h2>This site deploys from <code>main</code> at the repository root.</h2><p>GitHub Pages is already configured for <code>main</code> / <code>/</code>. Once this branch is merged into main, the root <code>index.html</code> is the published app — no build step needed.</p></div></div><div class="button-row"><a class="button button-soft button-small" href="https://karagemop466-tech.github.io/KoreaMasterItinerary1/" target="_blank" rel="noreferrer">Open Pages site ↗</a><button class="button button-quiet button-small" type="button" data-action="export-plan">Export my local plan</button><button class="button button-quiet button-small" type="button" data-action="refresh-research">Refresh cached research</button></div></section>
      ${renderFreshnessCenter()}
      ${renderSourceHealth()}
      <section class="panel" style="margin-top:18px"><div class="section-head"><div><div class="section-kicker">What was consolidated</div><h2>Master library inventory</h2><p>Structured records power the interface; full source documents are also retained in the local research vault.</p></div></div><div class="inventory-grid">${inventoryItem(counts.places, "destinations")} ${inventoryItem(counts.routes, "transport routes")} ${inventoryItem(counts.hotels, "stay options")} ${inventoryItem(counts.food, "food bookmarks")} ${inventoryItem(counts.events, "dated events")} ${inventoryItem(counts.activities, "activity notes")} ${inventoryItem(counts.savingsGuides, "savings notes")} ${inventoryItem(counts.apps, "essential apps")} ${inventoryItem(counts.sources, "source repos")}</div></section>
      <section class="source-grid" style="margin-top:18px">${catalog.sources.map(renderSourceCard).join("")}</section>
      <section class="content-grid" style="margin-top:18px"><article class="panel"><div class="section-kicker">Maintainer notes</div><h2 style="margin:0 0 9px;font-size:17px">How the master stays refreshable</h2><div class="prose"><p>Source snapshots live under <code>research/sources/</code>. The browser-friendly catalog is generated from them by <code>scripts/build_catalog.py</code>.</p><p>When source research changes, update the relevant snapshot, run the script, review the data diff, then publish. This avoids a hidden scraping dependency in GitHub Pages.</p></div></article><aside class="panel panel-warn"><div class="section-kicker">Important data note</div><h2 style="margin:0 0 9px;font-size:17px">Research is not a live feed</h2><p class="text-note">The imported material includes time-sensitive claims. Prices, events, operating hours, eligibility, entry rules, and services must be confirmed with the linked official source before action.</p></aside></section>
    </section>`;
  }

  function renderSourceHealth() {
    const checks = [
      ["Destinations missing source URL", (catalog.places || []).filter((item) => !item.officialUrl && !item.sourceUrl).length],
      ["Transit routes missing provider link", (catalog.routes || []).filter((item) => !item.booking_site && !item.officialUrl).length],
      ["Hotels missing comparison link", (catalog.hotels || []).filter((item) => !item.compareUrl && !item.officialUrl).length],
      ["Events in catalog", catalog.meta?.counts?.events ? 0 : 1],
    ];
    return `<section class="source-health panel"><div class="section-head"><div><div class="section-kicker">Catalog maintenance</div><h2>Source health check</h2><p>Quick structural checks for the local catalog. A missing link is a review task, not proof that a record is unusable.</p></div></div><div class="health-grid">${checks.map(([label, count]) => `<div class="health-item ${count ? "needs-review" : "healthy"}"><strong>${count ? count : "✓"}</strong><span>${e(label)}</span></div>`).join("")}</div></section>`;
  }

  function renderFreshnessCenter() {
    const snapshotDate = catalog.meta?.snapshotDate || "2026-08-07";
    return `<section class="freshness-center panel panel-warn"><div class="section-head"><div><div class="section-kicker">Research freshness center</div><h2>Review time-sensitive details before you lock the trip</h2><p>Catalog snapshot: ${e(snapshotDate)}. These prompts are reminders, not live verification.</p></div><button class="button button-quiet button-small" type="button" data-view="discover">Review library</button></div><div class="freshness-grid"><div><strong>Events</strong><span>Verify dates, tickets, and venue status</span></div><div><strong>Hotels</strong><span>Verify live price, room type, and cancellation terms</span></div><div><strong>Transit</strong><span>Verify KTX release times, fares, and station changes</span></div><div><strong>Attractions</strong><span>Verify hours, closures, weather, and entry rules</span></div></div></section>`;
  }

  function inventoryItem(value, label) {
    return `<div class="inventory-item"><strong>${formatNumber(value)}</strong><span>${e(label)}</span></div>`;
  }

  function renderSourceCard(source) {
    const readme = `${source.localPath}/README.md`;
    return `<article class="source-card"><div class="source-card-head"><h3>${e(source.name)}</h3><span class="meta-chip accent">Imported</span></div><p>${e(source.focus)}</p><div class="source-meta"><span>Branch: <code>${e(source.branch)}</code></span><span>Snapshot: <code>${e(source.commit.slice(0, 12))}</code></span></div><div class="button-row"><a class="button button-quiet button-small" href="${e(safeUrl(source.url))}" target="_blank" rel="noreferrer">Open repository ↗</a><a class="button button-link" href="${e(safeUrl(readme))}" target="_blank" rel="noreferrer">Local snapshot</a></div></article>`;
  }

  async function handleAction(button) {
    const action = button.dataset.action;
    switch (action) {
      case "reload": window.location.reload(); break;
      case "open-profile": openProfileModal(); break;
      case "go-discover": navigate("discover"); break;
      case "select-itinerary":
        ui.itineraryId = button.dataset.id || ui.itineraryId;
        window.history.replaceState(null, "", `${viewHash("itineraries")}/${ui.itineraryId}`);
        renderCurrentView();
        break;
      case "adopt-itinerary": adoptItinerary(button.dataset.id); break;
      case "copy-itinerary": await copyItinerary(button.dataset.id); break;
      case "export-blueprint-doc": exportBlueprintDoc(button.dataset.id); break;
      case "export-blueprint-txt": exportBlueprintTxt(button.dataset.id); break;
      case "go-plan": navigate("plan"); break;
      case "go-safety": navigate("safety"); break;
      case "discover-city":
        ui.discover.city = button.dataset.city || "";
        ui.discover.type = "all";
        ui.discover.query = "";
        navigate("discover");
        break;
      case "clear-discover-filters":
        ui.discover = { type: "all", city: "", query: "", limit: 18 };
        renderCurrentView();
        break;
      case "show-more":
        ui.discover.limit += 18;
        renderDiscoverResults();
        break;
      case "toggle-save": toggleSaved(button.dataset.type, button.dataset.id); break;
      case "show-detail": showDetail(button.dataset.type, button.dataset.id); break;
      case "add-to-plan": {
        const item = getCatalogItem(button.dataset.type, button.dataset.id);
        if (item) openPlanItemModal({ item, type: button.dataset.type });
        break;
      }
      case "open-plan-item": openPlanItemModal({ date: button.dataset.date || "", type: button.dataset.type || "" }); break;
      case "edit-plan-item": {
        const existing = state.itinerary.find((item) => item.id === button.dataset.id);
        if (existing) openPlanItemModal({ existing });
        break;
      }
      case "delete-plan-item": deletePlanItem(button.dataset.id); break;
      case "close-modal": closeModal(); break;
      case "copy-brief": await copyPlanningBrief(); break;
      case "export-plan": exportPlan(); break;
      case "export-plan-doc": exportPlanDoc(); break;
      case "export-plan-txt": exportPlanTxt(); break;
      case "export-offline-pack": exportOfflinePack(); break;
      case "add-template": addPlanTemplate(button.dataset.template); break;
      case "toggle-weather": ui.weatherMode = ui.weatherMode === "rain" ? "normal" : "rain"; renderCurrentView(); break;
      case "duplicate-scenario": duplicateScenario(); break;
      case "set-pace": setPacePreset(button.dataset.pace); break;
      case "add-reminder": addReminder(); break;
      case "toggle-reminder": toggleReminder(button.dataset.id); break;
      case "delete-reminder": deleteReminder(button.dataset.id); break;
      case "print-compact": printView("printing-compact"); break;
      case "print-transfers": printView("printing-transfers"); break;
      case "print-food": printView("printing-food"); break;
      case "print-essentials": printView("printing-essentials"); break;
      case "export-handoff": exportHandoff(); break;
      case "refresh-research": refreshResearch(); break;
      case "import-plan": openImportModal(); break;
      case "clear-saved": clearSaved(); break;
      case "print": window.print(); break;
      case "print-plan": printView("printing-plan"); break;
      case "print-itinerary": printView("printing-itinerary"); break;
      case "export-ics": exportIcs(); break;
      case "export-csv": exportCsv(); break;
      case "jump-airport": document.querySelector("#airport-options")?.scrollIntoView({ behavior: "smooth", block: "start" }); break;
      case "jump-cards": document.querySelector("#cards-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }); break;
      case "jump-apps": document.querySelector("#apps-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }); break;
      default: break;
    }
  }

  function selectedBlueprint(id) {
    return (catalog.itineraryBlueprints || []).find((item) => item.id === id) || null;
  }

  function adoptItinerary(id) {
    const blueprint = selectedBlueprint(id);
    if (!blueprint) {
      showToast("That route blueprint is not available in this catalog.", "warning");
      return;
    }
    if (state.itinerary.length && !window.confirm(`Replace your current editable plan with the ${blueprint.shortTitle} blueprint? Your saved ideas and checklist progress will remain.`)) return;
    const days = Array.isArray(blueprint.days) ? blueprint.days : [];
    if (!days.length) {
      showToast("This route does not have day details to load.", "warning");
      return;
    }
    const cities = [...new Set((blueprint.bases || []).map((base) => base.city).filter(Boolean))];
    const firstDate = days[0].date;
    const lastDate = days[days.length - 1].date;
    state.profile = {
      ...state.profile,
      startDate: validDate(firstDate) ? firstDate : state.profile.startDate,
      endDate: validDate(lastDate) ? lastDate : state.profile.endDate,
      cities,
    };
    state.itinerary = days.map((day) => ({
      id: `blueprint-${blueprint.id}-${day.date}`,
      date: day.date,
      time: "",
      title: day.title,
      city: day.city === "Seoul / ICN" ? "Seoul" : day.city,
      type: /Transfer|Arrival|Departure/.test(day.phase || "") ? "Transit" : "Visit",
      notes: blueprintDayNote(day),
      referenceType: "",
      referenceId: "",
      createdAt: new Date().toISOString(),
    }));
    persistState();
    navigate("plan");
    showToast(`${blueprint.shortTitle} is now loaded as your editable plan.`);
  }

  function blueprintDayNote(day) {
    const schedule = (day.schedule || []).map((item) => `${item.time} — ${item.title}: ${item.detail}${item.logistics ? ` (${item.logistics})` : ""}`).join("\n");
    const blocks = (day.blocks || []).map((block) => `${block.label}: ${block.text}`).join("\n");
    return [
      `Anchor: ${day.anchor}`,
      schedule ? `Target schedule:\n${schedule}` : "",
      blocks ? `Why this sequence works:\n${blocks}` : "",
      day.reservationNote ? `Reserve / verify: ${day.reservationNote}` : "",
      day.costNote ? `Cost posture: ${day.costNote}` : "",
      day.food ? `Food rhythm: ${day.food}` : "",
      day.watchouts ? `Watch for: ${day.watchouts}` : "",
      day.planB ? `Plan B: ${day.planB}` : "",
    ].filter(Boolean).join("\n\n");
  }

  async function copyItinerary(id) {
    const blueprint = selectedBlueprint(id);
    if (!blueprint) return;
    const copied = await copyText(buildItineraryBrief(blueprint));
    showToast(copied ? "Detailed route blueprint copied." : "Could not copy automatically. Try exporting your editable plan instead.", copied ? "" : "warning");
  }

  function buildItineraryBrief(blueprint) {
    const trip = catalog.itineraryBlueprintMeta?.trip || {};
    const lines = [
      `# ${blueprint.title}`,
      "",
      `Route: ${blueprint.routeLabel}`,
      `Arrival: ${formatDate(trip.arrival?.date)} at ${trip.arrival?.time || "21:00"} · ${trip.arrival?.airport || "ICN"}`,
      `Departure: ${formatDate(trip.departure?.date)} at ${trip.departure?.time || "13:00"} · ${trip.departure?.airport || "ICN"}`,
      `Nights: ${trip.nights || 21}`,
      trip.flightReconciliation ? `Flight-date note: ${trip.flightReconciliation}` : "",
      "",
      "## Why this route",
      blueprint.recommendation || blueprint.decisionSummary,
      "",
      blueprint.decisionSummary,
      "",
      "## Hotel-base strategy",
      ...(blueprint.bases || []).map((base) => `- ${base.city}: ${base.dates} (${base.nights} nights) — ${base.recommendedArea}. ${base.why}`),
      "",
      "## Day-by-day",
      ...(blueprint.days || []).flatMap((day) => [
        `### ${formatDate(day.date)} · ${day.city}`,
        `**${day.title}**`,
        `Stay: ${day.stay}`,
        `Anchor: ${day.anchor}`,
        ...(day.schedule || []).map((item) => `- **${item.time} · ${item.title}:** ${item.detail}${item.logistics ? ` ${item.logistics}` : ""}`),
        ...(day.blocks || []).map((block) => `- **Why this sequence works — ${block.label}:** ${block.text}`),
        `- **Food rhythm:** ${day.food}`,
        `- **Reserve / verify:** ${day.reservationNote || "Check live details."}`,
        `- **Cost posture:** ${day.costNote || "Use current official prices."}`,
        `- **Watch for:** ${day.watchouts}`,
        `- **Plan B:** ${day.planB}`,
        "",
      ]),
      "## Verify before booking",
      "- Live KTX timetable, release window, seat availability, and actual station/last-mile connections.",
      "- Hotel late check-in, current prices, room type, neighborhood, and airport-transfer fit.",
      "- Opening days/hours, event dates/status, weather, air quality, and all entry/emergency information.",
    ];
    return lines.join("\n");
  }

  function openProfileModal() {
    const cityChoices = catalog.cities.map((city) => `<label class="city-choice"><input type="checkbox" name="cities" value="${e(city.name)}" ${state.profile.cities.includes(city.name) ? "checked" : ""}><span>${e(city.name)}</span></label>`).join("");
    openModal({
      title: "Set up your trip",
      subtitle: "This only shapes your private workspace. You can change every field later.",
      body: `<form id="profile-form">
        <div class="form-grid">
          <div class="field full"><label for="trip-name">Trip name</label><input class="input" id="trip-name" name="name" maxlength="90" value="${e(state.profile.name)}" placeholder="My Korea trip" autofocus></div>
          <div class="field"><label for="trip-start">Start date <span class="muted">(optional)</span></label><input class="input" id="trip-start" name="startDate" type="date" value="${e(state.profile.startDate)}"></div>
          <div class="field"><label for="trip-end">End date <span class="muted">(optional)</span></label><input class="input" id="trip-end" name="endDate" type="date" value="${e(state.profile.endDate)}"></div>
          <div class="field"><label for="trip-travelers">Travelers</label><input class="input" id="trip-travelers" name="travelers" type="number" min="1" max="20" value="${state.profile.travelers}"></div>
          <div class="field"><label>Timeline behavior</label><div class="input" style="display:flex;align-items:center;color:var(--ink-soft);font-size:12px">Dates only create a flexible view</div></div>
          <div class="field"><label for="trip-walking">Walking tolerance</label><select class="select" id="trip-walking" name="walking"><option value="low" ${state.profile.walking === "low" ? "selected" : ""}>Lower walking</option><option value="medium" ${state.profile.walking === "medium" ? "selected" : ""}>Moderate walking</option><option value="high" ${state.profile.walking === "high" ? "selected" : ""}>Walking is welcome</option></select></div>
          <div class="field"><label for="trip-pace">Preferred pace</label><select class="select" id="trip-pace" name="pace"><option value="slow" ${state.profile.pace === "slow" ? "selected" : ""}>Slow and flexible</option><option value="balanced" ${state.profile.pace === "balanced" ? "selected" : ""}>Balanced</option><option value="full" ${state.profile.pace === "full" ? "selected" : ""}>Full sightseeing</option></select></div>
          <div class="field full"><label>Cities you are considering</label><div class="city-selector">${cityChoices}</div><p class="form-help">Pick as many or as few as you want. These are filters and route signals, not hotel or transport commitments.</p></div>
        </div>
        <div class="modal-footer"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button" type="submit">Save trip setup</button></div>
      </form>`,
    });
  }

  function submitProfile(form) {
    const data = new FormData(form);
    const startDate = String(data.get("startDate") || "");
    const endDate = String(data.get("endDate") || "");
    if ((startDate && !endDate) || (!startDate && endDate)) {
      showToast("Add both dates to build the day-by-day timeline, or leave both blank for now.", "warning");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      showToast("Your end date needs to be on or after your start date.", "error");
      return;
    }
    state.profile = {
      name: cleanText(data.get("name") || "My Korea trip", 90) || "My Korea trip",
      startDate: validDate(startDate) ? startDate : "",
      endDate: validDate(endDate) ? endDate : "",
      travelers: clampInteger(data.get("travelers"), 1, 20, 2),
      walking: ["low", "medium", "high"].includes(String(data.get("walking"))) ? String(data.get("walking")) : "medium",
      pace: ["slow", "balanced", "full"].includes(String(data.get("pace"))) ? String(data.get("pace")) : "balanced",
      interests: state.profile.interests || [],
      cities: [...data.getAll("cities")].map((city) => cleanText(city, 50)),
    };
    persistState();
    closeModal();
    renderCurrentView();
    showToast("Trip setup saved on this device.");
  }

  function openPlanItemModal({ item = null, type = "", date = "", existing = null } = {}) {
    const isEdit = Boolean(existing);
    const record = existing || {};
    const planKinds = ["Visit", "Event", "Activity", "Food", "Stay", "Transit", "Booking", "Note"];
    const inferredType = TYPE_META[type] ? TYPE_META[type].planType : (planKinds.includes(type) ? type : "Note");
    const defaultDate = record.date || date || (validDate(state.profile.startDate) ? state.profile.startDate : "");
    const title = record.title || (item ? itemTitle(item, type) : "");
    const city = record.city || (item ? itemCity(item, type) : "");
    const note = record.notes || (item ? planNote(item, type) : "");
    const formCities = [...new Set(["", ...catalog.cities.map((entry) => entry.name), ...catalog.events.map((entry) => entry.city), "Daejeon / Cheonan"].filter(Boolean))];
    const cityOptions = [`<option value="">No city / transit note</option>`, ...formCities.filter(Boolean).map((entry) => `<option value="${e(entry)}" ${city === entry ? "selected" : ""}>${e(entry)}</option>`)].join("");
    const types = ["Visit", "Event", "Activity", "Food", "Stay", "Transit", "Booking", "Note"];
    const planType = record.type || inferredType;

    openModal({
      title: isEdit ? "Edit plan item" : "Add to my plan",
      subtitle: "A plan item is only a placeholder until you make it real. Keep it simple.",
      body: `<form id="plan-item-form">
        <input type="hidden" name="id" value="${e(record.id || "")}">
        <input type="hidden" name="referenceType" value="${e(record.referenceType || (item ? type : ""))}">
        <input type="hidden" name="referenceId" value="${e(record.referenceId || (item ? item.id : ""))}">
        <div class="form-grid">
          <div class="field"><label for="plan-date">Date <span class="muted">(optional)</span></label><input class="input" id="plan-date" name="date" type="date" value="${e(defaultDate)}"></div>
          <div class="field"><label for="plan-time">Time <span class="muted">(optional)</span></label><input class="input" id="plan-time" name="time" type="time" value="${e(record.time || "")}"></div>
          <div class="field full"><label for="plan-title">What is it?</label><input class="input" id="plan-title" name="title" required maxlength="180" value="${e(title)}" placeholder="Example: Explore the palace area" autofocus></div>
          <div class="field"><label for="plan-city">City / area</label><select class="select" id="plan-city" name="city">${cityOptions}</select></div>
          <div class="field"><label for="plan-type">Kind of plan item</label><select class="select" id="plan-type" name="type">${types.map((entry) => `<option value="${entry}" ${planType === entry ? "selected" : ""}>${entry}</option>`).join("")}</select></div>
          <div class="field"><label for="plan-neighborhood">Neighborhood <span class="muted">(optional)</span></label><input class="input" id="plan-neighborhood" name="neighborhood" maxlength="90" value="${e(record.neighborhood || (item?.neighborhood || ""))}" placeholder="Myeongdong, Haeundae…"></div>
          <div class="field"><label for="plan-energy">Energy level</label><select class="select" id="plan-energy" name="energy">${["low", "medium", "high"].map((entry) => `<option value="${entry}" ${(record.energy || "medium") === entry ? "selected" : ""}>${entry[0].toUpperCase() + entry.slice(1)}</option>`).join("")}</select></div>
          <div class="field"><label for="plan-duration">Estimated duration <span class="muted">(optional)</span></label><input class="input" id="plan-duration" name="duration" maxlength="40" value="${e(record.duration || "")}" placeholder="2 hours"></div>
          <div class="field"><label class="check-inline" style="margin-top:25px"><input type="checkbox" name="indoor" ${record.indoor ? "checked" : ""}><span>Indoor / rain-friendly</span></label></div>
          <div class="field"><label for="plan-meal-type">Meal slot <span class="muted">(optional)</span></label><select class="select" id="plan-meal-type" name="mealType"><option value="">Not a meal</option>${["Breakfast", "Lunch", "Dinner", "Café", "Late night"].map((entry) => `<option value="${entry}" ${(record.mealType || "") === entry ? "selected" : ""}>${entry}</option>`).join("")}</select></div>
          <div class="field"><label for="plan-window">Recommended window <span class="muted">(optional)</span></label><input class="input" id="plan-window" name="recommendedWindow" maxlength="80" value="${e(record.recommendedWindow || "")}" placeholder="Morning / after 17:00"></div>
          <div class="field"><label class="check-inline" style="margin-top:25px"><input type="checkbox" name="reservationRequired" ${record.reservationRequired ? "checked" : ""}><span>Reservation / ticket needed</span></label></div>
          <div class="field full"><label for="plan-closure">Closure or verification note <span class="muted">(optional)</span></label><input class="input" id="plan-closure" name="closureNote" maxlength="180" value="${e(record.closureNote || "")}" placeholder="Closed Tuesdays; verify 2026 hours"></div>
          <div class="field full"><label for="plan-notes">Note <span class="muted">(optional)</span></label><textarea class="textarea" id="plan-notes" name="notes" maxlength="2000" placeholder="Reservation number, opening hours to check, who is going, backup idea…">${e(note)}</textarea><p class="form-help">Use a note for confirmation numbers or anything you will be glad to find later. It is stored only in this browser until you export it.</p></div>
        </div>
        <div class="modal-footer"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button" type="submit">${isEdit ? "Save changes" : "Add to plan"}</button></div>
      </form>`,
    });
  }

  function planNote(item, type) {
    if (type === "event") return [item.venue, item.status ? `Source status: ${item.status}` : ""].filter(Boolean).join(" · ");
    if (type === "food") return [item.neighborhood, item.koreanName].filter(Boolean).join(" · ");
    if (type === "route") return [item.mode, item.duration].filter(Boolean).join(" · ");
    if (type === "hotel") return [item.neighborhood, formatHotelPrice(item)].filter(Boolean).join(" · ");
    if (type === "place") return item.nearest_station || "";
    return item.snippet || "";
  }

  function submitPlanItem(form) {
    const data = new FormData(form);
    const title = cleanText(data.get("title"), 180);
    if (!title) {
      showToast("Give this plan item a short title first.", "warning");
      return;
    }
    const id = cleanText(data.get("id"), 100) || uniqueId("plan");
    const newItem = {
      id,
      date: validDate(data.get("date")) ? String(data.get("date")) : "",
      time: /^\d{2}:\d{2}$/.test(String(data.get("time") || "")) ? String(data.get("time")) : "",
      title,
      city: cleanText(data.get("city"), 70),
      type: cleanText(data.get("type") || "Note", 40),
      notes: cleanText(data.get("notes"), 2000),
      neighborhood: cleanText(data.get("neighborhood"), 90),
      energy: ["low", "medium", "high"].includes(String(data.get("energy"))) ? String(data.get("energy")) : "medium",
      duration: cleanText(data.get("duration"), 40),
      indoor: data.get("indoor") === "on",
      mealType: cleanText(data.get("mealType"), 40),
      recommendedWindow: cleanText(data.get("recommendedWindow"), 80),
      closureNote: cleanText(data.get("closureNote"), 180),
      reservationRequired: data.get("reservationRequired") === "on",
      referenceType: TYPE_META[data.get("referenceType")] ? String(data.get("referenceType")) : "",
      referenceId: cleanText(data.get("referenceId"), 180),
      createdAt: new Date().toISOString(),
    };
    const existingIndex = state.itinerary.findIndex((item) => item.id === id);
    if (existingIndex > -1) state.itinerary.splice(existingIndex, 1, { ...state.itinerary[existingIndex], ...newItem });
    else state.itinerary.push(newItem);
    persistState();
    closeModal();
    renderCurrentView();
    showToast(existingIndex > -1 ? "Plan item updated." : "Added to your plan.");
  }

  function deletePlanItem(id) {
    const item = state.itinerary.find((entry) => entry.id === id);
    if (!item) return;
    if (!window.confirm(`Remove “${item.title}” from your plan?`)) return;
    state.itinerary = state.itinerary.filter((entry) => entry.id !== id);
    persistState();
    renderCurrentView();
    showToast("Plan item removed.");
  }

  function showDetail(type, id) {
    const item = getCatalogItem(type, id);
    if (!item) {
      showToast("That source record is no longer available in this catalog.", "warning");
      return;
    }
    const title = itemTitle(item, type);
    const description = itemDescription(item, type);
    const facts = itemFacts(item, type);
    const url = itemUrl(item, type);
    const sourcePath = item.sourcePath || sourcePathForType(type);
    const planable = ["place", "event", "activity", "food", "hotel", "route"].includes(type);
    openModal({
      title: "Source detail",
      wide: true,
      subtitle: "Use this as a research card, then verify live details with the official provider.",
      body: `<span class="detail-modal-type">${e(TYPE_META[type].label)}</span><h2 class="detail-modal-title">${e(title)}</h2><p class="detail-modal-lede">${e(description)}</p>
      ${item.status ? `<div style="margin-bottom:12px">${statusBadge(item.status)}${item.statusDetail ? ` <span class="text-note" style="margin-left:5px">${e(item.statusDetail)}</span>` : ""}</div>` : ""}
      <div class="detail-facts">${facts.map((fact) => `<div class="detail-fact"><span>${e(fact.label)}</span><strong>${e(fact.value)}</strong></div>`).join("")}</div>
      ${renderDetailExtra(item, type)}
      <div class="detail-source">Imported from <code>${e(sourcePath || "source catalog")}</code>. ${sourcePath ? `<a class="source-link" href="${e(safeUrl(sourcePath))}" target="_blank" rel="noreferrer">Open local source snapshot →</a>` : ""}</div>
      <div class="modal-footer"><button class="button button-quiet" type="button" data-action="close-modal">Close</button>${planable ? `<button class="button button-soft" type="button" data-action="add-to-plan" data-type="${type}" data-id="${e(item.id)}">Add to plan</button>` : ""}${url ? `<a class="button" href="${e(safeUrl(url))}" target="_blank" rel="noreferrer">${type === "food" ? "Open map" : "Open official link"} ↗</a>` : ""}</div>`,
    });
  }

  function itemFacts(item, type) {
    switch (type) {
      case "place": return [
        { label: "City", value: item.city },
        { label: "Category", value: item.category },
        { label: "Nearest transit", value: item.nearest_station || "Check source" },
        { label: "Source estimate", value: item.est_cost_two_travelers_krw ? `${formatKrw(item.est_cost_two_travelers_krw)} for two` : "Not listed" },
      ];
      case "event": return [
        { label: "Dates", value: formatDateRange(item.startDate, item.endDate) },
        { label: "City / venue", value: [item.city, item.venue].filter(Boolean).join(" · ") || "Check source" },
        { label: "Price", value: item.price || "Check official listing" },
        { label: "Hours", value: item.hours || "Check official listing" },
      ];
      case "activity": return [
        { label: "City", value: item.city },
        { label: "Guide section", value: item.category || "Ideas" },
        { label: "Source status", value: item.status || "Idea" },
        { label: "Research reference", value: item.sourceLabel || "KoreaFun" },
      ];
      case "food": return [
        { label: "City", value: item.city },
        { label: "Neighborhood", value: item.neighborhood || "Check map" },
        { label: "Category", value: item.category || "Food" },
        { label: "Price tier", value: item.priceTier || "Not listed" },
      ];
      case "hotel": return [
        { label: "City / area", value: [item.city, item.area].filter(Boolean).join(" · ") },
        { label: "Source nightly price", value: formatHotelPrice(item) },
        { label: "Check-in / out", value: [item.checkIn, item.checkOut].filter(Boolean).join(" / ") || "Check provider" },
        { label: "Transit", value: item.stationWalkTime || item.neighborhood || "Check provider" },
      ];
      case "route": return [
        { label: "Mode", value: item.mode || "Transit" },
        { label: "Duration", value: item.duration || "Check timetable" },
        { label: "Source fare", value: item.cost_krw_per_person ? `${formatKrw(item.cost_krw_per_person)} per person` : "Check provider" },
        { label: "Beginner fit", value: item.beginner_friendliness || "Not rated" },
      ];
      case "saving": return [
        { label: "Topic", value: item.category || "Savings" },
        { label: "Source", value: "Korea research guide" },
        { label: "Action", value: "Verify terms and eligibility" },
      ];
      default: return [];
    }
  }

  function renderDetailExtra(item, type) {
    if (type === "hotel") {
      const rooms = Array.isArray(item.rooms) ? item.rooms.slice(0, 3).map((room) => `${room.name}${room.price ? ` (${room.price})` : ""}`).join(" · ") : "";
      return rooms ? `<div class="detail-source" style="margin-bottom:11px"><strong>Room notes in source:</strong> ${e(rooms)}</div>` : "";
    }
    if (type === "event" && item.officialSources) return `<div class="detail-source" style="margin-bottom:11px"><strong>Source listing(s):</strong> ${e(item.officialSources)}</div>`;
    if (type === "route" && item.sf_japan_comparison) return `<div class="detail-source" style="margin-bottom:11px"><strong>Familiar comparison:</strong> ${e(item.sf_japan_comparison)}</div>`;
    if (type === "place" && item.transit_card_used) return `<div class="detail-source" style="margin-bottom:11px"><strong>Transit note:</strong> ${e(item.transit_card_used)}</div>`;
    return "";
  }

  function openImportModal() {
    openModal({
      title: "Import a Korea Compass plan",
      subtitle: "Import a JSON export from this planner. It replaces the current local plan after confirmation.",
      body: `<form id="import-form"><div class="field"><label for="import-file">Korea Compass JSON file</label><input class="input" id="import-file" name="file" type="file" accept="application/json,.json" required><p class="form-help">Only planner exports are supported. Nothing is uploaded; the file is read in your browser.</p></div><div class="modal-footer"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button" type="submit">Import and replace</button></div></form>`,
    });
  }

  async function importPlan(form) {
    const input = form.querySelector('input[type="file"]');
    const file = input?.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const importedState = parsed.state || parsed;
      const nextState = normalizeState(importedState);
      if (!window.confirm("Replace the current local Korea Compass plan with this import?")) return;
      state = nextState;
      persistState();
      closeModal();
      renderCurrentView();
      showToast("Plan imported into this browser.");
    } catch (error) {
      console.error(error);
      showToast("That file is not a readable Korea Compass JSON export.", "error");
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function refreshResearch() {
    if (navigator.onLine === false) { showToast("You are offline. Cached research remains available.", "warning"); return; }
    showToast("Refreshing the research catalog…");
    try {
      const response = await fetch(new URL("data/index.json", DATA_BASE).href, { cache: "reload" });
      if (!response.ok) throw new Error("refresh failed");
      catalog = await response.json();
      Object.keys(LAZY_COLLECTIONS).forEach((name) => { catalog[name] = []; delete collectionPromises[name]; });
      await showView(currentView);
      showToast("Research catalog refreshed. Open a collection to update its cached data.");
    } catch (error) {
      showToast("Research refresh failed. Cached data is still available.", "warning");
    }
  }

  function exportPlan() {
    const payload = {
      format: "korea-compass-plan/v1",
      exportedAt: new Date().toISOString(),
      note: "This file contains only the local trip setup, saved ideas, checklist states, and plan items — not the full research catalog.",
      state,
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `${slug(state.profile.name || "korea-trip")}-korea-compass-plan.json`);
    showToast("Your local plan was exported as JSON.");
  }

  function planExportText() {
    const items = sortedPlanItems();
    const lines = [
      state.profile.name || "Korea trip",
      profileDateLabel(),
      `${state.profile.travelers} ${state.profile.travelers === 1 ? "traveler" : "travelers"}`,
      "",
      ...(!items.length ? ["No plan items yet."] : items.map((item) => [
        `${item.date || "Undated"}${item.time ? ` ${item.time}` : ""} — ${item.title}`,
        [item.type, item.city, item.notes].filter(Boolean).join(" · "),
      ].filter(Boolean).join("\n"))),
    ];
    return lines.join("\n");
  }

  function exportPlanTxt() {
    downloadBlob(new Blob([planExportText()], { type: "text/plain;charset=utf-8" }), `${slug(state.profile.name || "korea-trip")}-plan.txt`);
    showToast("Your editable plan was exported as plain text.");
  }

  function exportPlanDoc() {
    const items = sortedPlanItems();
    const rows = items.map((item) => `<tr><td>${e(item.date || "Undated")}</td><td>${e(item.time || "")}</td><td><strong>${e(item.title)}</strong><br><small>${e([item.type, item.city, item.notes].filter(Boolean).join(" · "))}</small></td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${e(state.profile.name || "Korea trip")}</title><style>body{font-family:Arial,sans-serif;color:#14221f}h1{color:#14332d}table{border-collapse:collapse;width:100%}td{border:1px solid #ccd5ce;padding:8px;vertical-align:top}small{color:#52615c}</style></head><body><h1>${e(state.profile.name || "Korea trip")}</h1><p>${e(profileDateLabel())} · ${state.profile.travelers} ${state.profile.travelers === 1 ? "traveler" : "travelers"}</p><table><thead><tr><th>Date</th><th>Time</th><th>Plan item</th></tr></thead><tbody>${rows || `<tr><td colspan="3">No plan items yet.</td></tr>`}</tbody></table></body></html>`;
    downloadBlob(new Blob([html], { type: "application/msword" }), `${slug(state.profile.name || "korea-trip")}-plan.doc`);
    showToast("Your editable plan was exported as a Word-compatible document.");
  }

  function exportBlueprintTxt(id) {
    const blueprint = selectedBlueprint(id);
    if (!blueprint) return;
    downloadBlob(new Blob([buildItineraryBrief(blueprint)], { type: "text/plain;charset=utf-8" }), `${slug(blueprint.shortTitle || blueprint.title)}.txt`);
    showToast("The complete route blueprint was exported as plain text.");
  }

  function exportBlueprintDoc(id) {
    const blueprint = selectedBlueprint(id);
    if (!blueprint) return;
    const text = buildItineraryBrief(blueprint);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${e(blueprint.title)}</title><style>body{font-family:Arial,sans-serif;color:#14221f;line-height:1.45}h1{color:#14332d}pre{white-space:pre-wrap;font:12px Arial,sans-serif}</style></head><body><h1>${e(blueprint.title)}</h1><pre>${e(text)}</pre></body></html>`;
    downloadBlob(new Blob([html], { type: "application/msword" }), `${slug(blueprint.shortTitle || blueprint.title)}.doc`);
    showToast("The complete route blueprint was exported as a Word-compatible document.");
  }

  function exportIcs() {
    const dated = sortedPlanItems().filter((item) => item.date);
    if (!dated.length) {
      showToast("Add at least one dated plan item before exporting a calendar file.", "warning");
      return;
    }
    const escape = (value) => String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");
    const fold = (line) => {
      const out = [];
      let current = line;
      while ([...current].length > 74) {
        const chars = [...current];
        out.push(chars.slice(0, 74).join(""));
        current = ` ${chars.slice(74).join("")}`;
      }
      out.push(current);
      return out.join("\r\n");
    };
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const events = dated.map((item) => {
      const compactDate = item.date.replace(/-/g, "");
      const start = item.time
        ? `DTSTART:${compactDate}T${item.time.replace(":", "")}00`
        : `DTSTART;VALUE=DATE:${compactDate}`;
      const endDate = item.time ? "" : toIsoDate(new Date(parseDate(item.date).getTime() + 86400000));
      const end = item.time ? "" : `DTEND;VALUE=DATE:${endDate.replace(/-/g, "")}`;
      const description = escape([item.type, item.notes].filter(Boolean).join("\n"));
      return [
        "BEGIN:VEVENT",
        `UID:${escape(item.id)}@korea-compass`,
        `DTSTAMP:${stamp}`,
        start,
        end,
        `SUMMARY:${escape(item.title)}`,
        item.city ? `LOCATION:${escape(item.city)}` : "",
        description ? `DESCRIPTION:${description}` : "",
        "END:VEVENT",
      ].filter(Boolean);
    }).flat();
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Korea Compass//Master trip planner//EN",
      "CALSCALE:GREGORIAN",
      `X-WR-CALNAME:${escape(state.profile.name || "Korea trip")}`,
      ...events,
      "END:VCALENDAR",
    ].map(fold).join("\r\n");
    downloadBlob(new Blob([lines], { type: "text/calendar;charset=utf-8" }), `${slug(state.profile.name || "korea-trip")}.ics`);
    showToast(`${dated.length} dated plan ${dated.length === 1 ? "item" : "items"} exported as a calendar file.`);
  }

  function exportCsv() {
    const items = sortedPlanItems();
    if (!items.length) {
      showToast("Your plan is empty — add an item before exporting CSV.", "warning");
      return;
    }
    const csvEscape = (value) => {
      const text = String(value ?? "");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
    };
    const rows = [
      ["date", "time", "title", "type", "city", "notes"],
      ...items.map((item) => [item.date, item.time, item.title, item.type, item.city, item.notes]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    downloadBlob(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }), `${slug(state.profile.name || "korea-trip")}-plan.csv`);
    showToast(`${items.length} plan ${items.length === 1 ? "item" : "items"} exported as CSV.`);
  }

  function printView(mode) {
    const details = [...app.querySelectorAll("details")];
    const wasOpen = details.map((node) => node.open);
    details.forEach((node) => { node.open = true; });
    document.body.classList.add(mode);
    const cleanup = () => {
      window.removeEventListener("afterprint", cleanup);
      document.body.classList.remove(mode);
      details.forEach((node, index) => { node.open = wasOpen[index]; });
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  async function copyPlanningBrief() {
    const text = buildPlanningBrief();
    const copied = await copyText(text);
    showToast(copied ? "Planning brief copied — ready to paste or share." : "Could not copy automatically. Try exporting your plan instead.", copied ? "" : "warning");
  }

  function buildPlanningBrief() {
    const cities = state.profile.cities.length ? state.profile.cities.join(", ") : "Not chosen yet";
    const plan = sortedPlanItems();
    const saved = resolveSavedItems();
    const lines = [
      "# Korea trip planning brief",
      "",
      `Trip: ${state.profile.name || "My Korea trip"}`,
      `Dates: ${profileDateLabel()}`,
      `Travelers: ${state.profile.travelers}`,
      `Cities being considered: ${cities}`,
      "",
      "## Current plan",
      ...(plan.length ? plan.map((item) => `- ${[item.date || "Undated", item.time, item.title, item.city, item.notes].filter(Boolean).join(" · ")}`) : ["- No plan items yet."]),
      "",
      "## Saved research ideas",
      ...(saved.length ? saved.slice(0, 35).map(({ item, type }) => `- [${TYPE_META[type].label}] ${itemTitle(item, type)}${itemCity(item, type) ? ` — ${itemCity(item, type)}` : ""}`) : ["- No saved ideas yet."]),
      "",
      "## Workspace note",
      `- This brief comes from Korea Compass. Its library includes ${formatNumber(catalog.meta.counts.food)} food bookmarks, ${formatNumber(catalog.meta.counts.events)} dated events, ${formatNumber(catalog.meta.counts.hotels)} stay options, transit research, safety checklists, and source links. Verify time-sensitive details before booking.`,
    ];
    return lines.join("\n");
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.append(textArea);
      textArea.select();
      const copied = document.execCommand("copy");
      textArea.remove();
      return copied;
    } catch (error) {
      console.warn("Could not copy", error);
      return false;
    }
  }

  function clearSaved() {
    if (!state.saved.length) return;
    if (!window.confirm("Clear all saved ideas from this browser?")) return;
    state.saved = [];
    persistState();
    renderCurrentView();
    showToast("Saved ideas cleared.");
  }

  function toggleSaved(type, id) {
    const key = savedKey(type, id);
    const index = state.saved.indexOf(key);
    if (index > -1) {
      state.saved.splice(index, 1);
      showToast("Removed from saved ideas.");
    } else {
      state.saved.unshift(key);
      showToast("Saved to your private shortlist.");
    }
    persistState();
    if (currentView === "discover") renderDiscoverResults();
    else renderCurrentView();
    updateChrome();
  }

  function openModal({ title, subtitle = "", body, wide = false }) {
    modalRoot.hidden = false;
    modalRoot.innerHTML = `<div class="modal-dialog ${wide ? "modal-wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">${e(title)}</h2>${subtitle ? `<p>${e(subtitle)}</p>` : ""}</div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div><div class="modal-body">${body}</div></div>`;
    document.body.classList.add("modal-open");
    window.setTimeout(() => {
      const focusTarget = modalRoot.querySelector("[autofocus], input, button, select, textarea, a");
      focusTarget?.focus();
    }, 10);
  }

  function closeModal() {
    modalRoot.hidden = true;
    modalRoot.innerHTML = "";
    document.body.classList.remove("modal-open");
  }

  function showToast(message, kind = "") {
    const toast = document.createElement("div");
    toast.className = `toast ${kind}`;
    toast.textContent = message;
    toastRoot.append(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  function getCatalogItem(type, id) {
    const meta = TYPE_META[type];
    if (!meta || !catalog?.[meta.collection]) return null;
    return catalog[meta.collection].find((item) => String(item.id) === String(id)) || null;
  }

  function resolveSavedItems() {
    return state.saved.map((key) => {
      const [type, ...idParts] = key.split(":");
      const id = idParts.join(":");
      const item = getCatalogItem(type, id);
      return item ? { item, type } : null;
    }).filter(Boolean);
  }

  function featuredItems() {
    const places = catalog.places.slice(0, 2).map((item) => ({ item, type: "place" }));
    const event = catalog.events.find((item) => item.status === "Confirmed") || catalog.events[0];
    return [...places, ...(event ? [{ item: event, type: "event" }] : [])];
  }

  function savedKey(type, id) { return `${type}:${id}`; }
  function isSaved(type, id) { return state.saved.includes(savedKey(type, id)); }

  function selectedCities() {
    return state.profile.cities.map((name) => catalog.cities.find((city) => city.name === name) || { name, short: "City selected for your route.", label: "Considering" });
  }

  function sortedPlanItems() {
    return [...state.itinerary].sort((a, b) => {
      const aKey = `${a.date || "9999-12-31"} ${a.time || "99:99"} ${a.title}`;
      const bKey = `${b.date || "9999-12-31"} ${b.time || "99:99"} ${b.title}`;
      return aKey.localeCompare(bKey);
    });
  }

  function sortPlanByTime(a, b) { return `${a.time || "99:99"} ${a.title}`.localeCompare(`${b.time || "99:99"} ${b.title}`); }

  function hasTripDates() {
    return validDate(state.profile.startDate) && validDate(state.profile.endDate) && state.profile.endDate >= state.profile.startDate;
  }

  function getDateRange() {
    if (!hasTripDates()) return [];
    const start = parseDate(state.profile.startDate);
    const end = parseDate(state.profile.endDate);
    const dates = [];
    const cap = 62;
    for (let cursor = new Date(start); cursor <= end && dates.length < cap; cursor.setDate(cursor.getDate() + 1)) {
      dates.push(toIsoDate(cursor));
    }
    return dates;
  }

  function tripLength() { return getDateRange().length; }

  function profileDateLabel() {
    if (!hasTripDates()) return "Dates not set";
    return formatDateRange(state.profile.startDate, state.profile.endDate);
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
    const parsed = parseDate(value);
    return !Number.isNaN(parsed.getTime()) && toIsoDate(parsed) === value;
  }

  function parseDate(value) { return new Date(`${value}T12:00:00Z`); }
  function toIsoDate(date) { return date.toISOString().slice(0, 10); }

  function dateParts(value) {
    const date = parseDate(value);
    const parts = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", weekday: "short", timeZone: "UTC" }).formatToParts(date);
    const pick = (type) => parts.find((part) => part.type === type)?.value || "";
    return { month: pick("month"), day: pick("day"), weekday: pick("weekday") };
  }

  function formatDate(value) {
    if (!validDate(value)) return "Date to confirm";
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(parseDate(value));
  }

  function formatDateRange(start, end) {
    if (!validDate(start)) return "Date to confirm";
    if (!validDate(end) || end === start) return formatDate(start);
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear();
    const sameMonth = sameYear && startDate.getUTCMonth() === endDate.getUTCMonth();
    const formatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    if (sameMonth) {
      const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(startDate);
      return `${month} ${startDate.getUTCDate()}–${endDate.getUTCDate()}, ${startDate.getUTCFullYear()}`;
    }
    if (sameYear) {
      const startShort = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(startDate);
      const endShort = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(endDate);
      return `${startShort} – ${endShort}, ${startDate.getUTCFullYear()}`;
    }
    return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
  }

  function formatKrw(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `₩${number.toLocaleString("en-US")}` : "Check fare";
  }

  function formatHotelPrice(item) {
    if (Number.isFinite(Number(item.priceFrom)) && Number.isFinite(Number(item.priceTo))) return `$${Number(item.priceFrom)}–${Number(item.priceTo)}/night`;
    return item.priceNote || "Check live rate";
  }

  function formatNumber(value) { return Number(value || 0).toLocaleString("en-US"); }
  function shorten(value, length = 42) { const text = String(value || ""); return text.length > length ? `${text.slice(0, length - 1).trim()}…` : text; }
  function slug(value) { return String(value).toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "korea-trip"; }

  function itemUrl(item, type) {
    if (type === "food") return item.mapUrl;
    if (type === "hotel") return item.officialUrl || item.compareUrl;
    if (type === "place") return item.official_site;
    if (type === "route") return item.booking_site;
    if (type === "activity" || type === "saving") return item.officialUrl;
    if (type === "event") return firstHttpUrl(item.officialSources);
    return "";
  }

  function sourcePathForType(type) {
    const fallback = {
      place: "research/sources/transport/data/destinations.json",
      event: "research/sources/fun/events.csv",
      activity: "research/sources/fun/README.md",
      food: "research/sources/food/restaurants-bookmarks.csv",
      hotel: "research/sources/hotels/data/hotels.json",
      route: "research/sources/transport/data/routes.json",
      saving: "research/sources/korea/README.md",
    };
    return fallback[type] || "";
  }

  function firstHttpUrl(value) {
    const match = String(value || "").match(/https?:\/\/[^\s;,)]+/);
    return match ? match[0] : "";
  }

  function safeUrl(value) {
    if (!value) return "#";
    try {
      const url = new URL(String(value), window.location.href);
      if (["http:", "https:"].includes(url.protocol)) return url.href;
      if (url.origin === window.location.origin) return url.href;
    } catch (error) {
      // Fall through to an inert link.
    }
    return "#";
  }

  function e(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    }[character]));
  }
})();
