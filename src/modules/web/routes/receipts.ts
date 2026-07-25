import { Hono } from "hono";
import { getSql, getConfig } from "../webDb";

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
    const storeLogoUrl = (await getConfig("storeLogoUrl")) || "";
    const webhookUrl = (await getConfig("webhookReceiptUrl")) || "";

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
      },
      deliveryMethod: deliveryMethod || "comprobante-digital",
    };

    let webhookStatus = "skipped";
    let webhookResponse = "";

    if (webhookUrl) {
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
      payload,
    }, 201);
  } catch (err) {
    return c.json({ error: "Failed to generate receipt" }, 500);
  }
});
