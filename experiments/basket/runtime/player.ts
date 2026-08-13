import { createScenarioContext, executeStep, type Scenario, type ScenarioContext } from "./engine";
import { SimulationRuntime } from "./simulation";

export class ScenarioPlayer {
  readonly scenario: Scenario;
  ctx: ScenarioContext;
  index = 0;
  error: string | null = null;

  constructor(scenario: Scenario) {
    this.scenario = scenario;
    this.ctx = createScenarioContext(scenario.name, new SimulationRuntime());
  }

  get runtime(): SimulationRuntime {
    return this.ctx.runtime;
  }

  get done(): boolean {
    return this.index >= this.scenario.steps.length;
  }

  get nextStep() {
    return this.scenario.steps[this.index];
  }

  reset(): void {
    this.ctx = createScenarioContext(this.scenario.name, new SimulationRuntime());
    this.index = 0;
    this.error = null;
  }

  step(): boolean {
    if (this.done || this.error) return false;
    try {
      executeStep(this.ctx, this.scenario.steps[this.index]);
      this.index += 1;
      return true;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
      return false;
    }
  }

  runAll(): boolean {
    while (!this.done && !this.error) {
      if (!this.step()) return false;
    }
    return this.error === null;
  }
}
