# Public document search and refresh

**Decision status:** Accepted for the isolated preview, 2026-10-08. Alpha Labs production deployment and any account transfer remain separate decisions.

## Decision

The preview remains a static GitHub Pages site. A repository-owned GitHub Actions workflow refreshes `document-search-index.json`; browser search loads it alongside the existing 35-page `search-index.json`. This keeps the refresh portable with the repository, without a local Windows scheduled task, personal token, or server attached to the site.

The source inventory is limited to first-party public PDF and XLSX links (including technical PDFs attached to image-map hotspots), plus the image-based service sheets, on the 35 retained routes. The job reads both the checked-in page links and the corresponding public Alpha Labs source pages, so a newly linked document on one of those routes can be discovered without replacing the preview's custom HTML. It does not crawl private systems, arbitrary off-site links, unlisted routes, or submit forms. The source host allowlist is in `scripts/refresh_document_index.py`.

The alternatives were a browser-side crawler/OCR process, a scheduler on the user's Windows computer, or a repository-owned job. Browser-side OCR would make every visitor download and process many files, while a computer-bound scheduler would stop when that machine is offline and complicate an Alpha-account move. The repository job adds GitHub Actions and OCR dependencies but travels with the source and keeps extraction off visitors' devices. The static search index is published only after a changed file is processed and the exact Pages build is verified.

For PDFs, embedded text is used when present and image-only pages are rendered and OCR'd. Service-sheet images are OCR'd. XLSX cell values are extracted. Each document result links to the original public file, except service-sheet results, which return to the owning preview page. The published index records extraction method, source URL, content hash, source pages, and any failures. A temporary failure retains previously indexed text but marks that result as stale; first-time failures are excluded and counted visibly in the search panel.

## Schedule and change detection

The workflow `refresh-document-index.yml` runs in `America/Los_Angeles` at 17 minutes past:

- Weekdays: every hour from 9:00 AM through 5:00 PM.
- Other weekday hours: midnight, 4:00 AM, 8:00 AM, and 8:00 PM.
- Weekends: midnight, 4:00 AM, 8:00 AM, noon, 4:00 PM, and 8:00 PM.

It uses conditional HTTP requests (`ETag` / `Last-Modified`) and re-extracts only new or changed files. If the source supplies neither validator, the file is downloaded and content-hashed. A new index commit and Pages build are requested only when document content or coverage changes. Because GitHub can disable schedules in inactive public repositories after 60 days, a no-content-change run makes one empty keepalive commit after 30 days without other commits; that commit also requests a Pages build of the unchanged site. GitHub scheduled runs are best-effort and can be delayed or dropped, so this is a check cadence, not a guaranteed one-hour freshness SLA. Workflow failures and per-file coverage appear in the Actions run summary.

## Run and verify

Manually run **Refresh public document search** in the repository's Actions tab after transferring the repository, changing source links, or fixing an extraction failure. The workflow validates the generated index, commits a change only when necessary, requests a Pages build explicitly, and compares the live index bytes with the committed file. A `GITHUB_TOKEN` commit alone does not trigger branch-sourced GitHub Pages.

For a bounded local diagnostic, use a temporary output path so the complete published index is not replaced by a sample:

```text
python scripts/refresh_document_index.py --local-only --max-documents 3 --output <temporary-file>
```

Run `node Test-DocumentIndex.mjs --require-documents` after a full refresh. Local OCR requires Tesseract and Poppler; the hosted workflow installs them. Do not describe the index as complete when `failedCount` or `sourcePageFailures` is nonzero, and review the file-level failure list before claiming full coverage.

## Moving to Alpha's GitHub account

Move the complete repository or import its full source, including `.github/workflows`, the two index files, scripts, and tests. A repository transfer preserves history; importing into an existing Alpha repository may be more convenient but needs a separate link and deployment check. No personal access token or Ukiah Computerworks-specific path is used by this refresh workflow. Confirm that Actions can write repository contents and request Pages builds, then manually dispatch one refresh and verify the live index. The current site's absolute preview links and Pages path must be reviewed for the new account; this feature does not migrate the site or grant Alpha's AI access.

If the production document host changes, explicitly update the first-party allowlist and source URLs in the route manifest before running the crawler against it. Do not broaden the crawler to arbitrary hosts merely to clear failures.
