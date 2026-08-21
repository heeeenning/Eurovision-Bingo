// ---------------------------------------------------------------------------
// CONFIG — the things you should need to touch
// ---------------------------------------------------------------------------

// Replace with your real Formspree endpoints.
const FORMSPREE_ENDPOINT = "https://formspree.io/f/meajpbja"; // bingo picks
const PREDICTIONS_FORMSPREE_ENDPOINT = "https://formspree.io/f/meajpbja"; // predictions

// How many prompts a participant must select for bingo
const TARGET_COUNT = 24;

// Bingo submissions close at this moment; predictions open at this moment.
// Set them to the SAME value for a direct switch-over with no gap between them.
// Use ISO 8601 with an explicit UTC offset so this fires at the same
// real-world moment for every visitor, regardless of their own timezone
// setting (Germany is +02:00 during CEST / summer time).
const BINGO_CLOSE_AT = "2026-08-21T09:20:00+02:00";
const PREDICTIONS_OPEN_AT = "2026-08-21T09:25:00+02:00";

// How often (ms) to recheck the time, so the page switches phases on its own
// for anyone who leaves the tab open across the cutoff — no refresh needed.
const PHASE_CHECK_INTERVAL_MS = 15000;

// ---------------------------------------------------------------------------

const PREDICTION_FIELDS = [
  { key: "winner", labelKey: "fieldWinner" },
  { key: "place2", labelKey: "field2nd" },
  { key: "place3", labelKey: "field3rd" },
  { key: "place4", labelKey: "field4th" },
  { key: "place5", labelKey: "field5th" },
  { key: "last", labelKey: "fieldLast" },
  { key: "jury", labelKey: "fieldJury" },
  { key: "televote", labelKey: "fieldTelevote" },
];

// Winner + 2nd-5th place must all be different countries from each other.
// Last place / Jury winner / Televote winner stay independent of these (and
// of each other) — remove keys here if you want to loosen or extend this.
const TOP5_FIELD_KEYS = ["winner", "place2", "place3", "place4", "place5"];

const UI_STRINGS = {
  en: {
    title: "Eurovision Bingo",
    eyebrowBingo: "Pick your prompts",
    eyebrowClosed: "Submissions",
    eyebrowPredictions: "Enter your predictions",
    scoreboardLabel: "Selected",
    nameLabel: "Your name",
    namePlaceholder: "Type your name",
    submitIncomplete: (n) => `Pick ${n} more to submit`,
    submitNoName: "Enter your name to submit",
    submitReady: "Submit my card",
    submitting: "Submitting…",
    errorGeneric: "Something went wrong sending your picks. Please try again.",
    errorLoad: "Couldn't load the prompt list. Please refresh the page.",
    errorLoadCountries: "Couldn't load the country list. Please refresh the page.",
    successTitle: "You're in!",
    successBody: (name, n) => `Thanks ${name}, your ${n} picks are saved.`,
    closedTitle: "Submissions closed",
    closedBody: "Sorry, submission time is over.",
    closedBodyGap: (timeStr) => `Sorry, submission time is over. Predictions open at ${timeStr}.`,
    fieldWinner: "Winner",
    field2nd: "2nd place",
    field3rd: "3rd place",
    field4th: "4th place",
    field5th: "5th place",
    fieldLast: "Last place",
    fieldJury: "Jury winner",
    fieldTelevote: "Televote winner",
    fieldGermany: "Germany's final position",
    selectPlaceholder: "— select —",
    predictionsSubmitIncomplete: "Fill in all fields to submit",
    predictionsSubmitReady: "Submit my predictions",
    predictionsSuccessBody: (name) => `Thanks ${name}, your predictions are saved.`,
  },
  de: {
    title: "Eurovision Bingo",
    eyebrowBingo: "Wähle deine Felder",
    eyebrowClosed: "Abgabe",
    eyebrowPredictions: "Gib deine Prognose ab",
    scoreboardLabel: "Ausgewählt",
    nameLabel: "Dein Name",
    namePlaceholder: "Namen eingeben",
    submitIncomplete: (n) => `Noch ${n} auswählen`,
    submitNoName: "Bitte Namen eingeben",
    submitReady: "Karte abschicken",
    submitting: "Wird gesendet…",
    errorGeneric: "Beim Senden ist etwas schiefgelaufen. Bitte nochmal versuchen.",
    errorLoad: "Die Felder-Liste konnte nicht geladen werden. Bitte Seite neu laden.",
    errorLoadCountries: "Die Länderliste konnte nicht geladen werden. Bitte Seite neu laden.",
    successTitle: "Du bist dabei!",
    successBody: (name, n) => `Danke ${name}, deine ${n} Auswahlen wurden gespeichert.`,
    closedTitle: "Abgabe beendet",
    closedBody: "Tut uns leid, die Abgabefrist ist vorbei.",
    closedBodyGap: (timeStr) => `Tut uns leid, die Abgabefrist ist vorbei. Die Prognose-Abgabe öffnet um ${timeStr}.`,
    fieldWinner: "Sieger",
    field2nd: "2. Platz",
    field3rd: "3. Platz",
    field4th: "4. Platz",
    field5th: "5. Platz",
    fieldLast: "Letzter Platz",
    fieldJury: "Jury-Sieger",
    fieldTelevote: "Televoting-Sieger",
    fieldGermany: "Deutschlands Endplatzierung",
    selectPlaceholder: "— auswählen —",
    predictionsSubmitIncomplete: "Bitte alle Felder ausfüllen",
    predictionsSubmitReady: "Prognose abschicken",
    predictionsSuccessBody: (name) => `Danke ${name}, deine Prognose wurde gespeichert.`,
  },
};

