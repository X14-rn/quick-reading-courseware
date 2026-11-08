# Security review: viewer study features (2026-11-01)

Scope: the changes that add study notes, session saving, the panel modes, search navigation and the refactor (`src/App.jsx`, `src/components/*`, `src/hooks/*`, `src/{tree,search,notes,storage,session}.js`). The security policy (`security-policy.mjs`), the Vite config, the schema and the validator are unchanged.

## Threat model
This is a local, single-user viewer on `127.0.0.1`. The untrusted inputs are imported map JSON, PDFs, imported notes files and data previously saved in the browser (which could be modified by other software with access to the browser profile). Nothing is sent over the network.

## Findings and controls

| Area | Risk | Control | Verified by |
|---|---|---|---|
| Script injection from map text, notes or key points | XSS | All text is rendered as React text nodes. No `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function` in `src/` (source scan). CSP unchanged: `script-src 'self'`, `object-src 'none'`, `base-uri 'none'`. | e2e "note and key-point text stay inert": an `<img onerror>` payload in a key point, supplement, erratum and note does not execute; no `<img>` is created |
| Network exfiltration | Data leaving the machine | No `fetch`, XHR, WebSocket or beacon in `src/` (source scan). CSP `connect-src 'self'`. Notes export uses a local `blob:` download. | e2e: no non-local requests during import, notes, export, search and reload |
| Imported notes file | Malformed or hostile JSON, prototype pollution, oversized input | `parseNotesFile`: requires schema and matching project ID, rejects `__proto__`/`prototype`/`constructor` keys and non-string fields, drops unknown fields, 5 000 characters per note, 10 MiB per file | unit tests (6 rejection cases) and e2e import |
| Saved map (IndexedDB) | Tampered or stale data trusted on restore | The restored map runs through the full validator again (schema, relations, resource budgets); failure means a clean start plus a notice | e2e: corrupted stored reference → session refused |
| Saved PDFs (IndexedDB) | Swapped or altered bytes shown as the original | Stored bytes are re-hashed (SHA-256) and page-counted on every restore; a mismatch is not bound and is reported | e2e: one flipped byte → "SHA-256 does not match", 1/2 bound |
| Saved view state | Injected IDs or a huge query | `restoreUi` keeps only node IDs present in the map; the query is capped at 200 characters | unit test |
| UI preferences (localStorage) | Unexpected values | Only whitelisted values (`pinned`/`autohide`, `open`/`closed`) are accepted | code review |
| Download filename | Path tricks | Built from `project.id`, which the schema restricts to `^[A-Za-z0-9][A-Za-z0-9._-]*$` | schema |
| Storage exhaustion | Quota errors | Size limits unchanged (JSON 25 MiB, PDF 256 MiB); quota errors are reported ("not saved for next time"), and the viewer keeps working | code review |
| Note IDs | Weak or absent randomness | `crypto.randomUUID`, falling back to 128 bits from `crypto.getRandomValues` | code review |

## Privacy note
The session saves the map, the exact PDF bytes and your notes in this browser profile, on this computer only. "Close map" deletes the saved map, PDFs and view state. Notes are kept per course until you delete them, and you can export them as a backup. Anyone with access to your Windows account and browser profile could read them, as with any local file.

## Not covered here
- **`npm audit`:** not run, because the registry was unreachable from the review environment. No dependency was added or changed; the last recorded audit result is in `docs/security-corrections.md`. Run `npm audit` locally.
- **Real-server header tests** (`npm run test:security`): to be run on Windows. The equivalent CSP and header checks passed against the test server used here.
