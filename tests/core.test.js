import test from "node:test";
import assert from "node:assert/strict";
import {
  assertRuleLimit,
  compileRules,
  chooseDestination,
  createRule,
  defaultState,
  destinationUrls,
  findCycle,
  fromSyncItems,
  MAX_RULES,
  MAX_DESTINATIONS,
  mergeState,
  normalizeHostname,
  normalizeUrl,
  portableState,
  resolveRedirect,
  SYNC_RULE_PREFIX,
  SYNC_SETTINGS_KEY,
  syncStorageUsage,
  toSyncItems,
  validateRules
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

test("caps configuration and compiled redirects at twenty detours", () => {
  const rules = [];
  for (let index = 0; index < MAX_RULES; index += 1) {
    rules.push(createRule({
      id: `rule-${index}`,
      sourceHost: `source-${index}.example`,
      destinationUrl: `https://destination-${index}.example/`
    }, rules));
  }
  assert.equal(rules.length, 20);
  assert.throws(
    () => createRule({ sourceHost: "too-many.example", destinationUrl: "https://safe.example/" }, rules),
    /up to 20 detours/,
  );
  assert.doesNotThrow(() => createRule({
    ...rules[0],
    destinationUrl: "https://updated.example/"
  }, rules));

  const twentyOne = rules.concat({ ...rules[0], id: "rule-20", sourceHost: "source-20.example" });
  assert.equal(compileRules(twentyOne).length, 20);
  assert.throws(() => assertRuleLimit(twentyOne), /up to 20 detours/);
  assert.throws(() => toSyncItems({ ...defaultState(), rules: twentyOne }), /up to 20 detours/);
});

test("migrates a legacy URL and retains multiple destinations through backup and Sync", () => {
  const legacy = { id: "legacy", sourceHost: "old.test", destinationUrl: "https://safe.test/", mode: "direct" };
  const multiple = createRule({ id: "many", sourceHost: "many.test", destinationUrls: ["a.test", "b.test"] });
  const state = mergeState({ version: 2, rules: [legacy, multiple], localStats: { totalPauses: 9 } });
  assert.equal(state.version, 3);
  assert.deepEqual(state.rules[0].destinationUrls, ["https://safe.test/"]);
  assert.equal(state.rules[0].id, "legacy");
  const backup = JSON.parse(JSON.stringify(portableState(state)));
  const imported = validateRules(backup.rules);
  assert.deepEqual(imported.map(destinationUrls), state.rules.map(destinationUrls));
  const synced = fromSyncItems(toSyncItems(state));
  assert.deepEqual(synced.rules.map(destinationUrls), state.rules.map(destinationUrls));
  assert.equal(synced.localStats.totalPauses, 0);
  assert.equal(JSON.stringify(toSyncItems(state)).includes("totalPauses"), false);
});

test("validates every destination and rejects every possible cycle including subdomains", () => {
  const input = { sourceHost: "source.test", destinationUrls: ["a.test", "b.test", "https://a.test/"] };
  assert.deepEqual(createRule(input).destinationUrls, ["https://a.test/", "https://b.test/"]);
  for (const invalid of ["javascript:alert(1)", "ftp://files.test", "", null, "https://source.test", "https://child.source.test/path"]) {
    assert.throws(() => createRule({ ...input, destinationUrls: ["a.test", invalid] }));
  }
  assert.throws(() => createRule({ ...input, destinationUrls: [] }), /at least one/);
  assert.throws(() => createRule({ ...input, destinationUrls: "https://a.test" }), /at least one/);
  assert.throws(() => createRule({ ...input, destinationUrls: Array(MAX_DESTINATIONS + 1).fill("a.test") }), /up to 10/);
  const first = createRule({ id: "one", sourceHost: "one.test", destinationUrls: ["safe.test", "child.two.test"] });
  const second = createRule({ id: "two", sourceHost: "two.test", destinationUrls: ["safe.test", "three.test"] }, [first]);
  assert.throws(() => createRule({ sourceHost: "three.test", destinationUrls: ["safe.test", "child.one.test"] }, [first, second]), /redirect loop/);
  const disabled = { id: "three", sourceHost: "three.test", destinationUrl: "https://one.test/", enabled: false };
  assert.doesNotThrow(() => validateRules([first, second, disabled]));
  assert.throws(() => validateRules([first, second, { ...disabled, enabled: true }]), /redirect loop/);
  assert.throws(() => toSyncItems({ ...defaultState(), rules: [first, second, { ...disabled, enabled: true }] }), /redirect loop/);
});

test("gives each unique destination an equal interval and chooses afresh per visit", () => {
  const rule = createRule({ id: "many", sourceHost: "many.test", destinationUrls: ["a.test", "b.test", "c.test", "a.test"] });
  const counts = new Map();
  for (let index = 0; index < 300; index += 1) {
    const url = chooseDestination(rule, () => (index + 0.5) / 300);
    counts.set(url, (counts.get(url) || 0) + 1);
  }
  assert.deepEqual([...counts.values()], [100, 100, 100]);
  const state = { ...defaultState(), rules: [rule] };
  assert.equal(resolveRedirect(state, rule.id, () => 0).destinationUrl, "https://a.test/");
  assert.equal(resolveRedirect(state, rule.id, () => 0.999999).destinationUrl, "https://c.test/");
  assert.throws(() => resolveRedirect({ ...state, enabled: false }, rule.id), /paused/);
  assert.throws(() => resolveRedirect({ ...state, rules: [{ ...rule, enabled: false }] }, rule.id), /no longer active/);
  assert.throws(() => resolveRedirect(state, "deleted"), /no longer active/);
});

test("multiple direct destinations use a per-visit relay while single direct URLs remain native", () => {
  const direct = createRule({ id: "direct", sourceHost: "direct.test", destinationUrls: ["a.test", "b.test"], mode: "direct" });
  const paused = { ...direct, id: "pause", sourceHost: "pause.test", mode: "pause" };
  const single = createRule({ id: "single", sourceHost: "single.test", destinationUrl: "safe.test", mode: "direct" });
  const compiled = compileRules([direct, paused, single, { ...direct, id: "off", enabled: false }]);
  assert.deepEqual(compiled.map((rule) => rule.action.redirect), [
    { extensionPath: "/landing.html?rule=direct" },
    { extensionPath: "/landing.html?rule=pause" },
    { url: "https://safe.test/" }
  ]);
  assert.deepEqual(compileRules([direct], false), []);
});
