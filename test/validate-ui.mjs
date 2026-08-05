import { chromium } from 'playwright';
import path from 'path';

(async () => {
    let failures = 0;
    function assert(condition, message) {
        if (condition) {
            console.log(`[PASS] ${message}`);
        } else {
            console.error(`[FAIL] ${message}`);
            failures++;
        }
    }

    const browser = await chromium.launch();
    const page = await browser.newPage();
    const absPath = path.resolve('../index.html').replace(/\\/g, '/');
    const filePath = 'file:///' + absPath;
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error(`Console Error: ${msg.text()}`);
            failures++;
        }
    });

    await page.goto(filePath);
    await page.waitForLoadState('networkidle');

    const plotData = await page.evaluate(() => document.getElementById('main-plot').data);
    assert(plotData && plotData.length >= 2, `Plotly canvas exists with traces (found ${plotData?plotData.length:0})`);

    const tcText = await page.evaluate(() => document.getElementById('hud-tc').textContent);
    assert(tcText && tcText !== 't/c: --.-% @ x/c=--.--' && !tcText.includes('NaN'), `HUD updated (actual: ${tcText})`);

    const initialZ = plotData[0].y[100];
    await page.evaluate(() => {
        let s = document.getElementById('au-2-slider');
        s.value = '0.5';
        s.dispatchEvent(new Event('input', {bubbles: true}));
    });
    
    await page.waitForTimeout(100);
    const newPlotData = await page.evaluate(() => document.getElementById('main-plot').data);
    const newZ = newPlotData[0].y[100];
    assert(newZ !== initialZ, `Plot updates on slider change`);

    await page.screenshot({ path: 'verification_custom.png' });
    console.log('[INFO] Screenshot saved to verification_custom.png');

    await page.evaluate(() => {
        let s = document.getElementById('preset-select');
        s.value = 'naca0012';
        s.dispatchEvent(new Event('change', {bubbles: true}));
    });
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'verification_naca0012.png' });
    console.log('[INFO] Screenshot saved to verification_naca0012.png');

    await browser.close();

    if (failures > 0) {
        process.exit(1);
    }
})();
