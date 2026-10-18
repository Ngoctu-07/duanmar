/**
 * The homepage header sits transparent/hidden over the full-viewport hero and
 * only slides down once the visitor scrolls past 50% of the hero height
 * (see src/components/layout/header.tsx). Header-level tests that run on `/`
 * must reveal it first — otherwise `page.click`/`page.hover` land off-screen.
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
