export const STORAGE_KEY = "goodDetourState";
export const APPEARANCE_KEY = "goodDetourAppearance";
export const SYNC_SETTINGS_KEY = "goodDetourSyncSettings";
export const SYNC_RULE_PREFIX = "goodDetourSyncRule:";
export const SYNC_ENABLED_KEY = "goodDetourSyncEnabled";
export const LOCAL_STATS_KEY = "goodDetourLocalStats";
export const STATE_VERSION = 3;
export const MAX_RULES = 20;
export const MAX_DESTINATIONS = 10;

export const suggestions = [
  { name: "Associated Press", url: "https://apnews.com/", note: "Straightforward global reporting" },
  { name: "NPR", url: "https://www.npr.org/", note: "News, culture, and thoughtful audio" },
  { name: "Hacker News", url: "https://news.ycombinator.com/", note: "Technology and startup discussion" },
  { name: "TED Talks", url: "https://www.youtube.com/@TED", note: "Ideas and talks worth your time" },
  { name: "Wikipedia: Random", url: "https://en.wikipedia.org/wiki/Special:Random", note: "Learn something unexpected" },
  { name: "Internet Archive", url: "https://archive.org/", note: "Books, media, and web history" }
];

export function defaultState() {
  return {
    version: STATE_VERSION,
    enabled: true,
    rules: [],
    preferences: {
      defaultMode: "pause",
      pauseSeconds: 8,
      landingTitle: "A small pause can change the next hour.",
      landingMessage: "You asked Good Detour to interrupt this habit. Continue somewhere more intentional, or turn the rule off."
    },
    localStats: { totalPauses: 0 }
  };
}

export function normalizeHostname(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol)) return "";
    return url.hostname.replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return "";
  }
}

export function normalizeUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

export function destinationUrls(rule) {
  const values = rule.destinationUrls === undefined ? [rule.destinationUrl] : rule.destinationUrls;
  if (!Array.isArray(values) || values.length === 0) throw new Error("Enter at least one destination URL.");
  if (values.length > MAX_DESTINATIONS) throw new Error(`Each detour supports up to ${MAX_DESTINATIONS} destinations.`);
  const urls = values.map((value) => {
    if (typeof value !== "string") throw new Error("Enter a valid HTTP or HTTPS destination on every line.");
    const url = normalizeUrl(value);
    if (!url) throw new Error("Enter a valid HTTP or HTTPS destination on every line.");
    if (url.length > 2048) throw new Error("Destination URLs must be 2,048 characters or fewer.");
    return url;
  });
  // Repeated URLs must not receive extra weight in the random selection.
  return [...new Set(urls)];
}

function matchesSource(host, source) {
  return host === source || host.endsWith(`.${source}`);
}

