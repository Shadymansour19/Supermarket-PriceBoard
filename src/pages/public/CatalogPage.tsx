import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import { CategoryNav } from "../../components/CategoryNav";
import { ProductCard } from "../../components/ProductCard";
import { SearchBar } from "../../components/SearchBar";
import { fetchCategoryTree } from "../../lib/categories";
import { fetchProducts } from "../../lib/products";
import type { CategoryWithChildren, Product } from "../../types/database";

export function CatalogPage() {
  const { t } = useTranslation();
  const { categoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";

  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchCategoryTree()
      .then(setCategories)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetchProducts({ categoryId, search })
      .then(setProducts)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [categoryId, search]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
      <aside>
        <CategoryNav categories={categories} />
      </aside>
      <section className="space-y-4">
        <SearchBar value={search} onChange={(q) => setSearchParams(q ? { q } : {})} />

        {loading && <p className="text-neutral-500">{t("common.loading")}</p>}
        {error && <p className="text-red-600">{t("common.error")}</p>}
        {!loading && !error && products.length === 0 && (
          <p className="text-neutral-500">{t("search.noResults")}</p>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
