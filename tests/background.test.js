import test from "node:test";
import assert from "node:assert/strict";
import { defaultState, STORAGE_KEY, SYNC_ENABLED_KEY, SYNC_SETTINGS_KEY } from "../src/extension/core.js";

function pick(data, keys) {
  if (keys === null || keys === undefined) return { ...data };
  const list = Array.isArray(keys) ? keys : [keys];
  return Object.fromEntries(list.filter((key) => key in data).map((key) => [key, data[key]]));
}

test("migrates local state to Chrome Sync and waits for per-browser site access", async (t) => {
  const state = defaultState();
  state.localStats.totalPauses = 7;
  state.rules = [{
    id: "cnn-rule",
    sourceHost: "cnn.com",
    destinationUrl: "https://apnews.com/",
    mode: "direct",
    enabled: true,
    label: "cnn.com",
    createdAt: "2026-08-19T12:00:00.000Z",
    updatedAt: "2026-08-19T12:00:00.000Z"
  }];

  const localData = { [STORAGE_KEY]: state };
  const syncData = {};
  let messageListener;
  let storageChangeListener;
  let dynamicRules = [];
  let permissionGranted = false;
  const area = (data) => ({
    get: async (keys) => pick(data, keys),
    set: async (values) => Object.assign(data, values),
    remove: async (keys) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
    },
    getBytesInUse: async () => JSON.stringify(data).length
  });

  globalThis.chrome = {
    storage: {
      local: area(localData),
      sync: area(syncData),
      onChanged: { addListener(listener) { storageChangeListener = listener; } }
    },
    permissions: {
      contains: async () => permissionGranted,
      onAdded: { addListener() {} },
      onRemoved: { addListener() {} }
    },
    declarativeNetRequest: {
      getDynamicRules: async () => dynamicRules,
      updateDynamicRules: async ({ addRules }) => { dynamicRules = addRules; }
    },
    runtime: {
      onInstalled: { addListener() {} },
      onStartup: { addListener() {} },
      onMessage: { addListener(listener) { messageListener = listener; } },
      getURL: (path) => `chrome-extension://test/${path}`
    },
    tabs: { create: async () => {} }
  };
  t.after(() => { delete globalThis.chrome; });

  await import(`../src/extension/background.js?test=${Date.now()}`);
  const send = (message) => new Promise((resolve, reject) => {
    messageListener(message, {}, (response) => response.ok ? resolve(response.result) : reject(new Error(response.error)));
  });

  const migrated = await send({ type: "sync:toggle", enabled: true });
  assert.equal(migrated.enabled, true);
  assert.equal(localData[SYNC_ENABLED_KEY], true);
  assert.equal(JSON.stringify(syncData).includes("totalPauses"), false);
  assert.ok(Object.keys(syncData).some((key) => key.startsWith("goodDetourSyncRule:")));
  assert.deepEqual(dynamicRules, []);

  delete localData[STORAGE_KEY];
  delete localData[SYNC_ENABLED_KEY];
  const onSecondBrowser = await send({ type: "state:get" });
  assert.equal(onSecondBrowser.rules[0].sourceHost, "cnn.com");
  assert.equal(onSecondBrowser.localStats.totalPauses, 0);

  permissionGranted = true;
  await send({ type: "permissions:refresh" });
  assert.equal(dynamicRules.length, 1);
  assert.equal(dynamicRules[0].action.redirect.url, "https://apnews.com/");

  const keptLocally = await send({ type: "data:delete-synced" });
  assert.equal(keptLocally.rules[0].sourceHost, "cnn.com");
  assert.equal(localData[SYNC_ENABLED_KEY], false);
  assert.equal(localData[STORAGE_KEY].rules[0].sourceHost, "cnn.com");
  assert.deepEqual(syncData, {});
  assert.equal(dynamicRules.length, 1);

  await send({ type: "sync:toggle", enabled: true });
  const deleted = await send({ type: "data:delete-all" });
  assert.deepEqual(deleted.rules, []);
  assert.equal(deleted.localStats.totalPauses, 0);
  assert.equal(STORAGE_KEY in localData, false);
  assert.equal(SYNC_ENABLED_KEY in localData, false);
  assert.deepEqual(syncData, {});
  assert.deepEqual(dynamicRules, []);

  await send({ type: "state:replace", state });
  await send({ type: "pause:count" });
  await send({ type: "sync:toggle", enabled: true });
  const oldSettings = syncData[SYNC_SETTINGS_KEY];
  for (const key of Object.keys(syncData)) delete syncData[key];
  await storageChangeListener({ [SYNC_SETTINGS_KEY]: { oldValue: oldSettings } }, "sync");
  const afterRemoteDeletion = await send({ type: "state:get" });
  assert.equal(localData[SYNC_ENABLED_KEY], false);
  assert.deepEqual(afterRemoteDeletion.rules, []);
  assert.equal(afterRemoteDeletion.localStats.totalPauses, 8);
  assert.deepEqual(dynamicRules, []);
});
