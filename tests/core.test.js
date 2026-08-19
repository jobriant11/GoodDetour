import test from "node:test";
import assert from "node:assert/strict";
import {
  compileRules,
  createRule,
  defaultState,
  findCycle,
  fromSyncItems,
  mergeState,
  normalizeHostname,
  normalizeUrl,
  SYNC_RULE_PREFIX,
  SYNC_SETTINGS_KEY,
  syncStorageUsage,
  toSyncItems
} from "../src/extension/core.js";
import { buildHostOrigins } from "../src/extension/platform.js";

test("normalizes friendly domain input", () => {
  assert.equal(normalizeHostname(" WWW.CNN.COM/story "), "cnn.com");
  assert.equal(normalizeHostname("javascript:alert(1)"), "");
  assert.equal(normalizeUrl("apnews.com"), "https://apnews.com/");
});

test("validates duplicate and self redirects", () => {
  const first = createRule({ id: "one", sourceHost: "cnn.com", destinationUrl: "apnews.com" });
  assert.throws(
    () => createRule({ id: "two", sourceHost: "www.cnn.com", destinationUrl: "npr.org" }, [first]),
    /already exists/,
  );
  assert.throws(
    () => createRule({ id: "two", sourceHost: "cnn.com", destinationUrl: "https://www.cnn.com" }),
    /cannot be the same/,
  );
});

test("detects redirect cycles", () => {
  const rules = [
    { sourceHost: "one.test", destinationUrl: "https://two.test" },
    { sourceHost: "two.test", destinationUrl: "https://three.test" },
    { sourceHost: "three.test", destinationUrl: "https://one.test" }
  ];
  assert.deepEqual(findCycle(rules), ["one.test", "two.test", "three.test", "one.test"]);
});

test("compiles enabled rules into private MV3 redirects", () => {
  const direct = createRule({ id: "direct", sourceHost: "cnn.com", destinationUrl: "apnews.com", mode: "direct" });
  const pause = createRule({ id: "pause", sourceHost: "foxnews.com", destinationUrl: "npr.org", mode: "pause" }, [direct]);
  const compiled = compileRules([direct, pause]);
  assert.equal(compiled.length, 2);
  assert.equal(compiled[0].action.redirect.url, "https://apnews.com/");
  assert.equal(compiled[1].action.redirect.extensionPath, "/landing.html?rule=pause");
  assert.deepEqual(compiled[0].condition.resourceTypes, ["main_frame"]);
  assert.deepEqual(compileRules([direct], false), []);
});

test("merges older stored state with current defaults", () => {
  const merged = mergeState({ enabled: false, preferences: { pauseSeconds: 12 } });
  assert.equal(merged.enabled, false);
  assert.equal(merged.preferences.pauseSeconds, 12);
  assert.equal(merged.preferences.defaultMode, defaultState().preferences.defaultMode);
  assert.deepEqual(merged.rules, []);
});

test("requests only HTTP and HTTPS patterns declared by the manifest", () => {
  assert.deepEqual(buildHostOrigins(["cnn.com"]), [
    "http://cnn.com/*",
    "http://*.cnn.com/*",
    "https://cnn.com/*",
    "https://*.cnn.com/*"
  ]);
  assert.deepEqual(buildHostOrigins(["localhost"]), [
    "http://localhost/*",
    "https://localhost/*"
  ]);
});

test("splits synced state into quota-friendly items and keeps stats local", () => {
  const state = defaultState();
  state.localStats.totalPauses = 42;
  state.rules = [
    createRule({ id: "one", sourceHost: "cnn.com", destinationUrl: "apnews.com" }),
    createRule({ id: "two", sourceHost: "foxnews.com", destinationUrl: "npr.org" })
  ];
  const items = toSyncItems(state);
  assert.ok(items[SYNC_SETTINGS_KEY]);
  assert.ok(items[`${SYNC_RULE_PREFIX}one`]);
  assert.ok(items[`${SYNC_RULE_PREFIX}two`]);
  assert.equal(JSON.stringify(items).includes("totalPauses"), false);
  const usage = syncStorageUsage(items);
  assert.equal(usage.itemCount, 3);
  assert.ok(usage.largestItemBytes < 8_000);
  assert.ok(usage.totalBytes < 100_000);

  const restored = fromSyncItems(items);
  assert.deepEqual(restored.rules.map((rule) => rule.id), ["one", "two"]);
  assert.equal(restored.localStats.totalPauses, 0);
});

test("recognizes an account with no synced Good Detour data", () => {
  assert.equal(fromSyncItems({ unrelatedExtensionKey: true }), null);
});
