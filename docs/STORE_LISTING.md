# Chrome Web Store listing

## Name

Good Detour

## One-line summary

Gently redirect distracting sites toward places you chose on purpose.

## Description

Good Detour puts a calm, intentional step between a familiar distraction and what you would rather do next.

Create a simple rule such as `cnn.com → apnews.com`, choose a short pause page or a direct redirect, and change or disable it whenever you like. Good Detour validates URLs, prevents redirect loops, and lets you export your configuration for backup.

Privacy is part of the feature: rules and pause counts stay in your browser. There is no account, browsing-history upload, advertising SDK, or hidden tracking.

Features:

- Domain-first setup with friendly URL suggestions.
- Optional calm pause page with your own message and timer.
- Direct redirects when you do not want an intermediate page.
- Per-rule and global pause controls.
- Import/export backup and redirect-loop prevention.
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

## Permission explanations

- `storage`: stores user-created redirect rules, preferences, and a local aggregate pause count on the device.
- `activeTab`: reads the current tab's domain only after the user opens the toolbar popup, so “Redirect this site” can be offered.
- `declarativeNetRequestWithHostAccess`: asks Chrome to perform the redirects the user configured without exposing request contents to extension code.
- Optional site access: requested for each source domain only when the user saves a rule for it.

## Privacy disclosure answers

- Personally identifiable information: not collected.
- Health information: not collected.
- Financial and payment information: not collected.
- Authentication information: not collected.
- Personal communications: not collected.
- Location: not collected.
- Web history: not collected or transmitted. The extension uses user-entered source domains locally only to create requested redirect rules.
- User activity: not collected or transmitted. A single aggregate pause-page count is stored locally on the device.
- Website content: not collected.

Data is not sold, transferred to third parties, used for advertising, or used for purposes unrelated to the extension's single purpose.

## Store assets

- Icon: `store-assets/good-detour-icon-128.png`
- Screenshot 1: `store-assets/good-detour-dashboard-1280x800.jpg`
- Screenshot 2: `store-assets/good-detour-pause-1280x800.jpg`
- Small promotional tile: `store-assets/good-detour-promo-440x280.jpg`
