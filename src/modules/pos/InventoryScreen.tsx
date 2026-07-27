import React from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { db, theme } from "@openpos/shared";

type Tab = "stock" | "count" | "adjust" | "history";

type Props = {
  rows: number;
  cols: number;
  active: boolean;
  onClose: () => void;
};

const TABS: { id: Tab; label: string; key: string }[] = [
  { id: "stock",   label: "TABLA STOCK",    key: "1" },
  { id: "count",   label: "CONTEO FÍSICO",  key: "2" },
  { id: "adjust",  label: "AJUSTE",         key: "3" },
  { id: "history", label: "HISTORIAL",      key: "4" },
];

function n(v: unknown): string {
  const x = Number(v);
  return Number.isFinite(x) ? x.toString() : "0";
}

function fmtNum(v: unknown): string {
  const x = Number(v);
  if (!Number.isFinite(x)) return "0";
  if (Number.isInteger(x)) return x.toString();
  return x.toFixed(2);
}

export function InventoryScreen({ rows, cols, active, onClose }: Props) {
  const [tab, setTab] = React.useState<Tab>("stock");
  const [msg, setMsg] = React.useState("");

  useInput((input, key) => {
    if (!active) return;
    if (key.escape) { onClose(); return; }
    if (input === "1") setTab("stock");
    else if (input === "2") setTab("count");
    else if (input === "3") setTab("adjust");
    else if (input === "4") setTab("history");
  });

  const panelW = Math.min(80, cols - 4);
  const panelH = rows - 6;

  return (
    <Box flexDirection="column" width={cols} height={rows}>
      <InventoryBgBox variant="section" width={cols} paddingX={2}>
        <Box width={cols - 4} justifyContent="space-between">
          <Box flexDirection="row" gap={1}>
            <Text color={theme.green} bold>▸</Text>
            <Text color={theme.textMuted}>INVENTARIO</Text>
          </Box>
          <Text color={theme.textMuted}>ESC volver</Text>
        </Box>
      </InventoryBgBox>

      <Box flexDirection="column" paddingX={1} paddingY={0} flexGrow={1}>
        <Box flexDirection="row" gap={1} marginBottom={0}>
          {TABS.map(t => (
            <Box key={t.id}>
              <Text
                bold
                color={tab === t.id ? theme.green : theme.textDim}
              >
                {` [${t.key}] ${t.label} `}
              </Text>
            </Box>
          ))}
        </Box>

        <Box height={1}><Text> </Text></Box>

        <Box flexGrow={1} flexDirection="column">
          {tab === "stock"   && <StockTable     panelW={panelW} panelH={panelH} />}
          {tab === "count"   && <PhysicalCount  panelW={panelW} panelH={panelH} setMsg={setMsg} />}
          {tab === "adjust"  && <StockAdjust    panelW={panelW} panelH={panelH} setMsg={setMsg} />}
          {tab === "history" && <MovementHistory panelW={panelW} panelH={panelH} />}
        </Box>

        {msg ? (
          <Box height={1}>
            <Text color={theme.amber}>{msg}</Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function StockTable({ panelW, panelH }: { panelW: number; panelH: number }) {
  const [products, setProducts] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const PAGE_SIZE = Math.max(5, panelH - 4);

  React.useEffect(() => {
    (async () => {
      const q = search.trim();
      const like = `%${q}%`;
      if (q) {
        const rows = await db.all(
          `SELECT * FROM products WHERE active = 1 AND (name ILIKE $1 OR sku ILIKE $1 OR barcode ILIKE $1) ORDER BY name ASC LIMIT $2 OFFSET $3`,
          [like, PAGE_SIZE, page * PAGE_SIZE]
        );
        const countRow = await db.get(
          `SELECT COUNT(*)::int as count FROM products WHERE active = 1 AND (name ILIKE $1 OR sku ILIKE $1 OR barcode ILIKE $1)`, [like]
        );
        setProducts(rows);
        setTotal((countRow as any)?.count ?? 0);
      } else {
        const rows = await db.all(
          `SELECT * FROM products WHERE active = 1 ORDER BY name ASC LIMIT $1 OFFSET $2`,
          [PAGE_SIZE, page * PAGE_SIZE]
        );
        const countRow = await db.get(`SELECT COUNT(*)::int as count FROM products WHERE active = 1`);
        setProducts(rows);
        setTotal((countRow as any)?.count ?? 0);
      }
    })();
  }, [search, page]);

  useInput((input, key) => {
    if (key.leftArrow && page > 0) { setPage(p => p - 1); return; }
    if (key.rightArrow && (page + 1) * PAGE_SIZE < total) { setPage(p => p + 1); return; }
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const colW = panelW - 4;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={0}>
        <Text bold color={theme.textMuted}>
          Buscar: <TextInput value={search} onChange={v => { setSearch(v); setPage(0); }} />
        </Text>
      </Box>
      <Box height={1}><Text> </Text></Box>

      <Box width={colW}>
        <Text bold color={theme.cyan}>
          {"SKU".padEnd(10)}{"NOMBRE".padEnd(22).slice(0,22)}{"STOCK".padStart(7)}{"MIN".padStart(5)}{"PRECIO".padStart(9)}
        </Text>
      </Box>
      <Text color={theme.textDim}>{"─".repeat(colW)}</Text>

      <Box flexDirection="column" flexGrow={1}>
        {products.map(p => {
          const stock = Number(p.stock);
          const min = Number(p.min_stock);
          const statusColor = stock <= 0 ? theme.red : stock <= min ? theme.amber : theme.green;
          return (
            <Box key={p.id} width={colW}>
              <Text>
                <Text color={theme.white}>{String(p.sku).padEnd(10)}</Text>
                <Text color={theme.textMuted}>{String(p.name).slice(0,22).padEnd(22)}</Text>
                <Text color={statusColor} bold>{n(p.stock).padStart(7)}</Text>
                <Text color={theme.textDim}>{n(p.min_stock).padStart(5)}</Text>
                <Text color={theme.white}>{String(p.price).padStart(9)}</Text>
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box height={1}>
        <Text color={theme.textDim}>
          {total > 0 ? `Pág ${page + 1}/${totalPages} (${total} prod.)  ← → navegar` : "Sin resultados"}
        </Text>
      </Box>
    </Box>
  );
}

function PhysicalCount({ panelW, panelH, setMsg }: { panelW: number; panelH: number; setMsg: (m: string) => void }) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [selectedCat, setSelectedCat] = React.useState("");
  const [products, setProducts] = React.useState<any[]>([]);
  const [counts, setCounts] = React.useState<Record<number, string>>({});
  const [catIdx, setCatIdx] = React.useState(0);
  const [editingIdx, setEditingIdx] = React.useState(-1);
  const [diff, setDiff] = React.useState<any[]>([]);

  React.useEffect(() => {
    (async () => {
      const rows = await db.all(`SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category`);
      setCategories(rows.map((r: any) => r.category));
    })();
  }, []);

  useInput((input, key) => {
    if (key.escape) { setStep(1); setSelectedCat(""); setCounts({}); setEditingIdx(-1); return; }

    if (step === 1) {
      if (key.return && categories[catIdx]) {
        setSelectedCat(categories[catIdx]);
        setStep(2);
        (async () => {
          const rows = await db.all(
            `SELECT id, sku, name, stock, min_stock, unit_type FROM products WHERE active = 1 AND category = $1 ORDER BY name`,
            [categories[catIdx]]
          );
          setProducts(rows);
          const initial: Record<number, string> = {};
          for (const r of rows) initial[r.id] = String(r.stock);
          setCounts(initial);
        })();
      }
      if (key.upArrow) setCatIdx(i => Math.max(0, i - 1));
      if (key.downArrow) setCatIdx(i => Math.min(categories.length - 1, i + 1));
      return;
    }

    if (step === 2) {
      if (key.return) {
        setDiff(products.map(p => ({
          ...p,
          previousStock: Number(p.stock),
          countedStock: parseFloat(counts[p.id] ?? String(p.stock)),
        })));
        setStep(3);
        return;
      }
      if (key.upArrow && editingIdx > 0) setEditingIdx(i => i - 1);
      if (key.downArrow && editingIdx < products.length - 1) setEditingIdx(i => i + 1);
      if (editingIdx >= 0) {
        if (/^[0-9.]$/.test(input)) {
          setCounts(c => ({ ...c, [products[editingIdx].id]: (c[products[editingIdx].id] || "") + input }));
        }
        if (key.backspace || input === "") {
          if (input === "" && key.backspace !== true) return;
          setCounts(c => ({ ...c, [products[editingIdx].id]: (c[products[editingIdx].id] || "").slice(0, -1) }));
        }
      }
      return;
    }

    if (step === 3 && key.return) {
      (async () => {
        setMsg("Aplicando conteo...");
        for (const d of diff) {
          if (d.countedStock !== d.previousStock) {
            await db.run(
              `INSERT INTO inventory_movements (product_id, product_sku, type, quantity, previous_stock, new_stock, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [d.id, d.sku, 'count', d.countedStock - d.previousStock, d.previousStock, d.countedStock, 'admin', new Date().toISOString()]
            );
            await db.run(`UPDATE products SET stock = $1, updated_at = $2 WHERE id = $3`,
              [d.countedStock, new Date().toISOString(), d.id]);
          }
        }
        setMsg("Conteo aplicado exitosamente");
        setStep(1);
        setSelectedCat("");
        setCounts({});
        setEditingIdx(-1);
      })();
      return;
    }
  });

  const colW = panelW - 4;

  if (step === 1) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Text bold color={theme.cyan}>PASO 1: Seleccionar categoria</Text>
        <Text color={theme.textDim}>{"─".repeat(colW)}</Text>
        {categories.map((c, i) => (
          <Box key={c}>
            <Text bold color={catIdx === i ? theme.green : theme.textMuted}>{catIdx === i ? "> " : "  "}</Text>
            <Text color={catIdx === i ? theme.white : theme.textMuted}>{c}</Text>
          </Box>
        ))}
        <Box height={1}><Text color={theme.textDim}>Enter seleccionar - up/down navegar - ESC atras</Text></Box>
      </Box>
    );
  }

  if (step === 2) {
    const listH = Math.min(products.length, Math.max(5, panelH - 6));
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Text bold color={theme.cyan}>PASO 2: Ingresar conteo - {selectedCat}</Text>
        <Text color={theme.textDim}>{"─".repeat(colW)}</Text>
        <Box>
          <Text bold color={theme.textMuted}>
            {"SKU".padEnd(10)}{"NOMBRE".padEnd(20).slice(0,20)}{"ACTUAL".padStart(7)}{"CONTEO".padStart(10)}
          </Text>
        </Box>
        <Box flexDirection="column" height={listH}>
          {products.map((p, i) => (
            <Box key={p.id}>
              <Text>
                <Text bold color={editingIdx === i ? theme.green : theme.textMuted}>
                  {editingIdx === i ? "> " : "  "}
                </Text>
                <Text color={theme.white}>{String(p.sku).padEnd(10)}</Text>
                <Text color={theme.textMuted}>{String(p.name).slice(0,20).padEnd(20)}</Text>
                <Text color={theme.textDim}>{n(p.stock).padStart(7)}</Text>
                <Text color={editingIdx === i ? theme.green : theme.white} bold={editingIdx === i}>
                  {String(counts[p.id] ?? p.stock).padStart(10)}
                </Text>
              </Text>
            </Box>
          ))}
        </Box>
        <Box height={1}><Text color={theme.textDim}>up/down editar - Enter revisar - ESC atras</Text></Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Text bold color={theme.cyan}>PASO 3: Revisar diferencias</Text>
      <Text color={theme.textDim}>{"─".repeat(colW)}</Text>
      <Box>
        <Text bold color={theme.textMuted}>
          {"SKU".padEnd(10)}{"NOMBRE".padEnd(18).slice(0,18)}{"ACTUAL".padStart(7)}{"CONTEO".padStart(7)}{"DIF".padStart(7)}
        </Text>
      </Box>
      {diff.map(d => {
        const dif = d.countedStock - d.previousStock;
        const difColor = dif < 0 ? theme.red : dif > 0 ? theme.green : theme.textDim;
        return (
          <Box key={d.id}>
            <Text>
              <Text color={theme.white}>{String(d.sku).padEnd(10)}</Text>
              <Text color={theme.textMuted}>{String(d.name).slice(0,18).padEnd(18)}</Text>
              <Text color={theme.textDim}>{fmtNum(d.previousStock).padStart(7)}</Text>
              <Text color={dif !== 0 ? difColor : theme.textMuted}>{fmtNum(d.countedStock).padStart(7)}</Text>
              <Text color={difColor} bold>
                {dif !== 0 ? `${dif > 0 ? "+" : ""}${fmtNum(dif)}`.padStart(7) : "   -".padStart(7)}
              </Text>
            </Text>
          </Box>
        );
      })}
      <Box height={1}>
        <Text color={theme.textDim}>Enter aplicar conteo - ESC cancelar</Text>
      </Box>
    </Box>
  );
}

function StockAdjust({ panelW, panelH, setMsg }: { panelW: number; panelH: number; setMsg: (m: string) => void }) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState(0);
  const [newStock, setNewStock] = React.useState("");
  const [focus, setFocus] = React.useState<"search" | "list" | "value">("search");

  React.useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const rows = await db.all(
        `SELECT * FROM products WHERE active = 1 AND (name ILIKE $1 OR sku ILIKE $1 OR barcode ILIKE $1) LIMIT 20`,
        [`%${query.trim()}%`]
      );
      setResults(rows);
      setSelected(0);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useInput((input, key) => {
    if (focus === "search") return;
    if (focus === "list") {
      if (key.upArrow && selected > 0) setSelected(s => s - 1);
      if (key.downArrow && selected < results.length - 1) setSelected(s => s + 1);
      if (key.return && results[selected]) { setFocus("value"); return; }
      if (key.tab) { setFocus("search"); return; }
      return;
    }
    if (focus === "value") {
      if (key.return && results[selected] && newStock !== "") {
        const p = results[selected];
        const val = parseFloat(newStock);
        if (!isNaN(val)) {
          (async () => {
            const prev = Number(p.stock);
            await db.run(
              `INSERT INTO inventory_movements (product_id, product_sku, type, quantity, previous_stock, new_stock, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [p.id, p.sku, 'adjustment', val - prev, prev, val, 'admin', new Date().toISOString()]
            );
            await db.run(`UPDATE products SET stock = $1, updated_at = $2 WHERE id = $3`,
              [val, new Date().toISOString(), p.id]);
            setMsg(`${p.sku}: stock ajustado de ${prev} a ${val}`);
            setNewStock("");
            setFocus("list");
            setQuery("");
            setResults([]);
          })();
        }
        return;
      }
      if (key.escape || key.tab) { setFocus("list"); return; }
      if (key.backspace) { setNewStock(v => v.slice(0, -1)); return; }
      if (/^[0-9.]$/.test(input)) { setNewStock(v => (v + input).slice(0, 10)); return; }
    }
  });

  const p = results[selected];

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={0}>
        <Text bold color={theme.textMuted}>
          {focus === "search" ? "> " : "  "}Buscar producto:
        </Text>
        <TextInput value={query} onChange={setQuery} />
      </Box>
      <Text color={theme.textDim}>{"─".repeat(panelW - 4)}</Text>

      <Box flexDirection="column" flexGrow={1}>
        {results.length > 0 ? (
          <Box flexDirection="column">
            <Box>
              <Text bold color={theme.textMuted}>
                {"SKU".padEnd(10)}{"NOMBRE".padEnd(22).slice(0,22)}{"STOCK".padStart(7)}
              </Text>
            </Box>
            {results.map((r, i) => (
              <Box key={r.id}>
                <Text bold color={focus === "list" && selected === i ? theme.green : theme.textMuted}>
                  {focus === "list" && selected === i ? "> " : "  "}
                </Text>
                <Text color={theme.white}>{String(r.sku).padEnd(10)}</Text>
                <Text color={theme.textMuted}>{String(r.name).slice(0,22).padEnd(22)}</Text>
                <Text color={Number(r.stock) <= Number(r.min_stock) ? theme.amber : theme.white} bold>
                  {n(r.stock).padStart(7)}
                </Text>
              </Box>
            ))}
          </Box>
        ) : query ? (
          <Text color={theme.textDim}>Sin resultados</Text>
        ) : null}
      </Box>

      {p && (
        <Box flexDirection="column" borderStyle="single" borderColor={theme.blue} paddingX={1}>
          <Text bold color={theme.cyan}>{p.name} ({p.sku})</Text>
          <Text color={theme.textMuted}>Stock actual: <Text color={theme.white}>{n(p.stock)}</Text></Text>
          {focus === "value" ? (
            <Box>
              <Text bold color={theme.green}>{'>'} Nuevo stock: </Text>
              <TextInput value={newStock} onChange={v => setNewStock(v.slice(0, 10))} />
            </Box>
          ) : (
            <Box>
              <Text color={theme.green}>Nuevo stock: </Text>
              <Text color={theme.white}>{newStock || "(Enter para editar)"}</Text>
            </Box>
          )}
        </Box>
      )}

      <Box height={1}>
        <Text color={theme.textDim}>
          {focus === "search" ? "Escribir para buscar" :
           focus === "list" ? "up/down navegar - Enter seleccionar - Tab buscar" :
           "Enter ajustar - Tab cancelar"}
        </Text>
      </Box>
    </Box>
  );
}

function MovementHistory({ panelW, panelH }: { panelW: number; panelH: number }) {
  const [movements, setMovements] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [filterType, setFilterType] = React.useState("");
  const PAGE_SIZE = Math.max(5, panelH - 5);

  React.useEffect(() => {
    (async () => {
      const where = filterType ? "WHERE im.type = $1" : "";
      const params = filterType ? [filterType, PAGE_SIZE, page * PAGE_SIZE] : [PAGE_SIZE, page * PAGE_SIZE];
      const rows = await db.all(
        `SELECT im.*, p.name as product_name FROM inventory_movements im LEFT JOIN products p ON p.id = im.product_id ${where} ORDER BY im.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      const countRow = await db.get(
        `SELECT COUNT(*)::int as count FROM inventory_movements im ${where}`,
        filterType ? [filterType] : []
      );
      setMovements(rows);
      setTotal((countRow as any)?.count ?? 0);
    })();
  }, [page, filterType]);

  useInput((input, key) => {
    if (input === "a") setFilterType(f => f === "adjustment" ? "" : "adjustment");
    else if (input === "c") setFilterType(f => f === "count" ? "" : "count");
    else if (input === "e") setFilterType(f => f === "entry" ? "" : "entry");
    else if (input === "t") setFilterType("");
    if (key.leftArrow && page > 0) setPage(p => p - 1);
    if (key.rightArrow && (page + 1) * PAGE_SIZE < total) setPage(p => p + 1);
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const colW = panelW - 4;
  const labelMap: Record<string, string> = { adjustment: "Ajuste", count: "Conteo", entry: "Entrada" };

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={0}>
        <Text color={theme.textMuted}>
          Filtro: [t]odas [a]juste [c]onteo [e]ntrada
          {filterType ? ` - ${labelMap[filterType] || filterType}` : ""}
        </Text>
      </Box>
      <Text color={theme.textDim}>{"─".repeat(colW)}</Text>

      <Box width={colW}>
        <Text bold color={theme.cyan}>
          {"FECHA".padEnd(18)}{"SKU".padEnd(10)}{"TIPO".padEnd(10)}{"CANT".padStart(7)}{"STOCK".padStart(7)}
        </Text>
      </Box>
      <Text color={theme.textDim}>{"─".repeat(colW)}</Text>

      <Box flexDirection="column" flexGrow={1}>
        {movements.map(m => {
          const typeColor = m.type === "entry" ? theme.green : m.type === "count" ? theme.blue : theme.amber;
          return (
            <Box key={m.id} width={colW}>
              <Text>
                <Text color={theme.textDim}>{String(m.created_at || "").slice(0,16).padEnd(18)}</Text>
                <Text color={theme.white}>{String(m.product_sku).padEnd(10)}</Text>
                <Text color={typeColor}>{(labelMap[m.type] || m.type).padEnd(10)}</Text>
                <Text color={theme.white} bold>{fmtNum(m.quantity).padStart(7)}</Text>
                <Text color={theme.textMuted}>{fmtNum(m.new_stock).padStart(7)}</Text>
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box height={1}>
        <Text color={theme.textDim}>
          {total > 0 ? `Pag ${page + 1}/${totalPages} (${total} mov.)  <- -> navegar` : "Sin movimientos"}
        </Text>
      </Box>
    </Box>
  );
}

function InventoryBgBox({ variant, width, paddingX, children }: any) {
  const bg = variant === "section" ? theme.bgSection : theme.bgPanel;
  return (
    <Box width={width} paddingX={paddingX ?? 0} backgroundColor={bg}>
      {children}
    </Box>
  );
}