export function createRule(input, existingRules = []) {
  const sourceHost = normalizeHostname(input.sourceHost);
  const destinations = destinationUrls(input);
  const mode = input.mode === "direct" ? "direct" : "pause";

  if (!sourceHost) throw new Error("Enter a valid source site, such as cnn.com.");
  if (destinations.some((url) => matchesSource(normalizeHostname(url), sourceHost))) {
    throw new Error("Source and destination cannot be the same site or its subdomains.");
  }
  const editingExistingRule = Boolean(input.id && existingRules.some((rule) => rule.id === input.id));
  if (!editingExistingRule && existingRules.length >= MAX_RULES) {
    throw new Error(`Good Detour supports up to ${MAX_RULES} detours for now.`);
  }

  const duplicate = existingRules.find(
    (rule) => rule.sourceHost === sourceHost && rule.id !== input.id,
  );
  if (duplicate) throw new Error(`A redirect for ${sourceHost} already exists.`);

  const rule = {
    id: input.id || crypto.randomUUID(),
    sourceHost,
    destinationUrl: destinations[0],
    destinationUrls: destinations,
    mode,
    enabled: input.enabled !== false,
    label: String(input.label || sourceHost).trim().slice(0, 80),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const nextRules = existingRules.filter((candidate) => candidate.id !== rule.id).concat(rule);
  const cycle = findCycle(nextRules.filter((candidate) => candidate.enabled));
  if (cycle) throw new Error(`That creates a redirect loop: ${cycle.join(" → ")}.`);
  return rule;
}

export function findCycle(rules) {
  const sources = rules.map((rule) => rule.sourceHost);
  const graph = new Map(rules.map((rule) => [rule.sourceHost,
    sources.filter((source) => destinationUrls(rule).some((url) => matchesSource(normalizeHostname(url), source)))
  ]));
  const visited = new Set();
  const path = [];
  function visit(source) {
    const position = path.indexOf(source);
    if (position !== -1) return path.slice(position).concat(source);
    if (visited.has(source)) return null;
    path.push(source);
    for (const next of graph.get(source) || []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    path.pop();
    visited.add(source);
    return null;
  }
  for (const source of sources) {
    const cycle = visit(source);
    if (cycle) return cycle;
  }
  return null;
}

export function validateRules(rules) {
  assertRuleLimit(rules);
  const validated = [];
  for (const rule of rules) {
    if (!rule || typeof rule !== "object") throw new Error("Every detour must contain a valid rule.");
    if (rule.id && validated.some((candidate) => candidate.id === rule.id)) throw new Error("Duplicate rule identifiers.");
    const result = createRule(rule, validated);
    validated.push({ ...result, updatedAt: rule.updatedAt || result.updatedAt });
  }
  return validated;
}

export function chooseDestination(rule, random = Math.random) {
  const urls = destinationUrls(rule);
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new Error("Could not choose a destination.");
  return urls[Math.floor(sample * urls.length)];
}

export function resolveRedirect(state, ruleId, random = Math.random) {
  if (!state.enabled) throw new Error("Good Detour is paused. You can close this tab.");
  const rule = validateRules(state.rules).find((candidate) => candidate.id === ruleId);
  if (!rule || !rule.enabled) throw new Error("This redirect is no longer active. You can close this tab.");
  return { rule, destinationUrl: chooseDestination(rule, random) };
}

export function compileRules(rules, globallyEnabled = true) {
  if (!globallyEnabled) return [];
  return rules
    .filter((rule) => rule.enabled)
    .slice(0, MAX_RULES)
    .map((rule, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect:
          rule.mode === "direct" && destinationUrls(rule).length === 1
            ? { url: destinationUrls(rule)[0] }
            : { extensionPath: `/landing.html?rule=${encodeURIComponent(rule.id)}` }
      },
      condition: {
        requestDomains: [rule.sourceHost],
        resourceTypes: ["main_frame"]
      }
    }));
}

export function mergeState(value) {
  const defaults = defaultState();
  if (!value || typeof value !== "object") return defaults;
  return {
    ...defaults,
    ...value,
    version: STATE_VERSION,
    preferences: { ...defaults.preferences, ...(value.preferences || {}) },
    localStats: { ...defaults.localStats, ...(value.localStats || {}) },
    rules: Array.isArray(value.rules) ? value.rules.map((rule) => {
      const destinations = destinationUrls(rule);
      return { ...rule, destinationUrl: destinations[0], destinationUrls: destinations };
    }) : []
  };
}

export function portableState(value) {
  const state = mergeState(value);
  return {
    version: STATE_VERSION,
    enabled: state.enabled,
    rules: state.rules,
    preferences: state.preferences
  };
}

export function toSyncItems(value) {
  const state = portableState(value);
  state.rules = validateRules(state.rules);
  const items = {
    [SYNC_SETTINGS_KEY]: {
      version: state.version,
      enabled: state.enabled,
      preferences: state.preferences
    }
  };
  for (const rule of state.rules) {
    items[`${SYNC_RULE_PREFIX}${encodeURIComponent(rule.id)}`] = rule;
  }
  return items;
}

export function assertRuleLimit(rules) {
  if (!Array.isArray(rules) || rules.length <= MAX_RULES) return;
  throw new Error(`Good Detour supports up to ${MAX_RULES} detours for now.`);
}

export function fromSyncItems(items) {
  const settings = items?.[SYNC_SETTINGS_KEY];
  if (!settings || typeof settings !== "object") return null;
  const rules = Object.entries(items)
    .filter(([key, value]) => key.startsWith(SYNC_RULE_PREFIX) && value && typeof value === "object")
    .map(([, value]) => value)
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  return mergeState({ ...settings, rules });
}

export function syncStorageUsage(items) {
  const encoder = new TextEncoder();
  const itemBytes = Object.entries(items).map(
    ([key, value]) => encoder.encode(key + JSON.stringify(value)).byteLength,
  );
  return {
    itemCount: itemBytes.length,
    totalBytes: itemBytes.reduce((total, bytes) => total + bytes, 0),
    largestItemBytes: Math.max(0, ...itemBytes)
  };
}
