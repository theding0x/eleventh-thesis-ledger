# Eleventh Thesis Ledger

The open ledger of **Eleventh Thesis [ELEVE]**, an industrial collective in EVE Online. It is the record promised in Article III.4 of the corporation's constitution: every member can read the books.

The page is published with GitHub Pages from this repository. The data lives in `ledger.json`, and each change to the books is a commit, so the history of every entry is public.

## Files

| File | Purpose |
|---|---|
| `ledger.json` | The books. This is the only file that changes in normal use. |
| `index.html`, `app.js`, `style.css` | The page that reads `ledger.json` and draws the tables. |

## Adding an entry

Append an object to the right array in `ledger.json`, set `meta.updated` to today's date, and commit with a message that names the entry (for example `Contribution: Pilot Name, 120,000 Tritanium`). Give each entry the next `id` in its array. Derived fields (`value`, `net`, and the distribution split) are recalculated by the page, so only the inputs are needed.

| Book | Fields |
|---|---|
| `contributions` | `id`, `date`, `member`, `item`, `qty`, `unit` (Jita 4-4 buy per unit), `status` (`held` / `sold` / `paid`), `note` |
| `production` | `id`, `date`, `product`, `runs`, `units`, `location`, `status` (`queued` / `in progress` / `delivered` / `sold`), `note` |
| `sales` | `id`, `date`, `item`, `qty`, `gross`, `fees`, `market`, `note` |
| `costs` | `id`, `date`, `category` (`materials` / `blueprints` / `job fees` / `office` / `hauling` / `recruitment` / `other`), `description`, `amount`, `note` |
| `payouts` | `id`, `date`, `member`, `kind` (`consignment` / `dividend`), `amount`, `note` |
| `loans` | `id`, `date`, `lender`, `description`, `kind` (`advance` / `repayment`), `amount`, `estimate` (true/false), `note` |
| `distributions` | `id`, `date`, `surplus`, `note` |

Dates are `YYYY-MM-DD`. Amounts are ISK.

## Paying for production inputs

Contributed goods that are sold as delivered (Fertilizer, for example) are paid 90% of their own net sale (constitution Art. IV.1). Contributed goods that go into production (minerals for missiles or hulls) are never sold themselves, so they are paid **90% of their delivery value when the product they went into sells**. The value added by production is surplus (Art. IV.3). Proposed as Art. IV.4 on 6 October 2026.
