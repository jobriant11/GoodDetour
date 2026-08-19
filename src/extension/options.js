import { createRule, findCycle, MAX_RULES, mergeState, suggestions } from "./core.js";
import {
  addStorageChangedListener,
  getMissingHostPermissions,
  requestHostPermission,
  requestHostPermissions,
  sendMessage
} from "./platform.js";

const elements = {
  globalToggle: document.querySelector("#global-toggle"),
  form: document.querySelector("#rule-form"),
  ruleId: document.querySelector("#rule-id"),
  source: document.querySelector("#source"),
  destination: document.querySelector("#destination"),
  mode: document.querySelector("#mode"),
  formNotice: document.querySelector("#form-notice"),
  saveRule: document.querySelector("#save-rule"),
  ruleList: document.querySelector("#rule-list"),
  empty: document.querySelector("#empty-state"),
  count: document.querySelector("#rule-count"),
  suggestions: document.querySelector("#suggestions"),
  datalist: document.querySelector("#destination-list"),
  preferencesForm: document.querySelector("#preferences-form"),
  landingTitle: document.querySelector("#landing-title"),
  landingMessage: document.querySelector("#landing-message"),
  pauseSeconds: document.querySelector("#pause-seconds"),
  exportButton: document.querySelector("#export-button"),
  importFile: document.querySelector("#import-file"),
  backupNotice: document.querySelector("#backup-notice"),
  syncToggle: document.querySelector("#sync-toggle"),
  syncStatus: document.querySelector("#sync-status"),
  permissionNotice: document.querySelector("#permission-notice"),
  permissionCopy: document.querySelector("#permission-copy"),
  grantSyncedPermissions: document.querySelector("#grant-synced-permissions")
};

let state;
let missingHosts = [];

async function message(payload) {
  const response = await sendMessage(payload);
  if (!response?.ok) throw new Error(response?.error || "Good Detour could not save that change.");
  return response.result;
}

function showNotice(element, text, isError = false) {
  element.textContent = text;
  element.classList.remove("hidden", "error");
  if (isError) element.classList.add("error");
}

function render() {
  elements.globalToggle.checked = state.enabled;
  elements.empty.classList.toggle("hidden", state.rules.length > 0);
  elements.count.textContent = `${state.rules.length} / ${MAX_RULES} detours`;
  elements.saveRule.disabled = state.rules.length >= MAX_RULES && !elements.ruleId.value;
  elements.ruleList.replaceChildren(...state.rules.map(renderRule));
  elements.landingTitle.value = state.preferences.landingTitle;
  elements.landingMessage.value = state.preferences.landingMessage;
  elements.pauseSeconds.value = state.preferences.pauseSeconds;
}

async function refreshSyncUi() {
  const [status, missing] = await Promise.all([
    message({ type: "sync:status" }),
    getMissingHostPermissions(state.rules.map((rule) => rule.sourceHost))
  ]);
  elements.syncToggle.checked = status.enabled;
  elements.syncStatus.textContent = status.enabled
    ? `Good Detour is set to use Chrome Sync. When Chrome account sync is enabled, ${state.rules.length} ${state.rules.length === 1 ? "route" : "routes"} can follow you (${Math.max(1, Math.ceil(status.bytesInUse / 1024))} KB used).`
    : "Chrome Sync is off on this browser. Routes and preferences stay here; an existing synced copy remains available to other browsers.";
  missingHosts = missing;
  elements.permissionNotice.classList.toggle("hidden", missingHosts.length === 0);
  if (missingHosts.length) {
    elements.permissionCopy.textContent = `${missingHosts.length} saved ${missingHosts.length === 1 ? "site needs" : "sites need"} permission on this Chrome before redirects can run.`;
    elements.grantSyncedPermissions.textContent = `Enable ${missingHosts.length} ${missingHosts.length === 1 ? "site" : "sites"} on this Chrome`;
  }
}

