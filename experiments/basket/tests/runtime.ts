import assert from "node:assert/strict";
import { canTransition, transition } from "../domain/fsm";
import { runScenario } from "../runtime/engine";
import { DEMO_SCENARIOS } from "../runtime/demos";
import { ScenarioPlayer } from "../runtime/player";
import { SimulationRuntime } from "../runtime/simulation";

export function runTz002(): void {
  assert.equal(canTransition("REJECTED", "STABLE"), false);
  assert.throws(() => transition("REJECTED", "STABLE"), /Illegal FSM/);
  assert.equal(transition("WAITING_BUYER", "STABLE"), "STABLE");

  for (const scenario of DEMO_SCENARIOS) {
    runScenario(scenario);
  }

  const player = new ScenarioPlayer(DEMO_SCENARIOS[0]);
  assert.equal(player.runAll(), true);
  assert.equal(player.done, true);
  assert.equal(player.error, null);

  const runtime = new SimulationRuntime();
  runtime.bindBuyer("CounteringBuyer");
  assert.equal(runtime.events.some((e) => e.kind === "bindBuyer"), true);

  console.log("TZ-BASKET-002 runtime: OK");
}
