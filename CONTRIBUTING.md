# Contributing

Thanks for helping! Bug reports, ideas and pull requests are all welcome.

## Before you start

- For a bug, open an issue with steps to reproduce, your browser and OS, and a screenshot if useful.
- For a larger change, open an issue first so we can agree on the approach.
- **Never attach real course PDFs or maps built from them** to issues or pull requests. Reproduce problems with the synthetic files in `fixtures/` (or generate your own with `scripts/make-demo-course.py`).

## Development setup

```bash
npm install
npx playwright install chromium   # once, for browser tests
npm run dev                       # http://127.0.0.1:5173
```

## Checks (please run before a pull request)

```bash
npm test
npm run test:security        # builds dist/ first
npm run test:skill
npm run demo:validate
npm run test:e2e
```

The same checks run automatically on GitHub Actions for every push and pull request.

## Guidelines

- Keep changes small and focused; add or update tests for behaviour you change.
- Security matters: no remote requests, no `dangerouslySetInnerHTML`, keep the CSP strict, validate all imported data.
- Changes to the map format need a schema update in both `schemas/` and `skill/.../references/`, plus a note in `CHANGELOG.md`.
- By contributing you agree that your contribution is licensed under the MIT License.