const state = {
  lang: "de",
  phase: null,
  prompts: [],
  selected: new Set(),
  countries: [],
  predictions: {
    winner: "",
    place2: "",
    place3: "",
    place4: "",
    place5: "",
    last: "",
    jury: "",
    televote: "",
    germanyPos: "",
  },
  submitting: false,
};

const els = {};
let phaseInterval = null;

document.addEventListener("DOMContentLoaded", init);

function getPhase() {
  const now = new Date();
  if (now < new Date(BINGO_CLOSE_AT)) return "bingo";
  if (now < new Date(PREDICTIONS_OPEN_AT)) return "closed";
  return "predictions";
}

async function init() {
  els.app = document.getElementById("app");
  els.langButtons = document.querySelectorAll("[data-lang]");
  els.title = document.getElementById("pageTitle");
  els.eyebrow = document.getElementById("pageEyebrow");
  els.scoreboard = document.getElementById("scoreboard");
  els.scoreboardCount = document.getElementById("scoreboardCount");
  els.scoreboardLabel = document.getElementById("scoreboardLabel");
  els.progressFill = document.getElementById("progressFill");
  els.nameField = document.getElementById("nameField");
  els.nameInput = document.getElementById("nameInput");
  els.nameLabel = document.getElementById("nameLabel");
  els.promptList = document.getElementById("promptList");
  els.closedPanel = document.getElementById("closedPanel");
  els.predictionsForm = document.getElementById("predictionsForm");
  els.submitBar = document.getElementById("submitBar");
  els.submitBtn = document.getElementById("submitBtn");
  els.statusMsg = document.getElementById("statusMsg");

  els.langButtons.forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  await enterPhase(getPhase());

  phaseInterval = setInterval(() => {
    const newPhase = getPhase();
    if (newPhase !== state.phase) {
      enterPhase(newPhase);
    }
  }, PHASE_CHECK_INTERVAL_MS);
}

function t() {
  return UI_STRINGS[state.lang];
}

