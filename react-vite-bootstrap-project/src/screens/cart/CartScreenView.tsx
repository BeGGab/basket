import { Content, Stack, Row } from '@/layout';
import { Text, Button, Snackbar, DialogSurface } from '@/design-system/components';
import { SnackbarContainer, DialogContainer } from '@/containers';
import { CartBottomSheetContent } from '@/screens/cart/CartBottomSheetContent';
import { useCartController } from '@/screens/cart/useCartController';
import '@/screens/cart/cart.css';

/**
 * Полноэкранный маршрут /cart. Чисто презентационный — данные и действия
 * из useCartController (образец SellerCardScreenView).
 */
export function CartScreenView() {
  const vm = useCartController();
  const hasItems = (vm.viewModel?.items.length ?? 0) > 0;

  return (
    <div className="gm-cart" data-testid="cart-screen">
      <header className="gm-cart__header">
        <Row align="center" justify="between" gap="md">
          <Text variant="title" as="h1">
            Корзина
          </Text>
          {hasItems && (
            <Button
              variant="ghost"
              size="sm"
              onClick={vm.onRequestClear}
              data-testid="cart-clear"
            >
              Очистить корзину
            </Button>
          )}
        </Row>
      </header>
      <Content className="gm-cart__content">
        <Stack gap="lg">
          <CartBottomSheetContent
            blocks={vm.blocks}
            onRetry={vm.onRetry}
            onAction={vm.onAction}
            onGoToCatalog={vm.onGoToCatalog}
            onChangeQuantity={vm.onChangeQuantity}
            onRemoveItem={vm.onRemoveItem}
          />
        </Stack>
      </Content>

      {vm.pageState === 'ready' && (
        <footer className="gm-cart__footer">
          <Button
            variant="primary"
            disabled={!hasItems}
            onClick={() => vm.onAction({ type: 'START_PURCHASE' })}
            data-testid="cart-start-purchase"
          >
            Начать покупку
          </Button>
        </footer>
      )}

      {vm.clearConfirmOpen && (
        <DialogContainer labelledBy="cart-clear-title" onDismiss={vm.onCancelClear}>
          <DialogSurface
            titleId="cart-clear-title"
            title="Очистить корзину?"
            actions={
              <Row gap="sm" justify="end">
                <Button variant="secondary" onClick={vm.onCancelClear}>
                  Отмена
                </Button>
                <Button variant="danger" onClick={vm.onConfirmClear} data-testid="cart-clear-confirm">
                  Очистить
                </Button>
              </Row>
            }
          >
            Все товары будут удалены. Действие можно будет отменить несколько секунд.
          </DialogSurface>
        </DialogContainer>
      )}

      {vm.undoNotice && (
        <SnackbarContainer>
          <Snackbar
            data-testid="cart-undo-snackbar"
            action={
              <Button variant="ghost" size="sm" onClick={vm.onUndo} data-testid="cart-undo">
                Отменить
              </Button>
            }
          >
            {vm.undoNotice.message}
          </Snackbar>
        </SnackbarContainer>
      )}
    </div>
  );
}
