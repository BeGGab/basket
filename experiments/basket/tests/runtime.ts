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
  assert.equal(runtime.events.some((e) => e.event === "bindBuyer"), true);
  const bind = runtime.events.find((e) => e.event === "bindBuyer");
  assert.equal(bind?.input, "CounteringBuyer");
  assert.equal(bind?.result, "bound");

  const three = DEMO_SCENARIOS.find((item) => item.name === "TZ002-THREE-SELLERS");
  assert.ok(three);
  const triple = runScenario(three);
  assert.equal(triple.world.sellerPurchases.size, 3);
  const respond = triple.events.find((e) => e.event === "sellerRespond");
  assert.ok(respond?.seller);
  assert.ok(respond?.sellerPurchaseId);
  assert.ok(respond?.result);

  // Determinism: the runtime uses a simulated clock and a per-world id counter, so re-running the
  // SAME scenario from a fresh runtime must reproduce the event stream AND the WHOLE observable
  // world (not just SellerPurchase pointers) byte-for-byte. This backs the "deterministic" claim.
  const observableWorld = (rt: ReturnType<typeof runScenario>) =>
    JSON.stringify({
      sellerPurchases: [...rt.world.sellerPurchases.values()],
      purchases: [...rt.world.purchases.values()],
      offers: rt.world.offers,
      acceptances: rt.world.acceptances,
      substitutions: rt.world.substitutions,
      stockConflicts: rt.world.stockConflicts,
      fulfillments: rt.world.fulfillments,
      catalog: rt.world.catalog,
      now: rt.world.nowIso(),
    });
  for (const scenario of DEMO_SCENARIOS) {
    const a = runScenario(scenario);
    const b = runScenario(scenario);
    assert.deepEqual(a.events, b.events, `${scenario.name}: event stream must be reproducible`);
    assert.equal(observableWorld(a), observableWorld(b), `${scenario.name}: full observable world must be reproducible`);
  }

  console.log("TZ-BASKET-002 runtime: OK");
}
