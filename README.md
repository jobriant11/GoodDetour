# Good Detour

A calm, local-first browser extension that redirects distracting sites toward places the user chose on purpose.

> **Status:** Chrome-first v0.1.0 release candidate, not yet store-published. Rules and pause counts stay on-device. The project intentionally contains no telemetry, advertising SDK, account system, or remote code.

## What works

- Domain-based redirects using Chrome Manifest V3 dynamic rules.
- Calm pause page or immediate direct redirect.
- Editable pause message and 3–60 second timer.
- Suggested destinations with local autocomplete.
- Global and per-rule controls.
- URL validation, duplicate detection, and redirect-cycle prevention.
- Per-domain permission requests instead of broad install-time access.
- JSON import/export backup.
- Browser-neutral core and API wrapper for future Firefox/Edge packages.

## Run it

Requirements: Node.js 20+ and Chrome 120+.

```bash
npm test
npm run check
npm run build
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist/chrome`.

Create a release ZIP with:

```bash
npm run package
```

## Project layout

```text
manifest.chrome.json       Chrome package metadata
src/extension/             packaged extension source and pages
tests/                     dependency-free core tests
scripts/                   deterministic build and policy checks
docs/                      research, architecture, listing, and launch plan
.github/                   CI and privacy-safe issue intake
```

## Product position

Existing tools are often developer-first, regex-heavy, quota-limited, over-permissioned, or stale. Good Detour focuses on intentional browsing: a friendly rule builder, an editable interruption, robust backups, and transparent local storage.

The requested idea of monetizing “anonymized” browsing behavior is deliberately excluded. Chrome explicitly prohibits collecting or transmitting browsing activity for behavioral advertising or other monetization, and concealment would create serious policy, legal, and trust risk. See [the research and policy notes](docs/RESEARCH.md).

## Release readiness

Automated tests, packaging, a Chrome smoke test, and store assets are complete. Store publication still requires publisher/legal details, counsel review, the hosted policy/support site, developer registration verification, and Web Store review. See [the launch checklist](docs/LAUNCH.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports must not include real private URLs or browsing history; see [SECURITY.md](SECURITY.md).

MIT licensed.
