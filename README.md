# Vuniper for Stremio

A configurable, unofficial catalogue add-on: choose any of Vuniper’s 10 movie lists and 5 TV lists, then install just those catalogues in Stremio. The webpage uses Vuniper’s public logo, purple palette and remote poster artwork. No account or API key is needed to fetch the public lists.

## Hosting: GitHub + Cloudflare Workers

**GitHub stores and refreshes the project. Cloudflare serves the webpage and personalised add-on URLs. Do not enable GitHub Pages for this project:** static Pages cannot generate a different manifest for every combination of lists. You will need a Cloudflare account alongside your GitHub account.

### 1. Create and upload the repository

Create a new public GitHub repository named **vuniper-configurable**. Extract the ZIP. Upload the *contents* of the extracted folder to the repository root, not the ZIP or an extra containing folder. At the root you should see `package.json`, `wrangler.jsonc`, `src`, `public`, `data`, `scripts` and `test`.

There are fewer than 100 source files. Poster images are URLs, not files in the repository. Never upload `node_modules`.

**Important: GitHub’s browser uploader may skip the hidden `.github` folder.** If you cannot see `.github/workflows/refresh.yml` in your repository:

1. Choose **Add file → Create new file**.
2. In the filename box, enter **`.github/workflows/refresh.yml`** (including the leading dot and both slashes).
3. Open the supplied `refresh-workflow.txt`, copy its complete contents into the editor, and commit.

The TXT copy is only there to make this step easy; GitHub runs the YML at the exact path above.

### 2. Connect Cloudflare to GitHub

In Cloudflare, open **Workers & Pages**, create a **Worker**, and connect/import your GitHub repository. Choose `vuniper-configurable` and the `main` branch. Use:

- Worker/project name: **vuniper-configurable** (must match `name` in `wrangler.jsonc`).
- Root directory: repository root (leave blank if the form allows it).
- Build command: **`npm ci && npm test`**.
- Deploy command: **`npx wrangler deploy`**.

Deploy it. Use the actual `https://vuniper-configurable.<your-subdomain>.workers.dev` URL shown by Cloudflare. The install button derives its URL automatically; there is no username or hostname to edit in the source. Cloudflare dashboard labels may change; choose the Git-connected **Workers** flow, not a static Pages project.

Keep automatic deployments enabled for pushes to `main`. A scheduled data commit then triggers a new deployment. The bundled data makes the first deployment usable without waiting for the first refresh.

### 3. Enable and check updates

In GitHub → **Actions**, enable workflows if prompted. Open **Refresh Vuniper catalogues → Run workflow**. A successful run refreshes the JSON data and commits it; check that Cloudflare subsequently deploys that commit.

The workflow is scheduled every six hours. GitHub schedules can run late, and public-repository schedules may be paused after 60 days without repository activity. Check Actions if the footer snapshot date stops advancing. If GitHub restricts workflow write permissions, enable **Settings → Actions → General → Workflow permissions → Read and write permissions**. Repository branch protection may also block the data commit.

### 4. Choose and install

Open your Cloudflare URL, choose lists, and press **Install in Stremio**. Alternatively, **Copy install link** and paste the HTTPS manifest URL into Stremio’s add-on search. Desktop and mobile configurations use the same link. On clients that do not expose add-on installation, install through Stremio Web/desktop using the same account.

Your selection is encoded in the install URL, saved locally in the browser, and retained in the webpage URL for sharing. New list contents do not require reinstalling. To change which lists are included, configure again and reinstall; if the client keeps the old configuration, remove the old Vuniper add-on first.

## What is included

Movies: Movies Now Online, Streaming Soon, Hidden Gems, Latest Trailers, Upcoming Movies, In Theaters, Popular Online, New on Blu-ray, New Anime Movies, Top 100 Movies.

TV: New Shows & Seasons, Upcoming Shows, Popular Now, New Anime Shows, Top 100 Shows.

Each regular catalogue includes up to **200 IMDb-matched titles** in Vuniper’s source order. The Top 100 lists include up to 100. Stremio receives pages of 100 titles. The footer shows the oldest list snapshot date. Each selectable card shows its actual bundled title count; a saved-snapshot label indicates a failed refresh for that list. Lists can have fewer titles when Vuniper supplies fewer results or lacks IMDb IDs. Increase `VUNIPER_MAX_ITEMS` in the refresh environment if you want a larger history; keep refresh/deployment limits in mind.

The refresh process reads Vuniper’s public website API. This is not a guaranteed or versioned integration: Vuniper can change its API or restrict access. A failed refresh retains the last good snapshot for the affected list. Initial refreshes fail rather than writing incomplete or invented data. No login/session tokens are used.

Posters use Vuniper’s `img.vuniper.com` URLs where available, with Metahub as a data-generation fallback when a source image is missing. They are not downloaded into the repository. If Vuniper removes an image later, that individual poster may fail until refreshed. Stremio can use another metadata provider’s artwork on its detail page; this add-on controls artwork in its own catalogue responses.

**This is a catalogue-only add-on.** It provides real IMDb IDs, not video files, streams or subtitles. You need other installed add-ons for playback. Upcoming/cinema/trailer lists do not guarantee playable streams. TV entries open the series, not a particular season. Existing Stremio client metadata/stream-provider delays are outside this add-on’s control.

## Local development and verification

Requires Node 22+ and Python 3.12+.

```sh
npm ci
npm test
npm run dev
# Open http://localhost:3000
npm run refresh
npm run check
```

`npm run refresh` updates `data/catalogues.json` and `public/status.json`. `npm run check` bundles the Worker without publishing. Tests cover every selection combination, selected-only manifests, pagination, invalid requests, media types and IMDb IDs. No credentials are required until you deploy to Cloudflare.

### Files you might edit

- `public/index.html` — webpage copy and layout.
- `public/style.css` — visual design.
- `public/app.js` — selection and installation UI.
- `public/lists.json` — list names and upstream sections.
- `public/config.js` — permanent selection bit positions; never reorder existing IDs.
- `scripts/refresh.py` — upstream fetch and metadata conversion.
- `src/worker.js` — personalised manifests and catalogue responses.

## Attribution

Unofficial fan project. Not affiliated with or endorsed by Vuniper or Stremio. Vuniper’s name, logo, list data and poster artwork belong to their respective owners. The page links back to Vuniper and clearly labels the integration as unofficial.
