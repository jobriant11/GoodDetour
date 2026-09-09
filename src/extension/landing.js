import { normalizeHostname, resolveRedirect } from "./core.js";
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
const card = document.querySelector("main");
let timer;

async function message(payload) {
  const response = await sendMessage(payload);
  if (!response?.ok) throw new Error(response?.error || "Something went wrong.");
  return response.result;
}

try {
  const state = await message({ type: "state:get" });
  const { rule, destinationUrl } = resolveRedirect(state, id);
  if (rule.mode === "direct") {
    location.replace(destinationUrl);
  } else {
    card.classList.remove("hidden");
    title.textContent = state.preferences.landingTitle;
    copy.textContent = state.preferences.landingMessage;
    route.textContent = `${rule.sourceHost} → ${normalizeHostname(destinationUrl)}`;
    await message({ type: "pause:count" });

    const navigate = () => { clearInterval(timer); location.replace(destinationUrl); };
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
      go.disabled = true;
      disable.disabled = true;
    });
  }
} catch (caught) {
  card.classList.remove("hidden");
  error.textContent = caught.message;
  error.classList.remove("hidden");
  route.classList.add("hidden");
  countdown.classList.add("hidden");
  go.classList.add("hidden");
  stay.classList.add("hidden");
  disable.classList.add("hidden");
}
