/* Real Chromium tests. Run with Playwright installed or PLAYWRIGHT_MODULE set to its module. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
let chromium;
try {
  ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"));
} catch (_) {}
let browser;
before(async () => {
  if (chromium)
    browser = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
    });
});
after(async () => {
  await browser?.close();
});
const browserTest = (name, fn) =>
  test(
    name,
    {
      skip:
        !chromium &&
        "Install Playwright or set PLAYWRIGHT_MODULE to run real-browser checks.",
    },
    fn,
  );

function legacySave() {
  return {
    schemaVersion: 1,
    coins: 57,
    settings: {
      sound: "muteAll",
      haptic: false,
      skin: "default",
      lefty: false,
      showBeats: true,
      slowMode: false,
    },
    tutorialDone: { pizza: true, pie: true, mix: true },
    progress: Object.fromEntries(
      ["pizza", "pie", "mix"].map((k) => [
        k,
        { unlocked: 10, stars: Array(10).fill(3) },
      ]),
    ),
    rushBest: Object.fromEntries(
      ["pizza", "pie", "mix"].map((k) => [k, { score: 44, servedOrders: 2 }]),
    ),
    codexUnlocked: [
      "whole",
      "dottedHalf",
      "half",
      "quarter",
      "eighth",
      "sixteenth",
      "wholeRest",
      "dottedHalfRest",
      "halfRest",
      "quarterRest",
      "eighthRest",
      "sixteenthRest",
    ],
    totalServes: 24,
    totalPerfectServes: 20,
    lastPlayedAt: null,
  };
}
async function openGame({
  viewport = { width: 390, height: 844 },
  legacy,
  blockedAssets = false,
  touch = false,
} = {}) {
  const context = await browser.newContext({
    viewport,
    hasTouch: touch,
    isMobile: touch,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error" && !blockedAssets) errors.push(e.text());
  });
  const baseURL = process.env.PIZZA_BASE_URL || "http://pizza.test/";
  if (process.env.PIZZA_BASE_URL && blockedAssets)
    await page.route("**/assets/**", (route) =>
      route.fulfill({ status: 404, body: "Missing test resource" }),
    );
  if (!process.env.PIZZA_BASE_URL)
    await page.route("http://pizza.test/**", async (route) => {
      const url = new URL(route.request().url());
      const file = path.resolve(
        root,
        "." +
          decodeURIComponent(
            url.pathname === "/" ? "/index.html" : url.pathname,
          ),
      );
      if (
        !file.startsWith(root + path.sep) ||
        (blockedAssets && file.includes(path.sep + "assets" + path.sep))
      )
        return route.fulfill({ status: 404, body: "Missing test resource" });
      try {
        await route.fulfill({
          body: await fs.readFile(file),
          contentType: file.endsWith(".html")
            ? "text/html"
            : file.endsWith(".js")
              ? "text/javascript"
              : file.endsWith(".css")
                ? "text/css"
                : file.endsWith(".webp")
                  ? "image/webp"
                  : "application/octet-stream",
        });
      } catch (_) {
        await route.fulfill({ status: 404, body: "Missing test resource" });
      }
    });
  if (legacy)
    await page.addInitScript((value) => {
      if (!localStorage.getItem("test-seeded")) {
        localStorage.setItem("npizza.save.v1", JSON.stringify(value));
        localStorage.setItem("test-seeded", "yes");
      }
    }, legacy);
  await page.goto(baseURL);
  await page.waitForFunction(
    () => typeof Game !== "undefined" && Game.state.screen === "MAIN",
  );
  return { page, context, errors };
}
const action = (page, name) =>
  page
    .locator(`.screen.active [data-action="${name}"]`)
    .filter({ visible: true });
const state = (page) =>
  page.evaluate(() => ({
    screen: Game.state.screen,
    orderIndex: Game.state.orderIndex,
    servedTicks: Game.state.servedTicks,
    busy: Game.state.busy,
    tutorialStep: Game.state.tutorialStep,
    activity: Game.state.activity,
    coins: Game.save.coins,
    stars: Game.save.progress.pizza.stars,
    overlay: Game.state.overlay?.type,
    leftMs: Game.state.timer?.leftMs,
    order: Game.state.currentOrder,
  }));
async function challenge(page, mode = "pizza", stage = 1) {
  await action(page, "go-mode").click();
  if (mode !== "pizza")
    await page
      .locator(`[data-action="select-kitchen"][data-mode="${mode}"]`)
      .click();
  await page
    .locator(`[data-action="stage-node"][data-stage="${stage}"]`)
    .click();
  await page.locator('[data-action="start-preview"]').click();
  if (await page.locator('[data-action="tutorial-continue"]').isVisible())
    await page.locator('[data-action="tutorial-continue"]').click();
}
async function solveOrder(page) {
  const ids = await page.evaluate(() => {
    const required = Game.state.currentOrder.items.flatMap((item) =>
      Array(item.count).fill(item.noteId),
    );
    function solve(left, filled) {
      if (!left.length) return [];
      for (let i = 0; i < left.length; i++) {
        const next = filled + NOTES[left[i]].ticks;
        if (next > 16) continue;
        const tail = solve(
          left.filter((_, at) => at !== i),
          next === 16 ? 0 : next,
        );
        if (tail) return [left[i], ...tail];
      }
      return null;
    }
    return solve(required, 0);
  });
  assert.ok(ids, "Generated order has a valid plate arrangement");
  for (const id of ids)
    await page.locator(`.piece-btn[data-note="${id}"]`).click();
}
async function waitNext(page, index) {
  await page.waitForFunction(
    (before) =>
      Game.state.orderIndex !== before || Game.state.screen === "RESULT",
    index,
  );
}
async function checkLayout(page) {
  const result = await page.evaluate(() => {
    const visible = (el) =>
      el.getClientRects().length &&
      getComputedStyle(el).visibility !== "hidden";
    const targets = [
      ...document.querySelectorAll(
        ".home-choice,.piece-btn,.listen-piece,.action-bar button,.icon-btn,.guide-open,.tutorial-guide button,.header-tools button",
      ),
    ].filter(visible);
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      small: targets
        .map((el) => ({
          label: el.getAttribute("aria-label") || el.textContent.trim(),
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
        }))
        .filter((r) => r.width < 47.5 || r.height < 47.5),
      transform: getComputedStyle(document.getElementById("scale-wrap"))
        .transform,
    };
  });
  assert.equal(result.overflow, 0, JSON.stringify(result));
  assert.deepEqual(result.small, []);
  assert.equal(result.transform, "none");
}

browserTest(
  "new player completes the real three-action tutorial and practice without challenge rewards",
  async () => {
    const { page, context, errors } = await openGame();
    try {
      assert.equal(await action(page, "practice-start").count(), 1);
      await action(page, "practice-start").click();
      assert.equal((await state(page)).tutorialStep, 0);
      await page.locator(".listen-piece").click();
      assert.equal((await state(page)).servedTicks, 0);
      await page.locator(".piece-btn").click();
      assert.equal((await state(page)).servedTicks, 4);
      assert.equal((await state(page)).tutorialStep, 1);
      await page.locator(".piece-btn").click();
      assert.equal((await state(page)).servedTicks, 8);
      assert.equal((await state(page)).tutorialStep, 2);
      await action(page, "serve").click();
      assert.equal((await state(page)).busy, true);
      await page.waitForFunction(() => Game.state.orderIndex === 1);
      while ((await state(page)).screen !== "RESULT") {
        const before = (await state(page)).orderIndex;
        await solveOrder(page);
        await action(page, "serve").click();
        await waitNext(page, before);
      }
      assert.match(
        await page.locator("#screen-result").innerText(),
        /오늘 배운 조각/,
      );
      assert.equal((await state(page)).coins, 0);
      assert.deepEqual((await state(page)).stars, Array(10).fill(0));
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);

browserTest(
  "mouse tap, listening, keyboard and drag use one accepted ingredient command",
  async () => {
    const { page, context, errors } = await openGame({ legacy: legacySave() });
    try {
      await challenge(page, "pizza", 4);
      const before = (await state(page)).servedTicks;
      await page.locator(".listen-piece").first().click();
      assert.equal((await state(page)).servedTicks, before);
      const button = page.locator('.piece-btn[data-note="quarter"]');
      await button.focus();
      await page.keyboard.press("Enter");
      assert.equal((await state(page)).servedTicks, before + 4);
      await page.keyboard.press("Space");
      assert.equal((await state(page)).servedTicks, before + 8);
      await action(page, "undo").click();
      await action(page, "undo").click();
      await button.scrollIntoViewIfNeeded();
      const from = await button.boundingBox();
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(from.x + from.width / 2 - 25, from.y - 40, {
        steps: 4,
      });
      const plate = await page.locator(".active-plate").boundingBox();
      await page.mouse.move(
        plate.x + plate.width / 2,
        plate.y + plate.height / 2,
        { steps: 8 },
      );
      await page.mouse.up();
      assert.equal(
        (await state(page)).servedTicks,
        before + 4,
        "one drag adds one",
      );
      await button.dispatchEvent("click", { detail: 1 });
      assert.equal(
        (await state(page)).servedTicks,
        before + 4,
        "trailing click is consumed",
      );
      await action(page, "undo").click();
      await button.scrollIntoViewIfNeeded();
      const outsideFrom = await button.boundingBox();
      await page.mouse.move(
        outsideFrom.x + outsideFrom.width / 2,
        outsideFrom.y + outsideFrom.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(2, 62, { steps: 10 });
      await page.mouse.up();
      assert.equal(
        (await state(page)).servedTicks,
        before,
        "outside drop adds nothing",
      );
      assert.equal(await page.locator(".ghost-piece").count(), 0);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);

browserTest(
  "challenge hint, serving transition and modal help pause keep keyboard focus stable",
  async () => {
    const { page, context, errors } = await openGame({ legacy: legacySave() });
    try {
      await challenge(page, "pizza", 4);
      const coins = (await state(page)).coins;
      await action(page, "hint").click();
      assert.equal((await state(page)).coins, coins - 5);
      const pause = action(page, "pause");
      await pause.click();
      const remaining = (await state(page)).leftMs;
      await page.locator("#guide-open").click();
      await page.waitForTimeout(180);
      await page.keyboard.press("Escape");
      assert.equal((await state(page)).overlay, "pause");
      assert.equal((await state(page)).leftMs, remaining);
      await page.locator('[data-action="resume"]').click();
      await solveOrder(page);
      const order = (await state(page)).orderIndex;
      await action(page, "serve").click();
      await action(page, "undo").click();
      assert.equal((await state(page)).busy, true);
      await waitNext(page, order);
      await action(page, "pause").click();
      await page.locator('[data-action="leave-stage"]').click();
      await action(page, "go-main").click();
      const opener = action(page, "open-settings");
      await opener.focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.locator('[role="dialog"]').count(), 2);
      await page.keyboard.press("Escape");
      assert.equal(
        await page.evaluate(() => document.activeElement?.dataset.action),
        "open-settings",
      );
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);

browserTest(
  "safe saved session reloads paused with migrated records and accepted pieces",
  async () => {
    const { page, context, errors } = await openGame({ legacy: legacySave() });
    try {
      await challenge(page);
      await page.locator(".piece-btn").click();
      const old = await state(page);
      await page.reload();
      await action(page, "resume-session").click();
      const resumed = await state(page);
      assert.equal(resumed.overlay, "pause");
      assert.equal(resumed.servedTicks, old.servedTicks);
      assert.equal(resumed.order.id, old.order.id);
      assert.equal(resumed.coins, old.coins);
      await page.waitForTimeout(200);
      assert.equal((await state(page)).leftMs, resumed.leftMs);
      await page.locator('[data-action="resume"]').click();
      await page.waitForTimeout(100);
      assert.ok((await state(page)).leftMs < resumed.leftMs);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);

for (const [width, height] of [
  [320, 568],
  [360, 780],
  [390, 844],
  [412, 915],
  [768, 1024],
  [1366, 768],
  [844, 390],
])
  browserTest(
    `readable controls and scrollable play at ${width}×${height}`,
    async () => {
      const { page, context, errors } = await openGame({
        viewport: { width, height },
        legacy: legacySave(),
      });
      try {
        await checkLayout(page);
        await challenge(page, "mix", 10);
        await checkLayout(page);
        assert.equal(await page.locator(".piece-btn").count(), 12);
        await page.locator(".piece-btn").last().scrollIntoViewIfNeeded();
        await page.locator(".listen-piece").last().click();
        assert.match(await page.locator("#toast").innerText(), /쉼표/);
        await page.locator("#guide-open").click();
        assert.equal(await page.locator("#rulebook-dialog").isVisible(), true);
        await page.keyboard.press("Escape");
        await page.locator(".piece-btn").first().scrollIntoViewIfNeeded();
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    },
  );

browserTest(
  "asset failures and 200 percent text enlargement preserve playable controls",
  async () => {
    const { page, context, errors } = await openGame({ blockedAssets: true });
    try {
      await action(page, "practice-start").click();
      await page.evaluate(() => (document.documentElement.style.zoom = "2"));
      await page.locator(".piece-btn").click();
      await page.locator(".piece-btn").click();
      assert.equal((await state(page)).servedTicks, 8);
      await action(page, "serve").click();
      await page.waitForFunction(() => Game.state.orderIndex === 1);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);

browserTest(
  "same-beat wrong ingredients are disclosed by real judging after quantity-ready serving",
  async () => {
    const { page, context, errors } = await openGame({ legacy: legacySave() });
    try {
      await challenge(page, "pizza", 2);
      const order = (await state(page)).order;
      const ids = order.items.some((x) => x.noteId === "half")
        ? Array(order.totalTicks / 4).fill("quarter")
        : ["half", ...Array(order.totalTicks / 4 - 2).fill("quarter")];
      for (const id of ids)
        await page.locator(`.piece-btn[data-note="${id}"]`).click();
      assert.equal(await action(page, "serve").isDisabled(), false);
      const progressText = await page.locator(".ticket-items").innerText();
      assert.match(progressText, /많아요|주문에 없는/);
      await action(page, "serve").click();
      await page.waitForFunction(() => Game.state.overlay?.type === "lesson");
      const result = await page.evaluate(
        () => Game.state.stageStats.lastResult,
      );
      assert.notEqual(result.grade, "PERFECT");
      assert.equal(result.wrong > 0, true);
      assert.match(await page.locator(".lesson-card").innerText(), /주문|담음/);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);

browserTest(
  "tutorial skip remains separate from completion and replay is action-driven",
  async () => {
    const { page, context, errors } = await openGame();
    try {
      await action(page, "practice-start").click();
      await action(page, "tutorial-skip").click();
      assert.equal(
        await page.evaluate(() => Game.save.tutorialStatus),
        "skipped",
      );
      assert.equal(
        await page.evaluate(() => Game.save.tutorialDone.pizza),
        false,
      );
      await action(page, "pause").click();
      await page.locator('[data-action="leave-stage"]').click();
      await action(page, "go-main").click();
      await action(page, "tutorial-replay").click();
      assert.equal((await state(page)).tutorialStep, 0);
      await page.locator("#guide-open").click();
      await page.keyboard.press("Escape");
      assert.equal((await state(page)).tutorialStep, 0);
      await page.locator(".piece-btn").focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Space");
      await action(page, "serve").focus();
      await page.keyboard.press("Enter");
      assert.equal(
        await page.evaluate(() => Game.save.tutorialStatus),
        "complete",
      );
      assert.equal((await state(page)).coins, 0);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);

browserTest(
  "header sound toggle and settings expose accessible persistent state",
  async () => {
    const { page, context, errors } = await openGame();
    try {
      const toggle = page.locator("#sound-toggle");
      assert.equal(await toggle.getAttribute("aria-label"), "소리 끄기");
      await toggle.click();
      assert.equal(await toggle.getAttribute("aria-label"), "소리 켜기");
      assert.equal(await toggle.getAttribute("aria-pressed"), "false");
      await page.reload();
      assert.equal(await toggle.getAttribute("aria-pressed"), "false");
      const settings = page.locator(
        '.game-header [data-action="open-settings"]',
      );
      await settings.click();
      assert.equal(
        await page
          .getByRole("dialog", { name: "설정", exact: true })
          .isVisible(),
        true,
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await settings.evaluate((el) => el === document.activeElement),
        true,
      );
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);

async function beginActualDrag(page, note = "quarter") {
  const button = page.locator(`.piece-btn[data-note="${note}"]`);
  await button.scrollIntoViewIfNeeded();
  const from = await button.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y - 30, { steps: 4 });
  assert.equal(await page.locator(".ghost-piece").count(), 1);
  return page.locator(".active-plate").boundingBox();
}

browserTest(
  "circle-only drop target accepts a visible inside edge and rejects frame corners and nearby outside edge",
  async () => {
    const { page, context, errors } = await openGame({
      viewport: { width: 1366, height: 1024 },
      legacy: legacySave(),
    });
    try {
      await challenge(page, "pizza", 3);
      let plate = await beginActualDrag(page);
      await page.mouse.move(
        plate.x + plate.width * 0.95,
        plate.y + plate.height / 2,
        { steps: 8 },
      );
      await page.mouse.up();
      assert.equal(
        (await state(page)).servedTicks,
        4,
        "just inside visible circle is accepted",
      );
      await action(page, "undo").click();
      plate = await beginActualDrag(page);
      await page.mouse.move(
        plate.x + plate.width - 2,
        plate.y + plate.height - 2,
        { steps: 8 },
      );
      await page.mouse.up();
      assert.equal(
        (await state(page)).servedTicks,
        0,
        "rectangle corner outside circle is rejected",
      );
      plate = await beginActualDrag(page);
      await page.mouse.move(
        plate.x + plate.width + 8,
        plate.y + plate.height / 2,
        { steps: 8 },
      );
      await page.mouse.up();
      assert.equal(
        (await state(page)).servedTicks,
        0,
        "eight pixels past visible circle is rejected",
      );
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);

browserTest(
  "pointer cancellation, lost focus and resizing a drag remove its ghost without adding ingredients",
  async () => {
    const { page, context, errors } = await openGame({
      viewport: { width: 1366, height: 1024 },
      legacy: legacySave(),
    });
    try {
      await challenge(page, "pizza", 3);
      let plate = await beginActualDrag(page);
      await page.evaluate(() =>
        document.dispatchEvent(
          new PointerEvent("pointercancel", {
            pointerId: Game.drag.pointerId,
            bubbles: true,
          }),
        ),
      );
      await page.mouse.move(
        plate.x + plate.width / 2,
        plate.y + plate.height / 2,
      );
      await page.mouse.up();
      assert.equal((await state(page)).servedTicks, 0);
      assert.equal(await page.locator(".ghost-piece").count(), 0);
      plate = await beginActualDrag(page);
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await page.mouse.move(
        plate.x + plate.width / 2,
        plate.y + plate.height / 2,
      );
      await page.mouse.up();
      assert.equal((await state(page)).servedTicks, 0);
      assert.equal(await page.locator(".ghost-piece").count(), 0);
      plate = await beginActualDrag(page);
      await page.setViewportSize({ width: 1280, height: 1024 });
      await page.mouse.move(
        plate.x + plate.width / 2,
        plate.y + plate.height / 2,
      );
      await page.mouse.up();
      assert.equal((await state(page)).servedTicks, 0);
      assert.equal(await page.locator(".ghost-piece").count(), 0);
      const quarter = page.locator('.piece-btn[data-note="quarter"]');
      const half = page.locator('.piece-btn[data-note="half"]');
      await quarter.click();
      await half.click();
      assert.equal(
        (await state(page)).servedTicks,
        12,
        "distinct rapid ingredients both count",
      );
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);

browserTest(
  "mobile touchscreen taps add exactly one piece and listening adds none",
  async () => {
    const { page, context, errors } = await openGame({
      viewport: { width: 390, height: 844 },
      touch: true,
    });
    try {
      await page.getByRole("button", { name: /연습하기/ }).tap();
      await page.locator(".piece-btn").tap();
      assert.equal((await state(page)).servedTicks, 4);
      await page.locator(".listen-piece").tap();
      assert.equal((await state(page)).servedTicks, 4);
      await page.locator(".piece-btn").tap();
      assert.equal((await state(page)).servedTicks, 8);
      await action(page, "serve").tap();
      await page.waitForFunction(() => Game.state.orderIndex === 1);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);

browserTest(
  "home and codex preference changes preserve a saved order until explicit resume",
  async () => {
    const { page, context, errors } = await openGame({ legacy: legacySave() });
    try {
      await challenge(page);
      await page.locator(".piece-btn").click();
      const old = await state(page);
      await page.reload();
      assert.equal(await action(page, "resume-session").count(), 1);
      await page.locator("#sound-toggle").click();
      await page.locator('.game-header [data-action="open-settings"]').click();
      await page
        .locator('[data-action="toggle-setting"][data-setting="lefty"]')
        .click();
      await page.keyboard.press("Escape");
      await action(page, "go-codex").click();
      await page.locator("#sound-toggle").click();
      await action(page, "codex-back").click();
      await page.reload();
      await action(page, "resume-session").click();
      const restored = await state(page);
      assert.equal(restored.overlay, "pause");
      assert.equal(restored.order.id, old.order.id);
      assert.equal(restored.servedTicks, old.servedTicks);
      assert.equal(restored.coins, old.coins);
      assert.equal(await page.evaluate(() => Game.save.settings.lefty), true);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  },
);
