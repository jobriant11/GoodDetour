# Launch checklist

## Product and legal blockers

- [ ] Complete a final trademark clearance check for “Good Detour.”
- [ ] Choose the publishing legal entity, support email, privacy email, and business contact details.
- [ ] Have qualified counsel review the privacy policy, terms, age position, launch jurisdictions, and any monetization.
- [x] Keep browsing-data sale, behavioral advertising, and concealed collection out of the product.
- [x] Publish the source repository under MIT.

## Verification

- [x] Core rule tests.
- [x] JavaScript syntax, manifest, and extension-CSP checks.
- [x] Reproducible unpacked build and ZIP command.
- [x] Manual unpacked smoke test in stable Chrome: install, onboarding, permission grant, and redirects.
- [ ] Complete extended manual coverage: disable, edit, import/export, permission denial, uninstall/reinstall backup restore.
- [ ] Test at 100%, 125%, and 200% zoom and with keyboard-only navigation.
- [ ] Add Chrome integration coverage in CI.
- [ ] Security review and accessibility audit.

## Store assets and account

- [ ] Register a Chrome Web Store developer account, pay the one-time fee, and enable required 2-Step Verification. [Registration guide](https://developer.chrome.com/docs/webstore/register)
- [ ] Verify developer identity and contact details.
- [x] Create final 16, 32, 48, and 128 px PNG icons plus required store screenshots and promotional artwork.
- [ ] Publish the privacy policy and support page on a stable HTTPS domain.
- [ ] Complete the store privacy/data-use disclosures accurately.
- [ ] Explain each permission in the listing.
- [ ] Upload `dist/good-detour-chrome.zip`, submit with deferred publishing, and complete reviewer test instructions.

## Operations

- [ ] Enable GitHub branch protection, required CI, Dependabot/security scanning, and private vulnerability reporting.
- [ ] Add release signing/versioning ownership and a rollback procedure.
- [ ] Create a support triage rotation and public changelog.
- [ ] Monitor crash/review/support signals without collecting browsing history.
- [ ] Recheck Chrome Web Store policies before every permission or data-practice change.
