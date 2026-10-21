# Cloud Telephony Resource Hub

A static website for the Cloud Telephony team, built with [Astro](https://astro.build) and hosted on Netlify.

| Page | URL | What's on it |
|---|---|---|
| Home | `/` | Links to both audiences and the 5 most recently added documents |
| Business Leaders | `/business-leaders/` | Practice lookup and Practice Information documents |
| Internal Engineers | `/internal-engineers/` | AI Projects (SoundHound, Sierra, IVA Studio) and Power BI |

You update the site by editing two data files and dropping documents into folders. When you push to GitHub, Netlify rebuilds the site automatically. **If you make a mistake, the build stops and tells you what's wrong**, so a broken site never goes live.

> ⚠️ **Hidden from search engines ≠ private.** Google and other search engines are told not to index the site. But anyone who has the URL can open every page and every file, including the full practice list (it's in the page source of the Business Leaders page). Don't upload anything confidential. If the site needs to be private, turn on Netlify password protection or put it behind company sign-in (SSO).

---

## Contents

1. [Set up on your computer](#1-set-up-on-your-computer)
2. [Add a document](#2-add-a-document)
3. [Add a link card](#3-add-a-link-card)
4. [Update practice data](#4-update-practice-data)
5. [Change colors and logo](#5-change-colors-and-logo)
6. [Connect to Netlify](#6-connect-to-netlify-one-time)
7. [Build errors and how to fix them](#7-build-errors-and-how-to-fix-them)
8. [Where things live](#8-where-things-live)

---

## 1. Set up on your computer

**You need:** [Node.js 24 LTS](https://nodejs.org) and [Git](https://git-scm.com). On Windows you can install both in PowerShell:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

Close and reopen your terminal afterwards so it can find them.

**First time only**, in the project folder:

```powershell
npm install
```

**Everyday commands:**

| Command | What it does |
|---|---|
| `npm run dev` | Runs the site at http://localhost:4321 and updates as you save files. Stop it with `Ctrl+C`. |
| `npm run build` | Builds the site exactly as Netlify will. **Run this before every push.** If it passes, Netlify will pass too. |
| `npm run preview` | Shows the built site (after `npm run build`) at http://localhost:4321. |
| `npm run check` | Runs every check: type errors, file sizes, color contrast and hardcoded colors. Run it after changing colors. |

**Publishing a change:**

```powershell
npm run build
git add -A
git commit -m "Add Q4 call volume report"
git push
```

Netlify picks up the push and the site updates in about a minute.

---

## 2. Add a document

1. **Put the file in the matching folder** under `public/files/`:

   | Section | Folder |
   |---|---|
   | Practice Information | `public/files/practice-info/` |
   | AI Projects · SoundHound | `public/files/ai-projects/soundhound/` |
   | AI Projects · Sierra | `public/files/ai-projects/sierra/` |
   | AI Projects · IVA Studio | `public/files/ai-projects/iva-studio/` |
   | Power BI | `public/files/power-bi/` |

   - **Supported types:** PDF, DOCX, DOC, XLSX, XLS, CSV, PPTX.
   - **Max size:** 25 MB per file.
   - **Name files in lowercase with dashes**, e.g. `q4-call-volume.pdf`. Avoid spaces. Capitalization matters on Netlify: `Report.pdf` and `report.pdf` are different files.

2. **Open `src/data/documents.yaml`** and paste the right example below into the matching section. Putting it near the top keeps new items easy to find; the site sorts by date anyway.

3. **Edit the values.** Keep the two-space indentation exactly as shown.

4. **Run `npm run build`.** If something's wrong, see [section 7](#7-build-errors-and-how-to-fix-them).

5. **Commit and push** (see above).

### Copy-paste examples

**Practice Information** (Business Leaders page)

```yaml
- title: "Practice Onboarding Checklist"
  description: "Steps for bringing a new practice onto the platform."
  section: practice-info
  file: practice-info/onboarding-checklist.pdf
  dateAdded: 2026-10-20
  tags: [onboarding, checklist]
```

**AI Projects · SoundHound**

```yaml
- title: "SoundHound Pilot Results"
  description: "Results from the first month of the SoundHound pilot."
  section: ai-projects
  subsection: soundhound
  file: ai-projects/soundhound/pilot-results.pdf
  dateAdded: 2026-10-20
  tags: [pilot, results]
```

**AI Projects · Sierra**

```yaml
- title: "Sierra Design Notes"
  description: "Design decisions for the Sierra integration."
  section: ai-projects
  subsection: sierra
  file: ai-projects/sierra/design-notes.docx
  dateAdded: 2026-10-20
  tags: [design]
```

**AI Projects · IVA Studio**

```yaml
- title: "IVA Studio Call Flows"
  description: "Current call flows built in IVA Studio."
  section: ai-projects
  subsection: iva-studio
  file: ai-projects/iva-studio/call-flows.pptx
  dateAdded: 2026-10-20
  tags: [call-flows]
```

**Power BI**

```yaml
- title: "Q4 Call Volume Summary"
  description: "Monthly call volume by practice, October–December."
  section: power-bi
  file: power-bi/q4-call-volume.xlsx
  dateAdded: 2026-10-20
  tags: [reporting, call-volume]
```

### Field reference

| Field | Required? | Notes |
|---|---|---|
| `title` | Yes | Shown as the card heading. Use "quotes" if it contains a colon (`:`). |
| `description` | Yes | One sentence, 200 characters max. |
| `section` | Yes | `practice-info`, `ai-projects` or `power-bi` |
| `subsection` | AI Projects only | `soundhound`, `sierra` or `iva-studio`. Leave it out for other sections. |
| `file` | `file` **or** `url` | Path inside `public/files/`, e.g. `power-bi/report.pdf`. Don't start it with `public/` or `/`. |
| `url` | `file` **or** `url` | A full `https://` link (see the next section). |
| `dateAdded` | Yes | `YYYY-MM-DD`, e.g. `2026-10-20`. Newest shows first. |
| `owner` | No | Defaults to "Pete". |
| `tags` | No | e.g. `[reporting, call-volume]`. Capitals and spaces are fixed automatically: `Call Volume` becomes `call-volume`. |

### What the site does with each type

| Type | Buttons on the card |
|---|---|
| PDF | **Open** (new tab) and **Download** |
| Word, Excel, CSV, PowerPoint | **Download** |
| Link | **Open link** (new tab) |

### Removing or replacing a document

- **Remove:** delete its entry from `documents.yaml` **and** delete the file. If you forget the file, the build warns `… is not listed in src/data/documents.yaml`. The warning doesn't stop the build.
- **Replace with a new version:** overwrite the file with the same name, and update `dateAdded` if you want it to show as recently added.

### Sample content

Entries whose titles start with **"SAMPLE –"** are placeholders. When you add real content, delete those entries from `documents.yaml` and their files from `public/files/`. They all have `sample-` at the start of their file names.

### Videos

Videos are not supported yet. When they are, they'll be hosted on a video platform and embedded on the page, not stored in this repo (GitHub blocks files over 100 MB).

---

## 3. Add a link card

Use a link card for anything that lives somewhere else, such as a SharePoint spreadsheet or a Power BI dashboard. Use `url:` instead of `file:`, and there's no file to upload.

```yaml
- title: "Call Volume Tracker"
  description: "Live spreadsheet of weekly call volume."
  section: power-bi
  url: https://example.sharepoint.com/sites/cloud-telephony/tracker.xlsx
  dateAdded: 2026-10-20
  tags: [reporting, tracker]
```

The card shows a **Link** badge and an **Open link** button that opens in a new tab. Link cards work in any section. For AI Projects, add `subsection:` as usual.

---

## 4. Update practice data

The practice lookup on the Business Leaders page reads `src/data/practices.csv`.

### Columns (the header row must be exactly this)

```
number,practice_name,address_line1,address_line2,city,state,zip,mon,tue,wed,thu,fri,sat,sun,timezone,notes
```

| Column | Notes |
|---|---|
| `number` | **Exactly 10 digits, no formatting**: `8135550101`, not `(813) 555-0101`. Each number must appear only once. |
| `practice_name` | Required. |
| `address_line1`, `address_line2`, `city`, `state`, `zip` | Optional. Leave `address_line2` empty if there isn't one. |
| `mon` … `sun` | Free text, e.g. `8:00 AM – 5:00 PM` or `Closed`. An empty cell shows as "Not listed". |
| `timezone` | Required. A time zone name: `America/New_York` (Eastern), `America/Chicago` (Central), `America/Denver` (Mountain), `America/Phoenix` (Arizona), `America/Los_Angeles` (Pacific). It decides which day is highlighted as "Today". |
| `notes` | Optional. Shown under the hours. |

**A practice with several phone numbers gets one row per number.** Repeat the rest of the row.

### Sample row

```
8135550101,Bayside Family Dental,100 Main Street,Suite 200,Tampa,FL,33602,8:00 AM – 5:00 PM,8:00 AM – 5:00 PM,8:00 AM – 5:00 PM,8:00 AM – 5:00 PM,8:00 AM – 3:00 PM,Closed,Closed,America/New_York,Lunch 12–1
```

**If a value contains a comma, wrap it in double quotes:** `"Closed Wednesdays, lunch 12–1"`.

### Editing in Excel

Excel works, but watch for two things:

1. **Phone numbers turned into `8.14E+09`.** Before typing or pasting numbers, format the `number` column as **Text** (select the column → right-click → Format Cells → Text).
2. **Save as "CSV UTF-8 (Comma delimited)"**, not plain "CSV". Plain CSV can mangle characters like the en dash in `8:00 AM – 5:00 PM`.

Then run `npm run build`. Bad rows are reported with their line number.

### The sample rows

The 5 rows in the file now are fake (555 numbers, names starting with "SAMPLE"). Replace the whole file contents, keeping the header row, with your real data.

---

## 5. Change colors and logo

### Colors

**Every color is in one file: `src/styles/tokens.css`.** A comment at the top lists what each variable controls. Typical rebrand:

1. Change `--color-accent` (links, buttons, selected tags) to the team color. Also set `--color-accent-hover` (a darker version), `--color-accent-soft` (a very light tint) and `--color-on-accent-soft` (dark text that's readable on the tint).
2. Change the same variables in **both** dark-theme blocks further down the file. The two blocks must stay identical. In dark mode the accent should be a lighter version of the team color.
3. Run `npm run check`. It confirms that every text color still meets WCAG AA contrast against its background in both themes, and lists anything that doesn't, e.g.:

   ```
   contrast (light): --color-accent on --color-bg is 3.10:1, needs at least 4.5:1
   ```

   If you see this, darken the color (light theme) or lighten it (dark theme) and run the check again.

Don't put color values anywhere else. `npm run check` fails if it finds one outside `tokens.css`.

### Logo

The logo is the text "Cloud Telephony" in `src/components/Logo.astro`. To use an image instead:

1. Put the image in `public/`, e.g. `public/logo.svg`.
2. In `Logo.astro`, replace `<span>{SITE_NAME}</span>` with `<img src="/logo.svg" alt="Cloud Telephony" height="32" />`.

Replace `public/favicon.svg` to change the browser-tab icon.

---

## 6. Connect to Netlify (one time)

**First, put the project on GitHub:**

1. On github.com, click **New repository**. Name it (e.g. `cloud-telephony-hub`), choose **Private** if you like, and **don't** add a README, .gitignore or license, because the project already has them. Click **Create repository**.
2. GitHub shows a "…or push an existing repository" box. Run those commands in the project folder. They look like:

   ```powershell
   git remote add origin https://github.com/YOUR-ACCOUNT/cloud-telephony-hub.git
   git push -u origin main
   ```

**Then connect Netlify:**

1. Log in to [app.netlify.com](https://app.netlify.com).
2. Click **Add new site → Import an existing project**.
3. Choose **GitHub** and authorize Netlify if asked. Pick the `cloud-telephony-hub` repository.
4. **Confirm the build settings.** Netlify reads them from `netlify.toml`, so they should already be filled in:

   | Setting | Value |
   |---|---|
   | Branch to deploy | `main` |
   | Build command | `npm run build` |
   | Publish directory | `dist` |

   Node 24 is set in `netlify.toml`, so you don't need an environment variable for it.
5. Click **Deploy**. The first build takes a minute or two. When it finishes, Netlify shows the site URL (e.g. `https://something-random.netlify.app`). Change it under **Site configuration → Change site name**.

**Check it's hidden from search engines** after the first deploy:

- Open `https://YOUR-SITE.netlify.app/robots.txt`. It should say `Disallow: /`.
- Check the header. In PowerShell:

  ```powershell
  curl.exe -sI https://YOUR-SITE.netlify.app/files/power-bi/sample-q3-call-volume.pdf | findstr /i robots
  ```

  It should print `X-Robots-Tag: noindex, nofollow`. Or open the browser's developer tools (F12) → **Network** → click the page → **Response Headers**.

From then on, every push to `main` redeploys automatically. If a build fails, the live site stays on the last good version. Open **Deploys** in Netlify to see the error, which is the same as you'd get from `npm run build` locally.

---

## 7. Build errors and how to fix them

Errors name the entry by its position in the file and its title, e.g. `#7 Q3 Call Volume Summary` is the 7th entry. Astro sometimes adds an unrelated "See https://docs.astro.build/…#document-or-window-is-not-defined" link under the message; ignore it.

### `documents.yaml`

| Message (shortened) | What it means | Fix |
|---|---|---|
| `title is required` / `description is required` | The field is missing or empty. | Add it. |
| `description must be 200 characters or fewer` | Too long for a card. | Shorten it. |
| `section must be one of: practice-info, ai-projects, power-bi` | Typo in `section`. | Use one of the three values exactly. |
| `ai-projects entries need a subsection` | AI Projects entries must say which project. | Add `subsection: soundhound` (or `sierra`, `iva-studio`). |
| `remove subsection — it's only used for ai-projects` | `subsection` is set on a Practice Info or Power BI entry. | Delete the `subsection:` line. |
| `set either file OR url, not both` | Both are set. | Keep one. |
| `set either file (…) or url (…)` | Neither is set. | Add `file:` or `url:`. |
| `public/files/… was not found` | Wrong path, a typo, or different capitalization. | Compare letter by letter with the actual file name. `Report.pdf` ≠ `report.pdf`. |
| `file must be in the … folder to match its section` | The file is in a different section's folder. | Move the file, or fix `section`/`subsection`. |
| `file is relative to public/files/` | The path starts with `public/`, `files/` or `/`. | Remove that part: `power-bi/report.pdf`. |
| `use forward slashes in file paths` | The path uses `\`. | Use `/`. |
| `unsupported file type ".txt"` | Not one of PDF, DOCX, DOC, XLSX, XLS, CSV, PPTX. | Convert it, or upload it elsewhere and add a link card. |
| `url must be a full https:// link` | The link is missing `https://` or uses `http://`. | Paste the full `https://…` address. |
| `dateAdded must be YYYY-MM-DD` | Wrong date format, e.g. `10/20/2026`. | Write `2026-10-20`. |
| `dateAdded is not a real calendar date` | e.g. `2026-02-30`. | Fix the date. |
| `Unknown field(s): tag — check spelling` | A misspelled field name. | e.g. `tag:` → `tags:`, `date:` → `dateAdded:`. |
| `tags must be a list` | Tags written as plain text. | Use brackets: `tags: [reporting, call-volume]`. |
| `entry #10 … uses the same file as entry #3 …` | The same file or link is listed twice. | Delete one of the entries. |
| `documents.yaml is not valid YAML … at line N, column M` | A formatting problem, usually indentation, a missing `]`, or an unquoted `:` in a title. | Go to that line. Check the two-space indentation and wrap titles that contain `:` in "quotes". |
| `entry #N is not a valid entry` | A line starting with `- ` that isn't a full entry. | Each entry starts with `- title:` and the other fields are indented under it. |

### `practices.csv`

| Message | What it means | Fix |
|---|---|---|
| `line N: number "…" must be exactly 10 digits` | Formatting, spaces, a missing digit, or Excel's `8.14E+09`. | Write the 10 digits only. In Excel, format the column as Text. |
| `line N: number … is a duplicate of line M` | The same number appears twice. | Delete one row, or fix the typo. |
| `line N: practice_name is empty` | No name. | Fill it in. |
| `line N: timezone "…" isn't recognised` / `timezone is empty` | e.g. `Eastern` or `EST`. | Use `America/New_York`, `America/Chicago`, etc. |
| `line 1: the header row must be exactly: …` | A column was renamed, removed, added or moved. The error lists what's missing or unexpected. | Restore the header row from [section 4](#4-update-practice-data). |
| `line N: Invalid Record Length: columns length is 16, got 17` | That row has an extra (or missing) comma. | Usually a comma inside a value: wrap the value in "double quotes". |

### Files and colors

| Message | What it means | Fix |
|---|---|---|
| `File size check failed … over the 25 MB limit` | The file is too big for the repo. | Compress it, split it, or host it elsewhere and add a link card. |
| `⚠ … is not listed in src/data/documents.yaml` (warning only) | A file with no entry, so it won't appear on the site. | Add an entry, or delete the file. |
| `contrast (light/dark): … needs at least 4.5:1` (`npm run check`) | A color change made text hard to read. | Adjust the color in `tokens.css`. |
| `… has a hard-coded color` (`npm run check`) | A color outside `tokens.css`. | Use a `var(--color-…)` token instead. |

---

## 8. Where things live

```
public/
  files/               ← your documents, one folder per section
  robots.txt           ← tells search engines to stay away
  favicon.svg          ← browser-tab icon
src/
  data/
    documents.yaml     ← every document and link card
    practices.csv      ← practice lookup data
  styles/tokens.css    ← all colors
  components/          ← page building blocks (cards, lookup, header…)
  pages/               ← the three pages
  lib/                 ← validation and data loading
scripts/               ← pre-build checks (file sizes, colors)
netlify.toml           ← Netlify build settings and the noindex header
DECISIONS.md           ← why things were built the way they are
```
