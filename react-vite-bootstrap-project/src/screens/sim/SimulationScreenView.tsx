import { useReducer, useState } from 'react';
import { Badge, Button, Card, Text } from '@/design-system/components';
import { Row, Stack } from '@/layout';
import { adviseBuyer, adviseSeller, type Advice } from 'basket-experiment/assistants';
import { DEMO_SCENARIOS } from 'basket-experiment/runtime/demos';
import { ScenarioPlayer } from 'basket-experiment/runtime/player';
import type { Scenario } from 'basket-experiment/runtime/engine';
import '@/screens/sim/sim.css';

function formatAdvice(advice: Advice): string {
  if (advice.kind === 'COUNTER') {
    const lines = advice.items.map((item) => `${item.productId} ${item.price ?? '—'}`).join(', ');
    return `COUNTER on ${advice.counterOfferId} · ${lines} MAD`;
  }
  if (advice.kind === 'WAIT') return `WAIT · ${advice.waitReason}`;
  if (advice.kind === 'REJECT') return `REJECT · ${advice.rejectReason}`;
  if (advice.kind === 'ACCEPT_ACTIVE') return `ACCEPT_ACTIVE · ${advice.offerId}`;
  return `ACCEPT_SUBSTITUTION · ${advice.substitutionId}`;
}

