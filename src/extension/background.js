import {
  assertRuleLimit,
  compileRules,
  defaultState,
  fromSyncItems,
  LOCAL_STATS_KEY,
  mergeState,
  STORAGE_KEY,
  SYNC_ENABLED_KEY,
  SYNC_RULE_PREFIX,
  SYNC_SETTINGS_KEY,
  syncStorageUsage,
  toSyncItems
} from "./core.js";
import { hasHostPermission, storageGet, storageRemove, storageSet } from "./platform.js";

async function readSyncState() {
  return fromSyncItems(await storageGet(null, "sync"));
}

async function syncEnabled() {
  const local = await storageGet(SYNC_ENABLED_KEY);
  if (typeof local[SYNC_ENABLED_KEY] === "boolean") return local[SYNC_ENABLED_KEY];
  const enabled = Boolean(await readSyncState());
  await storageSet({ [SYNC_ENABLED_KEY]: enabled });
  return enabled;
}

async function getState() {
  const local = await storageGet([STORAGE_KEY, LOCAL_STATS_KEY]);
  const portable = (await syncEnabled()) ? await readSyncState() : local[STORAGE_KEY];
  return mergeState({
    ...(portable || defaultState()),
    localStats: local[LOCAL_STATS_KEY] || local[STORAGE_KEY]?.localStats
  });
}

async function writeSyncState(state) {
  const existing = await storageGet(null, "sync");
  const next = toSyncItems(state);
  const usage = syncStorageUsage(next);
  if (usage.itemCount > 500 || usage.totalBytes > 100_000 || usage.largestItemBytes > 8_000) {
    throw new Error("These routes exceed Chrome Sync's storage limit. Remove some routes or keep them local and use a JSON backup.");
  }
  const staleRuleKeys = Object.keys(existing).filter(
    (key) => key.startsWith(SYNC_RULE_PREFIX) && !(key in next),
  );
  await storageSet(next, "sync");
  if (staleRuleKeys.length) await storageRemove(staleRuleKeys, "sync");
}

async function persistState(value) {
  const state = mergeState(value);
  assertRuleLimit(state.rules);
  if (await syncEnabled()) {
    await writeSyncState(state);
  } else {
    await storageSet({ [STORAGE_KEY]: state });
  }
  await storageSet({ [LOCAL_STATS_KEY]: state.localStats });
  return state;
}

async function authorizedRules(state) {
  const checks = await Promise.all(state.rules.map(async (rule) => ({
    rule,
    granted: await hasHostPermission(rule.sourceHost)
  })));
  return checks.filter((item) => item.granted).map((item) => item.rule);
}

async function syncRedirectRules(state) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: compileRules(await authorizedRules(state), state.enabled)
  });
}

async function setState(value) {
  const state = await persistState(value);
  await syncRedirectRules(state);
  return state;
}

async function setSyncEnabled(enabled) {
  const state = await getState();
  if (enabled) {
    await writeSyncState(state);
    await storageSet({ [SYNC_ENABLED_KEY]: true });
  } else {
    await storageSet({ [STORAGE_KEY]: state, [SYNC_ENABLED_KEY]: false });
  }
  await syncRedirectRules(state);
  return { enabled, state };
}

async function getSyncStatus() {
  const enabled = await syncEnabled();
  return {
    enabled,
    bytesInUse: enabled ? await chrome.storage.sync.getBytesInUse(null) : 0
  };
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const state = await getState();
  await setState(state);
  if (reason === "install") await chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
});

chrome.runtime.onStartup.addListener(async () => {
  await syncRedirectRules(await getState());
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "sync" || !(await syncEnabled())) return;
  const relevant = Object.keys(changes).some(
    (key) => key === SYNC_SETTINGS_KEY || key.startsWith(SYNC_RULE_PREFIX),
  );
  if (relevant) await syncRedirectRules(await getState());
});

chrome.permissions.onAdded.addListener(async () => syncRedirectRules(await getState()));
chrome.permissions.onRemoved.addListener(async () => syncRedirectRules(await getState()));

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
        await storageSet({ [LOCAL_STATS_KEY]: state.localStats });
        return state.localStats;
      case "sync:status":
        return getSyncStatus();
      case "sync:toggle":
        return setSyncEnabled(Boolean(message.enabled));
      case "permissions:refresh":
        await syncRedirectRules(state);
        return state;
      default:
        throw new Error("Unknown Good Detour message.");
    }
  })()
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
