import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/admin/AdminLayout";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";
import { PublicLayout } from "./components/PublicLayout";
import { AuthProvider } from "./context/AuthContext";
import { useDocumentDirection } from "./hooks/useDocumentDirection";
import { AdminCategoriesPage } from "./pages/admin/AdminCategoriesPage";
import { AdminProductsPage } from "./pages/admin/AdminProductsPage";
import { LoginPage } from "./pages/admin/LoginPage";
import { CatalogPage } from "./pages/public/CatalogPage";
import { DealsPage } from "./pages/public/DealsPage";
import { ProductDetailPage } from "./pages/public/ProductDetailPage";

export default function App() {
  useDocumentDirection();

  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<CatalogPage />} />
          <Route path="category/:categoryId" element={<CatalogPage />} />
          <Route path="deals" element={<DealsPage />} />
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
    </AuthProvider>
  );
}
