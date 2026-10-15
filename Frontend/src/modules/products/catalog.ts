import type { IconName } from "../../ui/Icon";
import type { ProductCategory } from "../../types/domain";

export const CATEGORIES: ProductCategory[] = ["Bebida", "Snack", "Aseo", "General"];

export const CAT_ICON: Record<ProductCategory, { icon: IconName; color: string }> = {
  Bebida: { icon: "drink", color: "c-sky" },
  Snack: { icon: "snack", color: "c-orange" },
  Aseo: { icon: "spark", color: "c-teal" },
  General: { icon: "product", color: "c-slate" },
};
