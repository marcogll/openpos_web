import React from "react";
import { Package, AlertTriangle } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { useCartStore, type Product } from "../../stores/cartStore";
import { useUIStore } from "../../stores/uiStore";

type Props = {
  search: string;
};

export function ProductGrid({ search }: Props) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const add = useCartStore((s) => s.add);
  const addToast = useUIStore((s) => s.addToast);

  const loadProducts = React.useCallback(
    async (pageNum: number, query: string) => {
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "50",
        });
        if (query) params.set("q", query);
        const res = await fetch(`/api/products?${params}`);
        const data = await res.json();
        if (pageNum === 0) {
          setProducts(data.items);
        } else {
          setProducts((prev) => [...prev, ...data.items]);
        }
        setTotal(data.total);
      } catch {
        addToast("Error al cargar productos", "error");
      } finally {
        setLoading(false);
      }
    },
    [addToast]
  );

  React.useEffect(() => {
    setLoading(true);
    setPage(0);
    loadProducts(0, search);
  }, [search, loadProducts]);

  const handleLoadMore = () => {
    const next = page + 1;
    if (products.length < total) {
      setPage(next);
      loadProducts(next, search);
    }
  };

  const handleAdd = (product: Product) => {
    if (product.active === 0) {
      addToast(`${product.name} está inactivo`, "warning");
      return;
    }
    if (product.stock <= 0) {
      addToast(`${product.name} sin stock`, "warning");
      return;
    }
    add(product);
    addToast(`${product.name} agregado`, "success");
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-36 rounded-xl bg-card border border-border/70 shadow-card animate-pulse-slow"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-text-muted">
        <Package className="w-12 h-12 mb-3 text-text-dim" />
        <p className="text-sm">
          {search ? "Sin resultados" : "No hay productos"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-border/70 bg-card/55 p-3 shadow-card backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">
          Productos
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {total}
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 overflow-auto flex-1 pb-4">
        {products.map((p) => (
          <ProductCard key={p.sku} product={p} onAdd={handleAdd} />
        ))}
      </div>

      {products.length < total && (
        <button
          onClick={handleLoadMore}
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground border-t border-border/70 hover:bg-accent transition-all cursor-pointer"
        >
          Cargar más ({products.length}/{total})
        </button>
      )}
    </div>
  );
}
