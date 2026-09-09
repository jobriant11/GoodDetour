# Changelog

All notable changes to Good Detour are documented here.

## 0.2.0

- Support up to 10 unique destinations per rule, chosen with equal probability on every visit.
- Keep pause-page and direct modes, old single-URL rules, JSON backups, and Chrome Sync working with destination lists.
- Validate every destination and every possible redirect cycle, including source subdomains.
- Add device-local Light, Dark, and System appearance across extension pages, with controls in the popup and settings. Deleting all data resets appearance to System.
- Improve keyboard focus visibility and readable form, notice, and action colors in both themes.
- Preserve synced rules when another browser updates only a rule, and preserve saved routes and preferences when an import or save fails.

## 0.1.0 — 2026-08-19

- Add user-created domain redirects with per-site permission requests.
- Add direct redirects and an optional editable pause page.
- Add suggested destinations, validation, and redirect-cycle protection.
- Add global and per-rule controls plus JSON import/export.
- Add optional Chrome Sync for rule definitions and preferences, with per-browser site permission approval.
- Add controls to delete the shared Chrome Sync copy or reset all Good Detour data on the current browser.
- Add no-account, retention, deletion, and U.S. state privacy-rights disclosures.
- Refresh the product, welcome, and pause-page presentation with a bolder editorial design.
- Standardize private support, privacy, legal, and security contact at admin@productlab.ai.
- Give Good Detour its own `/detour` site and policy namespace, with a reusable `/lab` product-directory entry.
- Add a hard deployment boundary protecting Product Lab's existing survey application and root pages.
- Add structured, privacy-safe product feedback and bug-report links.
- Cap configuration, imports, sync, and compiled rules at 20 detours for the initial release.
- Keep aggregate pause counts in local extension storage with no telemetry.
