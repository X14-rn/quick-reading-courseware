import { test, expect } from '@playwright/test';
import path from 'node:path';

// Viewer v2 (2026-11-08): stable map, keyboard control, compact cards, resizable panels,
// fit-page reader with F shortcut, and translation | original split reading.
const URL = 'http://127.0.0.1:5173/';
const importMap = async (page, file) => {
  await page.locator('input[accept*=".json"]').setInputFiles(path.resolve(file));
  await expect(page.locator('.status strong')).toBeVisible();
};
const node = (page, title) => page.locator('.react-flow__node').filter({ hasText: title });
const viewport = page => page.locator('.react-flow__viewport').evaluate(el => el.style.transform);
const settleFullscreen = page => page.waitForFunction(() => document.fullscreenElement !== null, null, { timeout: 1500 }).catch(() => {});

test('panel changes keep the map in place; cards are single-line and complete; leaf count shown', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  await page.goto(URL);
  await importMap(page, 'fixtures/demo-laser-optics.json');
  await expect(page.locator('.status')).toContainText('45 nodes');
  await expect(page.locator('.leaf-count')).toHaveText('35 learning points');
  await page.waitForTimeout(400);
  const before = await viewport(page);
  await page.getByRole('button', { name: 'Auto-hide panel', exact: true }).click();
  await page.waitForTimeout(400);
  expect(await viewport(page)).toBe(before);
  await page.locator('.panel-tab').hover();
  await page.getByRole('button', { name: 'Pin panel', exact: true }).click();
  await page.waitForTimeout(400);
  expect(await viewport(page)).toBe(before);
  // Every title fits on one line without being cut off.
  const cut = await page.locator('.card-title').evaluateAll(els => els.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent));
  expect(cut).toEqual([]);
  const heights = await page.locator('.react-flow__node').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e.closest('.react-flow__viewport')).transform.split(',')[3] || 1))));
  expect(Math.max(...heights)).toBeLessThanOrEqual(42);
});

test('keyboard: arrows move, Enter toggles in place, +/- zoom, Ctrl+Enter fits, F opens the reader', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  await page.goto(URL);
  await importMap(page, 'fixtures/demo-laser-optics.json');
  await page.getByRole('button', { name: 'Collapse all' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(10);
  await page.locator('.react-flow__pane').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('ArrowDown'); // nothing selected yet → the root
  await expect(page.locator('#source-panel .details h2')).toHaveText(await page.locator('.react-flow__node[data-id="demo"] .card-title').textContent());
  await page.keyboard.press('ArrowRight'); // into the chapters
  const first = await page.locator('#source-panel .details h2').textContent();
  await page.keyboard.press('ArrowDown');
  const second = await page.locator('#source-panel .details h2').textContent();
  expect(second).not.toBe(first);
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#source-panel .details h2')).toHaveText(first);
  // Enter expands the selected chapter and the chapter card stays where it was on screen.
  const card = page.locator('.react-flow__node.selected');
  await page.waitForTimeout(450); // let the Collapse-all fit animation finish
  const at = await card.boundingBox();
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__node')).not.toHaveCount(10);
  const after = await card.boundingBox();
  expect(Math.abs(after.x - at.x)).toBeLessThan(2); expect(Math.abs(after.y - at.y)).toBeLessThan(2);
  await page.keyboard.press('ArrowRight'); // first learning point of the chapter
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#source-panel .details h2')).toHaveText(first);
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__node')).toHaveCount(10);
  // Zoom keys and fit.
  const z0 = await viewport(page);
  await page.keyboard.press('-'); await page.waitForTimeout(250);
  expect(await viewport(page)).not.toBe(z0);
  await page.keyboard.press('Control+Enter'); await page.waitForTimeout(300);
  // Typing in search must not move the selection.
  await page.getByLabel('Search knowledge points').fill('laser');
  await page.getByLabel('Search knowledge points').press('ArrowDown');
  await expect(page.locator('#source-panel .details h2')).toHaveText(first);
  await page.getByLabel('Search knowledge points').press('Escape');
  // F opens the full-screen reader for a learning point; Esc closes it.
  await page.keyboard.press('Enter'); await page.keyboard.press('ArrowRight');
  await page.keyboard.press('f');
  await expect(page.locator('.preview-fullscreen')).toBeVisible();
  await settleFullscreen(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.preview-fullscreen')).toHaveCount(0);
});

test('panel width, details/preview split and study panel width are resizable and remembered', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 860 });
  await page.goto(URL);
  await importMap(page, 'fixtures/synthetic-valid-1.1.json');
  await page.locator('input[accept*=".pdf"]').setInputFiles([path.resolve('fixtures/waves.pdf'), path.resolve('fixtures/optics.pdf')]);
  await node(page, 'Reflection at a boundary').click();
  const panel = page.locator('#source-panel');
  const w0 = (await panel.boundingBox()).width;
  const bar = page.getByRole('separator', { name: 'Resize side panel' });
  const b = await bar.boundingBox();
  await page.mouse.move(b.x + 3, b.y + 200); await page.mouse.down(); await page.mouse.move(b.x - 150, b.y + 200, { steps: 5 }); await page.mouse.up();
  await expect.poll(async () => (await panel.boundingBox()).width).toBeGreaterThan(w0 + 120);
  const top0 = (await page.locator('.panel-top').boundingBox()).height;
  const split = page.getByRole('separator', { name: 'Resize details and source preview' });
  const s = await split.boundingBox();
  await page.mouse.move(s.x + 100, s.y + 3); await page.mouse.down(); await page.mouse.move(s.x + 100, s.y + 120, { steps: 5 }); await page.mouse.up();
  await expect.poll(async () => (await page.locator('.panel-top').boundingBox()).height).toBeGreaterThan(top0 + 90);
  const w1 = (await panel.boundingBox()).width;
  await page.reload();
  await expect(page.locator('#source-panel .details h2')).toHaveText('Reflection at a boundary');
  expect(Math.abs((await panel.boundingBox()).width - w1)).toBeLessThan(3);
  // Full screen: the study panel has its own drag handle; pages fit the window height.
  await page.getByRole('button', { name: 'Full Screen', exact: true }).click();
  await settleFullscreen(page);
  const study = page.locator('.study-sidebar');
  const sw = (await study.boundingBox()).width;
  const h = await page.getByRole('separator', { name: 'Resize study panel' }).boundingBox();
  await page.mouse.move(h.x + 3, h.y + 300); await page.mouse.down(); await page.mouse.move(h.x - 120, h.y + 300, { steps: 5 }); await page.mouse.up();
  await expect.poll(async () => (await study.boundingBox()).width).toBeGreaterThan(sw + 90);
  const canvas = page.locator('.preview-fullscreen .source-page canvas').first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox(), win = page.viewportSize();
  expect(box.height).toBeLessThanOrEqual(win.height - 60); // whole page visible, not width-fitted
  await page.keyboard.press('Escape');
});

