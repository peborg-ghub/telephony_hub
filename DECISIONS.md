# Decisions

Choices made where the spec was open or where Astro required a specific approach.

| # | Decision | Why |
|---|---|---|
| 1 | **Astro 7.4.1, Node 24 LTS**, pinned in `.nvmrc`, `package.json` `engines` and `netlify.toml`. | Latest stable versions as of 2026-10-20. |
| 2 | Added the dev dependencies **`@astrojs/check`** and **`@types/node`**. | `astro check` requires `@astrojs/check`. TypeScript 6 needs Node's type definitions to understand `node:fs`. Both are dev-only and never ship to the site. |
| 3 | Pre-build scripts are `.ts` files run directly by Node (`node scripts/check-files.ts`). | Node 24 runs TypeScript natively, so no `tsx`/`ts-node` dependency is needed and it works the same on Windows and Netlify. |
| 4 | `documents.yaml` is loaded with Astro's **`file()` loader** and a custom parser that gives each entry an id like `#3 Q3 Call Volume Summary`. | `file()` requires an `id` on every entry, and building it from the position and title makes build errors point at the right entry. |
| 5 | Checks on single entries live in the **Zod schema** (`src/lib/documents-schema.ts`). Checks on the whole file (invalid YAML, duplicate `file`/`url`) live in `src/lib/documents-file.ts` and run from `getDocuments()`. | Astro only *logs* errors thrown inside a loader and keeps building. Throwing during page rendering reliably fails the build. Verified: a duplicate file passed the build before this change and fails it after. |
| 6 | The schema is **strict**: unknown fields (e.g. `tag:` instead of `tags:`) fail the build. | A typo would otherwise be dropped silently. |
| 7 | File paths are checked with **exact capitalisation**. | Windows ignores case but Netlify (Linux) doesn't, so `Report.PDF` vs `report.pdf` would work locally and 404 once deployed. |
| 8 | Files must sit in the folder that matches their `section`/`subsection`. | This keeps `public/files/` organised and catches a document filed under the wrong section. |
| 9 | `owner` defaults to "Pete" and `tags` to `[]`. | Fewer fields to type per entry. |
| 10 | Dates show as "Oct 20, 2026". The footer's build date is calculated in `America/New_York` (`src/lib/site.ts`). | Netlify builds in UTC, so an evening build would otherwise show tomorrow's date. Change `SITE_TIMEZONE` if the team is elsewhere. |
| 11 | The header is sticky on tablet and desktop only. | On a 360px phone the nav wraps to a second row, and a sticky header would cover about a fifth of the screen. |
| 12 | Tags on cards are `<button>`s that filter the library (wired up in Phase 3). Without JS they do nothing, and all cards still show. | The spec asks for clickable tag chips that drive the filter. |
| 13 | PDF "Open" uses `target="_blank"`. Other file types use the `download` attribute. | Matches the spec. Browsers handle `download` for same-site files. |
| 14 | Library filter controls start `hidden` and the script reveals them. | Without JavaScript you see every card and no controls that don't work. |
| 15 | Search matches every word typed, in any order ("call volume" finds "Call Volume Tracker"), and is case-insensitive. | It's more forgiving than matching the exact phrase. |
| 16 | `practices.csv` is validated in `src/lib/practices.ts` with `csv-parse` and embedded in the page as JSON. Only the fields the lookup shows are included. | Static site, no server. A bad CSV fails the build with line numbers, and every problem is listed at once so you can fix them in one pass. |
| 17 | Header row must match exactly, and every row must have 16 columns. | Catches renamed or reordered columns, and unquoted commas inside a value. |
| 18 | "Today" in the hours table uses the **practice's** time zone, not the viewer's. A friendly time zone name is shown (e.g. "Central Time (America/Chicago)"). | Matches the spec. Verified with a faked clock: at 00:30 Wednesday Eastern, a New York practice shows Wednesday and a Chicago practice shows Tuesday. |
| 19 | The lookup announces "Found <practice> for <number>." in a live region and builds the card outside it. | Screen-reader users hear a short summary instead of the whole card being read out. |
| 20 | Practice data is public. Anyone with the URL can view the full list in the page source. | This is what the spec describes (no password). If it needs to be private, turn on Netlify password protection or put the site behind company sign-in (SSO). |
| 21 | Added `scripts/check-colors.ts` to `npm run check`. It checks WCAG AA contrast for 18 text/background pairs in both themes, confirms the two dark-theme blocks match, and finds hardcoded colors outside `tokens.css`. It is **not** run by `npm run build`. | You'll be changing the brand colors later, and this catches unreadable combinations immediately. It's left out of the build so a color tweak can never block an urgent content deploy. Current lowest ratios: light 5.63:1, dark 6.54:1. |
| 22 | On screens under 480px the lookup card uses tighter padding, and hours never wrap. | At 360px, "9:00 AM – 5:00 PM" was wrapping onto two lines. |