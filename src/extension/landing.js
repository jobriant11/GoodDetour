import { normalizeHostname } from "./core.js";
import { sendMessage } from "./platform.js";

const id = new URLSearchParams(location.search).get("rule");
const title = document.querySelector("#landing-title");
const copy = document.querySelector("#landing-message");
const route = document.querySelector("#route");
const countdown = document.querySelector("#countdown");
const go = document.querySelector("#go-now");
const stay = document.querySelector("#stay");
const disable = document.querySelector("#disable");
const error = document.querySelector("#landing-error");
let timer;

async function message(payload) {
  const response = await sendMessage(payload);
  if (!response?.ok) throw new Error(response?.error || "Something went wrong.");
  return response.result;
}

try {
  const state = await message({ type: "state:get" });
  const rule = state.rules.find((candidate) => candidate.id === id);
  if (!rule) throw new Error("This redirect no longer exists. You can close this tab.");

  title.textContent = state.preferences.landingTitle;
  copy.textContent = state.preferences.landingMessage;
  route.textContent = `${rule.sourceHost} → ${normalizeHostname(rule.destinationUrl)}`;
  await message({ type: "pause:count" });

  const navigate = () => location.replace(rule.destinationUrl);
  let remaining = state.preferences.pauseSeconds;
  const tick = () => {
    countdown.textContent = `Continuing in ${remaining} ${remaining === 1 ? "second" : "seconds"}…`;
    if (remaining <= 0) navigate();
    remaining -= 1;
  };
  tick();
  timer = setInterval(tick, 1000);
  go.addEventListener("click", navigate);
  stay.addEventListener("click", () => {
    clearInterval(timer);
    countdown.textContent = "Timer paused. Take the moment you need.";
    stay.disabled = true;
  });
  disable.addEventListener("click", async () => {
    clearInterval(timer);
    await message({ type: "rule:toggle", id: rule.id, enabled: false });
    countdown.textContent = "Rule turned off.";
    disable.disabled = true;
  });
} catch (caught) {
  error.textContent = caught.message;
  error.classList.remove("hidden");
  route.classList.add("hidden");
  countdown.classList.add("hidden");
  go.classList.add("hidden");
  stay.classList.add("hidden");
  disable.classList.add("hidden");
}

