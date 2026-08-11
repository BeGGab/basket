import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Action, ProductId, SellerId } from '@/platform-core/contracts/Action';
import type { ContentBlock } from '@/platform-core/contracts/ContentBlock';
import type { BasketViewModel } from '@/platform-core/basket/viewmodels/BasketViewModel';
import { asBasketId } from '@/platform-core/basket/viewmodels/BasketViewModel';
import { BasketAdapter } from '@/platform-core/basket/adapters/BasketAdapter';
import { getBasketViewModel } from '@/platform-core/basket/BasketActionHandlers';
import {
  BasketStore,
  type StoredBasketItem,
} from '@/platform-core/basket/persistence/BasketStore';
import { useGreenMarketRuntime } from '@/platform-core/navigation-runtime-layer/hooks/useGreenMarketRuntime';

/**
 * Контроллер экрана «Корзина» — по образцу useSellerCardController:
 * экран остаётся презентационным, данные и dispatch живут здесь.
 *
 * idle (CART-001: пусто и не трогали) для UI трактуется как empty —
 * иначе BasketAdapter показал бы skeleton навсегда.
 *
 * BR-006 (CART-003): снимок корзины перед деструктивной операцией держится
 * во временной переменной контроллера (не в localStorage); «Отменить» в
 * Snackbar восстанавливает его в течение UNDO_TIMEOUT_MS.
 */

export type CartPageState = 'loading' | 'error' | 'ready';

export type CartUndoNotice = {
  message: string;
} | null;

const UNDO_TIMEOUT_MS = 5000;

export interface CartPageModel {
  pageState: CartPageState;
  viewModel: BasketViewModel | null;
  blocks: ContentBlock[];
  undoNotice: CartUndoNotice;
  clearConfirmOpen: boolean;
  onAction: (action: Action) => void;
  onRetry: () => void;
  onGoToCatalog: () => void;
  onChangeQuantity: (sellerId: SellerId, productId: ProductId, quantity: number) => void;
  onRemoveItem: (sellerId: SellerId, productId: ProductId) => void;
  onRequestClear: () => void;
  onCancelClear: () => void;
  onConfirmClear: () => void;
  onUndo: () => void;
  onDismissUndo: () => void;
}

function errorViewModel(): BasketViewModel {
  return {
    basketId: asBasketId('current'),
    items: [],
    totalItems: 0,
    totalPrice: 0,
    savings: 0,
    purchaseSummary: { sellersCount: 0, missingCount: 0, totalCost: 0 },
    state: 'error',
    availableActions: [
      {
        id: 'refresh-basket',
        action: { type: 'REFRESH_BASKET' },
        label: 'Повторить',
        variant: 'secondary',
      },
    ],
  };
}

function normalizeForUi(vm: BasketViewModel): BasketViewModel {
  if (vm.state === 'idle' && vm.items.length === 0) {
    return { ...vm, state: 'empty' };
  }
  return vm;
}

function cloneItems(items: StoredBasketItem[]): StoredBasketItem[] {
  return items.map((item) => ({ ...item, photo: item.photo ? { ...item.photo } : null }));
}

