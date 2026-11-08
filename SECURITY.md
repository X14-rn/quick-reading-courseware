# Security policy

## Supported versions

Only the latest release on the `main` branch receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.
Use GitHub's private reporting instead: open the repository's **Security** tab → **Report a vulnerability**.
Include the steps to reproduce, the affected file or feature, and (if possible) a minimal map JSON or PDF that triggers it.

You can expect an acknowledgement within 7 days. Fixes are released as a new version with a note in [`CHANGELOG.md`](CHANGELOG.md).

## Security model (summary)

- The viewer is a static web app served only on `127.0.0.1`; it makes no network requests at runtime.
- A strict Content Security Policy (`security-policy.mjs`) blocks remote scripts, connections, frames and forms.
- Imported JSON is size-limited and validated against the JSON Schema and relation rules before use; text is rendered as text, never as HTML.
- PDFs are rendered with pdf.js with scripting and `eval` disabled; course PDFs must match the SHA-256 and page count stored in the map. Translation PDFs (`*_tr.pdf`) are matched by exact name and page count only.
- The local server (`scripts/serve-viewer.mjs`) accepts only GET/HEAD from loopback with an allowed `Host` header and blocks path traversal.
- Maps, PDFs and notes are stored in the browser's IndexedDB on the user's machine.

Details: [`docs/security-review-20261101.md`](docs/security-review-20261101.md). Security tests: `npm run test:security`.
