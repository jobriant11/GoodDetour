# Architecture and roadmap

## Current design

Good Detour is a dependency-free Manifest V3 extension.

- `core.js` owns normalization, validation, cycle detection, state defaults, and browser-neutral rule compilation.
- `platform.js` isolates WebExtension API differences.
- `background.js` is the only state mutation and dynamic-rule synchronization authority.
- `options.js`, `popup.js`, and `landing.js` are extension pages with no inline or remote scripts.
- State is local by default. Users can opt in to Chrome Sync for rule definitions and preferences; aggregate pause counts remain local. There is no developer backend, account, telemetry endpoint, or remote configuration.
- Synced rules are split into separate storage items to stay below Chrome's per-item quota, with total quota checks before writes.
- A synced rule remains inactive on a new Chrome until that browser grants its source-domain permission.
- Host access is optional and requested for each source domain from a user gesture.
- Dynamic rules apply only to top-level page navigation.

## Threat model

Primary risks are malicious destinations, redirect loops, excessive permissions, rule loss, imported configuration abuse, remote-code injection, and sensitive URLs leaking through bug reports or telemetry.

Current controls include HTTP(S)-only destinations, duplicate and cycle validation, a narrow request resource type, per-site access prompts, CSP-compatible packaged scripts, validated imports, readable source, no developer-controlled network transmission, and explicit opt-in before Chrome Sync is used.

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
- Use Chrome Sync for the current Chromium-only portability feature; it requires no developer backend.
- If future cross-browser sync justifies a service, put it behind Cloud Run and API Gateway and encrypt user-requested sync data at the application layer with keys unavailable to the service where feasible.
- Use Secret Manager, Cloud Armor, least-privilege service accounts, retention limits, regional controls, deletion APIs, audit logs, budgets, and environment separation.
- Never log full visited URLs, source domains, redirect rules, or request headers.
- Complete a privacy impact assessment and update in-product disclosure and consent before collection starts.

## Product Lab web structure

Product Lab is the portfolio layer, while each experiment owns a separate stable path:

- `/lab/` lists active products using reusable product cards.
- `/detour/` is Good Detour's product homepage.
- `/detour/privacy/`, `/detour/terms/`, and `/detour/support/` contain product-specific policy and support content.

Future products should receive their own top-level product path and appear as another card in `/lab/`. If a product graduates to a standalone domain, preserve inbound links with permanent redirects from its Product Lab path to the equivalent pages on the new domain. Do not combine policies for unrelated products into one generic Lab policy.

### Protected Product Lab deployment boundary

The existing productlab.ai pages serve the survey application and are production-critical. Good Detour must never replace, rebuild, or alter those pages from this repository.

- Treat deployment as an additive integration into the existing Product Lab website repository or hosting project.
- Limit changes to the exact `/lab/**` and `/detour/**` route namespaces.
- Never deploy this repository's `docs/` directory as the Product Lab hosting root.
- Do not add a root catch-all, global rewrite, shared 404, or unscoped header/cache rule for Good Detour.
- Do not overwrite existing shared assets, application bundles, survey routes, or root navigation without a separate explicit request and review.
- Record and smoke-test the existing survey application's critical URLs before and after any deployment.
- Require a route-scoped rollback that can remove `/lab/**` and `/detour/**` without changing the survey application.
