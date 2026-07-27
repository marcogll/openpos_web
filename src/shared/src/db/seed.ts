import { db, initDb } from "./client.js";

initDb();

const sample = [
  // Maquillaje
  { barcode: "7501000100010", sku: "MAQ001", name: "Base Líquida Matte 30ml",       price: 280, cost: 120, category: "MAQ", stock: 25, minStock: 8, unitType: "pza", unitQty: 1 },
  { barcode: "7501000100027", sku: "MAQ002", name: "Labial Liquido Velvet",          price: 180, cost: 70, category: "MAQ", stock: 40, minStock: 10, unitType: "pza", unitQty: 1 },
  { barcode: "7501000100034", sku: "MAQ003", name: "Paleta de Sombras 12 colores",   price: 450, cost: 180, category: "MAQ", stock: 15, minStock: 5, unitType: "pza", unitQty: 1 },
  { barcode: "7501000100041", sku: "MAQ004", name: "Corrector Concealer",            price: 160, cost: 60, category: "MAQ", stock: 30, minStock: 10, unitType: "pza", unitQty: 1 },
  { barcode: "7501000100058", sku: "MAQ005", name: "Rubor en Polvo Compacto",        price: 200, cost: 80, category: "MAQ", stock: 20, minStock: 6, unitType: "pza", unitQty: 1 },
  { barcode: "7501000100065", sku: "MAQ006", name: "Máscara de Pestañas Volumen",    price: 190, cost: 75, category: "MAQ", stock: 35, minStock: 10, unitType: "pza", unitQty: 1 },
  { barcode: "7501000100072", sku: "MAQ007", name: "Delineador Líquido Waterproof",  price: 150, cost: 55, category: "MAQ", stock: 28, minStock: 8, unitType: "pza", unitQty: 1 },
  { barcode: "7501000100089", sku: "MAQ008", name: "Primer Facial Pre-maquillaje",   price: 220, cost: 90, category: "MAQ", stock: 18, minStock: 5, unitType: "pza", unitQty: 1 },

  // Cuidado Facial
  { barcode: "7502000100018", sku: "CFA001", name: "Limpiador Facial Espumoso 150ml", price: 180, cost: 65, category: "CFA", stock: 22, minStock: 8, unitType: "pza", unitQty: 1 },
  { barcode: "7502000100025", sku: "CFA002", name: "Tónico Hidratante Facial 200ml",  price: 160, cost: 55, category: "CFA", stock: 18, minStock: 6, unitType: "pza", unitQty: 1 },
  { barcode: "7502000100032", sku: "CFA003", name: "Sérum Vitamina C 30ml",           price: 350, cost: 140, category: "CFA", stock: 12, minStock: 4, unitType: "pza", unitQty: 1 },
  { barcode: "7502000100049", sku: "CFA004", name: "Crema Hidratante Nocturna 50ml",  price: 280, cost: 100, category: "CFA", stock: 20, minStock: 6, unitType: "pza", unitQty: 1 },
  { barcode: "7502000100056", sku: "CFA005", name: "Mascarilla Facial Arcilla 75ml",  price: 190, cost: 70, category: "CFA", stock: 25, minStock: 8, unitType: "pza", unitQty: 1 },
  { barcode: "7502000100063", sku: "CFA006", name: "Protector Solar FPS 50 100ml",    price: 240, cost: 90, category: "CFA", stock: 30, minStock: 10, unitType: "pza", unitQty: 1 },

  // Cabello
  { barcode: "7503000100019", sku: "CAB001", name: "Shampoo Reparación 400ml",       price: 170, cost: 60, category: "CAB", stock: 20, minStock: 8, unitType: "pza", unitQty: 1 },
  { barcode: "7503000100026", sku: "CAB002", name: "Acondicionador Hidratante 400ml", price: 170, cost: 60, category: "CAB", stock: 18, minStock: 6, unitType: "pza", unitQty: 1 },
  { barcode: "7503000100033", sku: "CAB003", name: "Tinte Capilar Permanente",        price: 120, cost: 40, category: "CAB", stock: 45, minStock: 15, unitType: "pza", unitQty: 1 },
  { barcode: "7503000100040", sku: "CAB004", name: "Mascarilla Capilar Nutritiva",    price: 200, cost: 75, category: "CAB", stock: 15, minStock: 5, unitType: "pza", unitQty: 1 },
  { barcode: "7503000100057", sku: "CAB005", name: "Aceite Capilar Argán 100ml",      price: 220, cost: 85, category: "CAB", stock: 12, minStock: 4, unitType: "ml", unitQty: 100 },

  // Uñas
  { barcode: "7504000100017", sku: "UNA001", name: "Esmalte Gel Polish 15ml",        price: 95, cost: 30, category: "UNA", stock: 60, minStock: 20, unitType: "pza", unitQty: 1 },
  { barcode: "7504000100024", sku: "UNA002", name: "Removedor de Esmalte 250ml",      price: 65, cost: 20, category: "UNA", stock: 30, minStock: 10, unitType: "ml", unitQty: 250 },
  { barcode: "7504000100031", sku: "UNA003", name: "Tips de Uñas Full Cover (240 pzas)", price: 80, cost: 25, category: "UNA", stock: 40, minStock: 12, unitType: "pza", unitQty: 240 },
  { barcode: "7504000100048", sku: "UNA004", name: "Gel Builder Transparente 30g",    price: 180, cost: 65, category: "UNA", stock: 20, minStock: 6, unitType: "pza", unitQty: 1 },
  { barcode: "7504000100055", sku: "UNA005", name: "Lima para Uñas Doble Cara",       price: 35, cost: 10, category: "UNA", stock: 50, minStock: 15, unitType: "pza", unitQty: 1 },

  // Spa / Tratamientos
  { barcode: "7505000100014", sku: "SPA001", name: "Aceite Esencial Lavanda 30ml",   price: 150, cost: 50, category: "SPA", stock: 15, minStock: 5, unitType: "ml", unitQty: 30 },
  { barcode: "7505000100021", sku: "SPA002", name: "Sales de Baño Epsom 500g",       price: 120, cost: 40, category: "SPA", stock: 20, minStock: 6, unitType: "g", unitQty: 500 },
  { barcode: "7505000100038", sku: "SPA003", name: "Exfoliante Corporal Café 200g",  price: 180, cost: 65, category: "SPA", stock: 18, minStock: 5, unitType: "g", unitQty: 200 },
  { barcode: "7505000100045", sku: "SPA004", name: "Mascarilla Corporal Arcilla 300g", price: 200, cost: 75, category: "SPA", stock: 12, minStock: 4, unitType: "g", unitQty: 300 },
  { barcode: "7505000100052", sku: "SPA005", name: "Crema Masaje Relajante 250ml",   price: 160, cost: 55, category: "SPA", stock: 22, minStock: 6, unitType: "ml", unitQty: 250 },

  // Herramientas
  { barcode: "7506000100013", sku: "HER001", name: "Set Brochas Maquillaje (12 pzas)", price: 350, cost: 120, category: "HER", stock: 10, minStock: 3, unitType: "pza", unitQty: 12 },
  { barcode: "7506000100020", sku: "HER002", name: "Espejo de Escritorio LED",        price: 280, cost: 100, category: "HER", stock: 8, minStock: 3, unitType: "pza", unitQty: 1 },
  { barcode: "7506000100037", sku: "HER003", name: "Pinzas Depiladoras Acero",        price: 85, cost: 25, category: "HER", stock: 25, minStock: 8, unitType: "pza", unitQty: 1 },
  { barcode: "7506000100044", sku: "HER004", name: "Corta Cutículas Profesional",     price: 120, cost: 40, category: "HER", stock: 15, minStock: 5, unitType: "pza", unitQty: 1 },
  { barcode: "7506000100051", sku: "HER005", name: "Secadora de Uñas LED",            price: 450, cost: 180, category: "HER", stock: 6, minStock: 2, unitType: "pza", unitQty: 1 },

  // Accesorios
  { barcode: "7507000100012", sku: "ACC001", name: "Neceser Profesional Tela",        price: 150, cost: 50, category: "ACC", stock: 20, minStock: 6, unitType: "pza", unitQty: 1 },
  { barcode: "7507000100029", sku: "ACC002", name: "Bandana Facial Desechable (100)", price: 85, cost: 28, category: "ACC", stock: 30, minStock: 10, unitType: "pza", unitQty: 100 },
  { barcode: "7507000100036", sku: "ACC003", name: "Protector Capa Plástico",         price: 45, cost: 12, category: "ACC", stock: 50, minStock: 15, unitType: "pza", unitQty: 1 },
  { barcode: "7507000100043", sku: "ACC004", name: "Organizador Brochas Tubo",        price: 180, cost: 60, category: "ACC", stock: 12, minStock: 4, unitType: "pza", unitQty: 1 },

  // Servicios
  { barcode: "7508000100018", sku: "SER001", name: "Manicure Completo",               price: 250, cost: 0, category: "SER", stock: 0, minStock: 0, unitType: "servicio", unitQty: 1 },
  { barcode: "7508000100025", sku: "SER002", name: "Pedicure Completo",               price: 280, cost: 0, category: "SER", stock: 0, minStock: 0, unitType: "servicio", unitQty: 1 },
  { barcode: "7508000100032", sku: "SER003", name: "Facial Limpieza Profunda",        price: 350, cost: 0, category: "SER", stock: 0, minStock: 0, unitType: "servicio", unitQty: 1 },
  { barcode: "7508000100049", sku: "SER004", name: "Masaje Relajante 60min",          price: 400, cost: 0, category: "SER", stock: 0, minStock: 0, unitType: "servicio", unitQty: 1 },
  { barcode: "7508000100056", sku: "SER005", name: "Aplicación de Maquillaje",        price: 500, cost: 0, category: "SER", stock: 0, minStock: 0, unitType: "servicio", unitQty: 1 },
];

export async function runSeed() {
  try {
    const now = new Date().toISOString();
    for (const p of sample) {
      await db.run(
        `INSERT INTO products (barcode, sku, name, price, cost, category, stock, min_stock, unit_type, unit_qty, active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [p.barcode, p.sku, p.name, p.price, p.cost, p.category, p.stock, p.minStock, p.unitType, p.unitQty, 1, now, now]
      );
    }
    console.log("Seed completado: " + sample.length + " productos insertados.");
  } catch {
    console.log("Seed ya aplicado o error — omitiendo.");
  }
}
