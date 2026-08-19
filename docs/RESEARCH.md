# Market and policy research

Research date: August 19, 2026. This is a product snapshot, not a claim that every review represents current behavior.

## User problems worth solving

Public reviews and issue discussions repeatedly surface these themes:

- Rules disappear or cannot be restored, making import/export and stable migrations essential.
- URL parsing breaks schemes or punctuation, so input normalization must preserve valid HTTP(S) URLs.
- Redirects fail silently, so creation needs validation, permission explanations, and a future built-in test runner.
- Regex-first tools feel convoluted to non-developers; domain-first setup should be the default, with advanced patterns deferred.
- Rules can loop; cycles should be rejected before they reach the browser.
- Users dislike quotas and formerly free behavior moving behind a paywall.
- Stale Manifest V2 projects stop working or become marked unsafe; automated MV3 verification and active maintenance matter.
- Broad permissions and unclear privacy practices erode trust.

Sources:

- [Switcheroo Redirector reviews](https://chrome-stats.com/d/cnmciclhnghalnpfhhleggldniplelbg/reviews)
- [Switcheroo marked unsafe discussion](https://support.google.com/chrome/thread/106958743/switcheroo-redirector-extension-disabled-because-it-s-been-marked-unsafe-by-the-chrome-web-store)
- [Redirector project and issue tracker](https://github.com/einaregilsson/Redirector)
- [Requestly Chrome Web Store listing](https://chromewebstore.google.com/detail/requestly-intercept-modif/mdnleldcmiljblolnjhpnblkcekpdkpa)
- [Requestly review noting free-tier quotas](https://www.g2.com/products/requestly/reviews)
- [Manifest V3 alternatives discussion](https://www.reddit.com/r/chrome_extensions/comments/1iyc5cl/)

## Competitive position

The redirect category already has strong domain/wildcard tools and sophisticated developer products. Good Detour should not compete on maximum request-manipulation power. Its wedge is intentional browsing:

1. A friendly domain-first rule builder.
2. A calm, editable pause page between habit and destination.
3. Curated alternatives that remain suggestions, not political or editorial endorsements.
4. Local-first state, narrow per-site permissions, readable source, backup, and loop safety.
5. Later, local-only time budgets and recommendations computed on-device.

## Binding Chrome Web Store constraints

- Browsing activity may only be collected or transmitted when required for a prominently described user-facing feature. Google explicitly says behavioral advertising or other monetization of browsing activity is not allowed. [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- Personal or sensitive data transfers are limited, and user data cannot be sold for unrelated purposes. [User Data Policy](https://developer.chrome.com/docs/webstore/user_data)
- Extensions must have a narrow single purpose. Adding advertising to an otherwise functional redirect extension can violate that rule. [Quality Guidelines FAQ](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines-faq/)
- Affiliate programs must be prominent before install and in the interface, and require a related user action and tangible user benefit. [Affiliate Ads Policy](https://developer.chrome.com/docs/webstore/program-policies/affiliate-ads/)
- Manifest V3 logic must be self-contained and reviewable; remotely hosted executable code is prohibited outside narrow documented exceptions. [Manifest V3 Requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- `declarativeNetRequest` lets the browser redirect without exposing request content to extension code. [API reference](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)

## Monetization decision

Selling “anonymized” browsing behavior is not a viable Chrome Web Store model and would create substantial re-identification, consumer-protection, and trust risk. Hiding it in terms would compound that risk.

Viable paths to evaluate instead:

- Free core plus paid encrypted sync or team policy management.
- Donations or sponsorship of the open-source project outside the extension workflow.
- A paid productivity tier with on-device schedules, budgets, and reports.
- Enterprise administration and support.

Do not add ads to the extension without a fresh store-policy and legal review. In particular, do not assume a pause page creates permission to monetize the browsing event that triggered it.

