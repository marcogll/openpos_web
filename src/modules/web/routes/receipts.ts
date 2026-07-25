import { Hono } from "hono";
import { getSql, getConfig } from "../webDb";
import {
  DEFAULT_RECEIPT_THEME,
  buildMailtoUrl,
  buildReceiptText,
  buildWhatsappUrl,
  renderVanityReceiptHtml,
  type ReceiptSale,
  type ReceiptStore,
} from "../receiptTemplate";

export const receiptsRoutes = new Hono();

receiptsRoutes.post("/generate", async (c) => {
  try {
    const sql = getSql();
    const body = await c.req.json();
    const { ticket, deliveryMethod } = body;

    if (!ticket) {
      return c.json({ error: "ticket is required" }, 400);
    }

    const saleRows = await sql`SELECT * FROM sales WHERE ticket = ${ticket}`;
    const sale = saleRows[0] as any;
    if (!sale) {
      return c.json({ error: "Sale not found" }, 404);
    }

    const storeName = (await getConfig("storeName")) || "MI TIENDA";
    const storeRfc = (await getConfig("storeRfc")) || "";
    const storeAddress = (await getConfig("storeAddress")) || "";
    const storeLegalName = (await getConfig("storeLegalName")) || "";
    const storeLogoUrl =
      (await getConfig("storeLogoUrl")) ||
      "https://raw.githubusercontent.com/marcogll/mg_data_storage/refs/heads/main/vanity/logo_vanity_simplificado.svg";
    const webhookUrl = (await getConfig("webhookReceiptUrl")) || "";
    const receiptTheme =
      deliveryMethod === "printed" || deliveryMethod === "ticket"
        ? {
            ink: "#000000",
            paper: "#ffffff",
            background: "#ffffff",
            line: "#000000",
            accent: "#000000",
            accentDeep: "#000000",
            muted: "#444444",
          }
        : {
            ink: (await getConfig("receiptColorInk")) || DEFAULT_RECEIPT_THEME.ink,
            paper: (await getConfig("receiptColorPaper")) || DEFAULT_RECEIPT_THEME.paper,
            background: (await getConfig("receiptColorBackground")) || DEFAULT_RECEIPT_THEME.background,
            line: (await getConfig("receiptColorLine")) || DEFAULT_RECEIPT_THEME.line,
            accent: (await getConfig("receiptColorAccent")) || DEFAULT_RECEIPT_THEME.accent,
            accentDeep: (await getConfig("receiptColorAccentDeep")) || DEFAULT_RECEIPT_THEME.accentDeep,
            muted: (await getConfig("receiptColorMuted")) || DEFAULT_RECEIPT_THEME.muted,
          };
    const saleData: ReceiptSale = {
      ticket: sale.ticket,
      subtotal: Number(sale.subtotal) || 0,
      tax: Number(sale.tax) || 0,
      discount: Number(sale.discount) || 0,
      total: Number(sale.total) || 0,
      received: Number(sale.received) || 0,
      change: Number(sale.change) || 0,
      method: sale.method,
      status: sale.status,
      items: JSON.parse(sale.items),
      created_at: sale.created_at,
      created_by: sale.created_by,
      customer_email: sale.customer_email,
    } as ReceiptSale;
    const storeData: ReceiptStore = {
      name: storeName,
      rfc: storeRfc,
      address: storeAddress,
      legalName: storeLegalName,
      logoUrl: storeLogoUrl,
      theme: receiptTheme,
    };
    const receiptHtml = renderVanityReceiptHtml(saleData, storeData);
    const receiptText = buildReceiptText(saleData, storeData);

    const payload = {
      event: "receipt.generated",
      timestamp: new Date().toISOString(),
      store: {
        name: storeName,
        rfc: storeRfc,
        address: storeAddress,
        legalName: storeLegalName,
        logoUrl: storeLogoUrl,
      },
      sale: {
        ticket: sale.ticket,
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount || 0,
        total: sale.total,
        received: sale.received,
        change: sale.change,
        method: sale.method,
        status: sale.status,
        items: JSON.parse(sale.items),
        itemCount: sale.item_count,
        createdAt: sale.created_at,
        createdBy: sale.created_by,
        customerEmail: sale.customer_email,
      },
      receipt: {
        html: receiptHtml,
        text: receiptText,
        filename: `${sale.ticket}.html`,
        whatsappUrl: buildWhatsappUrl(saleData, storeData),
        mailtoUrl: buildMailtoUrl(saleData, storeData),
      },
      deliveryMethod: deliveryMethod || "comprobante-digital",
    };

    let webhookStatus = "skipped";
    let webhookResponse = "";

    if (webhookUrl && (deliveryMethod || "comprobante-digital") === "comprobante-digital") {
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });
        webhookStatus = res.ok ? "sent" : "failed";
        webhookResponse = await res.text().catch(() => "");
      } catch (err) {
        webhookStatus = "failed";
        webhookResponse = err instanceof Error ? err.message : "Webhook error";
      }
    }

    await sql`INSERT INTO receipts (sale_ticket, delivery_method, logo_url, webhook_url, webhook_status, webhook_response, payload)
      VALUES (${ticket}, ${deliveryMethod || "comprobante-digital"}, ${storeLogoUrl}, ${webhookUrl}, ${webhookStatus}, ${webhookResponse}, ${JSON.stringify(payload)})`;

    return c.json({
      ok: true,
      ticket,
      webhookStatus,
      receipt: payload.receipt,
      payload,
    }, 201);
  } catch (err) {
    return c.json({ error: "Failed to generate receipt" }, 500);
  }
});
