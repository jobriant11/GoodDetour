const api = globalThis.browser ?? globalThis.chrome;

export function storageGet(key, area = "local") {
  return api.storage[area].get(key);
}

export function storageSet(value, area = "local") {
  return api.storage[area].set(value);
}

export function storageRemove(keys, area = "local") {
  return api.storage[area].remove(keys);
}

export function sendMessage(message) {
  return api.runtime.sendMessage(message);
}

export function openOptionsPage() {
  return api.runtime.openOptionsPage();
}

export function getActiveTab() {
  return api.tabs.query({ active: true, currentWindow: true }).then((tabs) => tabs[0]);
}

export function requestHostPermission(hostname) {
  return requestHostPermissions([hostname]);
}

export function buildHostOrigins(hostnames) {
  const origins = [];
  for (const hostname of new Set(hostnames)) {
    const isDnsName = hostname.includes(".") && !/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
    for (const scheme of ["http", "https"]) {
      origins.push(`${scheme}://${hostname}/*`);
      if (isDnsName) origins.push(`${scheme}://*.${hostname}/*`);
    }
  }
  return origins;
}

export function requestHostPermissions(hostnames) {
  return api.permissions.request({ origins: buildHostOrigins(hostnames) });
}

export function hasHostPermission(hostname) {
  return api.permissions.contains({ origins: buildHostOrigins([hostname]) });
}

export async function getMissingHostPermissions(hostnames) {
  const unique = [...new Set(hostnames)];
  const checks = await Promise.all(unique.map(async (hostname) => ({
    hostname,
    granted: await hasHostPermission(hostname)
  })));
  return checks.filter((item) => !item.granted).map((item) => item.hostname);
}

export function addStorageChangedListener(listener) {
  api.storage.onChanged.addListener(listener);
}
