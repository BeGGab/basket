import { createScenarioContext, executeStep, type Scenario, type ScenarioContext } from "./engine";
import { SimulationRuntime } from "./simulation";

export class ScenarioPlayer {
  readonly scenario: Scenario;
  ctx: ScenarioContext;
  index = 0;
  private _error: string | null = null;

  constructor(scenario: Scenario) {
    this.scenario = scenario;
    this.ctx = createScenarioContext(scenario.name, new SimulationRuntime());
  }

  get runtime(): SimulationRuntime {
    return this.ctx.runtime;
  }

  get error(): string | null {
    return this._error;
  }

  get done(): boolean {
    return this.index >= this.scenario.steps.length;
  }

  get nextStep() {
    return this.scenario.steps[this.index];
  }

  fail(message: string): void {
    this._error = message;
  }

  reset(): void {
    this.ctx = createScenarioContext(this.scenario.name, new SimulationRuntime());
    this.index = 0;
    this._error = null;
  }

  /** Run a UI/runtime command; errors stay on the player, not assigned from React. */
  run(command: () => void): boolean {
    try {
      command();
      return this._error === null;
    } catch (err) {
      this.fail(err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  step(): boolean {
    if (this.done || this._error) return false;
    try {
      executeStep(this.ctx, this.scenario.steps[this.index]);
      this.index += 1;
      return true;
    } catch (err) {
      this.fail(err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  runAll(): boolean {
    while (!this.done && !this._error) {
      if (!this.step()) return false;
    }
    return this._error === null;
  }
}
