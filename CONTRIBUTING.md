# Contributing

Good Detour is dependency-free by design. It targets Chrome Manifest V3 first while keeping business logic and browser API access separate for future Firefox and Edge packages.

1. Create a feature branch.
2. Run `npm test` and `npm run check`.
3. Build with `npm run build` and load `dist/chrome` as an unpacked extension.
4. Include tests for rule parsing, loop detection, or manifest compilation changes.
5. Never add remote code, tracking SDKs, visited-URL collection, or new permissions without a documented threat/privacy review.

Pull requests should explain user impact, permission changes, privacy impact, and manual test coverage.

