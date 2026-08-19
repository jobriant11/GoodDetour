import { normalizeHostname } from "./core.js";
import { getActiveTab, sendMessage } from "./platform.js";

const current = document.querySelector("#current-site");
const add = document.querySelector("#add-current");
const manage = document.querySelector("#manage");
const toggle = document.querySelector("#global-toggle");
const notice = document.querySelector("#popup-notice");
let hostname = "";

async function message(payload) {
  const response = await sendMessage(payload);
  if (!response?.ok) throw new Error(response?.error || "Something went wrong.");
  return response.result;
}

try {
  const [tab, state] = await Promise.all([getActiveTab(), message({ type: "state:get" })]);
  hostname = normalizeHostname(tab?.url);
  current.textContent = hostname || "This page cannot be redirected";
  add.disabled = !hostname;
  toggle.checked = state.enabled;
} catch (error) {
  current.textContent = "This page cannot be read";
  add.disabled = true;
}

add.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL(`options.html?source=${encodeURIComponent(hostname)}`) });
  window.close();
});
manage.addEventListener("click", () => chrome.runtime.openOptionsPage());
toggle.addEventListener("change", async () => {
  try {
    await message({ type: "global:toggle", enabled: toggle.checked });
  } catch (error) {
    notice.textContent = error.message;
    notice.classList.remove("hidden");
  }
});

