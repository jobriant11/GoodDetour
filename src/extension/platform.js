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

export function requestHostPermissions(hostnames) {
  const origins = [];
  for (const hostname of new Set(hostnames)) {
    origins.push(`*://${hostname}/*`);
    const isDnsName = hostname.includes(".") && !/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
    if (isDnsName) origins.push(`*://*.${hostname}/*`);
  }
  return api.permissions.request({ origins });
}
