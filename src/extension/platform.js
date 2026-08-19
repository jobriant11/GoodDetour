const api = globalThis.browser ?? globalThis.chrome;

export function storageGet(key) {
  return api.storage.local.get(key);
}

export function storageSet(value) {
  return api.storage.local.set(value);
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
