/** Deterministic clock for reproducible scenarios. */
export class DeterministicClock {
  private ms: number;

  constructor(startIso = "2026-01-01T00:00:00.000Z") {
    this.ms = Date.parse(startIso);
  }

  now(): Date {
    return new Date(this.ms);
  }

  advance(durationMs: number): void {
    this.ms += durationMs;
  }
}
