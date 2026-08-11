import type { Action, ProductId, SellerId } from '@/platform-core/contracts/Action';
import { asProductId, asSellerId } from '@/platform-core/contracts/Action';
import type { ContentBlock, RowItem } from '@/platform-core/contracts/ContentBlock';
import { Text, Card, Button, Loader, EmptyState, ErrorState, ListItem, Badge } from '@/design-system/components';
import { Row, Stack } from '@/layout';
import { CartQuantityStepper } from '@/screens/cart/CartQuantityStepper';

/**
 * Узкий рендерер ContentBlock[] для экрана корзины (образец —
 * MapBottomSheetContent). Обрабатывает только теги BasketAdapter.toBlocks:
 * skeleton, errorRetry, empty, list, metaLine, alerts, priceLine.
 *
 * Группировка list.items по продавцу — визуальная, поверх плоского списка;
 * sellerId берётся из хвоста RowItem.subtitle (`… · {sellerId}`).
 */

function sellerIdFromRow(item: RowItem): string {
  if (item.subtitle?.includes(' · ')) {
    return item.subtitle.slice(item.subtitle.lastIndexOf(' · ') + 3);
  }
  const colon = item.id.indexOf(':');
  return colon >= 0 ? item.id.slice(0, colon) : item.id;
}

function displaySubtitle(item: RowItem): string | undefined {
  if (!item.subtitle) return undefined;
  const sep = item.subtitle.lastIndexOf(' · ');
  return sep >= 0 ? item.subtitle.slice(0, sep) : item.subtitle;
}

function parseRowIds(item: RowItem): { sellerId: SellerId; productId: ProductId } | null {
  const colon = item.id.indexOf(':');
  if (colon < 0) return null;
  return {
    sellerId: asSellerId(item.id.slice(0, colon)),
    productId: asProductId(item.id.slice(colon + 1)),
  };
}

function parseQuantity(item: RowItem): number {
  const subtitle = displaySubtitle(item);
  const match = subtitle?.match(/^(\d+)/);
  return match ? Number(match[1]) : 1;
}

function groupBySeller(items: RowItem[]): { sellerId: string; items: RowItem[] }[] {
  const groups: { sellerId: string; items: RowItem[] }[] = [];
  const indexBySeller = new Map<string, number>();
  for (const item of items) {
    const sellerId = sellerIdFromRow(item);
    const existing = indexBySeller.get(sellerId);
    if (existing === undefined) {
      indexBySeller.set(sellerId, groups.length);
      groups.push({ sellerId, items: [item] });
    } else {
      groups[existing].items.push(item);
    }
  }
  return groups;
}

export function CartBottomSheetContent({
  blocks,
  onRetry,
  onAction,
  onGoToCatalog,
  onChangeQuantity,
  onRemoveItem,
}: {
  blocks: ContentBlock[];
  onRetry: () => void;
  onAction: (action: Action) => void;
  onGoToCatalog: () => void;
  onChangeQuantity?: (sellerId: SellerId, productId: ProductId, quantity: number) => void;
  onRemoveItem?: (sellerId: SellerId, productId: ProductId) => void;
}) {
  return (
    <Stack gap="md">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'skeleton':
            return <Loader key={index} />;
          case 'errorRetry':
            return (
              <ErrorState
                key={index}
                title={block.text}
                action={
                  <Button variant="secondary" onClick={onRetry}>
                    Повторить
                  </Button>
                }
              />
            );
          case 'empty':
            return (
              <EmptyState
                key={index}
                title={block.text}
                description="Добавьте товары из каталога"
                action={
                  <Button variant="primary" onClick={onGoToCatalog}>
                    В каталог
                  </Button>
                }
              />
            );
          case 'list':
            return (
              <Stack key={index} gap="lg">
                {groupBySeller(block.items).map((group) => (
                  <Card key={group.sellerId}>
                    <Stack gap="xs">
                      <Text variant="overline" tone="secondary" data-testid="cart-seller-group">
                        Продавец · {group.sellerId}
                      </Text>
                      {group.items.map((item) => {
                        const ids = parseRowIds(item);
                        const quantity = parseQuantity(item);
                        return (
                          <ListItem
                            key={item.id}
                            static
                            leading={item.avatar ? <Text as="span">{item.avatar}</Text> : undefined}
                            trailing={
                              item.trailing ? (
                                <Text variant="bodyStrong" as="span">
                                  {item.trailing}
                                </Text>
                              ) : undefined
                            }
                            data-testid="cart-item-row"
                          >
                            <button
                              type="button"
                              className="gm-cart__item-title"
                              onClick={() => item.action && onAction(item.action)}
                            >
                              <Text variant="bodyStrong">{item.title}</Text>
                            </button>
                            {displaySubtitle(item) && (
                              <Text variant="caption" tone="secondary">
                                {displaySubtitle(item)}
                              </Text>
                            )}
                            {item.tag && (
                              <Badge tone={item.tag === 'missing' ? 'danger' : 'neutral'}>
                                {item.tag === 'missing' ? 'Нет в наличии' : 'Замена'}
                              </Badge>
                            )}
                            {ids && onChangeQuantity && onRemoveItem && (
                              <Row gap="sm" align="center" className="gm-cart__item-controls">
                                <CartQuantityStepper
                                  value={quantity}
                                  onChange={(next) =>
                                    onChangeQuantity(ids.sellerId, ids.productId, next)
                                  }
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRemoveItem(ids.sellerId, ids.productId)}
                                  data-testid="cart-remove-item"
                                >
                                  Удалить
                                </Button>
                              </Row>
                            )}
                          </ListItem>
                        );
                      })}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            );
          case 'metaLine':
            return (
              <Text
                key={index}
                tone="secondary"
                data-testid={block.text.startsWith('Экономия') ? 'cart-savings' : 'cart-meta'}
              >
                {block.text}
              </Text>
            );
          case 'alerts':
            return (
              <Stack key={index} gap="xs" data-testid="cart-alerts">
                {block.items.map((text) => (
                  <Text key={text} tone="danger" variant="caption">
                    {text}
                  </Text>
                ))}
              </Stack>
            );
          case 'priceLine':
            return (
              <Text key={index} variant="title" as="p" data-testid="cart-price-line">
                {block.text}
              </Text>
            );
          default:
            return null;
        }
      })}
    </Stack>
  );
}
