import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRule, defaultState, findCycle, MAX_RULES, mergeState, syncStorageUsage, toSyncItems } from "../src/extension/core.js";

const source = await readFile(new URL("../src/extension/options.js", import.meta.url), "utf8");
const registration = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const handlers = registration('elements.preferencesForm.addEventListener', 'elements.exportButton.addEventListener') +
  registration('elements.importFile.addEventListener', 'elements.syncToggle.addEventListener');

function optionsFixture() {
  const initial = {
    ...defaultState(),
    rules: [
      createRule({ id: "one", sourceHost: "one.test", destinationUrl: "https://keep-one.test/" }),
      createRule({ id: "two", sourceHost: "two.test", destinationUrl: "https://keep-two.test/" })
    ]
  };
  const events = {};
  const elements = {
    preferencesForm: { addEventListener(_type, handler) { events.preferences = handler; } },
    preferencesNotice: {},
    landingTitle: { value: "New title" },
    landingMessage: { value: "New message" },
    pauseSeconds: { value: "12" },
    importFile: { files: [], value: "backup.json", addEventListener(_type, handler) { events.import = handler; } },
    backupNotice: {}
  };
  let failSave = false;
  let persisted = initial;
  const notices = [];
  const setup = new Function("elements", "initial", "createRule", "findCycle", "MAX_RULES", "mergeState", "requestHostPermissions", "message", "showNotice", "render", "refreshSyncUi",
    `let state = initial; ${handlers}; return () => state;`);
  const getState = setup(elements, initial, createRule, findCycle, MAX_RULES, mergeState, async () => true,
    async ({ state }) => {
      if (failSave || syncStorageUsage(toSyncItems(state)).largestItemBytes > 8000) {
        throw new Error("Chrome Sync could not save these changes.");
      }
      persisted = structuredClone(state);
      return persisted;
    },
    (_element, text, error = false) => notices.push({ text, error }), () => {}, async () => {});
  return {
    initial, elements, notices, getState,
    persisted: () => persisted,
    failSave: (value) => { failSave = value; },
    async import(value) {
      elements.importFile.files = [{ text: async () => JSON.stringify(value) }];
      await events.import();
    },
    savePreferences: () => events.preferences({ preventDefault() {} })
  };
}

test("a valid import rejected by Sync leaves current routes and preferences intact", async () => {
  const fixture = optionsFixture();
  const imported = {
    rules: [
      createRule({ id: "one", sourceHost: "one.test", destinationUrls: Array.from({ length: 5 }, (_, i) => `https://large${i}.test/${"a".repeat(1800)}`) }),
      createRule({ id: "imported", sourceHost: "imported.test", destinationUrl: "https://other.test/" })
    ]
  };
  assert.ok(syncStorageUsage(toSyncItems(imported)).largestItemBytes > 8000);
  await fixture.import(imported);
  assert.equal(fixture.getState(), fixture.initial);
  assert.equal(fixture.persisted(), fixture.initial);
  assert.equal(fixture.notices.at(-1).error, true);
  assert.equal(fixture.elements.importFile.value, "");
  // A later successful save must use the original routes, never the rejected import.
  await fixture.savePreferences();
  assert.deepEqual(fixture.persisted().rules.map(rule => rule.id), ["one", "two"]);
});

test("failed pause-page save preserves the previous preference object and can be retried", async () => {
  const fixture = optionsFixture();
  const before = structuredClone(fixture.initial);
  fixture.failSave(true);
  await fixture.savePreferences();
  assert.equal(fixture.getState(), fixture.initial);
  assert.deepEqual(fixture.getState(), before);
  assert.equal(fixture.notices.at(-1).error, true);
  fixture.failSave(false);
  await fixture.savePreferences();
  assert.equal(fixture.getState().preferences.landingTitle, "New title");
  assert.equal(fixture.getState().preferences.pauseSeconds, 12);
  assert.equal(fixture.notices.at(-1).error, false);
  assert.deepEqual(fixture.initial, before);
});

test("successful imports replace the current state only with the saved response", async () => {
  const fixture = optionsFixture();
  await fixture.import({ rules: [createRule({ id: "new", sourceHost: "new.test", destinationUrls: ["a.test", "b.test"] })] });
  assert.equal(fixture.getState(), fixture.persisted());
  assert.deepEqual(fixture.getState().rules.map(rule => rule.id), ["new"]);
  assert.equal(fixture.notices.at(-1).error, false);
});
