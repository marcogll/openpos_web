import React from "react";
import { Package } from "lucide-react";
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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-44 rounded-lg border border-border/70 bg-card shadow-card animate-pulse-slow"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border app-chrome-line bg-card/55 text-text-muted">
        <Package className="mb-3 h-12 w-12 text-text-dim" />
        <p className="text-sm font-medium">
          {search ? "Sin resultados" : "No hay productos"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border app-chrome-line bg-card/70 p-3 shadow-card backdrop-blur">
      <div className="mb-3 flex min-h-8 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">
          Productos
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {total}
          </span>
        </h2>
      </div>

      <div className="grid flex-1 auto-rows-fr grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3 overflow-auto pb-4 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]">
        {products.map((p) => (
          <ProductCard key={p.sku} product={p} onAdd={handleAdd} />
        ))}
      </div>

      {products.length < total && (
        <button
          onClick={handleLoadMore}
          className="min-h-11 w-full border-t border-border/70 py-2 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground cursor-pointer"
        >
          Cargar más ({products.length}/{total})
        </button>
      )}
    </div>
  );
}