async function enterPhase(phase) {
  state.phase = phase;
  state.submitting = false;
  setStatus("", null);

  els.promptList.hidden = phase !== "bingo";
  els.closedPanel.hidden = phase !== "closed";
  els.predictionsForm.hidden = phase !== "predictions";
  els.scoreboard.hidden = phase !== "bingo";
  els.nameField.hidden = phase === "closed";
  els.submitBar.hidden = phase === "closed";

  renderStrings();

  if (phase === "bingo") {
    if (state.prompts.length === 0) {
      const ok = await loadPrompts();
      if (!ok) return;
    }
    renderPrompts();
    updateScoreboard();
    els.nameInput.oninput = updateBingoSubmitState;
    els.submitBtn.onclick = handleBingoSubmit;
    updateBingoSubmitState();
  } else if (phase === "closed") {
    renderClosedPanel();
  } else if (phase === "predictions") {
    if (state.countries.length === 0) {
      const ok = await loadCountries();
      if (!ok) return;
    }
    renderPredictionsForm();
    els.nameInput.oninput = updatePredictionsSubmitState;
    els.submitBtn.onclick = handlePredictionsSubmit;
    updatePredictionsSubmitState();
  }
}

function setLang(lang) {
  if (lang === state.lang) return;
  state.lang = lang;
  els.langButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.lang === lang));
  renderStrings();
  if (state.phase === "bingo") {
    renderPrompts();
    updateBingoSubmitState();
  } else if (state.phase === "predictions") {
    renderPredictionsForm();
    updatePredictionsSubmitState();
  } else if (state.phase === "closed") {
    renderClosedPanel();
  }
}

function renderStrings() {
  const s = t();
  els.title.textContent = s.title;
  els.eyebrow.textContent =
    state.phase === "bingo" ? s.eyebrowBingo : state.phase === "predictions" ? s.eyebrowPredictions : s.eyebrowClosed;
  els.scoreboardLabel.textContent = s.scoreboardLabel;
  els.nameLabel.textContent = s.nameLabel;
  els.nameInput.placeholder = s.namePlaceholder;
  document.documentElement.lang = state.lang;
}

// ---------------------------------------------------------------------------
// Bingo phase
// ---------------------------------------------------------------------------

async function loadPrompts() {
  try {
    const res = await fetch("prompts.json");
    if (!res.ok) throw new Error("bad response");
    const data = await res.json();
    state.prompts = data.prompts || [];
    return true;
  } catch (err) {
    els.promptList.innerHTML = `<div class="load-error">${t().errorLoad}</div>`;
    return false;
  }
}

function renderPrompts() {
  const lang = state.lang;
  els.promptList.innerHTML = "";
  state.prompts.forEach((p) => {
    const text = p[lang] || p.en;
    const row = document.createElement("label");
    row.className = "prompt-row";
    row.dataset.id = p.id;
    if (state.selected.has(p.id)) row.classList.add("selected");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.selected.has(p.id);
    checkbox.addEventListener("change", () => toggleSelection(p.id, row, checkbox));

    const body = document.createElement("div");
    body.className = "prompt-body";
    body.innerHTML = `
      <span class="prompt-title"><span class="prompt-id">${p.id}</span>${escapeHtml(text.title)}</span>
      <div class="prompt-desc">${escapeHtml(text.description)}</div>
    `;

    row.appendChild(checkbox);
    row.appendChild(body);
    els.promptList.appendChild(row);
  });
  applyMaxReachedState();
}

function toggleSelection(id, row, checkbox) {
  if (checkbox.checked) {
    if (state.selected.size >= TARGET_COUNT) {
      checkbox.checked = false;
      return;
    }
    state.selected.add(id);
    row.classList.add("selected");
  } else {
    state.selected.delete(id);
    row.classList.remove("selected");
  }
  updateScoreboard();
  updateBingoSubmitState();
  applyMaxReachedState();
}

function applyMaxReachedState() {
  const reached = state.selected.size >= TARGET_COUNT;
  document.querySelectorAll(".prompt-row").forEach((row) => {
    const checkbox = row.querySelector("input[type='checkbox']");
    if (!checkbox.checked) {
      checkbox.disabled = reached;
    } else {
      checkbox.disabled = false;
    }
  });
}

function updateScoreboard() {
  const count = state.selected.size;
  const complete = count === TARGET_COUNT;
  els.scoreboardCount.textContent = `${count} / ${TARGET_COUNT}`;
  els.scoreboardCount.classList.toggle("complete", complete);
  const pct = Math.min(100, (count / TARGET_COUNT) * 100);
  els.progressFill.style.width = `${pct}%`;
  els.progressFill.classList.toggle("complete", complete);
}

