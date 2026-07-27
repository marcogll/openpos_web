import React from "react";
import { ProductBulkEditor } from "./ProductBulkEditor";

export function InventoryManagement() {
  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      <ProductBulkEditor />
    </div>
  );
}
