// ---------------------------------------------------------------------------
// CONFIG — the only two things you should need to touch
// ---------------------------------------------------------------------------

// Replace with your real Formspree endpoint, e.g. "https://formspree.io/f/abcd1234"
const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";

// How many prompts a participant must select
const TARGET_COUNT = 24;

// ---------------------------------------------------------------------------

const UI_STRINGS = {
  en: {
    title: "Eurovision Bingo",
    eyebrow: "Pick your prompts",
    scoreboardLabel: "Selected",
    nameLabel: "Your name",
    namePlaceholder: "Type your name",
    submitIncomplete: (n) => `Pick ${n} more to submit`,
    submitNoName: "Enter your name to submit",
    submitReady: "Submit my card",
    submitting: "Submitting…",
    errorGeneric: "Something went wrong sending your picks. Please try again.",
    errorLoad: "Couldn't load the prompt list. Please refresh the page.",
    successTitle: "You're in!",
    successBody: (name, n) => `Thanks ${name}, your ${n} picks are saved.`,
  },
  de: {
    title: "Eurovision Bingo",
    eyebrow: "Wähle deine Prompts",
    scoreboardLabel: "Ausgewählt",
    nameLabel: "Dein Name",
    namePlaceholder: "Namen eingeben",
    submitIncomplete: (n) => `Noch ${n} auswählen`,
    submitNoName: "Bitte Namen eingeben",
    submitReady: "Karte abschicken",
    submitting: "Wird gesendet…",
    errorGeneric: "Beim Senden ist etwas schiefgelaufen. Bitte nochmal versuchen.",
    errorLoad: "Die Prompt-Liste konnte nicht geladen werden. Bitte Seite neu laden.",
    successTitle: "Du bist dabei!",
    successBody: (name, n) => `Danke ${name}, deine ${n} Auswahlen wurden gespeichert.`,
  },
};

const state = {
  lang: "de",
  prompts: [],
  selected: new Set(),
  submitting: false,
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  els.app = document.getElementById("app");
  els.langButtons = document.querySelectorAll("[data-lang]");
  els.scoreboardCount = document.getElementById("scoreboardCount");
  els.scoreboardLabel = document.getElementById("scoreboardLabel");
  els.progressFill = document.getElementById("progressFill");
  els.nameInput = document.getElementById("nameInput");
  els.nameLabel = document.getElementById("nameLabel");
  els.promptList = document.getElementById("promptList");
  els.submitBtn = document.getElementById("submitBtn");
  els.statusMsg = document.getElementById("statusMsg");
  els.title = document.getElementById("pageTitle");
  els.eyebrow = document.getElementById("pageEyebrow");

  els.langButtons.forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
  els.nameInput.addEventListener("input", updateSubmitState);
  els.submitBtn.addEventListener("click", handleSubmit);

  try {
    const res = await fetch("prompts.json");
    if (!res.ok) throw new Error("bad response");
    const data = await res.json();
    state.prompts = data.prompts || [];
  } catch (err) {
    els.promptList.innerHTML = `<div class="load-error">${t().errorLoad}</div>`;
    return;
  }

  renderStrings();
  renderPrompts();
  updateScoreboard();
  updateSubmitState();
}

function t() {
  return UI_STRINGS[state.lang];
}

function setLang(lang) {
  if (lang === state.lang) return;
  state.lang = lang;
  els.langButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.lang === lang));
  renderStrings();
  renderPrompts();
  updateSubmitState();
}

function renderStrings() {
  const s = t();
  els.title.textContent = s.title;
  els.eyebrow.textContent = s.eyebrow;
  els.scoreboardLabel.textContent = s.scoreboardLabel;
  els.nameLabel.textContent = s.nameLabel;
  els.nameInput.placeholder = s.namePlaceholder;
  document.documentElement.lang = state.lang;
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
  updateSubmitState();
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

function updateSubmitState() {
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

async function handleSubmit() {
  const s = t();
  const name = els.nameInput.value.trim();
  const ids = Array.from(state.selected);

  if (ids.length !== TARGET_COUNT || !name) return;

  state.submitting = true;
  updateSubmitState();
  setStatus("", null);

  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: name,
        language: state.lang,
        selected_ids: ids.join(","),
        count: ids.length,
      }),
    });

    if (!res.ok) throw new Error("submit failed");

    showSuccess(name, ids.length);
  } catch (err) {
    state.submitting = false;
    updateSubmitState();
    setStatus(s.errorGeneric, "error");
  }
}

function setStatus(message, type) {
  els.statusMsg.textContent = message;
  els.statusMsg.className = "status-msg" + (type ? ` ${type}` : "");
}

function showSuccess(name, count) {
  const s = t();
  els.app.innerHTML = `
    <div class="success-panel">
      <h2>${escapeHtml(s.successTitle)}</h2>
      <p>${escapeHtml(s.successBody(name, count))}</p>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
