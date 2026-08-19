import { compileRules, defaultState, mergeState, STORAGE_KEY } from "./core.js";
import { storageGet, storageSet } from "./platform.js";

async function getState() {
  const stored = await storageGet(STORAGE_KEY);
  return mergeState(stored[STORAGE_KEY]);
}

async function setState(state) {
  await storageSet({ [STORAGE_KEY]: state });
  await syncRedirectRules(state);
  return state;
}

async function syncRedirectRules(state) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: compileRules(state.rules, state.enabled)
  });
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const stored = await storageGet(STORAGE_KEY);
  const state = stored[STORAGE_KEY] ? mergeState(stored[STORAGE_KEY]) : defaultState();
  await setState(state);
  if (reason === "install") await chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
});

chrome.runtime.onStartup.addListener(async () => {
  await syncRedirectRules(await getState());
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    const state = await getState();
    switch (message?.type) {
      case "state:get":
        return state;
      case "state:replace":
        return setState(mergeState(message.state));
      case "rule:delete":
        state.rules = state.rules.filter((rule) => rule.id !== message.id);
        return setState(state);
      case "rule:toggle": {
        const rule = state.rules.find((candidate) => candidate.id === message.id);
        if (rule) rule.enabled = Boolean(message.enabled);
        return setState(state);
      }
      case "global:toggle":
        state.enabled = Boolean(message.enabled);
        return setState(state);
      case "pause:count":
        state.localStats.totalPauses += 1;
        await storageSet({ [STORAGE_KEY]: state });
        return state.localStats;
      default:
        throw new Error("Unknown Good Detour message.");
    }
  })()
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

