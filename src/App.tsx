import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/admin/AdminLayout";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";
import { PublicLayout } from "./components/PublicLayout";
import { AuthProvider } from "./context/AuthContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { useDocumentDirection } from "./hooks/useDocumentDirection";
import { AdminCategoriesPage } from "./pages/admin/AdminCategoriesPage";
import { AdminProductsPage } from "./pages/admin/AdminProductsPage";
import { LoginPage } from "./pages/admin/LoginPage";
import { CatalogPage } from "./pages/public/CatalogPage";
import { CategoriesPage } from "./pages/public/CategoriesPage";
import { DealsPage } from "./pages/public/DealsPage";
import { FavoritesPage } from "./pages/public/FavoritesPage";
import { NotificationsPage } from "./pages/public/NotificationsPage";
import { ProductDetailPage } from "./pages/public/ProductDetailPage";
import { WholesaleDealsPage } from "./pages/public/WholesaleDealsPage";

export default function App() {
  useDocumentDirection();

  return (
    <AuthProvider>
      <FavoritesProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<CatalogPage />} />
            <Route path="category/:categoryId" element={<CatalogPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="deals" element={<DealsPage />} />
            <Route path="wholesale-deals" element={<WholesaleDealsPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
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
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </FavoritesProvider>
    </AuthProvider>
  );
}
