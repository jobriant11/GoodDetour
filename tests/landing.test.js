import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRule, defaultState, normalizeHostname, resolveRedirect } from "../src/extension/core.js";

const source = (await readFile(new URL("../src/extension/landing.js", import.meta.url), "utf8"))
  .replace(/^import .*;\n/gm, "");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function visit({ mode = "pause", enabled = true, globalEnabled = true, sample = 0.75 } = {}) {
  const nodes = new Map();
  const node = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, {
      textContent: "", disabled: false, listeners: {}, classes: new Set(["hidden"]),
      classList: {
        remove(name) { node(selector).classes.delete(name); },
        add(name) { node(selector).classes.add(name); }
      },
      addEventListener(name, handler) { this.listeners[name] = handler; }
    });
    return nodes.get(selector);
  };
  const rule = createRule({ id: "rule", sourceHost: "source.test", destinationUrls: ["a.test", "b.test"], mode, enabled });
  const state = { ...defaultState(), enabled: globalEnabled, rules: [rule] };
  const messages = [];
  const navigations = [];
  let timer;
  let choices = 0;
  const execute = new AsyncFunction("document", "location", "URLSearchParams", "sendMessage", "normalizeHostname", "resolveRedirect", "setInterval", "clearInterval", source);
  await execute(
    { querySelector: node },
    { search: "?rule=rule", replace: (url) => navigations.push(url) },
    URLSearchParams,
    async (message) => { messages.push(message); return { ok: true, result: message.type === "state:get" ? state : {} }; },
    normalizeHostname,
    (value, id) => resolveRedirect(value, id, () => { choices += 1; return sample; }),
    (callback) => { timer = callback; return 1; },
    () => { timer = null; }
  );
  return { nodes, messages, navigations, node, choices, tick: () => timer?.() };
}

test("direct multiple-URL visits navigate immediately without a visible pause or pause count", async () => {
  const result = await visit({ mode: "direct" });
  assert.deepEqual(result.navigations, ["https://b.test/"]);
  assert.deepEqual(result.messages.map((message) => message.type), ["state:get"]);
  assert.equal(result.node("main").classes.has("hidden"), true);
  assert.equal(result.choices, 1);
});

test("a paused visit shows and consistently uses its one selected destination", async () => {
  const result = await visit();
  assert.equal(result.node("#route").textContent, "source.test → b.test");
  assert.equal(result.node("main").classes.has("hidden"), false);
  assert.deepEqual(result.messages.map((message) => message.type), ["state:get", "pause:count"]);
  assert.deepEqual(result.navigations, []);
  result.node("#go-now").listeners.click();
  result.tick();
  assert.deepEqual(result.navigations, ["https://b.test/"]);
  assert.equal(result.choices, 1);
});

test("pause countdown and stay controls preserve the selected destination", async () => {
  const timerVisit = await visit({ sample: 0 });
  for (let second = 0; second < 10; second += 1) timerVisit.tick();
  assert.deepEqual(timerVisit.navigations, ["https://a.test/"]);
  const stayVisit = await visit();
  stayVisit.node("#stay").listeners.click();
  for (let second = 0; second < 10; second += 1) stayVisit.tick();
  assert.deepEqual(stayVisit.navigations, []);
  stayVisit.node("#go-now").listeners.click();
  assert.deepEqual(stayVisit.navigations, ["https://b.test/"]);
  const disabledVisit = await visit();
  await disabledVisit.node("#disable").listeners.click();
  for (let second = 0; second < 10; second += 1) disabledVisit.tick();
  assert.deepEqual(disabledVisit.navigations, []);
  assert.equal(disabledVisit.node("#go-now").disabled, true);
});

test("disabled redirects show an error and never choose or navigate", async () => {
  for (const input of [{ enabled: false }, { globalEnabled: false }]) {
    const result = await visit(input);
    assert.deepEqual(result.navigations, []);
    assert.equal(result.choices, 0);
    assert.equal(result.node("#landing-error").classes.has("hidden"), false);
    assert.equal(result.node("main").classes.has("hidden"), false);
  }
});
