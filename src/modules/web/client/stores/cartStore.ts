import { create } from "zustand";

export type UnitType = "pza" | "kg" | "g" | "lt" | "ml" | "m" | "cm" | "servicio";

const UNIT_STEP: Record<UnitType, number> = {
  pza: 1, kg: 0.1, g: 10, lt: 0.1, ml: 10, m: 0.1, cm: 1, servicio: 1,
};

export type Product = {
  id: number;
  barcode: string | null;
  sku: string;
  name: string;
  price: number;
  cost: number | null;
  category: string;
  stock: number;
  minStock: number | null;
  unitType: string;
  unitQty: number | null;
  active: number | null;
};

export type CartItem = Product & { qty: number };

type CartStore = {
  items: CartItem[];
  ticketNum: number;
  add: (p: Product, qty?: number) => void;
  remove: (sku: string) => void;
  inc: (sku: string) => void;
  dec: (sku: string) => void;
  setQty: (sku: string, qty: number) => void;
  clear: () => void;
  nextTicket: () => void;
  subtotal: () => number;
  tax: () => number;
  total: () => number;
  itemCount: () => number;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  ticketNum: parseInt(localStorage.getItem("lastTicketNum") || "1", 10),

  add(p, qty = 1) {
    set((s) => {
      const existing = s.items.find((i) => i.sku === p.sku);
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.sku === p.sku ? { ...i, qty: i.qty + qty } : i
          ),
        };
      }
      return { items: [{ ...p, qty }, ...s.items] };
    });
  },

  remove(sku) {
    set((s) => ({ items: s.items.filter((i) => i.sku !== sku) }));
  },

  inc(sku) {
    set((s) => {
      const item = s.items.find((i) => i.sku === sku);
      if (!item) return s;
      const step = UNIT_STEP[item.unitType as UnitType] || 1;
      return {
        items: s.items.map((i) =>
          i.sku === sku ? { ...i, qty: i.qty + step } : i
        ),
      };
    });
  },

  dec(sku) {
    set((s) => {
      const item = s.items.find((i) => i.sku === sku);
      if (!item) return s;
      const step = UNIT_STEP[item.unitType as UnitType] || 1;
      const newQty = item.qty - step;
      if (newQty <= 0) return { items: s.items.filter((i) => i.sku !== sku) };
      return {
        items: s.items.map((i) =>
          i.sku === sku ? { ...i, qty: newQty } : i
        ),
      };
    });
  },

  setQty(sku, qty) {
    if (qty <= 0) {
      set((s) => ({ items: s.items.filter((i) => i.sku !== sku) }));
    } else {
      set((s) => ({
        items: s.items.map((i) => (i.sku === sku ? { ...i, qty } : i)),
      }));
    }
  },

  clear() {
    set({ items: [] });
  },

  nextTicket() {
    const newNum = get().ticketNum + 1;
    localStorage.setItem("lastTicketNum", String(newNum));
    set({ ticketNum: newNum, items: [] });
  },

  subtotal() {
    return get().items.reduce((a, i) => a + i.price * i.qty, 0);
  },

  tax() {
    return get().subtotal() * 0.16;
  },

  total() {
    return get().subtotal() + get().tax();
  },

  itemCount() {
    return get().items.reduce((a, i) => a + i.qty, 0);
  },
}));
