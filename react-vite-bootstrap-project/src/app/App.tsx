import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/design-system/ThemeProvider';
import { GreenMarketRuntimeProvider } from '@/platform-core/navigation-runtime-layer/hooks/useGreenMarketRuntime';
import { basketActionHandlers } from '@/platform-core/basket/BasketActionHandlers';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { NavigationContainer } from '@/app/NavigationContainer';
import { RuntimeRouteSync } from '@/app/RuntimeRouteSync';
import { Screen } from '@/layout';

/**
 * App Shell: ThemeProvider -> GreenMarketRuntimeProvider (real Platform
 * Core Runtime, IMP-003) -> ErrorBoundary -> Router.
 * Screen provides the token-driven base background/layout for the whole app.
 *
 * handlers={basketActionHandlers}: точка инъекции ТЗ-022 требование 8 —
 * CRUD корзины (CART-001), без изменения GreenMarketRuntime.
 */
export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <GreenMarketRuntimeProvider handlers={basketActionHandlers}>
          <BrowserRouter>
            <RuntimeRouteSync />
            <Screen>
              <NavigationContainer />
            </Screen>
          </BrowserRouter>
        </GreenMarketRuntimeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
