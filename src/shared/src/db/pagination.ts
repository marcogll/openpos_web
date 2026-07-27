import { db } from "./client.js";
import type { Product } from "./schema.js";

export interface PaginatedProducts {
  items: Product[];
  total: number;
}

export async function searchProducts(
  query: string,
  offset: number,
  limit: number
): Promise<PaginatedProducts> {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery) {
    const likePattern = `${normalizedQuery}%`;
    const items = await db.all(
      `SELECT * FROM products WHERE active = 1 AND (name ILIKE $1 OR sku ILIKE $1 OR barcode ILIKE $1) ORDER BY name ASC LIMIT $2 OFFSET $3`,
      [likePattern, limit, offset]
    );
    const countRow = await db.get(
      `SELECT COUNT(*)::int as count FROM products WHERE active = 1 AND (name ILIKE $1 OR sku ILIKE $1 OR barcode ILIKE $1)`,
      [likePattern]
    );
    return { items, total: (countRow as any)?.count ?? 0 };
  }

  const items = await db.all(
    `SELECT * FROM products WHERE active = 1 ORDER BY name ASC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const countRow = await db.get(
    `SELECT COUNT(*)::int as count FROM products WHERE active = 1`
  );
  return { items, total: (countRow as any)?.count ?? 0 };
}

export async function findProductByCode(code: string): Promise<Product | undefined> {
  const row = await db.get(
    `SELECT * FROM products WHERE active = 1 AND (barcode = $1 OR sku = $1) LIMIT 1`,
    [code]
  );
  return row as Product | undefined;
}