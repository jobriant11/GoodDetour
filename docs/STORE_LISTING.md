# Chrome Web Store listing

## Name

Good Detour

## One-line summary

Gently redirect distracting sites toward places you chose on purpose.

## Description

Good Detour puts a calm, intentional step between a familiar distraction and what you would rather do next.

Create a simple rule such as `cnn.com → apnews.com`, choose a short pause page or a direct redirect, and change or disable it whenever you like. Good Detour validates URLs, prevents redirect loops, and lets you export your configuration for backup.

Privacy is part of the feature: rules stay on one browser unless you opt in to Chrome Sync, and pause counts always stay local. There is no developer account, browsing-history upload, advertising SDK, or hidden tracking.

Features:

- Domain-first setup with friendly URL suggestions.
- Optional calm pause page with your own message and timer.
- Direct redirects when you do not want an intermediate page.
- Per-rule and global pause controls.
- Import/export backup and redirect-loop prevention.
- A 20-detour safety cap for the initial release.
- Optional Chrome Sync for rules and pause-page preferences.
- In-extension feedback and bug-report links with privacy-safe submission guidance.
- Direct controls to delete the Chrome Sync copy or reset Good Detour data on the current browser.
- Site access requested only when you add that site.

## Single purpose

Good Detour redirects top-level visits from user-selected websites to user-selected destinations to support more intentional browsing.

## Category

Productivity

## Listing URLs

- Homepage: https://jobriant11.github.io/GoodDetour/
- Privacy policy: https://jobriant11.github.io/GoodDetour/privacy.html
- Support: https://jobriant11.github.io/GoodDetour/support.html
- Terms: https://jobriant11.github.io/GoodDetour/terms.html

## Contact

- Developer, support, privacy, legal, and security contact: admin@productlab.ai

## Permission explanations

- `storage`: stores user-created redirect rules and preferences locally or, only after the user opts in, in Chrome Sync. The aggregate pause count remains local.
- `activeTab`: reads the current tab's domain only after the user opens the toolbar popup, so “Redirect this site” can be offered.
- `declarativeNetRequestWithHostAccess`: asks Chrome to perform the redirects the user configured without exposing request contents to extension code.
- Optional site access: requested for each source domain only when the user saves a rule for it.

## Privacy disclosure answers

Good Detour has no developer-run user account. Rules, preferences, and the device-local pause count can be deleted from the extension's Privacy & data settings. The same screen can remove the shared Chrome Sync copy. Device-local counts on another Chrome instance must be deleted on that instance; exported JSON files and public GitHub feedback are separate.

- Personally identifiable information: not collected.
- Health information: not collected.
- Financial and payment information: not collected.
- Authentication information: not collected.
- Personal communications: not collected.
- Location: not collected.
- Web history: not observed or collected. When Chrome Sync is enabled, user-entered rule domains and destination URLs are synchronized through the user's Google account; they are not sent to the developer.
- User activity: not collected or transmitted. A single aggregate pause-page count is stored locally on the device.
- Website content: not collected.

Data is not sold, used for advertising, or used for purposes unrelated to the extension's single purpose. Optional synchronization is performed by Google's Chrome Sync service at the user's request; the developer cannot access that synced data.

## Store assets

- Icon: `store-assets/good-detour-icon-128.png`
- Screenshot 1: `store-assets/good-detour-dashboard-1280x800.jpg`
- Screenshot 2: `store-assets/good-detour-pause-1280x800.jpg`
- Screenshot 3: `store-assets/good-detour-sync-1280x800.jpg`
- Small promotional tile: `store-assets/good-detour-promo-440x280.jpg`