export function useCartController(): CartPageModel {
  const { dispatch } = useGreenMarketRuntime();
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<CartPageState>('loading');
  const [viewModel, setViewModel] = useState<BasketViewModel | null>(null);
  const [undoNotice, setUndoNotice] = useState<CartUndoNotice>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const undoSnapshotRef = useRef<StoredBasketItem[] | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }, []);

  const dismissUndo = useCallback(() => {
    clearUndoTimer();
    undoSnapshotRef.current = null;
    setUndoNotice(null);
  }, [clearUndoTimer]);

  const armUndo = useCallback(
    (message: string, snapshot: StoredBasketItem[]) => {
      clearUndoTimer();
      undoSnapshotRef.current = snapshot;
      setUndoNotice({ message });
      undoTimerRef.current = window.setTimeout(() => {
        undoSnapshotRef.current = null;
        setUndoNotice(null);
        undoTimerRef.current = null;
      }, UNDO_TIMEOUT_MS);
    },
    [clearUndoTimer]
  );

  const refresh = useCallback((options?: { showLoading?: boolean }) => {
    if (options?.showLoading) setPageState('loading');
    try {
      const vm = normalizeForUi(getBasketViewModel());
      setViewModel(vm);
      setPageState(vm.state === 'error' ? 'error' : 'ready');
    } catch {
      setViewModel(errorViewModel());
      setPageState('error');
    }
  }, []);

  useEffect(() => {
    refresh({ showLoading: true });
    return () => {
      clearUndoTimer();
    };
  }, [refresh, clearUndoTimer]);

  const onAction = useCallback(
    (action: Action) => {
      // Следующая операция после undo-окна — откат недоступен (BR-006).
      if (action.type !== 'REFRESH_BASKET') {
        dismissUndo();
      }
      const accepted = dispatch(action);
      if (accepted || action.type === 'REFRESH_BASKET') {
        refresh(action.type === 'REFRESH_BASKET' ? { showLoading: true } : undefined);
      }
    },
    [dispatch, refresh, dismissUndo]
  );

  const runDestructive = useCallback(
    (message: string, action: Action) => {
      const snapshot = cloneItems(BasketStore.load());
      dismissUndo();
      const accepted = dispatch(action);
      if (!accepted) return;
      refresh();
      armUndo(message, snapshot);
    },
    [dispatch, refresh, dismissUndo, armUndo]
  );

  const onChangeQuantity = useCallback(
    (sellerId: SellerId, productId: ProductId, quantity: number) => {
      if (quantity <= 0) {
        runDestructive('Товар удалён из корзины', {
          type: 'REMOVE_FROM_BASKET',
          payload: { sellerId, productId },
        });
        return;
      }
      onAction({
        type: 'CHANGE_QUANTITY',
        payload: { sellerId, productId, quantity },
      });
    },
    [onAction, runDestructive]
  );

  const onRemoveItem = useCallback(
    (sellerId: SellerId, productId: ProductId) => {
      runDestructive('Товар удалён из корзины', {
        type: 'REMOVE_FROM_BASKET',
        payload: { sellerId, productId },
      });
    },
    [runDestructive]
  );

  const onRequestClear = useCallback(() => {
    setClearConfirmOpen(true);
  }, []);

  const onCancelClear = useCallback(() => {
    setClearConfirmOpen(false);
  }, []);

  const onConfirmClear = useCallback(() => {
    setClearConfirmOpen(false);
    runDestructive('Корзина очищена', { type: 'CLEAR_BASKET' });
  }, [runDestructive]);

  const onUndo = useCallback(() => {
    const snapshot = undoSnapshotRef.current;
    if (!snapshot) return;
    BasketStore.replaceAll(snapshot);
    dismissUndo();
    refresh();
  }, [dismissUndo, refresh]);

  const onRetry = useCallback(() => {
    refresh({ showLoading: true });
  }, [refresh]);

  const onGoToCatalog = useCallback(() => {
    navigate('/catalog');
  }, [navigate]);

  const blocks =
    pageState === 'loading'
      ? ([{ type: 'skeleton' }] as ContentBlock[])
      : pageState === 'error'
        ? BasketAdapter.toBlocks(viewModel ?? errorViewModel())
        : viewModel
          ? BasketAdapter.toBlocks(viewModel)
          : ([{ type: 'skeleton' }] as ContentBlock[]);

  return {
    pageState,
    viewModel,
    blocks,
    undoNotice,
    clearConfirmOpen,
    onAction,
    onRetry,
    onGoToCatalog,
    onChangeQuantity,
    onRemoveItem,
    onRequestClear,
    onCancelClear,
    onConfirmClear,
    onUndo,
    onDismissUndo: dismissUndo,
  };
}
