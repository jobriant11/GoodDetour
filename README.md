# Good Detour

A calm, local-first browser extension that redirects distracting sites toward places the user chose on purpose.

> **Source version:** 0.2.0, prepared for release. The [Chrome Web Store listing](https://chromewebstore.google.com/detail/good-detour/egfngcmhebknhnnfofimoaegapdfegfb) has its own publication status. Rules stay local unless the user opts in to Chrome Sync; pause counts and appearance stay local. The project contains no telemetry, advertising SDK, developer account system, or remote code.

## What works

- Domain-based redirects using Chrome Manifest V3 dynamic rules.
- Calm pause page or immediate direct redirect.
- Editable pause message and 3–60 second timer.
- Up to 10 destination URLs per detour, with an equal random choice on each visit.
- Suggested destinations that can be added to a detour in one click.
- Global and per-rule controls.
- Light, Dark, or System appearance, saved on this browser and shared across extension pages.
- URL validation, duplicate detection, and redirect-cycle prevention.
- A 20-detour safety cap.
- Per-domain permission requests instead of broad install-time access.
- Optional Chrome Sync for rules and preferences; pause counts remain local.
- In-product deletion for this browser's data and the shared Chrome Sync copy.
- Privacy-safe product feedback and bug-report entry points.
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

The repository provides automated tests, manifest and syntax checks, an unpacked build, and ZIP packaging. Verify the current build in Chrome before uploading it to the existing store item. GitHub CI produces a build artifact; it does not publish to the Chrome Web Store. See [the release checklist](docs/LAUNCH.md) for the current release checks and original launch history.

The [pre-launch risk review](docs/RISK_REVIEW.md) tracks navigation, sync, permission, import, privacy, and operational failure modes.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports must not include real private URLs or browsing history; see [SECURITY.md](SECURITY.md).

Private support, privacy, legal, and security contact: admin@productlab.ai.

MIT licensed.
