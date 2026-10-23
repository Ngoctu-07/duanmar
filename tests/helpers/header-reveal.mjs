/**
 * Above 50% of the homepage hero the header is a frameless transparent
 * overlay that paints only the centered nav links — the logo, search, account
 * and locale switcher stay hidden until the visitor scrolls past the hero
 * (see src/components/layout/header.tsx). Header-level tests that run on `/`
 * must reveal it first, otherwise utility clicks land on invisible nodes.
 */
export async function revealHomeHeader(page) {
  await page.evaluate(() => {
    const hero = document.getElementById("home-hero");
    const height = hero ? hero.getBoundingClientRect().height : window.innerHeight;
    window.scrollTo(0, Math.ceil(height * 0.5) + 60);
  });
  await page
    .waitForFunction(
      () => document.querySelector("header")?.getAttribute("data-header-revealed") === "true",
      { timeout: 5000 }
    )
    .catch(() => null);
  await new Promise((resolve) => setTimeout(resolve, 350));
}
