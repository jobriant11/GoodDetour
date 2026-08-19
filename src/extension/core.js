export const STORAGE_KEY = "goodDetourState";
export const SYNC_SETTINGS_KEY = "goodDetourSyncSettings";
export const SYNC_RULE_PREFIX = "goodDetourSyncRule:";
export const SYNC_ENABLED_KEY = "goodDetourSyncEnabled";
export const LOCAL_STATS_KEY = "goodDetourLocalStats";
export const STATE_VERSION = 2;
export const MAX_RULES = 20;

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

export function createRule(input, existingRules = []) {
  const sourceHost = normalizeHostname(input.sourceHost);
  const destinationUrl = normalizeUrl(input.destinationUrl);
  const destinationHost = normalizeHostname(destinationUrl);
  const mode = input.mode === "direct" ? "direct" : "pause";

  if (!sourceHost) throw new Error("Enter a valid source site, such as cnn.com.");
  if (!destinationUrl) throw new Error("Enter a valid HTTP or HTTPS destination.");
  if (destinationUrl.length > 2048) throw new Error("Destination URLs must be 2,048 characters or fewer.");
  if (sourceHost === destinationHost) throw new Error("Source and destination cannot be the same site.");
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
    destinationUrl,
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
  const graph = new Map(
    rules.map((rule) => [rule.sourceHost, normalizeHostname(rule.destinationUrl)]),
  );
  for (const start of graph.keys()) {
    const path = [];
    const positions = new Map();
    let current = start;
    while (graph.has(current)) {
      if (positions.has(current)) {
        return path.slice(positions.get(current)).concat(current);
      }
      positions.set(current, path.length);
      path.push(current);
      current = graph.get(current);
    }
  }
  return null;
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
          rule.mode === "direct"
            ? { url: rule.destinationUrl }
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
    preferences: { ...defaults.preferences, ...(value.preferences || {}) },
    localStats: { ...defaults.localStats, ...(value.localStats || {}) },
    rules: Array.isArray(value.rules) ? value.rules : []
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
  assertRuleLimit(state.rules);
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
