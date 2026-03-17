import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";

// vercel.json을 직접 읽어서 크론 설정 검증
const vercelJsonPath = path.resolve(__dirname, "../../../vercel.json");
const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, "utf-8"));

interface CronEntry {
  path: string;
  schedule: string;
}

const crons: CronEntry[] = vercelConfig.crons;

describe("vercel.json cron configuration", () => {
  // ── TC1: 크론 배열이 7개 존재 ──
  test("has exactly 7 cron entries", () => {
    expect(crons).toBeDefined();
    expect(Array.isArray(crons)).toBe(true);
    expect(crons).toHaveLength(7);
  });

  // ── TC2: /api/cron/serp 크론 검증 ──
  test("/api/cron/serp is scheduled at 0 3 * * *", () => {
    const entry = crons.find((c) => c.path === "/api/cron/serp");
    expect(entry).toBeDefined();
    expect(entry!.schedule).toBe("0 3 * * *");
  });

  // ── TC3: /api/cron/search-volume 크론 검증 ──
  test("/api/cron/search-volume is scheduled at 0 4 1 * *", () => {
    const entry = crons.find((c) => c.path === "/api/cron/search-volume");
    expect(entry).toBeDefined();
    expect(entry!.schedule).toBe("0 4 1 * *");
  });

  // ── TC4: /api/cron/grading 크론 검증 ──
  test("/api/cron/grading is scheduled at 0 5 * * 1", () => {
    const entry = crons.find((c) => c.path === "/api/cron/grading");
    expect(entry).toBeDefined();
    expect(entry!.schedule).toBe("0 5 * * 1");
  });

  // ── TC5: /api/cron/monthly-report 크론 검증 ──
  test("/api/cron/monthly-report is scheduled at 0 0 1 * *", () => {
    const entry = crons.find((c) => c.path === "/api/cron/monthly-report");
    expect(entry).toBeDefined();
    expect(entry!.schedule).toBe("0 0 1 * *");
  });

  // ── TC6: /api/cron/aeo 크론 검증 ──
  test("/api/cron/aeo is scheduled at 0 4 * * *", () => {
    const entry = crons.find((c) => c.path === "/api/cron/aeo");
    expect(entry).toBeDefined();
    expect(entry!.schedule).toBe("0 4 * * *");
  });

  // ── TC7: /api/cron/scheduled-publish 크론 검증 ──
  test("/api/cron/scheduled-publish is scheduled at 0 6 * * *", () => {
    const entry = crons.find((c) => c.path === "/api/cron/scheduled-publish");
    expect(entry).toBeDefined();
    expect(entry!.schedule).toBe("0 6 * * *");
  });

  // ── TC8: /api/cron/daily-stats 크론 검증 ──
  test("/api/cron/daily-stats is scheduled at 30 4 * * *", () => {
    const entry = crons.find((c) => c.path === "/api/cron/daily-stats");
    expect(entry).toBeDefined();
    expect(entry!.schedule).toBe("30 4 * * *");
  });

  // ── TC9: 중복 경로 없음 검증 ──
  test("has no duplicate cron paths", () => {
    const paths = crons.map((c) => c.path);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(paths.length);
  });

  // ── TC10: 모든 크론 스케줄이 유효한 cron expression 형식 ──
  test("all cron schedules are valid cron expression format", () => {
    // Vercel cron은 5-필드 형식: 분 시 일 월 요일
    const cronRegex = /^(\d{1,2}|\*)\s(\d{1,2}|\*)\s(\d{1,2}|\*)\s(\d{1,2}|\*)\s(\d{1,2}|\*)$/;

    for (const entry of crons) {
      expect(entry.schedule).toMatch(cronRegex);

      // 각 필드 범위 검증
      const parts = entry.schedule.split(" ");
      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

      if (minute !== "*") {
        const m = parseInt(minute, 10);
        expect(m).toBeGreaterThanOrEqual(0);
        expect(m).toBeLessThanOrEqual(59);
      }
      if (hour !== "*") {
        const h = parseInt(hour, 10);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(23);
      }
      if (dayOfMonth !== "*") {
        const d = parseInt(dayOfMonth, 10);
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(31);
      }
      if (month !== "*") {
        const mo = parseInt(month, 10);
        expect(mo).toBeGreaterThanOrEqual(1);
        expect(mo).toBeLessThanOrEqual(12);
      }
      if (dayOfWeek !== "*") {
        const dw = parseInt(dayOfWeek, 10);
        expect(dw).toBeGreaterThanOrEqual(0);
        expect(dw).toBeLessThanOrEqual(6);
      }
    }
  });

  // ── region 검증 ──
  test("region is set to icn1", () => {
    expect(vercelConfig.regions).toBeDefined();
    expect(vercelConfig.regions).toContain("icn1");
  });
});
