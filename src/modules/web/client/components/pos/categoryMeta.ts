import {
  BookOpen,
  Boxes,
  Coffee,
  Cookie,
  Hammer,
  Package,
  PackageOpen,
  Scissors,
  Sparkles,
  SprayCan,
} from "lucide-react";
import type { ElementType } from "react";

type CategoryMeta = {
  code: string;
  label: string;
  icon: ElementType;
  className: string;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  BEB: {
    code: "BEB",
    label: "Bebidas",
    icon: Coffee,
    className: "bg-blue/10 text-blue",
  },
  BOT: {
    code: "BOT",
    label: "Botanas",
    icon: Cookie,
    className: "bg-amber/10 text-amber",
  },
  COS: {
    code: "COS",
    label: "Cosméticos",
    icon: Sparkles,
    className: "bg-pink/10 text-pink",
  },
  GEN: {
    code: "GEN",
    label: "General",
    icon: Boxes,
    className: "bg-text-dim/10 text-text-muted",
  },
  HER: {
    code: "HER",
    label: "Herramientas",
    icon: Hammer,
    className: "bg-amber/10 text-amber",
  },
  KIT: {
    code: "KIT",
    label: "Kits",
    icon: PackageOpen,
    className: "bg-purple/10 text-purple",
  },
  MAT: {
    code: "MAT",
    label: "Material didáctico",
    icon: BookOpen,
    className: "bg-lavender/10 text-lavender",
  },
  SER: {
    code: "SER",
    label: "Servicios",
    icon: Scissors,
    className: "bg-mauve/10 text-mauve",
  },
  UNA: {
    code: "UNA",
    label: "Uñas",
    icon: SprayCan,
    className: "bg-rosewater/10 text-rosewater",
  },
  UNG: {
    code: "UNG",
    label: "Ungüentos",
    icon: Package,
    className: "bg-cyan/10 text-cyan",
  },
};

export function getCategoryMeta(category: string | null | undefined): CategoryMeta {
  const code = (category || "GEN").toUpperCase();
  return (
    CATEGORY_META[code] || {
      code,
      label: `Categoría ${code}`,
      icon: Package,
      className: "bg-muted text-muted-foreground",
    }
  );
}