function updateBingoSubmitState() {
  const s = t();
  const count = state.selected.size;
  const name = els.nameInput.value.trim();
  const complete = count === TARGET_COUNT;

  if (state.submitting) {
    els.submitBtn.disabled = true;
    els.submitBtn.textContent = s.submitting;
    return;
  }

  if (!complete) {
    els.submitBtn.disabled = true;
    els.submitBtn.textContent = s.submitIncomplete(TARGET_COUNT - count);
  } else if (!name) {
    els.submitBtn.disabled = true;
    els.submitBtn.textContent = s.submitNoName;
  } else {
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = s.submitReady;
  }
}

async function handleBingoSubmit() {
  const s = t();
  const name = els.nameInput.value.trim();
  const ids = Array.from(state.selected);

  if (ids.length !== TARGET_COUNT || !name) return;

  state.submitting = true;
  updateBingoSubmitState();
  setStatus("", null);

  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: name,
        language: state.lang,
        selected_ids: ids.join(",")
      }),
    });

    if (!res.ok) throw new Error(await describeError(res));

    if (phaseInterval) clearInterval(phaseInterval);
    showSuccess(s.successTitle, s.successBody(name, ids.length));
  } catch (err) {
    state.submitting = false;
    updateBingoSubmitState();
    console.error("Submission error:", err);
    setStatus(`${s.errorGeneric} (${err.message})`, "error");
  }
}

// ---------------------------------------------------------------------------
// Predictions phase
// ---------------------------------------------------------------------------

async function loadCountries() {
  try {
    const res = await fetch("countries.json");
    if (!res.ok) throw new Error("bad response");
    const data = await res.json();
    state.countries = data.countries || [];
    return true;
  } catch (err) {
    els.predictionsForm.innerHTML = `<div class="load-error">${t().errorLoadCountries}</div>`;
    return false;
  }
}

function renderPredictionsForm() {
  const s = t();
  els.predictionsForm.innerHTML = "";

  PREDICTION_FIELDS.forEach((field) => {
    const row = document.createElement("div");
    row.className = "field-row";

    const label = document.createElement("label");
    label.className = "field-label";
    label.textContent = s[field.labelKey];
    label.htmlFor = `field-${field.key}`;

    const select = document.createElement("select");
    select.id = `field-${field.key}`;
    select.className = "field-select";
    const excludeIds = TOP5_FIELD_KEYS.includes(field.key) ? getUsedTop5Ids(field.key) : null;
    populateCountrySelectOptions(select, excludeIds);
    select.value = state.predictions[field.key] || "";
    select.addEventListener("change", () => {
      state.predictions[field.key] = select.value;
      if (TOP5_FIELD_KEYS.includes(field.key)) refreshTop5Dropdowns();
      updatePredictionsSubmitState();
    });

    row.appendChild(label);
    row.appendChild(select);
    els.predictionsForm.appendChild(row);
  });

  const germanyRow = document.createElement("div");
  germanyRow.className = "field-row";

  const germanyLabel = document.createElement("label");
  germanyLabel.className = "field-label";
  germanyLabel.textContent = s.fieldGermany;
  germanyLabel.htmlFor = "field-germanyPos";

  const germanySelect = document.createElement("select");
  germanySelect.id = "field-germanyPos";
  germanySelect.className = "field-select";
  germanySelect.appendChild(makeOption("", s.selectPlaceholder));
  const totalCountries = state.countries.length || 26;
  for (let i = 1; i <= totalCountries; i++) {
    germanySelect.appendChild(makeOption(String(i), String(i)));
  }
  germanySelect.value = state.predictions.germanyPos || "";
  germanySelect.addEventListener("change", () => {
    state.predictions.germanyPos = germanySelect.value;
    updatePredictionsSubmitState();
  });

  germanyRow.appendChild(germanyLabel);
  germanyRow.appendChild(germanySelect);
  els.predictionsForm.appendChild(germanyRow);
}

function makeOption(value, text) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = text;
  return opt;
}

