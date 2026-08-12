import { useState } from 'react';
import { Card, Text, Divider, Button } from '@/design-system/components';
import { Stack } from '@/layout';
import { asProductId, asSellerId, type Action } from '@/platform-core/contracts/Action';
import { basketActionHandlers } from '@/platform-core/basket/BasketActionHandlers';
import { useGreenMarketRuntime } from '@/platform-core/navigation-runtime-layer/hooks/useGreenMarketRuntime';
import { PhotoStrip } from './PhotoStrip';
import { formatPrice, formatStock } from '../format';
import type { ProductDetail, SellerOffer } from '../types';

/** PhotoItem в platform-core не несёт URL — только placeholder-цвет (ограничение всей платформы). */
const PHOTO_PLACEHOLDER_COLOR = '#E4F0E8';

interface OfferCardProps {
  offer: SellerOffer;
  /** Товар-родитель: name/id для ADD_TO_BASKET (productId = ProductDetail.id, не seller_product_id). */
  product: Pick<ProductDetail, 'id' | 'name'>;
}

/** Экран 3 (Карточка товара): продавец, цена, единица, остаток, фото (все, лентой), описание, «В корзину». */
export function OfferCard({ offer, product }: OfferCardProps) {
  const { dispatch } = useGreenMarketRuntime();
  const [addedHint, setAddedHint] = useState<string | null>(null);

  function handleAddToBasket() {
    const price = Number(offer.price);
    if (!Number.isFinite(price) || price < 0) {
      setAddedHint('Некорректная цена предложения');
      return;
    }

    const action: Action = {
      type: 'ADD_TO_BASKET',
      payload: {
        sellerId: asSellerId(String(offer.seller_id)),
        productId: asProductId(String(product.id)),
        name: product.name,
        unit: offer.unit,
        price,
        photo: offer.photos[0]
          ? { id: String(product.id), placeholderColor: PHOTO_PLACEHOLDER_COLOR }
          : null,
      },
    };

    // Runtime может быть на Basket/Map после других экранов — isActionAllowed
    // тогда отклонит ADD. Пишем в BasketStore напрямую как fallback.
    const accepted = dispatch(action);
    if (!accepted) {
      basketActionHandlers.handle(action, 'Catalog');
    }

    setAddedHint('Добавлено в корзину');
    window.setTimeout(() => setAddedHint(null), 2500);
  }

  return (
    <Card className="gm-buyer-offer-card">
      <Stack gap="sm">
        <PhotoStrip photos={offer.photos} label={offer.seller_name} />
        <Text variant="bodyStrong" as="h3">
          {offer.seller_name}
        </Text>
        <Text variant="title" as="p">
          {formatPrice(offer.price)}{' '}
          <Text as="span" variant="caption" tone="secondary">
            / {offer.unit}
          </Text>
        </Text>
        <Text variant="caption" tone="secondary">
          Остаток: {formatStock(offer.stock, offer.unit)}
        </Text>
        {offer.description && (
          <>
            <Divider />
            <Text variant="body" tone="secondary">
              {offer.description}
            </Text>
          </>
        )}
        <Button variant="primary" onClick={handleAddToBasket} data-testid="add-to-basket">
          В корзину
        </Button>
        {addedHint && (
          <Text variant="caption" tone="secondary" data-testid="add-to-basket-hint">
            {addedHint}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
