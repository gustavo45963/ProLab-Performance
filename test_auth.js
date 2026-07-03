const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: {
      dir: '/home/jules/verification/videos'
    }
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:8000');
  await page.waitForTimeout(1000);

  // take a screenshot of logged out state
  await page.screenshot({ path: '/home/jules/verification/screenshots/logged_out.png' });

  // login
  await page.click('[data-open-login]');
  await page.waitForTimeout(500);

  await page.fill('#loginEmail', 'test@prolab.pt');
  await page.fill('#loginPassword', 'password123');

  page.on('dialog', async dialog => {
    console.log('DIALOG:', dialog.message());
    await dialog.accept();
  });

  await page.click('#loginForm [type="submit"]');
  await page.waitForTimeout(2000);

  // take a screenshot of logged in state
  await page.screenshot({ path: '/home/jules/verification/screenshots/logged_in.png' });

  await context.close();
  await browser.close();
})();
