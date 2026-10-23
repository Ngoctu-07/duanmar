import assert from "node:assert/strict";

/**
 * Mission gamification rules (account PROFILE tab): archive boundary at
 * travelDate + 1 day, split ordering, telemetry stability and HHh:MMm:SSs.
 */
const {
  MISSION_ARCHIVE_DELAY_DAYS,
  formatMissionDuration,
  isMissionArchived,
  resolveMissionTelemetry,
  splitMissions,
} = await import("../../src/lib/missions.ts");

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

const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/** Fixed "now": 2026-10-22 12:00 local. */
const now = new Date(2026, 9, 22, 12, 0, 0);

const booking = (overrides: Record<string, unknown>) => ({
  reference: "REF-1",
  slug: "hcm",
  tourName: "Tour",
  travelDate: iso(2026, 10, 22),
  fullName: "Test",
  email: "test@example.com",
  phone: "0",
  notes: "",
  guests: 2,
  pricePerGuest: 100,
  total: 200,
  currency: "VND",
  locale: "vi",
  paidAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

check("archive delay is exactly one day", () => {
  assert.equal(MISSION_ARCHIVE_DELAY_DAYS, 1);
});

check("travel day (and later) stays an active mission", () => {
  assert.equal(isMissionArchived(iso(2026, 10, 22), now), false);
  assert.equal(isMissionArchived(iso(2026, 10, 23), now), false);
});

check("the day after travel is archived", () => {
  assert.equal(isMissionArchived(iso(2026, 10, 21), now), true);
  assert.equal(isMissionArchived(iso(2026, 9, 1), now), true);
});

check("malformed travel dates never archive", () => {
  assert.equal(isMissionArchived("not-a-date", now), false);
  assert.equal(isMissionArchived("2026-02-31", now), false);
});

check("splitMissions sorts active soonest-first and archive newest-first", () => {
  const rows = [
    booking({ reference: "A", travelDate: iso(2026, 10, 25) }),
    booking({ reference: "B", travelDate: iso(2026, 10, 10) }),
    booking({ reference: "C", travelDate: iso(2026, 10, 22) }),
    booking({ reference: "D", travelDate: iso(2026, 10, 5) }),
  ];
  const { active, archive } = splitMissions(rows, now);
  assert.deepEqual(active.map((row) => row.reference), ["C", "A"]);
  assert.deepEqual(archive.map((row) => row.reference), ["B", "D"]);
});

check("formatMissionDuration renders HHh:MMm:SSs", () => {
  assert.equal(formatMissionDuration(0), "00h:00m:00s");
  assert.equal(formatMissionDuration((1 * 3600 + 7 * 60 + 9) * 1000), "01h:07m:09s");
  assert.equal(formatMissionDuration((12 * 3600 + 59 * 60 + 59) * 1000), "12h:59m:59s");
  assert.equal(formatMissionDuration(-5000), "00h:00m:00s");
});

check("telemetry is deterministic per booking reference", () => {
  const first = resolveMissionTelemetry(booking({ reference: "STABLE-REF" }));
  const second = resolveMissionTelemetry(booking({ reference: "STABLE-REF" }));
  assert.deepEqual(first, second);
});

check("telemetry stays inside the designed bounds", () => {
  for (let index = 0; index < 200; index += 1) {
    const telemetry = resolveMissionTelemetry(booking({ reference: `REF-${index}` }));
    assert.ok(telemetry.outcome === "success" || telemetry.outcome === "failed");
    assert.equal(telemetry.cluesTotal, 10);
    assert.ok(telemetry.cluesUsed >= 1 && telemetry.cluesUsed <= telemetry.cluesTotal);
    assert.ok(telemetry.clearTimeMs >= 60 * 60 * 1000);
    assert.ok(/^\d{2}h:\d{2}m:\d{2}s$/.test(formatMissionDuration(telemetry.clearTimeMs)));
  }
});

check("both outcomes appear across a reference spread", () => {
  const outcomes = new Set(
    Array.from({ length: 100 }, (_, index) =>
      resolveMissionTelemetry(booking({ reference: `OUTCOME-${index}` })).outcome
    )
  );
  assert.deepEqual([...outcomes].sort(), ["failed", "success"]);
});

check("explicit stored telemetry wins over the derived fallback", () => {
  const explicit = resolveMissionTelemetry(
    booking({
      reference: "EXPLICIT",
      mission: { outcome: "failed", clearTimeMs: 1234, cluesUsed: 9, cluesTotal: 10 },
    })
  );
  assert.deepEqual(explicit, {
    outcome: "failed",
    clearTimeMs: 1234,
    cluesUsed: 9,
    cluesTotal: 10,
  });
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
