# Architecture and roadmap

## Current design

Good Detour is a dependency-free Manifest V3 extension.

- `core.js` owns normalization, validation, cycle detection, state defaults, and browser-neutral rule compilation.
- `platform.js` isolates WebExtension API differences.
- `background.js` is the only state mutation and dynamic-rule synchronization authority.
- `options.js`, `popup.js`, and `landing.js` are extension pages with no inline or remote scripts.
- Chrome storage is local. There is no backend, account, telemetry endpoint, or remote configuration.
- Host access is optional and requested for each source domain from a user gesture.
- Dynamic rules apply only to top-level page navigation.

## Threat model

Primary risks are malicious destinations, redirect loops, excessive permissions, rule loss, imported configuration abuse, remote-code injection, and sensitive URLs leaking through bug reports or telemetry.

Current controls include HTTP(S)-only destinations, duplicate and cycle validation, a narrow request resource type, per-site access prompts, CSP-compatible packaged scripts, validated imports, readable source, and zero network transmission.

Before 1.0, add automated browser integration tests, JSON schema validation with size/rule-count limits, safer confirmation for imported rules, dependency and secret scanning, private vulnerability reporting, a data-flow diagram, and an external security review.

## Cross-browser plan

1. Chrome, Edge, Brave, and other Chromium browsers share the current MV3 package.
2. Add `manifest.firefox.json`, document API differences, and run Firefox extension linting.
3. Keep `core.js` unchanged; adapt only the platform wrapper and rule compiler where Firefox differs.
4. Treat Safari as a separate signed app-extension project and reuse the rule schema and UI concepts.

## Google Cloud plan

The MVP needs no cloud backend. That is a feature, not missing infrastructure.

When remote features have a justified user-facing purpose:

- Host the public privacy/support site on Cloud Storage + Cloud CDN or Firebase Hosting.
- Put authenticated sync behind Cloud Run and API Gateway.
- Use Firestore only for user-requested sync data, encrypted at the application layer with keys unavailable to the service where feasible.
- Use Secret Manager, Cloud Armor, least-privilege service accounts, retention limits, regional controls, deletion APIs, audit logs, budgets, and environment separation.
- Never log full visited URLs, source domains, redirect rules, or request headers.
- Complete a privacy impact assessment and update in-product disclosure and consent before collection starts.

