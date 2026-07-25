import { Hono } from "hono";
import { CONFIG_KEYS, getConfig, getRawDb, searchProducts } from "../webDb";

export const telegramRoutes = new Hono();

type TelegramMessage = {
  message_id?: number;
  chat?: { id?: number | string };
  text?: string;
  caption?: string;
  voice?: unknown;
  audio?: unknown;
};

type TelegramUpdate = {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

type ChatMode = "idle" | "consulta" | "update";

const chatModes = new Map<string, ChatMode>();

const MAX_RESULTS = 8;

async function getTelegramBotToken() {
  return (await getConfig(CONFIG_KEYS.TELEGRAM_BOT_TOKEN)) || process.env.TELEGRAM_BOT_TOKEN || "";
}

async function getTelegramWebhookSecret() {
  return (await getConfig(CONFIG_KEYS.TELEGRAM_WEBHOOK_SECRET)) || process.env.TELEGRAM_WEBHOOK_SECRET || "";
}

function getMessage(update: TelegramUpdate) {
  return update.message || update.edited_message;
}

function getText(message: TelegramMessage) {
  return (message.text || message.caption || "").trim();
}

async function isAuthorized(secretParam: string | undefined, headerSecret: string | undefined) {
  const webhookSecret = await getTelegramWebhookSecret();
  if (!webhookSecret) return true;
  return secretParam === webhookSecret || headerSecret === webhookSecret;
}

async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = await getTelegramBotToken();
  if (!botToken) return;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatProduct(product: any) {
  const stock = Number(product.stock || 0);
  const minStock = Number(product.min_stock || 0);
  const unit = product.unit_type || "pza";
  const status = stock <= 0 ? "agotado" : stock <= minStock ? "bajo" : "ok";

  return [
    `<b>${escapeHtml(product.name)}</b>`,
    `SKU: <code>${escapeHtml(product.sku)}</code>`,
    product.barcode ? `Codigo: <code>${escapeHtml(product.barcode)}</code>` : null,
    `Stock: ${stock} ${escapeHtml(unit)} (${status})`,
    `Minimo: ${minStock}`,
    `Precio: $${Number(product.price || 0).toFixed(2)}`,
  ].filter(Boolean).join("\n");
}

function parseInventoryLines(text: string) {
  const lines = text
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: { sku: string; stock: number }[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    const normalized = line
      .replace(/\s*(?:=|:|->)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const match = normalized.match(/^([a-zA-Z0-9._-]+)\s+(-?\d+(?:\.\d+)?)$/);

    if (!match) {
      errors.push(line);
      continue;
    }

    const stock = Number(match[2]);
    if (!Number.isFinite(stock) || stock < 0) {
      errors.push(line);
      continue;
    }

    items.push({ sku: match[1], stock });
  }

  return { items, errors };
}

async function handleConsulta(chatId: string, query: string) {
  if (!query) {
    chatModes.set(chatId, "consulta");
    return "Que producto buscamos? Envia nombre, SKU o codigo de barras.";
  }

  const result = await searchProducts(query, 0, MAX_RESULTS);
  if (result.total === 0) {
    return `No encontre productos para: ${escapeHtml(query)}`;
  }

  const products = result.items.map(formatProduct).join("\n\n");
  const extra = result.total > result.items.length ? `\n\nMostrando ${result.items.length} de ${result.total}.` : "";
  return `${products}${extra}`;
}

async function handleUpdate(chatId: string, text: string) {
  if (!text) {
    chatModes.set(chatId, "update");
    return [
      "Modo update activo.",
      "Envia una o varias lineas con: SKU cantidad",
      "Ejemplo:",
      "ABC123 10",
      "CREMA-01 = 6",
    ].join("\n");
  }

  const { items, errors } = parseInventoryLines(text);
  if (items.length === 0) {
    return [
      "No pude leer ningun producto para actualizar.",
      "Usa el formato: SKU cantidad",
      errors.length ? `Lineas no validas: ${errors.map(escapeHtml).join("; ")}` : null,
    ].filter(Boolean).join("\n");
  }

  const db = getRawDb();
  const updated: string[] = [];
  const missing: string[] = [];

  for (const item of items) {
    const product = await db.get("SELECT * FROM products WHERE sku = $1 AND active = 1", [item.sku]) as any;
    if (!product) {
      missing.push(escapeHtml(item.sku));
      continue;
    }

    const previousStock = Number(product.stock || 0);
    await db.run(
      `UPDATE products SET stock = $1, updated_at = NOW()::text WHERE sku = $2`,
      [item.stock, item.sku]
    );
    await db.run(
      `INSERT INTO inventory_movements (product_id, product_sku, type, quantity, previous_stock, new_stock, note, created_by, created_at)
       VALUES ($1, $2, 'telegram_count', $3, $4, $5, $6, $7, NOW()::text)`,
      [product.id, item.sku, item.stock, previousStock, item.stock, "Conteo desde Telegram", "telegram"]
    );

    updated.push(`${escapeHtml(product.name)} (${escapeHtml(item.sku)}): ${previousStock} -> ${item.stock}`);
  }

  const parts: string[] = [];
  if (updated.length) parts.push(`Actualizados (${updated.length}):\n${updated.join("\n")}`);
  if (missing.length) parts.push(`No encontrados:\n${missing.join("\n")}`);
  if (errors.length) parts.push(`No pude leer:\n${errors.map(escapeHtml).join("\n")}`);
  return parts.join("\n\n");
}

async function processTelegramUpdate(update: TelegramUpdate) {
  const message = getMessage(update);
  const chatId = message?.chat?.id;
  if (chatId === undefined || chatId === null) {
    return { ok: true, ignored: true };
  }

  const chatKey = String(chatId);
  const text = message ? getText(message) : "";
  const lower = text.toLowerCase();
  let response = "";

  if (message?.voice || message?.audio) {
    response = [
      "Recibi un audio, pero Telegram no manda la transcripcion al webhook.",
      "Por ahora envia el conteo como texto: SKU cantidad",
    ].join("\n");
  } else if (lower.startsWith("/start") || lower.startsWith("/ayuda")) {
    chatModes.set(chatKey, "idle");
    response = [
      "Comandos disponibles:",
      "/consulta - buscar productos",
      "/update - actualizar stock por SKU",
      "/cancelar - salir del modo actual",
    ].join("\n");
  } else if (lower.startsWith("/cancelar")) {
    chatModes.set(chatKey, "idle");
    response = "Listo. Sali del modo actual.";
  } else if (lower.startsWith("/consulta")) {
    const query = text.replace(/^\/consulta(?:@\w+)?/i, "").trim();
    response = await handleConsulta(chatKey, query);
  } else if (lower.startsWith("/update")) {
    const updateText = text.replace(/^\/update(?:@\w+)?/i, "").trim();
    response = await handleUpdate(chatKey, updateText);
  } else if (chatModes.get(chatKey) === "consulta") {
    response = await handleConsulta(chatKey, text);
  } else if (chatModes.get(chatKey) === "update") {
    response = await handleUpdate(chatKey, text);
  } else {
    response = "Usa /consulta para buscar productos o /update para actualizar inventario.";
  }

  await sendTelegramMessage(chatKey, response);
  return { ok: true, response };
}

async function webhookHandler(c: any) {
  if (!(await isAuthorized(c.req.param("secret"), c.req.header("X-Telegram-Bot-Api-Secret-Token")))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const result = await processTelegramUpdate(await c.req.json());
    return c.json(result);
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return c.json({ error: "Failed to process Telegram update" }, 500);
  }
}

telegramRoutes.post("/webhook", webhookHandler);
telegramRoutes.post("/webhook/:secret", webhookHandler);
