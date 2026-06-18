const { chromium } = require('playwright');

(async () => {
  const GAME_URL = 'http://localhost:5173';
  const browser = await chromium.launch({ headless: true });

  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();
  const p1 = await ctx1.newPage();
  const p2 = await ctx2.newPage();

  p1.on('console', msg => msg.type() === 'error' && console.log('[P1]', msg.text().slice(0, 200)));
  p2.on('console', msg => msg.type() === 'error' && console.log('[P2]', msg.text().slice(0, 200)));
  p1.on('pageerror', e => console.log('[P1 PAGE]', e.message));
  p2.on('pageerror', e => console.log('[P2 PAGE]', e.message));

  await p1.goto(GAME_URL, { waitUntil: 'domcontentloaded' });
  await p2.goto(GAME_URL, { waitUntil: 'domcontentloaded' });

  const results = { passed: [], failed: [] };

  function ok(label) { results.passed.push(label); console.log(`  ✓ ${label}`); }
  function fail(label, detail) { results.failed.push(`${label}: ${detail}`); console.log(`  ✗ ${label}: ${detail}`); }

  try {
    // --- Step 1: Navigate to create room ---
    console.log('\n[1] Creating room...');
    await p1.waitForSelector('button:has-text("Create Room")', { timeout: 10000 });
    await p1.click('button:has-text("Create Room")');
    await p1.waitForURL('**/create');
    ok('Navigated to /create');

    // --- Step 2: Fill form ---
    console.log('\n[2] Filling create form...');
    await p1.fill('#input-your-name', 'Alpha');
    await p1.click('button:has-text("Hoop Dreams")');
    await p1.evaluate(() => {
      const s = document.querySelector('input[type="range"]');
      if (s) { const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; d.call(s, 5); s.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    ok('Form filled');

    // --- Step 3: Submit and verify lobby ---
    console.log('\n[3] Submitting create form...');
    await p1.click('button:has-text("Create Room")');
    await p1.waitForURL('**/lobby/**', { timeout: 15000 });
    ok('Navigated to lobby');

    // Wait for lobby content to load (RoomCode component appears after API fetch)
    await p1.waitForSelector('text=Room Code', { timeout: 15000 });
    await p1.waitForSelector('[class*="text-5xl"]', { timeout: 5000 });
    const roomCode = await p1.$eval('[class*="text-5xl"]', el => el.textContent.trim());
    if (!roomCode || roomCode.length !== 6) fail('Room code', `got "${roomCode}"`);
    else ok(`Room code: ${roomCode}`);

    // --- Step 4: Player 2 joins ---
    console.log('\n[4] Player 2 joining...');
    await p2.click('button:has-text("Join Room")');
    await p2.waitForURL('**/join');
    await p2.fill('#input-your-name', 'Beta');
    await p2.fill('#input-room-code', roomCode);
    await p2.click('button:has-text("Join Room")');
    await p2.waitForURL('**/lobby/**', { timeout: 15000 });
    ok('Player 2 in lobby');

    // --- Step 5: Verify lobby state ---
    console.log('\n[5] Verifying lobby...');
    const hasGameLobby = await p1.$('text=Game Lobby');
    if (hasGameLobby) ok('Lobby heading visible');
    else fail('Lobby heading', 'not found');

    const playerNames = await p1.evaluate(() => {
      const names = document.querySelectorAll('[class*="PlayerList"] button, [class*="playerList"] button, .lobby-player-name');
      return Array.from(document.querySelectorAll('*')).filter(el => el.textContent === 'Alpha' || el.textContent === 'Beta').map(el => el.textContent);
    });
    console.log(`  Player names found: ${[...new Set(playerNames)].join(', ')}`);

    // --- Step 6: Start game ---
    console.log('\n[6] Starting game...');
    await p1.waitForTimeout(3000); // Let lobby poll
    const startBtn = await p1.$('button:has-text("Start Game"):not([disabled])');
    if (!startBtn) {
      // Check what buttons exist
      const btns = await p1.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim() + (b.disabled ? ' [DISABLED]' : '')));
      console.log('  Available buttons:', JSON.stringify(btns));
      fail('Start Game', `button not found or disabled. Buttons: ${JSON.stringify(btns)}`);
    } else {
      await startBtn.click();
      ok('Start Game clicked');
    }

    // --- Step 7: Wait for game page ---
    console.log('\n[7] Waiting for game to start...');
    await p1.waitForURL('**/game/**', { timeout: 30000 });
    await p2.waitForURL('**/game/**', { timeout: 30000 });
    ok('Both players on game page');

    // --- Step 8: Wait for story generation and Continue button ---
    console.log('\n[8] Waiting for story generation...');
    await p1.waitForSelector('button:has-text("Continue")', { timeout: 120000 });
    ok('Continue button appeared (story generated)');
    await p1.click('button:has-text("Continue")');
    try { await p2.waitForSelector('button:has-text("Continue")', { timeout: 10000 }); await p2.click('button:has-text("Continue")'); } catch {}

    // --- Step 9: Input phase ---
    console.log('\n[9] Story input phase...');
    await p1.waitForSelector('textarea', { timeout: 15000 });
    await p2.waitForSelector('textarea', { timeout: 15000 });
    ok('Textareas visible for both players');

    // Type input using keyboard events for React compatibility
    const input1 = 'Alpha surveyed the court. The defenders were scrambling after the last play. With a quick head fake, Alpha burst past the first defender and pulled up for a mid-range jumper. The ball swished through the net as the buzzer echoed.';
    await p1.click('textarea');
    await p1.fill('textarea', '');
    await p1.type('textarea', input1, { delay: 2 });
    
    // Verify textarea value
    const val1 = await p1.$eval('textarea', el => el.value);
    console.log(`  P1 textarea length: ${val1.length}`);

    // Wait for submit button to become enabled
    const btnReady1 = await p1.waitForFunction(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Submit Your Idea'));
      return btn && !btn.disabled;
    }, { timeout: 10000 }).then(() => true).catch(() => false);
    
    if (btnReady1) {
      await p1.click('button:has-text("Submit Your Idea")');
      ok('Player 1 submitted input');
    } else {
      fail('Submit button', 'never enabled for P1');
    }

    const input2 = 'Beta noticed the defense was overplaying the right side. Calling for an isolation play, Beta waved off the screen and took the defender one-on-one. A behind-the-back dribble created just enough space for a floating layup that kissed off the glass and in.';
    await p2.click('textarea');
    await p2.fill('textarea', '');
    await p2.type('textarea', input2, { delay: 2 });

    const btnReady2 = await p2.waitForFunction(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Submit Your Idea'));
      return btn && !btn.disabled;
    }, { timeout: 10000 }).then(() => true).catch(() => false);

    if (btnReady2) {
      await p2.click('button:has-text("Submit Your Idea")');
      ok('Player 2 submitted input');
    } else {
      fail('Submit button', 'never enabled for P2');
    }

    // --- Step 10: Voting phase ---
    console.log('\n[10] Waiting for voting phase...');
    await p1.waitForSelector('text=Vote For The Best', { timeout: 60000 });
    await p2.waitForSelector('text=Vote For The Best', { timeout: 60000 });
    ok('Voting phase started');

    // Vote
    const opts1 = await p1.$$('button:has-text("Option")');
    const opts2 = await p2.$$('button:has-text("Option")');
    
    if (opts1.length > 0) {
      await opts1[0].click();
      await p1.click('button:has-text("Cast Your Vote")');
      ok('Player 1 voted');
    } else { fail('Voting', 'no options for P1'); }

    if (opts2.length > 0) {
      await opts2[0].click();
      await p2.click('button:has-text("Cast Your Vote")');
      ok('Player 2 voted');
    } else { fail('Voting', 'no options for P2'); }

    // --- Step 11: Voting results ---
    console.log('\n[11] Waiting for voting results...');
    await p1.waitForSelector('text=Voting Results', { timeout: 60000 });
    ok('Voting results displayed');

    // --- Summary ---
    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log(`Passed: ${results.passed.length}, Failed: ${results.failed.length}`);
    results.passed.forEach(p => console.log(`  ✓ ${p}`));
    results.failed.forEach(f => console.log(`  ✗ ${f}`));
    console.log('========================================');

  } catch (e) {
    console.error('\n❌ CRASH:', e.message);
    console.error(e.stack?.split('\n').slice(0, 5).join('\n'));
  } finally {
    await browser.close();
  }
})();