// Countries already picked in one of the other top-5 dropdowns (so a given
// dropdown never offers a country that's already used in a sibling slot).
function getUsedTop5Ids(excludeKey) {
  const used = new Set();
  TOP5_FIELD_KEYS.forEach((key) => {
    if (key === excludeKey) return;
    if (state.predictions[key]) used.add(state.predictions[key]);
  });
  return used;
}

// (Re)builds a select's <option> list from state.countries, skipping any ids
// in excludeIds, and restores whatever value was selected before rebuilding.
function populateCountrySelectOptions(select, excludeIds) {
  const s = t();
  const lang = state.lang;
  const currentValue = select.value;
  select.innerHTML = "";
  select.appendChild(makeOption("", s.selectPlaceholder));
  state.countries.forEach((c) => {
    if (excludeIds && excludeIds.has(c.id)) return;
    const text = c[lang] || c.en;
    select.appendChild(makeOption(c.id, `${text.country} — ${text.artist} "${text.song}"`));
  });
  select.value = currentValue;
}

// Re-filters all five top-5 dropdowns after any one of them changes, so a
// country picked in one slot disappears from the others, and a country
// cleared from one slot becomes available again everywhere else.
function refreshTop5Dropdowns() {
  TOP5_FIELD_KEYS.forEach((key) => {
    const select = document.getElementById(`field-${key}`);
    if (!select) return;
    populateCountrySelectOptions(select, getUsedTop5Ids(key));
  });
}

function predictionsComplete() {
  const name = els.nameInput.value.trim();
  return (
    !!name &&
    !!state.predictions.germanyPos &&
    PREDICTION_FIELDS.every((f) => !!state.predictions[f.key])
  );
}

function updatePredictionsSubmitState() {
  const s = t();

  if (state.submitting) {
    els.submitBtn.disabled = true;
    els.submitBtn.textContent = s.submitting;
    return;
  }

  if (!predictionsComplete()) {
    els.submitBtn.disabled = true;
    els.submitBtn.textContent = s.predictionsSubmitIncomplete;
  } else {
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = s.predictionsSubmitReady;
  }
}

async function handlePredictionsSubmit() {
  const s = t();
  const name = els.nameInput.value.trim();
  if (!predictionsComplete()) return;

  state.submitting = true;
  updatePredictionsSubmitState();
  setStatus("", null);

  try {
    const res = await fetch(PREDICTIONS_FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: name,
        predictions: [
          state.predictions.winner,
          state.predictions.place2,
          state.predictions.place3,
          state.predictions.place4,
          state.predictions.place5,
          state.predictions.last,
          state.predictions.jury,
          state.predictions.televote,
          state.predictions.germanyPos].join(","),
      }),
    });

    if (!res.ok) throw new Error(await describeError(res));

    if (phaseInterval) clearInterval(phaseInterval);
    showSuccess(s.successTitle, s.predictionsSuccessBody(name));
  } catch (err) {
    state.submitting = false;
    updatePredictionsSubmitState();
    console.error("Submission error:", err);
    setStatus(`${s.errorGeneric} (${err.message})`, "error");
  }
}

// ---------------------------------------------------------------------------
// Closed phase
// ---------------------------------------------------------------------------

function renderClosedPanel() {
  const s = t();
  let body = s.closedBody;
  if (new Date() < new Date(PREDICTIONS_OPEN_AT)) {
    const timeStr = new Date(PREDICTIONS_OPEN_AT).toLocaleString(state.lang === "de" ? "de-DE" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    body = s.closedBodyGap(timeStr);
  }
  els.closedPanel.innerHTML = `
    <div class="success-panel">
      <h2>${escapeHtml(s.closedTitle)}</h2>
      <p>${escapeHtml(body)}</p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function describeError(res) {
  let detail = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body && body.errors && body.errors.length) {
      detail += ": " + body.errors.map((e) => e.message || e.code).join(", ");
    } else if (body && body.error) {
      detail += ": " + body.error;
    }
  } catch (_) {
    /* response wasn't JSON, ignore */
  }
  return detail;
}

function setStatus(message, type) {
  els.statusMsg.textContent = message;
  els.statusMsg.className = "status-msg" + (type ? ` ${type}` : "");
}

function showSuccess(title, body) {
  els.app.innerHTML = `
    <div class="success-panel">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