function renderRule(rule) {
  const item = document.createElement("article");
  item.className = "rule";
  const copy = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = rule.label;
  const route = document.createElement("p");
  route.className = "rule-route";
  route.textContent = `${rule.sourceHost} → ${rule.destinationUrl}`;
  const mode = document.createElement("span");
  mode.className = "muted";
  mode.textContent = `${rule.mode === "pause" ? "Pause page" : "Direct"} · ${rule.enabled ? "On" : "Off"}`;
  copy.append(title, route, mode);

  const actions = document.createElement("div");
  actions.className = "rule-actions";
  const toggle = document.createElement("button");
  toggle.className = "icon-button";
  toggle.type = "button";
  toggle.textContent = rule.enabled ? "Pause" : "Resume";
  toggle.addEventListener("click", async () => {
    state = await message({ type: "rule:toggle", id: rule.id, enabled: !rule.enabled });
    render();
    await refreshSyncUi();
  });
  const edit = document.createElement("button");
  edit.className = "icon-button";
  edit.type = "button";
  edit.textContent = "Edit";
  edit.addEventListener("click", () => {
    elements.ruleId.value = rule.id;
    elements.source.value = rule.sourceHost;
    elements.destination.value = rule.destinationUrl;
    elements.mode.value = rule.mode;
    elements.saveRule.disabled = false;
    elements.source.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  const remove = document.createElement("button");
  remove.className = "icon-button";
  remove.type = "button";
  remove.textContent = "Delete";
  remove.addEventListener("click", async () => {
    state = await message({ type: "rule:delete", id: rule.id });
    render();
    await refreshSyncUi();
  });
  actions.append(toggle, edit, remove);
  item.append(copy, actions);
  return item;
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.formNotice.classList.add("hidden");
  try {
    const previous = state.rules.find((rule) => rule.id === elements.ruleId.value);
    const rule = createRule(
      {
        id: elements.ruleId.value || undefined,
        sourceHost: elements.source.value,
        destinationUrl: elements.destination.value,
        mode: elements.mode.value,
        enabled: previous?.enabled,
        createdAt: previous?.createdAt
      },
      state.rules,
    );
    const granted = await requestHostPermission(rule.sourceHost);
    if (!granted) throw new Error(`Good Detour needs permission for ${rule.sourceHost} before it can redirect that site.`);
    state.rules = state.rules.filter((candidate) => candidate.id !== rule.id).concat(rule);
    state = await message({ type: "state:replace", state });
    elements.form.reset();
    elements.ruleId.value = "";
    elements.mode.value = state.preferences.defaultMode;
    showNotice(elements.formNotice, `Saved ${rule.sourceHost}.`);
    render();
    await refreshSyncUi();
  } catch (error) {
    showNotice(elements.formNotice, error.message, true);
  }
});

elements.globalToggle.addEventListener("change", async () => {
  state = await message({ type: "global:toggle", enabled: elements.globalToggle.checked });
  render();
});

elements.preferencesForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.preferences.landingTitle = elements.landingTitle.value.trim();
  state.preferences.landingMessage = elements.landingMessage.value.trim();
  state.preferences.pauseSeconds = Math.min(60, Math.max(3, Number(elements.pauseSeconds.value) || 8));
  state = await message({ type: "state:replace", state });
  elements.preferencesForm.querySelector("button").textContent = "Saved";
  setTimeout(() => { elements.preferencesForm.querySelector("button").textContent = "Save pause page"; }, 1200);
});

elements.exportButton.addEventListener("click", () => {
  const safeExport = { version: state.version, rules: state.rules, preferences: state.preferences };
  const blob = new Blob([JSON.stringify(safeExport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `good-detour-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
});

elements.importFile.addEventListener("change", async () => {
  const file = elements.importFile.files?.[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.rules)) throw new Error("That file does not contain a rules list.");
    if (imported.rules.length > MAX_RULES) {
      throw new Error(`Imports can contain up to ${MAX_RULES} detours.`);
    }
    const validated = [];
    for (const candidate of imported.rules) {
      if (candidate?.id && validated.some((rule) => rule.id === candidate.id)) {
        throw new Error("Import contains duplicate rule identifiers.");
      }
      validated.push(createRule(candidate, validated));
    }
    const cycle = findCycle(validated.filter((rule) => rule.enabled));
    if (cycle) throw new Error(`Import contains a loop: ${cycle.join(" → ")}`);
    const hosts = [...new Set(validated.map((rule) => rule.sourceHost))];
    if (!(await requestHostPermissions(hosts))) {
      throw new Error("Permission was not granted for every imported site. Import cancelled.");
    }
    state = mergeState({ ...state, rules: validated, preferences: imported.preferences });
    state = await message({ type: "state:replace", state });
    showNotice(elements.backupNotice, `Imported ${validated.length} routes.`);
    render();
    await refreshSyncUi();
  } catch (error) {
    showNotice(elements.backupNotice, error.message, true);
  } finally {
    elements.importFile.value = "";
  }
});

elements.syncToggle.addEventListener("change", async () => {
  const enabled = elements.syncToggle.checked;
  elements.syncToggle.disabled = true;
  try {
    const result = await message({ type: "sync:toggle", enabled });
    state = result.state;
    render();
    await refreshSyncUi();
  } catch (error) {
    elements.syncToggle.checked = !enabled;
    showNotice(elements.syncStatus, error.message, true);
  } finally {
    elements.syncToggle.disabled = false;
  }
});

elements.grantSyncedPermissions.addEventListener("click", async () => {
  try {
    if (!(await requestHostPermissions(missingHosts))) {
      throw new Error("Site access was not granted. Synced routes remain saved but inactive on this Chrome.");
    }
    await message({ type: "permissions:refresh" });
    await refreshSyncUi();
  } catch (error) {
    showNotice(elements.permissionCopy, error.message, true);
  }
});

addStorageChangedListener(async (changes, areaName) => {
  if (areaName !== "sync" || !elements.syncToggle.checked || !Object.keys(changes).some((key) => key.startsWith("goodDetourSync"))) return;
  state = await message({ type: "state:get" });
  render();
  await refreshSyncUi();
});

for (const suggestion of suggestions) {
  const option = document.createElement("option");
  option.value = suggestion.url;
  option.label = suggestion.name;
  elements.datalist.append(option);

  const button = document.createElement("button");
  button.className = "suggestion";
  button.type = "button";
  const name = document.createElement("strong");
  name.textContent = suggestion.name;
  const note = document.createElement("span");
  note.textContent = suggestion.note;
  button.append(name, note);
  button.addEventListener("click", () => {
    elements.destination.value = suggestion.url;
    elements.destination.focus();
    window.scrollTo({ top: 180, behavior: "smooth" });
  });
  elements.suggestions.append(button);
}

const prefill = new URLSearchParams(location.search).get("source");
if (prefill) elements.source.value = prefill;
state = await message({ type: "state:get" });
elements.mode.value = state.preferences.defaultMode;
render();
await refreshSyncUi();
