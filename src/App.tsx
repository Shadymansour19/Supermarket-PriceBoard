import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/admin/AdminLayout";
import { CashierLayout } from "./components/cashier/CashierLayout";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";
import { PublicLayout } from "./components/PublicLayout";
import { ScrollToTop } from "./components/ScrollToTop";
import { UpdateBanner } from "./components/UpdateBanner";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ConfirmDialogProvider } from "./context/ConfirmDialogContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { useAdminManifest } from "./hooks/useAdminManifest";
import { useDocumentDirection } from "./hooks/useDocumentDirection";
import { AdminCategoriesPage } from "./pages/admin/AdminCategoriesPage";
import { AdminFinancePage } from "./pages/admin/AdminFinancePage";
import { AdminProductsPage } from "./pages/admin/AdminProductsPage";
import { AdminStaffPage } from "./pages/admin/AdminStaffPage";
import { LoginPage } from "./pages/admin/LoginPage";
import { CashierInvoicesPage } from "./pages/cashier/CashierInvoicesPage";
import { CashierReceivePage } from "./pages/cashier/CashierReceivePage";
import { CashierSellPage } from "./pages/cashier/CashierSellPage";
import { CartPage } from "./pages/public/CartPage";
import { CatalogPage } from "./pages/public/CatalogPage";
import { CategoriesPage } from "./pages/public/CategoriesPage";
import { DealsPage } from "./pages/public/DealsPage";
import { FavoritesPage } from "./pages/public/FavoritesPage";
import { NotificationsPage } from "./pages/public/NotificationsPage";
import { OrderHistoryPage } from "./pages/public/OrderHistoryPage";
import { ProductDetailPage } from "./pages/public/ProductDetailPage";
import { WholesaleDealsPage } from "./pages/public/WholesaleDealsPage";

export default function App() {
  useDocumentDirection();
  useAdminManifest();

  return (
    <ConfirmDialogProvider>
      <ScrollToTop />
      <UpdateBanner />
      <AuthProvider>
        <FavoritesProvider>
          <CartProvider>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<CatalogPage />} />
                <Route path="category/:categoryId" element={<CatalogPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="deals" element={<DealsPage />} />
                <Route path="wholesale-deals" element={<WholesaleDealsPage />} />
                <Route path="favorites" element={<FavoritesPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="orders" element={<OrderHistoryPage />} />
                <Route path="product/:productId" element={<ProductDetailPage />} />
              </Route>

              <Route path="admin/login" element={<LoginPage />} />
              <Route
                path="admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="products" replace />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="categories" element={<AdminCategoriesPage />} />
                <Route path="finance" element={<AdminFinancePage />} />
                <Route path="staff" element={<AdminStaffPage />} />
              </Route>

              <Route path="cashier/login" element={<Navigate to="/admin/login" replace />} />
              <Route
                path="cashier"
                element={
                  <ProtectedRoute roles={["admin", "cashier"]}>
                    <CashierLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="sell" replace />} />
                <Route path="sell" element={<CashierSellPage />} />
                <Route path="receive" element={<CashierReceivePage />} />
                <Route path="invoices" element={<CashierInvoicesPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CartProvider>
        </FavoritesProvider>
      </AuthProvider>
    </ConfirmDialogProvider>
  );
}
