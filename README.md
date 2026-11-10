# Mira’s KS Value Guide

Static site (no build) that reads its data from a Google Sheet.

## Run locally
    python3 -m http.server   # then visit http://localhost:8000
(Use a server, not file://.) Publish with GitHub Pages: Settings > Pages > deploy from main, root folder.

## Data: Google Sheet with 4 tabs
Import `data/values.csv`, `data/shops.csv`, `data/popups.csv`, `data/featured.csv` into one sheet (File > Import > Insert new sheet), naming the tabs values, shops, popups, featured. Keep the header row exactly as is.

- **values**: item, qty, usd, source, superseded. Unit value = usd / qty. Put TRUE in superseded to ignore a line.
- **shops**: shop, item, tokens, plus optional event, recurring, qty, tier. One row per shop item. A new shop name starts a new table. `qty` is how many units one purchase gives (blank means 1); when any item in a table has a qty other than 1, a Qty column appears and value per token uses the whole purchase. `tier` splits a shop into separate tables on the same page, one per tier, in the order the tiers first appear (repeat the items on new rows for each tier with that tier's token cost). Ranks and "% of best" are worked out within each tier.
- **featured**: title, description, url, badge (optional `event` column too). If the url is an event page (event.html?e=Halloween) or the `event` column names an event with dates in the `events` tab, the button shows its active, upcoming or ended tag, and ended events are greyed and listed last. Each row becomes a big button on the dashboard under Special event pack valuations. url can be a page in this site (popups.html) or a full link; badge is optional (e.g. Ends Nov 7).
- **popups**: pack, price, limit, item, qty, event (optional). One row per item in the pack; repeat the pack name and price on each row.

Then for each tab: File > Share > Publish to web > pick the tab > Comma-separated values (.csv) > Publish. Paste each link into `config.js` and commit once. After that, editing cells updates the site (Google refreshes published sheets every few minutes).

Tips: format number columns as plain numbers. Item names must match exactly between tabs. Items missing from values show as unpriced.

## Active and past events
Add an optional `events` tab with the columns `event, start, end` (dates like 2026-10-25, or whatever format Google Sheets shows). The event name must match the `event` column on shops and packs. Events whose end date has passed are greyed out and listed last, still clickable, with an "Ended" label. Events with a future start show "Starts ...". An event with no row is treated as active. Publish the tab as CSV and paste the link into `config.js` on the `events` line.

## Pack builder
`build.html` lets visitors type items from the masterlist plus a total price and see the pack's worth and ratio at baseline. It uses the `values` tab, so it needs no extra setup.

## Recurring event shops
Recurring events come back on a rotation (like Fantasy Theater). Put the event name in the `recurring` column of each of its shop rows and the shop moves from the Permanent event shops page to `recurring.html?e=Fantasy%20Theater`; `recurring.html` with no event shows a tile per recurring event. Use `tier` (for example Tier 1, Tier 2) when the shop sells the same items at different token costs, and `qty` when a purchase gives more than 1. A row in the `events` tab with the same name is optional and shows the current run's dates on the tile.

Example rows:

    shop,item,tokens,qty,tier,recurring
    Fantasy Theater Shop,Truegold,100,5,Tier 1,Fantasy Theater
    Fantasy Theater Shop,Truegold,80,5,Tier 2,Fantasy Theater

## Seasonal events
Seasonal events are holiday or limited-time events (like Halloween) that can have a currency shop and pop-up packs. Always-available shops, such as Tidal Shop, stay on the Permanent event shops page: leave their `event` and `recurring` columns empty. Give a shop or pop-up pack the same text in its `event` column (for example Halloween) and it appears on that event's page (`event.html?e=Halloween`) together with every other shop and pack that uses the same event name. A shop with an event is shown on its event page instead of the Permanent event shops page; packs with an event are shown on their event page instead of the Pop-up packs page. `event.html` with no event lists all events. To feature an event on the dashboard, add a row to the `featured` tab with url `event.html?e=Halloween`.
