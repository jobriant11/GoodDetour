import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { APPEARANCE_KEY, STORAGE_KEY } from "../src/extension/core.js";
import { initializeAppearance, normalizeAppearance } from "../src/extension/theme.js";

function events() {
  const listeners = new Set();
  return {
    addListener(listener) { listeners.add(listener); },
    removeListener(listener) { listeners.delete(listener); },
    async emit(...args) { await Promise.all([...listeners].map(listener => listener(...args))); }
  };
}

function browserFixture(value, dark = false) {
  const changes = events();
  const data = { [STORAGE_KEY]: { rules: [{ id: "keep-me" }] } };
  if (value !== undefined) data[APPEARANCE_KEY] = value;
  const storage = {
    onChanged: changes,
    local: {
      async get(key) { return { [key]: data[key] }; },
      async set(values) {
        const updates = {};
        for (const [key, next] of Object.entries(values)) {
          updates[key] = { oldValue: data[key], newValue: next };
          data[key] = next;
        }
        await changes.emit(updates, "local");
      }
    }
  };
  function page(withControl = true) {
    const systemEvents = events();
    const controlEvents = events();
    const media = {
      matches: dark,
      addEventListener(_type, listener) { systemEvents.addListener(listener); },
      removeEventListener(_type, listener) { systemEvents.removeListener(listener); }
    };
    const select = withControl ? {
      value: "system", disabled: true,
      addEventListener(_type, listener) { controlEvents.addListener(listener); },
      removeEventListener(_type, listener) { controlEvents.removeListener(listener); }
    } : null;
    const classes = new Set();
    const notice = { textContent: "", classList: {
      toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); }
    } };
    const root = { dataset: {} };
    return {
      root, select, media, notice, classes,
      async open() { return initializeAppearance({ root, select, media, notice, storage }); },
      async choose(next) { select.value = next; await controlEvents.emit(); },
      async changeSystem(next) { media.matches = next; await systemEvents.emit(); }
    };
  }
  return { data, storage, changes, page };
}

test("new and invalid preferences follow the system, including live system changes", async () => {
  for (const value of [undefined, null, "invalid", {}, "system"]) {
    assert.equal(normalizeAppearance(value), "system");
    const fixture = browserFixture(value, true);
    const page = fixture.page();
    await page.open();
    assert.equal(page.root.dataset.theme, "dark");
    assert.equal(page.select.value, "system");
    await page.changeSystem(false);
    assert.equal(page.root.dataset.theme, "light");
    assert.deepEqual(fixture.data[STORAGE_KEY], { rules: [{ id: "keep-me" }] });
  }
});

test("explicit choice persists, overrides the system, and updates other open pages", async () => {
  const fixture = browserFixture("light", true);
  const options = fixture.page();
  const popup = fixture.page();
  const landing = fixture.page(false);
  await Promise.all([options.open(), popup.open(), landing.open()]);
  assert.equal(options.root.dataset.theme, "light");
  await options.choose("dark");
  assert.equal(fixture.data[APPEARANCE_KEY], "dark");
  assert.equal(popup.select.value, "dark");
  assert.equal(landing.root.dataset.theme, "dark");
  await options.changeSystem(false);
  assert.equal(options.root.dataset.theme, "dark");
  const reopened = fixture.page();
  await reopened.open();
  assert.equal(reopened.root.dataset.theme, "dark");
  await popup.choose("system");
  assert.equal(options.root.dataset.theme, "light");
  assert.equal(popup.root.dataset.theme, "dark");
  assert.deepEqual(fixture.data[STORAGE_KEY], { rules: [{ id: "keep-me" }] });
});

test("local reset restores System while irrelevant and synced changes are ignored", async () => {
  const fixture = browserFixture("dark", false);
  const page = fixture.page();
  await page.open();
  await fixture.changes.emit({ [APPEARANCE_KEY]: { newValue: "light" } }, "sync");
  await fixture.changes.emit({ [STORAGE_KEY]: { newValue: {} } }, "local");
  assert.equal(page.root.dataset.theme, "dark");
  await fixture.changes.emit({ [APPEARANCE_KEY]: { oldValue: "dark" } }, "local");
  assert.equal(page.root.dataset.theme, "light");
  assert.equal(page.select.value, "system");
});

test("a failed save restores the persisted appearance and offers a retry", async () => {
  const fixture = browserFixture("light", true);
  const page = fixture.page();
  await page.open();
  const save = fixture.storage.local.set;
  fixture.storage.local.set = async () => { throw new Error("storage unavailable"); };
  await page.choose("dark");
  assert.equal(page.root.dataset.theme, "light");
  assert.equal(page.select.value, "light");
  assert.equal(page.select.disabled, false);
  assert.equal(page.classes.has("error"), true);
  assert.match(page.notice.textContent, /could not be saved/);
  fixture.storage.local.set = save;
  await page.choose("dark");
  assert.equal(page.root.dataset.theme, "dark");
  assert.equal(page.classes.has("error"), false);
});

test("a failed initial read leaves a working control and system appearance", async () => {
  const fixture = browserFixture(undefined, true);
  fixture.storage.local.get = async () => { throw new Error("unavailable"); };
  const page = fixture.page();
  await page.open();
  assert.equal(page.root.dataset.theme, "dark");
  assert.equal(page.select.disabled, false);
  assert.match(page.notice.textContent, /could not be loaded/);
  await page.choose("light");
  assert.equal(page.root.dataset.theme, "light");
});

test("a new storage event wins over an initial read still in flight", async () => {
  const fixture = browserFixture("light");
  let resolveRead;
  fixture.storage.local.get = () => new Promise(resolve => { resolveRead = resolve; });
  const page = fixture.page();
  const opening = page.open();
  await fixture.storage.local.set({ [APPEARANCE_KEY]: "dark" });
  resolveRead({ [APPEARANCE_KEY]: "light" });
  await opening;
  assert.equal(page.root.dataset.theme, "dark");
  assert.equal(page.select.value, "dark");
});

test("both palettes maintain readable text, controls, and keyboard focus", async () => {
  const css = await readFile(new URL("../src/extension/styles.css", import.meta.url), "utf8");
  const palette = selector => Object.fromEntries([...css.match(selector)[1].matchAll(/--([\w-]+): (#[\da-f]{6})/g)].map(match => [match[1], match[2]]));
  const light = palette(/:root \{([\s\S]*?)\}/);
  const dark = { ...light, ...palette(/:root\[data-theme="dark"\] \{([\s\S]*?)\}/) };
  function luminance(hex) {
    const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  function contrast(a, b) {
    const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  }
  for (const [name, colors] of Object.entries({ light, dark })) {
    for (const [foreground, background] of [
      ["ink", "paper"], ["ink", "panel"], ["ink", "field"], ["ink", "mint"], ["ink", "soft-surface"],
      ["muted", "paper"], ["muted", "panel"], ["muted", "field"], ["green", "paper"], ["green", "panel"],
      ["button-ink", "green"], ["button-ink", "green-dark"], ["danger", "danger-surface"], ["danger", "paper"]
    ]) assert.ok(contrast(colors[foreground], colors[background]) >= 4.5, `${name}: ${foreground} on ${background}`);
    for (const [foreground, background] of [["control-line", "field"], ["focus", "paper"], ["focus", "panel"]]) {
      assert.ok(contrast(colors[foreground], colors[background]) >= 3, `${name}: ${foreground} on ${background}`);
    }
  }
});
