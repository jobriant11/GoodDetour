import { APPEARANCE_KEY } from "./core.js";

export function normalizeAppearance(value) {
  return value === "light" || value === "dark" ? value : "system";
}

// Appearance is device-local and independent of rule edits, backups, and Sync.
export async function initializeAppearance({
  root = document.documentElement,
  select = document.querySelector("#appearance"),
  notice = document.querySelector("#appearance-notice"),
  media = window.matchMedia("(prefers-color-scheme: dark)"),
  storage = (globalThis.browser ?? globalThis.chrome).storage
} = {}) {
  let preference = "system";
  let savedPreference = "system";
  let storageRevision = 0;

  function render(value) {
    preference = normalizeAppearance(value);
    root.dataset.theme = preference === "system" ? (media.matches ? "dark" : "light") : preference;
    if (select) select.value = preference;
  }

  function announce(message, error = false) {
    if (!notice) return;
    notice.textContent = message;
    notice.classList.toggle("hidden", !message);
    notice.classList.toggle("error", error);
  }

  const onSystemChange = () => render(preference);
  const onStorageChange = (changes, area) => {
    if (area !== "local" || !Object.hasOwn(changes, APPEARANCE_KEY)) return;
    storageRevision += 1;
    savedPreference = normalizeAppearance(changes[APPEARANCE_KEY].newValue);
    render(savedPreference);
    announce("");
  };
  const onSelection = async () => {
    const next = normalizeAppearance(select.value);
    select.disabled = true;
    render(next);
    announce("");
    try {
      await storage.local.set({ [APPEARANCE_KEY]: next });
      savedPreference = preference;
      announce("Appearance saved on this browser.");
    } catch {
      render(savedPreference);
      announce("Appearance could not be saved. Try again.", true);
    } finally {
      select.disabled = false;
    }
  };

  render("system");
  media.addEventListener("change", onSystemChange);
  storage.onChanged.addListener(onStorageChange);
  if (select) select.disabled = true;
  try {
    const initial = await storage.local.get(APPEARANCE_KEY);
    // A newer cross-page change wins over an older read still in flight.
    if (storageRevision === 0) {
      savedPreference = normalizeAppearance(initial[APPEARANCE_KEY]);
      render(savedPreference);
    }
  } catch {
    announce("Appearance could not be loaded. Choose an appearance to try again.", true);
  } finally {
    if (select) {
      select.disabled = false;
      select.addEventListener("change", onSelection);
    }
  }

  return () => {
    media.removeEventListener("change", onSystemChange);
    storage.onChanged.removeListener(onStorageChange);
    select?.removeEventListener("change", onSelection);
  };
}

if (typeof document !== "undefined") void initializeAppearance();
