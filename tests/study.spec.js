import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const URL = 'http://127.0.0.1:5173/';
const importMap = async (page, file) => {
  await page.locator('input[accept*=".json"]').setInputFiles(path.resolve(file));
  await expect(page.locator('.status strong')).toBeVisible(); // the map is shown before PDFs are chosen
};
const importPdfs = page => page.locator('input[accept*=".pdf"]').setInputFiles([path.resolve('fixtures/waves.pdf'), path.resolve('fixtures/optics.pdf')]);
// Windows Chrome takes a moment to enter native full screen and swallows Esc during the
// transition (as a user would experience); wait for it (or for the in-app fallback) first.
const settleFullscreen = page => page.waitForFunction(() => document.fullscreenElement !== null, null, { timeout: 1500 }).catch(() => {});
const node = (page, title) => page.locator('.react-flow__node').filter({ hasText: title });

test('search jumps between matches, reveals collapsed branches and searches key points', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  await page.goto(URL);
  await importMap(page, 'fixtures/demo-laser-optics.json');
  await page.getByRole('button', { name: 'Collapse all' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(10); // course + 9 chapters
  const search = page.getByLabel('Search knowledge points');
  await search.fill('coherence length');
  const counter = page.getByLabel('Search matches');
  await expect(counter).toHaveText(/^–\/\d+$/);
  const total = Number((await counter.textContent()).split('/')[1]);
  expect(total).toBeGreaterThan(2);
  // Collapsed chapters show how many matches they hide.
  await expect(node(page, 'Coherence').locator('.badge-match')).toBeVisible();
  await search.press('Enter');
  await expect(counter).toHaveText(`1/${total}`);
  const first = await page.locator('#source-panel .details h2').textContent();
  await expect(page.locator('.react-flow__node.match-current')).toHaveCount(1);
  await expect(page.locator('.react-flow__node.match-current')).toContainText(first);
  await page.getByRole('button', { name: 'Next match' }).click();
  await expect(counter).toHaveText(`2/${total}`);
  await expect(page.locator('#source-panel .details h2')).not.toHaveText(first);
  await search.press('Shift+Enter');
  await search.press('Shift+Enter');
  await expect(counter).toHaveText(`${total}/${total}`); // wraps around
  // Key-point text is searchable (this phrase only occurs in a key point).
  await search.fill('flash-lamp Nd:YAG');
  await expect(counter).toHaveText('–/1');
  await search.press('Enter');
  await expect(page.locator('#source-panel .details h2')).toHaveText('Specifying a laser source');
  await expect(node(page, 'Specifying a laser source')).toBeVisible();
  await search.press('Escape');
  await expect(search).toHaveValue('');
  await page.getByRole('button', { name: 'Expand all' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(45);
});

test('collapse all and expand all refit the whole map to the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  await page.goto(URL);
  await importMap(page, 'fixtures/demo-laser-optics.json');
  const inView = async () => page.locator('.react-flow__node').evaluateAll(nodes => {
    const pane = document.querySelector('.react-flow').getBoundingClientRect();
    return nodes.every(n => { const r = n.getBoundingClientRect(); return r.left >= pane.left - 1 && r.right <= pane.right + 1 && r.top >= pane.top - 1 && r.bottom <= pane.bottom + 1; });
  });
  await page.getByRole('button', { name: 'Collapse all' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(10);
  await expect.poll(inView).toBe(true);
  await page.getByRole('button', { name: 'Expand Beam shaping' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(13);
  // Expanded, this map is taller than the canvas even at minimum zoom, so check that a fit ran:
  // the view is zoomed out to the limit or everything fits, and the root is on screen.
  await page.getByRole('button', { name: 'Expand all' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(45);
  const scale = () => page.locator('.react-flow__viewport').evaluate(v => new DOMMatrix(getComputedStyle(v).transform).a);
  await expect.poll(async () => (await inView()) || (await scale()) <= 0.151).toBe(true);
  await expect(node(page, 'Laser optics for material processing')).toBeInViewport();
});

test('notes: add, edit, delete, survive a reload, show on the map, are searchable and export', async ({ page }) => {
  await page.goto(URL);
  await importMap(page, 'fixtures/synthetic-valid-1.1.json');
  await node(page, 'Reflection at a boundary').click();
  const box = page.locator('.details').getByLabel('New note');
  await box.fill('Angle of incidence equals angle of reflection — my mnemonic: "i = r".');
  await box.press('Control+Enter');
  await expect(page.locator('.details .note')).toHaveCount(1);
  await expect(node(page, 'Reflection at a boundary').locator('.badge-notes')).toHaveText('✎1');
  await expect(page.locator('.status')).toContainText('1 note');
  // Empty notes are refused.
  await expect(page.locator('.details').getByRole('button', { name: 'Add note' })).toBeDisabled();
  await page.reload();
  await expect(page.locator('.notice')).toContainText('Restored your last session');
  await expect(page.locator('.details h2')).toHaveText('Reflection at a boundary');
  await expect(page.locator('.details .note-text')).toContainText('mnemonic');
  await page.getByLabel('Search knowledge points').fill('mnemonic');
  await expect(page.getByLabel('Search matches')).toHaveText('–/1');
  await page.locator('.details .note').getByRole('button', { name: 'Edit' }).click();
  await page.locator('.details').getByLabel('Edit note').fill('Edited: i = r for specular reflection.');
  await page.locator('.details .note').getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.details .note-text')).toHaveText('Edited: i = r for specular reflection.');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export notes' }).click();
  const file = await (await download).path();
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(exported.schema).toBe('qr-notes/1');
  expect(exported.notes.N3[0].text).toBe('Edited: i = r for specular reflection.');
  await page.locator('.details .note').getByRole('button', { name: 'Delete' }).click();
  await page.locator('.details .note').getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.locator('.details .note')).toHaveCount(0);
  // Importing the backup restores it (merge by note ID).
  await page.getByLabel('Import notes').setInputFiles(file);
  await expect(page.locator('.details .note-text')).toHaveText('Edited: i = r for specular reflection.');
  await expect(page.locator('.notice')).toContainText('Imported 1 note');
});

test('session restore reopens the map, PDFs and view; Close map forgets it but keeps notes', async ({ page }) => {
  await page.goto(URL);
  await importMap(page, 'fixtures/synthetic-valid-1.1.json');
  await importPdfs(page);
  await expect(page.getByText('2/2 PDFs bound')).toBeVisible();
  await node(page, 'Reflection at a boundary').click();
  await page.locator('.details').getByLabel('New note').fill('Keep me');
  await page.locator('.details').getByRole('button', { name: 'Add note' }).click();
  await page.getByRole('button', { name: 'Collapse Wave concepts' }).click();
  await page.waitForTimeout(300); // a reload aborts storage writes still in flight
  await page.reload();
  await expect(page.getByText('2/2 PDFs bound')).toBeVisible();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await expect(page.locator('.details h2')).toHaveText('Reflection at a boundary');
  await expect(page.locator('canvas[aria-label="waves.pdf · Physical PDF page 2"]')).toBeVisible();
  await page.getByRole('button', { name: 'Close map' }).click();
  await expect(page.getByText('Open a courseware map')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Open a courseware map')).toBeVisible();
  // Notes belong to the project and come back when the course is imported again.
  await importMap(page, 'fixtures/synthetic-valid-1.1.json');
  await expect(page.locator('.status')).toContainText('1 note');
  await expect(page.getByText('0/2 PDFs bound')).toBeVisible();
});

test('re-importing an updated map of the same course re-attaches the saved PDFs', async ({ page }) => {
  await page.goto(URL);
  await importMap(page, 'fixtures/synthetic-valid-1.1.json');
  await importPdfs(page);
  await expect(page.getByText('2/2 PDFs bound')).toBeVisible();
  await importMap(page, 'fixtures/synthetic-valid-1.1.json');
  await expect(page.getByText('2/2 PDFs bound')).toBeVisible();
  await expect(page.locator('.notice')).toContainText('Re-attached 2 saved PDF(s)');
});

test('full-screen study sidebar shows key points, supplements, errata and editable notes', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  await page.goto(URL);
  await importMap(page, 'fixtures/synthetic-valid-1.1.json');
  await importPdfs(page);
  await node(page, 'Wave speed relation').click();
  await page.getByRole('button', { name: 'Full Screen', exact: true }).click();
  const side = page.locator('.study-sidebar');
  await expect(side).toBeVisible();
  await expect(side.getByLabel('Key points')).toContainText('v = f·λ');
  await expect(side.getByLabel('Supplementary explanation')).toContainText('not from the course material');
  await expect(side).toContainText('Possible slide error');
  await expect(side).toContainText('Standard form: v = fλ');
  const pages = await page.locator('.preview-pages').boundingBox(), sb = await side.boundingBox();
  expect(pages.x + pages.width).toBeLessThanOrEqual(sb.x + 1);
  // Typing a note does not trigger the reader's keyboard shortcuts.
  const zoom = page.getByLabel('PDF zoom', { exact: true });
  const box = side.getByLabel('New note');
  await box.fill('');
  await box.type('0-+ ArrowKeys');
  await box.press('ArrowLeft');
  await expect(zoom).toHaveText('100%');
  await box.press('Escape'); // leaves the text box, not full screen
  await expect(page.locator('.preview-fullscreen')).toBeVisible();
  await side.getByRole('button', { name: 'Add note' }).click();
  await expect(side.locator('.note')).toHaveCount(1);
  await side.getByRole('button', { name: 'p. 1' }).click();
  await expect(page.getByLabel('Current source page')).toContainText('page 1');
  // Same pin / auto-hide behaviour as the side panel (one shared setting).
  await side.getByRole('button', { name: 'Auto-hide study panel' }).click();
  await expect(side).toHaveCount(0);
  await expect(page.locator('.study-dock .panel-tab')).toBeVisible();
  await page.locator('.study-dock .panel-tab').hover();
  await expect(page.locator('.study-sidebar .note')).toHaveCount(1);
  await page.getByRole('button', { name: 'Pin study panel' }).click();
  await page.mouse.move(5, 300);
  await page.waitForTimeout(700);
  await expect(page.locator('.study-sidebar .note')).toHaveCount(1);
  await page.getByRole('button', { name: 'Exit Full Screen' }).click();
  await expect(page.locator('.details .note')).toHaveCount(1); // same note, also in the side panel
});

test('full screen works from auto-hide mode and keeps the panel open while reading', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  await page.goto(URL);
  await importMap(page, 'fixtures/synthetic-valid-1.1.json');
  await importPdfs(page);
  await node(page, 'Wave speed relation').click();
  await page.getByRole('button', { name: 'Auto-hide panel' }).click();
  await page.locator('.panel-tab').hover();
  await page.getByRole('button', { name: 'Full Screen', exact: true }).click();
  await page.mouse.move(5, 5);
  await settleFullscreen(page);
  await page.waitForTimeout(700);
  await expect(page.locator('.preview-fullscreen')).toBeVisible();
  // Auto-hide carries over: a slim tab that slides the study panel out on hover.
  await expect(page.locator('.study-sidebar')).toHaveCount(0);
  await page.locator('.study-dock .panel-tab').hover();
  await expect(page.locator('.study-sidebar')).toContainText('Key points');
  await page.mouse.move(300, 400);
  await expect(page.locator('.study-sidebar')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.preview-fullscreen')).toHaveCount(0);
});

// ---------- Security ----------

test('security: note and key-point text stay inert, and new features make no network requests', async ({ page }) => {
  const external = [];
  page.on('request', r => { const u = r.url(); if (!u.startsWith(URL) && !u.startsWith('blob:') && !u.startsWith('data:')) external.push(u); });
  await page.goto(URL);
  const map = JSON.parse(fs.readFileSync('fixtures/synthetic-valid-1.1.json', 'utf8'));
  const payload = '<img src=x onerror="window.pwned=1">';
  for (const nodes of [map.v2.nodes, map.v3.nodes]) { nodes[1].key_points[0].text = payload; nodes[1].supplements[0].text = payload; }
  map.validation.issues[0].description = payload;
  await page.locator('input[accept*=".json"]').setInputFiles({ name: 'xss.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(map)) });
  await expect(page.locator('.status strong')).toBeVisible();
  await importPdfs(page);
  await expect(page.getByText('2/2 PDFs bound')).toBeVisible();
  await node(page, 'Wave speed relation').click();
  await expect(page.locator('.details .kp-text').first()).toHaveText(payload);
  const box = page.locator('.details').getByLabel('New note');
  await box.fill(payload); await box.press('Control+Enter');
  await expect(page.locator('.details .note-text')).toHaveText(payload);
  await page.getByRole('button', { name: 'Full Screen', exact: true }).click();
  await expect(page.locator('.study-sidebar .note-text')).toHaveText(payload);
  await settleFullscreen(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.preview-fullscreen')).toHaveCount(0);
  await page.getByLabel('Search knowledge points').fill('onerror');
  await page.getByLabel('Search knowledge points').press('Enter');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export notes' }).click();
  await download;
  await page.reload();
  await expect(page.getByText('2/2 PDFs bound')).toBeVisible();
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
  expect(await page.locator('img').count()).toBe(0);
  expect(external).toEqual([]);
});

test('security: a tampered saved session or saved PDF is rejected, not trusted', async ({ page }) => {
  await page.goto(URL);
  await importMap(page, 'fixtures/synthetic-valid-1.1.json');
  await importPdfs(page);
  await expect(page.getByText('2/2 PDFs bound')).toBeVisible();
  await page.waitForTimeout(300);
  // Alter one stored PDF's bytes: its hash no longer matches, so it must not bind.
  await page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('quick-reading-viewer');
    req.onsuccess = () => {
      const tx = req.result.transaction('pdfs', 'readwrite'), s = tx.objectStore('pdfs');
      const keys = s.getAllKeys();
      keys.onsuccess = () => { const k = keys.result[0]; const g = s.get(k); g.onsuccess = () => {
        const bytes = new Uint8Array(g.result.bytes.slice(0)); bytes[bytes.length - 2] ^= 0xff; s.put({ ...g.result, bytes: bytes.buffer }, k); }; };
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    };
  }));
  await page.reload();
  await expect(page.getByText('1/2 PDFs bound')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('SHA-256 does not match');
  // Break the stored map's integrity: the session is refused, the app starts clean.
  await page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('quick-reading-viewer');
    req.onsuccess = () => {
      const tx = req.result.transaction('session', 'readwrite'), s = tx.objectStore('session'), g = s.get('map');
      g.onsuccess = () => { const m = g.result; m.v3.references[0].page = 99; s.put(m, 'map'); };
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    };
  }));
  await page.reload();
  await expect(page.getByText('Open a courseware map')).toBeVisible();
  await expect(page.locator('.notice')).toContainText('could not be restored');
});
