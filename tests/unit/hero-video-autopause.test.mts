import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HERO_VIDEO_VISIBILITY_THRESHOLD,
  HERO_VIDEO_VOLUME,
  isHeroVideoVisible,
} from "../../src/components/homepage/use-hero-video-autopause";

/**
 * Hero promo clip auto-pause/auto-mute contract.
 *
 * Behavioural checks cover the 50% visibility decision; source checks lock the
 * native-audio wiring (unmuted element, volume 0.85, NotAllowedError recovery),
 * the observer (no window scroll listeners, disconnect on cleanup) and the hero
 * integration (refs on the frame + clip, looping/autoplay untouched).
 */

const read = (path: string) =>
  readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

const hook = read("components/homepage/use-hero-video-autopause.ts");
/** Code only — the hook's doc comment explains the constraints in prose. */
const hookCode = hook.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const hero = read("components/homepage/hero-section.tsx");

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

check("visibility threshold is exactly 50%", () => {
  assert.equal(HERO_VIDEO_VISIBILITY_THRESHOLD, 0.5);
});

check("default volume is exactly 85% of the 1.0 scale", () => {
  assert.equal(HERO_VIDEO_VOLUME, 0.85);
});

check("clip keeps playing at or above the 50% ratio", () => {
  assert.equal(isHeroVideoVisible(true, 0.5), true);
  assert.equal(isHeroVideoVisible(true, 0.51), true);
  assert.equal(isHeroVideoVisible(true, 1), true);
});

check("clip pauses/mutes below the 50% ratio or when off-screen", () => {
  assert.equal(isHeroVideoVisible(true, 0.49), false);
  assert.equal(isHeroVideoVisible(true, 0), false);
  assert.equal(isHeroVideoVisible(false, 1), false);
});

check("observer uses the 50% threshold and observes the frame container", () => {
  assert.ok(hookCode.includes("new IntersectionObserver("), "IntersectionObserver missing");
  assert.ok(
    hookCode.includes("threshold: HERO_VIDEO_VISIBILITY_THRESHOLD"),
    "observer threshold not wired to the 50% constant",
  );
  assert.ok(hookCode.includes("observer.observe(frame)"), "observer does not watch the frame");
  assert.ok(
    !hookCode.includes("observer.observe(video)"),
    "observer should track the container, not the clip",
  );
});

check("scroll-out pauses and mutes; scroll-in resumes without resetting time", () => {
  assert.ok(hookCode.includes("video.pause()"), "pause() missing");
  assert.ok(hookCode.includes("video.muted = true"), "mute on scroll-out missing");
  assert.ok(hookCode.includes("video.play()"), "play() missing");
  assert.ok(!hookCode.includes("currentTime"), "resume must not rewind the clip");
  assert.ok(!hookCode.includes('video.loop = false'), "loop must stay enabled");
});

check("native audio is unmuted and calibrated to 0.85 before playback", () => {
  assert.ok(hookCode.includes("video.muted = false"), "audio must be unmuted");
  assert.ok(
    hookCode.includes("video.volume = HERO_VIDEO_VOLUME"),
    "volume must be applied programmatically"
  );
  assert.ok(!hero.includes("<audio"), "audio must stay on the video element's own track");
  assert.ok(!hero.includes("muted"), "the promo video must not render the muted prop");
});

check("blocked unmuted autoplay waits for a gesture, never leaks a rejection", () => {
  assert.ok(hookCode.includes("NotAllowedError"), "NotAllowedError must be handled");
  assert.ok(hookCode.includes(".catch("), "play() rejection must be caught");
  assert.ok(hookCode.includes('"pointerdown"'), "pointer gesture unlock missing");
  assert.ok(hookCode.includes('"keydown"'), "keyboard gesture unlock missing");
  assert.ok(
    hookCode.includes("removeUnlockListeners()"),
    "gesture listeners must be cleaned up"
  );
});

check("no global scroll listener and cleanup disconnects the observer", () => {
  assert.ok(
    !hookCode.includes('addEventListener("scroll"') && !hookCode.includes("addEventListener('scroll'"),
    "hook must not bind a window scroll listener",
  );
  assert.ok(hookCode.includes("observer.disconnect()"), "observer cleanup missing");
  assert.ok(hookCode.includes("removeUnlockListeners()"), "gesture-listener cleanup missing");
});

check("hero wires the frame ref and video ref, keeping autoplay/loop/inline", () => {
  assert.ok(hero.includes("useHeroVideoAutopause()"), "hero does not use the hook");
  assert.ok(hero.includes("ref={frameRef}"), "frame ref not attached");
  assert.ok(hero.includes("ref={videoRef}"), "video ref not attached");
  for (const attr of ["autoPlay", "loop", "playsInline"]) {
    assert.ok(hero.includes(attr), `hero video lost ${attr}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