test('translation files pair with their originals and split mode locks both pages', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 860 });
  await page.goto(URL);
  await importMap(page, 'fixtures/synthetic-valid-1.1.json');
  await page.locator('input[accept*=".pdf"]').setInputFiles([path.resolve('fixtures/waves.pdf'), path.resolve('fixtures/optics.pdf'),
    path.resolve('fixtures/waves_tr.pdf'), path.resolve('fixtures/bad/optics_tr.pdf')]);
  await expect(page.locator('.error')).toContainText('optics_tr.pdf: 2 pages, map expects 1');
  await expect(page.locator('.status')).toContainText('1 translation');
  // The mode button is always offered in full screen; a source without translation stays single, with a note.
  await node(page, 'Reflection at a boundary').click();
  await page.getByRole('button', { name: 'Full Screen', exact: true }).click();
  await settleFullscreen(page);
  await page.getByRole('button', { name: 'Translation | Original' }).click();
  await expect(page.locator('.source-document[aria-label="optics.pdf"] .pair-missing')).toContainText('original only');
  await expect(page.locator('.source-document[aria-label="optics.pdf"] .source-page.paired')).toHaveCount(0);
  await expect(page.locator('.source-document[aria-label="waves.pdf"] .source-page.paired')).toHaveCount(1);
  await page.getByRole('button', { name: 'Original only' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.preview-fullscreen')).toHaveCount(0);
  await node(page, 'Wave speed relation').click();
  await page.getByRole('button', { name: 'Full Screen', exact: true }).click();
  await settleFullscreen(page);
  const mode = page.getByRole('button', { name: 'Translation | Original' });
  await expect(mode).toBeVisible();
  await mode.click();
  const pair = page.locator('.source-page.paired').first();
  await expect(pair.locator('.pair-cell.translation canvas')).toBeVisible();
  await expect(pair.locator('.pair-cell.original canvas')).toBeVisible();
  const t = await pair.locator('.pair-cell.translation').boundingBox(), o = await pair.locator('.pair-cell.original').boundingBox();
  expect(t.x).toBeLessThan(o.x); expect(Math.abs(t.y - o.y)).toBeLessThan(2); // left translation, middle original, same row
  await expect(page.locator('.study-sidebar')).toBeVisible(); // right: study panel
  // Arrow keys scroll both together: they are one row.
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
  const t2 = await pair.locator('.pair-cell.translation').boundingBox(), o2 = await pair.locator('.pair-cell.original').boundingBox();
  expect(Math.abs(t2.y - o2.y)).toBeLessThan(2);
  // The mode is remembered and survives a reload together with the translation.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator('.status')).toContainText('1 translation');
  await page.getByRole('button', { name: 'Full Screen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Original only' })).toBeVisible();
  await expect(page.locator('.source-page.paired').first()).toBeVisible();
});
