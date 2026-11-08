import { test, expect } from '@playwright/test';
import path from 'node:path';

test('security policy blocks remote connections and imported markup stays inert', async ({ page }) => {
  const response = await page.goto('http://127.0.0.1:5173/');
  expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  const fixture = JSON.parse((await import('node:fs')).readFileSync('fixtures/synthetic-valid.json', 'utf8'));
  const title = '<img src=x onerror="window.injected=true">';
  fixture.project.title = title;
  await page.locator('input[accept*=".json"]').setInputFiles({name:'markup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
  await expect(page.locator('.status strong')).toHaveText(title);
  expect(await page.evaluate(()=>window.injected)).toBeUndefined();
  expect(await page.evaluate(async()=>{
    try { await fetch('https://untrusted.invalid/should-be-blocked'); return false; } catch { return true; }
  })).toBe(true);
});

test('synthetic import, multiple sources, PDF preview and invalid map', async ({ page }) => {
  const external = [];
  page.on('request', req => { if (!req.url().startsWith('http://127.0.0.1:5173/') && !req.url().startsWith('blob:')) external.push(req.url()); });
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('input[accept*=".json"]').setInputFiles(path.resolve('fixtures/synthetic-valid.json'));
  await expect(page.getByText('Synthetic wave demonstration')).toBeVisible();
  await expect(page.getByText('0/2 PDFs bound')).toBeVisible();
  await expect(page.getByText('Missing PDFs: waves.pdf, optics.pdf')).toBeVisible();
  await page.getByText('Describe wave reflection at a boundary').click();
  await expect(page.locator('.reference')).toHaveCount(2);
  await page.locator('.reference').first().click();
  await expect(page.getByText('Missing PDF: waves.pdf.', { exact: false })).toBeVisible();
  await page.locator('input[accept*=".pdf"]').setInputFiles([path.resolve('fixtures/waves.pdf'), path.resolve('fixtures/optics.pdf')]);
  await expect(page.getByText('2/2 PDFs bound')).toBeVisible();
  await page.locator('.reference').nth(1).click();
  await expect(page.locator('canvas[aria-label="optics.pdf · Physical PDF page 1"]')).toBeVisible();
  await expect(page.locator('.source-page')).toHaveCount(2);
  await expect(page.locator('.details')).not.toContainText('occurrence');
  await page.getByRole('button', { name: 'Collapse Wave concepts' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await page.getByRole('button', { name: 'Expand all' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await page.locator('input[accept*=".json"]').setInputFiles(path.resolve('fixtures/synthetic-invalid-page.json'));
  await expect(page.getByRole('alert')).toContainText('invalid document or physical page');
  expect(external).toEqual([]);
});

test('malformed JSON and unrelated PDF give actionable errors', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('input[accept*=".json"]').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.getByRole('alert')).toContainText('Map import failed');
  await page.locator('input[accept*=".json"]').setInputFiles(path.resolve('fixtures/synthetic-valid.json'));
  await page.locator('input[accept*=".pdf"]').setInputFiles({ name: 'other.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n') });
  await expect(page.getByRole('alert')).toContainText('no matching document ID/hash');
});

test('continuous and scattered sources show every cited page, including in fullscreen', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('input[accept*=".json"]').setInputFiles(path.resolve('fixtures/synthetic-page-ranges.json'));
  await page.getByText('Continuous pages example', { exact: true }).click();
  await expect(page.locator('.details .reference')).toHaveCount(1);
  await expect(page.locator('.details .reference')).toContainText('pages 8-11');
  await expect(page.locator('.preview')).toContainText('Missing PDF: source-ranges.pdf');
  await page.locator('input[accept*=".pdf"]').setInputFiles([path.resolve('fixtures/source-ranges.pdf'), path.resolve('fixtures/optics.pdf')]);
  const articles = page.locator('.source-page');
  await expect(articles).toHaveCount(4);
  expect(await articles.evaluateAll(els => els.map(el => Number(el.dataset.page)))).toEqual([8, 9, 10, 11]);
  // Each page must actually render after scrolling, not merely have a label.
  for (let i = 0; i < 4; i++) {
    await articles.nth(i).scrollIntoViewIfNeeded();
    await expect(articles.nth(i).locator('canvas')).toBeVisible();
    expect(await articles.nth(i).locator('canvas').evaluate(c => c.width > 0 && c.height > 0)).toBe(true);
  }
  await page.getByText('Scattered pages and two documents example', { exact: true }).click();
  await expect(page.locator('.details .reference')).toHaveCount(2);
  await expect(page.locator('.details .reference').first()).toContainText('pages 8, 12, 15-17');
  await expect(articles).toHaveCount(6);
  expect(await articles.evaluateAll(els => els.map(el => `${el.dataset.document}/${el.dataset.page}`))).toEqual([
    'source-ranges/8', 'source-ranges/12', 'source-ranges/15', 'source-ranges/16', 'source-ranges/17', 'optics/1'
  ]);
  await page.locator('.details .reference').nth(1).click();
  await expect(articles.last().locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Full Screen', exact: true }).click();
  await expect(page.locator('.preview-fullscreen')).toBeVisible();
  await expect(page.locator('.preview-heading h2')).toHaveText('Scattered pages and two documents example');
  await expect(articles).toHaveCount(6);
  const position = page.getByLabel('Current source page');
  await expect(position).toContainText('Source 6 of 6');
  await page.keyboard.press('ArrowLeft');
  await expect(position).toContainText('page 17');
  await page.keyboard.press('ArrowLeft');
  await expect(position).toContainText('page 16');
  await page.keyboard.press('ArrowLeft');
  await expect(position).toContainText('page 15');
  await page.keyboard.press('ArrowLeft');
  await expect(position).toContainText('page 12');
  await page.keyboard.press('ArrowRight');
  await expect(position).toContainText('page 15');
  await page.keyboard.press('ArrowRight');
  await expect(position).toContainText('page 16');
  const stack = page.locator('.preview-page-stack');
  const initialWidth = (await stack.boundingBox()).width;
  const preview = page.locator('.preview-pages');
  const beforeScroll = await preview.evaluate(el => el.scrollTop);
  await page.keyboard.down('ArrowDown');
  await expect.poll(async () => await preview.evaluate(el => el.scrollTop) - beforeScroll).toBeGreaterThan(120);
  await page.keyboard.up('ArrowDown');
  await expect(position).toContainText('page 16');
  const stoppedAt = await preview.evaluate(el => el.scrollTop);
  const afterFrames = await preview.evaluate(el => new Promise(resolve => {
    let frames = 4;
    const tick = () => --frames ? requestAnimationFrame(tick) : resolve(el.scrollTop);
    requestAnimationFrame(tick);
  }));
  expect(Math.abs(afterFrames - stoppedAt)).toBeLessThanOrEqual(1);
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => preview.evaluate(el => el.scrollTop)).toBeLessThan(stoppedAt);
  await expect(position).toContainText('page 16');
  await preview.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: 20, clientY: 200 });
  await expect(page.getByLabel('PDF zoom', { exact: true })).toHaveText('125%');
  await preview.dispatchEvent('wheel', { deltaY: 100, ctrlKey: true });
  await expect(page.getByLabel('PDF zoom', { exact: true })).toHaveText('100%');
  await expect(page.getByRole('toolbar', { name: 'PDF reading controls' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Zoom in PDF' })).toHaveCount(0);
  const center = () => page.locator('.source-page[data-page="16"] .pdf-page').evaluate(pdf => {
    const view = pdf.closest('.preview-pages'), box = view.getBoundingClientRect(), rect = pdf.getBoundingClientRect();
    return { x: (box.left + view.clientWidth / 2 - rect.left) / rect.width,
      y: (box.top + view.clientHeight / 2 - rect.top) / rect.height };
  });
  const beforeZoom = await center();
  await page.keyboard.press('=');
  await expect(page.getByLabel('PDF zoom', { exact: true })).toHaveText('125%');
  expect((await stack.boundingBox()).width).toBeGreaterThan(initialWidth * 1.2);
  await expect(position).toContainText('page 16');
  const afterZoom = await center();
  expect(afterZoom.x).toBeCloseTo(beforeZoom.x, 2);
  expect(afterZoom.y).toBeCloseTo(beforeZoom.y, 2);
  await expect(page.locator('.source-page[data-page="16"] canvas')).toBeVisible();
  await page.keyboard.press('-');
  await expect(page.getByLabel('PDF zoom', { exact: true })).toHaveText('100%');
  await page.keyboard.press('-');
  await expect(page.getByLabel('PDF zoom', { exact: true })).toHaveText('75%');
  await page.keyboard.press('0');
  await expect(page.getByLabel('PDF zoom', { exact: true })).toHaveText('100%');
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft');
  await expect(position).toContainText('Source 1 of 6');
  await page.keyboard.press('ArrowLeft');
  await expect(position).toContainText('Source 1 of 6');
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
  await expect(position).toContainText('Source 6 of 6');
  await page.keyboard.press('ArrowRight');
  await expect(position).toContainText('Source 6 of 6');
  await page.getByRole('button', { name: 'Exit Full Screen', exact: true }).click();
  await expect(page.locator('.preview-fullscreen')).toHaveCount(0);
  await page.getByRole('button', { name: 'Full Screen', exact: true }).click();
  // Native full screen swallows Esc while it is still being entered (Windows); let it settle.
  await page.waitForFunction(() => document.fullscreenElement !== null, null, { timeout: 1500 }).catch(() => {});
  await page.keyboard.press('Escape');
  await expect(page.locator('.preview-fullscreen')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
});

test('Mini Map and controls align with each other and the footer at different viewport sizes', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('input[accept*=".json"]').setInputFiles(path.resolve('fixtures/synthetic-valid.json'));
  for (const [width, height] of [[1280, 800], [960, 600], [800, 600]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(async () => {
      const mini = await page.locator('.react-flow__minimap').boundingBox();
      const controls = await page.locator('.react-flow__controls').boundingBox();
      const footer = await page.locator('footer').boundingBox();
      return Math.max(Math.abs(mini.y + mini.height - footer.y), Math.abs(controls.y + controls.height - footer.y));
    }).toBeLessThanOrEqual(1);
    const mini = await page.locator('.react-flow__minimap').boundingBox();
    const controls = await page.locator('.react-flow__controls').boundingBox();
    expect(Math.abs(controls.x - mini.x - mini.width)).toBeLessThanOrEqual(1);
    const svg = await page.locator('.react-flow__minimap-svg').boundingBox();
    expect(Math.abs(svg.width - mini.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(svg.x + svg.width - controls.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(svg.y + svg.height - mini.y - mini.height)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  }
});


test('auto-hide panel keeps a visible edge tab, never opens on selection, and pins back', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('input[accept*=".json"]').setInputFiles(path.resolve('fixtures/synthetic-valid.json'));
  await page.locator('input[accept*=".pdf"]').setInputFiles([path.resolve('fixtures/waves.pdf'), path.resolve('fixtures/optics.pdf')]);
  await page.locator('.react-flow__node').filter({ hasText: 'Describe wave reflection at a boundary' }).click();
  await expect(page.locator('#source-panel .reference')).toHaveCount(2);
  const initial = await page.locator('.map-pane').boundingBox();
  const auto = page.getByRole('button', { name: 'Auto-hide panel', exact: true });
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await auto.click();
  const tab = page.locator('.panel-tab');
  await expect(tab).toBeVisible();
  await expect(page.locator('#source-panel .panel-body')).toBeHidden();
  await expect.poll(async () => (await page.locator('.map-pane').boundingBox()).width).toBeGreaterThan(initial.width + 300);
  const strip = await page.locator('#source-panel').boundingBox();
  expect(strip.width).toBeLessThanOrEqual(40);
  // Selecting a point while studying the map must not open the panel; the tab names the selection.
  await page.locator('.react-flow__node').filter({ hasText: 'Relate wave speed, frequency and wavelength' }).click();
  await expect(page.locator('#source-panel .panel-body')).toBeHidden();
  await expect(tab).toContainText('Relate wave speed, frequency and wavelength');
  // Hovering the edge slides the panel over the map without resizing the map.
  const mapBefore = await page.locator('.map-pane').boundingBox();
  await tab.hover();
  await expect(page.locator('#source-panel .details h2')).toHaveText('Relate wave speed, frequency and wavelength');
  await expect(page.locator('#source-panel .reference')).toHaveCount(1);
  await expect(page.locator('#source-panel canvas')).toBeVisible();
  expect((await page.locator('.map-pane').boundingBox()).width).toBeCloseTo(mapBefore.width, 0);
  // Leaving it retracts the panel to the edge tab again.
  await page.mouse.move(200, 400);
  await expect(page.locator('#source-panel .panel-body')).toBeHidden();
  await expect(tab).toBeVisible();
  // The choice is remembered, and Pin panel docks it beside the map again.
  await page.reload();
  await expect(page.locator('.panel-tab')).toBeVisible();
  // The pin button sits in the panel's top-right corner.
  await page.locator('.panel-tab').hover();
  const pinButton = page.getByRole('button', { name: 'Pin panel', exact: true });
  const pinBox = await pinButton.boundingBox(), panelBox = await page.locator('#source-panel').boundingBox();
  expect(pinBox.x + pinBox.width).toBeGreaterThan(panelBox.x + panelBox.width - 40);
  expect(pinBox.y).toBeLessThan(panelBox.y + 40);
  await pinButton.click();
  await expect(page.locator('#source-panel .details h2')).toHaveText('Relate wave speed, frequency and wavelength');
  const pane = await page.locator('#source-panel').boundingBox();
  const map = await page.locator('.map-pane').boundingBox();
  expect(Math.abs(map.x + map.width - pane.x)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
});