function formatEventLine(event: { at: string; seller: string | null; event: string; input: string; result: string; offerId: string | null; sellerPurchaseId: string | null }): string {
  return [
    event.seller ? `seller=${event.seller}` : null,
    event.input ? `in=${event.input}` : null,
    event.result ? `→ ${event.result}` : null,
    event.offerId ? `offer=${event.offerId}` : null,
    event.sellerPurchaseId ? `sp=${event.sellerPurchaseId}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function formatItems(items: readonly { productId: string; quantity: number; unit: string; price?: number }[]): string {
  if (!items.length) return '—';
  return items
    .map((item) => `${item.productId} × ${item.quantity} ${item.unit}${item.price != null ? ` · ${item.price} MAD` : ''}`)
    .join(', ');
}

export function SimulationScreenView() {
  const [scenarioName, setScenarioName] = useState(DEMO_SCENARIOS[0].name);
  const scenario = DEMO_SCENARIOS.find((item) => item.name === scenarioName) ?? DEMO_SCENARIOS[0];
  const [player, setPlayer] = useState(() => new ScenarioPlayer(scenario));
  const [selectedSpId, setSelectedSpId] = useState<string | null>(null);
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const world = player.runtime.world;
  const sellerPurchases = [...world.sellerPurchases.values()];
  const selected = sellerPurchases.find((item) => item.id === selectedSpId) ?? sellerPurchases[0];
  const snapshot = selected ? world.snapshot(selected.id) : null;
  const buyerAdvice = selected ? adviseBuyer(world, selected.id) : null;
  const sellerAdvice = selected ? adviseSeller(world, selected.id) : null;

  function load(next: Scenario) {
    setScenarioName(next.name);
    setPlayer(new ScenarioPlayer(next));
    setSelectedSpId(null);
  }

  function act(fn: () => void) {
    player.run(fn);
    bump();
  }

  return (
    <div className="gm-sim" data-testid="simulation-screen">
      <header className="gm-sim__header">
        <Text variant="overline" tone="secondary">
          TZ-BASKET-004 · не production-корзина
        </Text>
        <Text variant="headline" as="h1">
          Симуляция закупки
        </Text>
        <Text tone="secondary">
          Demo и training всей Purchase: переключение SellerPurchase, snapshot и журнал. Экран «Корзина» (/cart) не
          затрагивается. Приёмка BS-001…028 — программные тесты, не этот экран.
        </Text>
      </header>

      <div className="gm-sim__grid">
        <Card className="gm-sim__panel">
          <Stack gap="md">
            <Text variant="title" as="h2">
              Scenario control
            </Text>
            <Stack gap="xs">
              {DEMO_SCENARIOS.map((item) => (
                <Button
                  key={item.name}
                  variant={item.name === scenario.name ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => load(item)}
                >
                  {item.title ?? item.name}
                </Button>
              ))}
            </Stack>
            <Row gap="sm" wrap>
              <Button variant="primary" onClick={() => act(() => player.runAll())} disabled={player.done || Boolean(player.error)}>
                Run all
              </Button>
              <Button variant="secondary" onClick={() => act(() => player.step())} disabled={player.done || Boolean(player.error)}>
                Step
              </Button>
              <Button variant="ghost" onClick={() => act(() => { player.reset(); setSelectedSpId(null); })}>
                Reset
              </Button>
            </Row>
            <Text variant="caption" tone="secondary">
              Шаг {player.index}/{player.scenario.steps.length}
              {player.nextStep ? ` · next: ${player.nextStep.op}` : ' · готово'}
            </Text>
            {player.error && (
              <Text tone="danger" variant="caption">
                {player.error}
              </Text>
            )}
            <Text variant="title" as="h3">
              Ручное управление
            </Text>
            <Row gap="sm" wrap>
              <Button
                variant="secondary"
                size="sm"
                disabled={!selected}
                onClick={() => act(() => selected && player.runtime.buyerRespond(selected.id))}
              >
                Buyer respond
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!selected}
                onClick={() => act(() => selected && player.runtime.sellerRespond(selected.id))}
              >
                Seller respond
              </Button>
              <Button variant="secondary" size="sm" onClick={() => act(() => player.runtime.tick(3_600_000))}>
                Tick +1h
              </Button>
            </Row>
          </Stack>
        </Card>

        <Card className="gm-sim__panel">
          <Stack gap="md">
            <Text variant="title" as="h2">
              Snapshot
            </Text>
            {selected && buyerAdvice && sellerAdvice ? (
              <>
                {sellerPurchases.length > 0 && (
                  <Stack gap="xs">
                    <Text variant="overline">SellerPurchase</Text>
                    <Row gap="sm" wrap>
                      {sellerPurchases.map((sp) => (
                        <Button
                          key={sp.id}
                          variant={sp.id === selected.id ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => setSelectedSpId(sp.id)}
                        >
                          {sp.sellerId} · {sp.status}
                        </Button>
                      ))}
                    </Row>
                  </Stack>
                )}
                <Row gap="sm" align="center">
                  <Badge tone={selected.status === 'STABLE' ? 'success' : 'neutral'}>{selected.status}</Badge>
                  <Text variant="caption" tone="secondary">
                    {selected.sellerId} · {selected.id}
                  </Text>
                </Row>
                <div className="gm-sim__lane gm-sim__lane--agreed">
                  <Text variant="overline">AGREED</Text>
                  <Text variant="bodyStrong">{formatItems(snapshot?.agreed.items ?? [])}</Text>
                  <Text variant="caption" tone="secondary">
                    {snapshot?.agreed.offerId ?? 'нет'}
                  </Text>
                </div>
                <div className="gm-sim__lane gm-sim__lane--current">
                  <Text variant="overline">CURRENT OFFER</Text>
                  <Text variant="bodyStrong">{formatItems(snapshot?.current.items ?? [])}</Text>
                  <Text variant="caption" tone="secondary">
                    {snapshot?.current.offerId ?? 'нет'}
                  </Text>
                </div>
                <div className="gm-sim__lane gm-sim__lane--pending">
                  <Text variant="overline">PENDING SUBSTITUTION</Text>
                  {snapshot?.pendingSubstitutions.length ? (
                    snapshot.pendingSubstitutions.map((sub) => (
                      <Text key={sub.id} variant="bodyStrong">
                        {sub.originalProductId} → {sub.replacementProductId} ({sub.status})
                      </Text>
                    ))
                  ) : (
                    <Text tone="secondary">нет</Text>
                  )}
                </div>
                <div className="gm-sim__lane gm-sim__lane--advice">
                  <Text variant="overline">BUYER ASSISTANT</Text>
                  <Text variant="bodyStrong">{formatAdvice(buyerAdvice)}</Text>
                  <Text variant="caption" tone="secondary">
                    {buyerAdvice.rationale}
                  </Text>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => act(() => player.runtime.applyDisplayedAdvice(selected.id, buyerAdvice))}
                  >
                    Apply buyer
                  </Button>
                </div>
                <div className="gm-sim__lane gm-sim__lane--advice">
                  <Text variant="overline">SELLER ASSISTANT</Text>
                  <Text variant="bodyStrong">{formatAdvice(sellerAdvice)}</Text>
                  <Text variant="caption" tone="secondary">
                    {sellerAdvice.rationale}
                  </Text>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => act(() => player.runtime.applyDisplayedAdvice(selected.id, sellerAdvice))}
                  >
                    Apply seller
                  </Button>
                </div>
              </>
            ) : (
              <Text tone="secondary">Нет SellerPurchase — запустите сценарий.</Text>
            )}
          </Stack>
        </Card>

        <Card className="gm-sim__panel">
          <Stack gap="md">
            <Text variant="title" as="h2">
              Event log
            </Text>
            <ol className="gm-sim__log">
              {player.runtime.events.length === 0 && (
                <li>
                  <Text tone="secondary">Пока пусто</Text>
                </li>
              )}
              {player.runtime.events.map((event, index) => (
                <li key={`${event.at}-${index}`}>
                  <Text variant="caption" tone="secondary" as="span">
                    {event.at.slice(11, 19)}
                  </Text>{' '}
                  <Text variant="bodyStrong" as="span">
                    {event.event}
                  </Text>{' '}
                  <Text as="span">{formatEventLine(event)}</Text>
                </li>
              ))}
            </ol>
          </Stack>
        </Card>
      </div>
    </div>
  );
}
