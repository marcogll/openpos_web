import React from "react";
import { AlertTriangle, Boxes, CheckCircle2, Filter, Package, Scissors, Tags } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { useCartStore, type Product } from "../../stores/cartStore";
import { useUIStore } from "../../stores/uiStore";
import { Button } from "../ui/Button";
import { getCategoryMeta } from "./categoryMeta";

type Props = {
  search: string;
};

type ProductFilter = "all" | "available" | "services" | "low-stock";

type ProductResponse = {
  items?: unknown;
  total?: unknown;
};

type RawProduct = Partial<Product> & {
  unit_type?: unknown;
  min_stock?: unknown;
  unit_qty?: unknown;
};

const FILTERS: {
  id: ProductFilter;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "all", label: "Todos", icon: Boxes },
  { id: "available", label: "Disponibles", icon: CheckCircle2 },
  { id: "services", label: "Servicios", icon: Scissors },
  { id: "low-stock", label: "Stock bajo", icon: AlertTriangle },
];

function normalizeProduct(raw: RawProduct): Product {
  return {
    id: Number(raw.id) || 0,
    barcode: typeof raw.barcode === "string" ? raw.barcode : null,
    sku: String(raw.sku || ""),
    name: String(raw.name || "Producto sin nombre"),
    price: Number(raw.price) || 0,
    cost: raw.cost === null || raw.cost === undefined ? null : Number(raw.cost) || 0,
    category: String(raw.category || "GEN"),
    stock: Number(raw.stock) || 0,
    minStock:
      raw.minStock === null || raw.minStock === undefined
        ? raw.min_stock === null || raw.min_stock === undefined
          ? null
          : Number(raw.min_stock) || 0
        : Number(raw.minStock) || 0,
    unitType: String(raw.unitType || raw.unit_type || "pza"),
    unitQty:
      raw.unitQty === null || raw.unitQty === undefined
        ? raw.unit_qty === null || raw.unit_qty === undefined
          ? null
          : Number(raw.unit_qty) || 1
        : Number(raw.unitQty) || 1,
    active: raw.active === null || raw.active === undefined ? 1 : Number(raw.active),
  };
}

export function ProductGrid({ search }: Props) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [filter, setFilter] = React.useState<ProductFilter>("all");
  const [category, setCategory] = React.useState("all");
  const add = useCartStore((s) => s.add);
  const addToast = useUIStore((s) => s.addToast);

  const getIsService = React.useCallback((product: Product) => {
    return (
      product.category?.toUpperCase() === "SER" ||
      product.unitType?.toLowerCase() === "servicio"
    );
  }, []);

  const filteredProducts = React.useMemo(() => {
    return products.filter((product) => {
      const isService = getIsService(product);
      if (category !== "all" && product.category !== category) return false;
      if (filter === "available") return isService || (product.active !== 0 && product.stock > 0);
      if (filter === "services") return isService;
      if (filter === "low-stock") {
        return !isService && product.minStock !== null && product.stock <= product.minStock;
      }
      return true;
    });
  }, [category, filter, getIsService, products]);

  const categories = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      const key = product.category || "GEN";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [products]);

  const loadProducts = React.useCallback(
    async (pageNum: number, query: string) => {
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "50",
        });
        if (query) params.set("q", query);
        const res = await fetch(`/api/products?${params}`);
        const data = (await res.json().catch(() => ({}))) as ProductResponse;
        if (!res.ok || !Array.isArray(data.items)) {
          throw new Error("Invalid products response");
        }
        const items = data.items.map((item) => normalizeProduct(item as RawProduct));
        if (pageNum === 0) {
          setProducts(items);
        } else {
          setProducts((prev) => [...prev, ...items]);
        }
        setTotal(Number(data.total) || items.length);
      } catch {
        if (pageNum === 0) {
          setProducts([]);
          setTotal(0);
        }
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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(8.75rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-36 rounded-lg border border-border/70 bg-card shadow-card animate-pulse-slow sm:h-44"
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
    <div className="flex flex-col rounded-lg border app-chrome-line bg-card/70 p-2 shadow-card backdrop-blur sm:p-3 lg:p-4">
      <div className="mb-2 flex min-h-8 items-center justify-between gap-2 sm:mb-3 lg:mb-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <Filter className="h-4 w-4 text-primary" />
          Productos
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {filteredProducts.length}
          </span>
        </h2>
        <span className="hidden text-xs font-semibold text-muted-foreground sm:inline">
          {total} cargados
        </span>
      </div>

      <div className="mb-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
          <Tags className="h-4 w-4 text-mauve" />
          Categorías
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={category === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory("all")}
            aria-pressed={category === "all"}
            className="min-h-10 min-w-[6.75rem] justify-between"
          >
            Todas
            <span className="rounded-full bg-background/30 px-2 py-0.5 text-xs">{products.length}</span>
          </Button>
          {categories.map(([item, count]) => {
            const meta = getCategoryMeta(item);
            const Icon = meta.icon;
            return (
              <Button
                key={item}
                variant={category === item ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className="min-h-10 min-w-[9.5rem] justify-between"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{meta.label}</span>
                </span>
                <span className="rounded-full bg-background/30 px-2 py-0.5 text-xs">{count}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2" aria-label="Filtros de productos">
        {FILTERS.map((item) => {
          const Icon = item.icon;
          const active = filter === item.id;
          return (
            <Button
              key={item.id}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(item.id)}
              aria-pressed={active}
              className="min-h-10"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(8.75rem,1fr))] content-start gap-2 pb-24 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] sm:gap-3 sm:pb-4 lg:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] lg:pb-2 2xl:grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))]">
        {filteredProducts.map((p) => (
          <ProductCard key={p.sku} product={p} onAdd={handleAdd} />
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 text-muted-foreground">
            <Package className="mb-2 h-10 w-10 text-text-dim" />
            <p className="text-sm font-bold">Sin productos en este filtro</p>
          </div>
        )}
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
