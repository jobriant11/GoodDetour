# Pre-launch risk review

Good Detour changes navigation, so a small bug can have an outsized effect. These are the main risks to keep visible before release.

## Launch-critical controls already present

- Configuration is capped at 20 detours across creation, import, Chrome Sync, and rule compilation.
- Destinations are limited to HTTP(S), URLs are length-limited, duplicate source domains are rejected, and redirect cycles are blocked.
- Redirects apply only to top-level navigation and use Chrome's declarative rules rather than reading request contents.
- Site access is requested one source domain at a time. Synced rules remain inactive on a new Chrome until permission is granted there.
- Rules stay local unless Chrome Sync is explicitly enabled. Pause counts never sync, and no per-user or timestamped traffic logging is present.
- Settings can delete the shared Chrome Sync copy or reset all Good Detour data on the current browser.
- Imports are validated before permissions or state changes, and backups remain available as readable JSON.
- Feedback forms warn that GitHub submissions are public and never attach browser context automatically.

## Risks to test before store submission

1. **A domain-wide rule can interrupt important flows.** Test sign-in, checkout, password-reset, and deep-link behavior. The popup's global off switch is the current escape hatch; a future release should add a one-time bypass.
2. **Simultaneous edits can conflict across Chrome instances.** Chrome Sync is last-writer-wins. Test edits and deletions from two profiles, retain JSON export, and document that simultaneous editing is unsupported for v0.1.0.
3. **Revoked permissions can make a saved rule appear broken.** Verify the settings page consistently shows and repairs missing site access.
4. **Sensitive rule URLs could enter Chrome Sync or public feedback.** Keep the prominent warnings, never sync activity history, and recheck privacy copy whenever fields change.
5. **A destination can later become unsafe or change ownership.** Suggestions are convenience examples, not endorsements. Avoid automatic destination updates and give users clear edit/delete controls.
6. **Import files can be malformed or unexpectedly broad.** Test oversized files, duplicate identifiers, 21-rule imports, loops, invalid schemes, and permission denial without partial state changes.
7. **Service-worker or dynamic-rule failures can strand redirects.** Test browser restart, extension update, global disable, uninstall/reinstall, and recovery from a rejected sync write.
8. **Public feedback can attract spam or sensitive disclosures.** Keep structured templates, moderation ownership, security reporting separation, and privacy-safe examples.
9. **Policy or disclosure drift can block publication.** Treat the manifest, privacy policy, store disclosures, and actual behavior as one versioned release unit.
10. **Deletion can be misunderstood across devices and services.** Test sync deletion propagation. Keep explaining that device-local counts must be removed on each browser and that JSON backups and GitHub feedback are separate.
11. **A Product Lab deployment could disrupt the existing survey application.** Never deploy this repository as the Product Lab site root. Restrict integration to `/lab/**` and `/detour/**`, inspect rewrites and shared assets, smoke-test the survey before and after, and keep a path-scoped rollback.

## Deliberately excluded

- Developer-side browsing logs, persistent user identifiers, timestamped per-user traffic records, behavioral advertising, and sale of browsing data.
- General browsing-history collection. Good Detour acts only on user-configured source domains for its disclosed redirect feature.
