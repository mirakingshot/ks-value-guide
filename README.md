# Mira’s KS Value Guide

Static site (no build) that reads its data from a Google Sheet.

## Run locally
    python3 -m http.server   # then visit http://localhost:8000
(Use a server, not file://.) Publish with GitHub Pages: Settings > Pages > deploy from main, root folder.

## Data: Google Sheet with 4 tabs
Import `data/values.csv`, `data/shops.csv`, `data/popups.csv`, `data/featured.csv` into one sheet (File > Import > Insert new sheet), naming the tabs values, shops, popups, featured. Keep the header row exactly as is.

- **values**: item, qty, usd, source, superseded. Unit value = usd / qty. Put TRUE in superseded to ignore a line.
- **shops**: shop, item, tokens, plus optional event, recurring, qty, tier. One row per shop item. A new shop name starts a new table. `qty` is how many units one purchase gives (blank means 1); when any item in a table has a qty other than 1, a Qty column appears and value per token uses the whole purchase. `tier` splits a shop into separate tables on the same page, one per tier, in the order the tiers first appear (repeat the items on new rows for each tier with that tier's token cost). Ranks and "% of best" are worked out within each tier. Put an x in an optional `pick` column to tag an item "Mira's pick", and in an optional `f2p` column to tag it "Mira's F2P pick" (both can be marked). The tags show on the shop tables and the Item finder whatever the value ranking says, and tagged items are never faded.
- **featured**: title, description, url, badge (optional `event` column too). If the url is an event page (event.html?e=Halloween) or the `event` column names an event with dates in the `events` tab, the button shows its active, upcoming or ended tag, and ended events are greyed and listed last. Each row becomes a big button on the dashboard under Special event pack valuations. url can be a page in this site (popups.html) or a full link; badge is optional (e.g. Ends Nov 7).
- **packs** (optional): regular packs, see [Regular packs and base values](#regular-packs-and-base-values).
- **popups**: pack, price, limit, item, qty, plus optional event, recurring or available. One row per item in the pack; repeat the pack name and price on each row. A pack with a `recurring` event name shows on that recurring event's page instead of the Pop-up packs page.

Then for each tab: File > Share > Publish to web > pick the tab > Comma-separated values (.csv) > Publish. Paste each link into `config.js` and commit once. After that, editing cells updates the site (Google refreshes published sheets every few minutes).

Tips: format number columns as plain numbers. Item names must match exactly between tabs. Items missing from values show as unpriced.

## Active and past events
Add an optional `events` tab with the columns `event, start, end` (dates like 2026-10-25, or whatever format Google Sheets shows). Dates follow the game's UTC reset: an event starts at 00:00 UTC on its start date and ends at 23:59 UTC on its end date. The event name must match the `event` column on shops and packs. Events whose end date has passed are greyed out and listed last, still clickable, with an "Ended" label. Events with a future start show "Starts ...". An event with no row is treated as active. Publish the tab as CSV and paste the link into `config.js` on the `events` line.

## Event simulators
To show a simulator tile on the dashboard, add a `simulator` column to the `events` tab and put the simulator's link in that event's row. Active and upcoming events with a link each get a tile (titled "<event> simulator") with their date tag; ended events drop off automatically. An optional `simulator description` column replaces the default tile text. When no current event has a simulator, a single tile links to the simulator home page.

## Events calendar
Every page has a calendar button in the top corner. Its red badge counts the events in the `events` tab that are running today, and clicking it lists them (plus anything starting soon) with links to the event's values page and its simulator. The values link goes to the Recurring events page when the event name appears in a `recurring` column, otherwise to its Seasonal events page. The look of the site lives in `theme.css`, layered on top of `style.css`.

## Regular packs and base values
Add a `packs` tab with the columns `pack, price, category, item, qty, base, value`, one row per item like the popups tab (repeat the pack name, price and category on each row). `packs.html` lists every pack in one searchable table (search by pack or item name) with category filter buttons above it.

Variations of the same pack are grouped into one row. Name them `Pack - Option` (for example `Common Custom Pet Chest - Pet Food`): packs sharing the text before " - " become one row showing the number of options, the price range and the best ratio, and clicking it compares the options side by side with their contents. To group packs whose names don't follow that pattern, add an optional `group` column and give them the same text there. A pack on its own expands to its full breakdown.

A row with a `value` but no x in `base` (like an "Other" row for filler) counts as exactly that many dollars, both in the pack's worth and when working out what is left for a blank base row. It stays out of the Item finder's search list.

Put an x in `base` on the row whose pack sets that item's value. The item's value then comes from that pack instead of the `values` tab:
- `value` filled in: the item is worth that many dollars for that row's qty (the same number you would put in `usd` on the values tab).
- `value` blank: the item gets what is left of the pack price after the pack's other items are priced. If several rows in one pack are base with a blank value, they split what is left evenly in dollars.

Mark each item as base in one pack only. Items with no base row keep their `values` tab value, so breakdowns and conversion rates (like Truegold Dust) can stay there. If a pack's other items can't all be priced, its blank base rows fall back to the values tab too. On the Masterlist, an item's source links to its base pack.

Example rows:

    pack,price,category,item,qty,base,value
    Custom Selection,4.99,Custom packs,Truegold,40,x,2.86
    Custom Selection,4.99,Custom packs,1hr General Speed,20,x,
    Custom Selection,4.99,Custom packs,Gems,1000,,

## Item finder
`finder.html` lets visitors pick an item and see, for that item:
- every regular pack, plus every pack on sale right now, ranked by ratio, with the item's share of each pack's worth;
- every shop open right now that sells it, ranked by "% of best" within its shop or tier.

Event and recurring packs and shops count only while their event is active in the `events` tab. A pop-up pack with no event counts when its row has an x in an optional `available` column in the popups tab. Permanent shops always count. The page can be linked to a specific item with `finder.html?item=Truegold`.

## Pack builder
`build.html` lets visitors type items from the masterlist plus a total price and see the pack's worth and ratio at baseline. It uses the `values` tab, so it needs no extra setup.

## Recurring events
Recurring events come back on a rotation (like Fantasy Theater). Put the event name in the `recurring` column of each of its shop rows (and of any pop-up packs in the popups tab that belong to it) and the shop moves from the Permanent event shops page to `recurring.html?e=Fantasy%20Theater`; `recurring.html` with no event shows a tile per recurring event. Use `tier` (for example Tier 1, Tier 2) when the shop sells the same items at different token costs, and `qty` when a purchase gives more than 1. A row in the `events` tab with the same name is optional and shows the current run's dates on the tile.

Example rows:

    shop,item,tokens,qty,tier,recurring
    Fantasy Theater Shop,Truegold,100,5,Tier 1,Fantasy Theater
    Fantasy Theater Shop,Truegold,80,5,Tier 2,Fantasy Theater

## Seasonal events
Seasonal events are holiday or limited-time events (like Halloween) that can have a currency shop and pop-up packs. Always-available shops, such as Tidal Shop, stay on the Permanent event shops page: leave their `event` and `recurring` columns empty. Give a shop or pop-up pack the same text in its `event` column (for example Halloween) and it appears on that event's page (`event.html?e=Halloween`) together with every other shop and pack that uses the same event name. A shop with an event is shown on its event page instead of the Permanent event shops page; packs with an event are shown on their event page instead of the Pop-up packs page. `event.html` with no event lists all events. Packs you pick one of (for example `Fiesta Sale - Truegold` and `Fiesta Sale - Lucky Chest`) are grouped into one row the same way as on the Regular packs page: name them `Pack - Option`, or give them the same text in an optional `group` column in the popups tab. This works on Recurring event pages too. To feature an event on the dashboard, add a row to the `featured` tab with url `event.html?e=Halloween`.
