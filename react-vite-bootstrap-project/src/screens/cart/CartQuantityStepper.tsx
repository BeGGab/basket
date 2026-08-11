import { Button, Text } from '@/design-system/components';
import { Row } from '@/layout';

/**
 * Локальный степпер количества для строк корзины (в Design System нет
 * отдельного компонента — CART-003, не выносится в пакет).
 */
export function CartQuantityStepper({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <Row gap="xs" align="center" className="gm-cart-stepper" data-testid="cart-quantity-stepper">
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || value <= 0}
        onClick={(event) => {
          event.stopPropagation();
          onChange(value - 1);
        }}
        aria-label="Уменьшить количество"
      >
        −
      </Button>
      <Text variant="bodyStrong" as="span" data-testid="cart-quantity-value">
        {value}
      </Text>
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onChange(value + 1);
        }}
        aria-label="Увеличить количество"
      >
        +
      </Button>
    </Row>
  );
}
