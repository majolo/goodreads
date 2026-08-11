# Goodreads Classic Reading Challenge

A small Chrome extension that restores the compact, cover-only tiled layout to
Goodreads annual reading challenge pages.

The extension changes presentation only. It does not call Goodreads APIs,
collect data, or read the page's embedded authentication values.

## Install for testing

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select this project folder (the folder containing `manifest.json`).
5. Open or reload your Goodreads annual challenge details page.

Chrome does not inject newly loaded extensions into tabs that were already
open, so reload the Goodreads tab after loading or updating the extension.

## What to verify

- The challenge summary says how many books you have read and your goal.
- The achievements and large challenge cards are hidden.
- Book covers appear in a compact responsive grid without title or author text.
- Covers share a consistent tile height; unusually tall covers scale narrower.
- Desktop rows contain no more than ten covers and remain centred on the page.
- Friends' challenges use the owner's name in the progress summary.
- Clicking a cover still performs the same action as it did in Goodreads' UI.
- The regular Goodreads header and footer remain visible.
- Narrowing the browser window produces a smaller mobile-friendly grid.

## Troubleshooting

The extension supports both of Goodreads' current annual challenge URL forms:

- `https://www.goodreads.com/readingchallenges/annual`
- `https://www.goodreads.com/readingchallenges/gr/annual/`

Then open `chrome://extensions`, click **Errors** on this extension if the link
is present, and inspect the Goodreads tab's developer console for errors.

After editing a file, click the extension's reload button on
`chrome://extensions`, then reload the Goodreads tab.

To return to the normal Goodreads design, disable or remove the extension and
reload the page.
