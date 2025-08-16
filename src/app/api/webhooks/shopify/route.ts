import { NextResponse } from "next/server";
import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Exécution côté Node
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Types basiques */
type ShopifyLineItem = {
  id: number | string;
  title: string;
  price: string | number;
  quantity: number;
};

type ShopifyCartPayload = {
  id?: string;
  token?: string;
  line_items?: ShopifyLineItem[];
  note?: string | null;
  updated_at?: string;
  created_at?: string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Cart = {
  items: CartItem[];
  total: number;
};

interface AIResult {
  provider: string;
  model?: string; // Added model property
  response: {
    suggestions: {
      product_name: string;
      reason: string;
      estimated_price: number;
    }[];
  };
  err?: string;
  ms?: number;
  fallbackReason?: string;
}

/** Utils */
function timingSafeEqual(a: string, b: string) {
  const abuf = Buffer.from(a, "utf8");
  const bbuf = Buffer.from(b, "utf8");
  if (abuf.length !== bbuf.length) return false;
  return crypto.timingSafeEqual(abuf, bbuf);
}

function verifyShopifyHmac(rawBody: string, secret: string, signature: string) {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  return timingSafeEqual(digest, signature);
}

function toNumber(x: unknown): number {
  if (typeof x === "number") return Number.isFinite(x) ? x : 0;
  if (typeof x === "string") {
    const n = parseFloat(x);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeCart(payload: ShopifyCartPayload): Cart {
  const items: CartItem[] = (payload.line_items || []).map((li) => ({
    id: String(li.id),
    name: li.title,
    price: toNumber(li.price),
    quantity: Number(li.quantity) || 0,
  }));

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  return { items, total };
}

export async function POST(request: Request) {
  console.log("[ShopifyWebhook] ➡️ Webhook reçu", {
    headers: Object.fromEntries(request.headers.entries()),
  });
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  // 1) Lire le body BRUT pour la vérification HMAC
  const raw = await request.text();
  const hdr = Object.fromEntries(request.headers.entries());
  const providedSig = hdr["x-shopify-hmac-sha256"];
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || "";

  if (!secret) {
    console.error("[ShopifyWebhook] Missing SHOPIFY_WEBHOOK_SECRET");
    return NextResponse.json(
      { error: "SERVER_MISCONFIG", message: "Missing webhook secret" },
      { status: 500 }
    );
  }

  if (!providedSig) {
    console.warn("[ShopifyWebhook] Missing HMAC header", { requestId });
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Missing HMAC" },
      { status: 401 }
    );
  }

  // 2) Vérifier la signature
  const ok = verifyShopifyHmac(raw, secret, providedSig);
  if (ok) {
    console.log("[ShopifyWebhook] ✅ Webhook reçu et signature valide");
  } else {
    console.warn("[ShopifyWebhook] ❌ Webhook reçu mais signature invalide");
  }

  // Persist WebhookEvent with idempotence
  const webhookId = hdr["x-shopify-webhook-id"] as string | undefined;
  const topic = hdr["x-shopify-topic"] as string | undefined;
  const shop = hdr["x-shopify-shop-domain"] as string | undefined;

  try {
    await prisma.webhookEvent.create({
      data: {
        webhookId: webhookId ?? `legacy_${crypto.randomUUID()}`, // safeguard (ne devrait pas arriver)
        topic: topic ?? "unknown",
        shop: shop,
        rawBody: raw,
        hmacValid: ok,
      },
    });
  } catch (e: unknown) { // Changed to unknown
    // Prisma P2002 = unique violation
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === "P2002") { // Type narrowing
      console.warn("[ShopifyWebhook] Duplicate webhook received, deduped.", { requestId, webhookId });
      return NextResponse.json({ ok: true, deduped: true }, { status: 200 });
    }
    console.error("[ShopifyWebhook] Failed to save WebhookEvent", { requestId, e });
  }

  if (!ok) {
    console.warn("[ShopifyWebhook] Invalid HMAC signature", { requestId });
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Invalid HMAC" },
      { status: 401 }
    );
  }

  // 3) Parser en JSON une fois la signature validée
  let payload: ShopifyCartPayload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    console.error("[ShopifyWebhook] Invalid JSON payload", { requestId, e });
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  console.log("[ShopifyWebhook] Payload reçu:", {
    requestId,
    id: payload.id,
    token: payload.token,
    itemsCount: payload.line_items?.length || 0,
  });

  // 4) Normaliser le panier
  const cart = normalizeCart(payload);
  if (!cart.items.length || cart.total <= 0) {
    console.log("[ShopifyWebhook] Panier vide → on n'appelle pas l'IA", {
      requestId,
      total: cart.total,
      items: cart.items.length,
    });

    return NextResponse.json(
      {
        ok: true,
        requestId,
        latencyMs: Date.now() - startedAt,
        cart,
        ai: { provider: "skip", response: { suggestions: [] } },
      },
      { status: 200 }
    );
  }

  console.log("[ShopifyWebhook] Panier normalisé:", { requestId, cart });

  // Persist CartSnapshot
  try {
    await prisma.cartSnapshot.create({
      data: {
        cartToken: payload.token || "unknown",
        total: cart.total,
        items: cart.items,
      },
    });
  } catch (e: unknown) { // Changed to unknown
    console.error("[ShopifyWebhook] Failed to save CartSnapshot", {
      requestId,
      e,
    });
  }

  // 5) Appeler l’agent IA local
  let aiResult: AIResult | null = null;
  const ctrl = new AbortController();
  const TO = setTimeout(() => ctrl.abort(), 15_000);

  try {
    const res = await fetch(`${process.env.AI_AGENT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(TO);

    const text = await res.text();
    if (!res.ok) {
      console.error("[ShopifyWebhook] AI agent HTTP error", {
        requestId,
        status: res.status,
        bodyPreview: text.slice(0, 300),
      });
      aiResult = {
        provider: "fallback",
        response: { suggestions: [] },
        err: "AI_AGENT_HTTP",
      };
    } else {
      aiResult = JSON.parse(text);
    }
  } catch (e: unknown) {
    clearTimeout(TO);
    const message = e instanceof Error ? e.message : "Unknown fetch error";
    console.error("[ShopifyWebhook] AI agent fetch failed", {
      requestId,
      message,
    });
    aiResult = {
      provider: "fallback",
      response: { suggestions: [] },
      err: "AI_AGENT_FETCH",
    };
  }

  const latency = Date.now() - startedAt;
  console.log("[ShopifyWebhook] Terminé", {
    requestId,
    latencyMs: latency,
    suggestions: aiResult?.response?.suggestions?.length ?? 0,
    provider: aiResult?.provider,
  });

  // Persist SuggestionLog
  try {
    await prisma.suggestionLog.create({
      data: {
        requestId,
        cartToken: payload.token ?? null,
        provider: aiResult?.provider ?? "unknown",
        model: aiResult?.model ?? null, // Assuming model is part of aiResult
        payload: aiResult as Prisma.JsonValue ?? {},
      },
    });
  } catch (e: unknown) { // Changed to unknown
    console.error("[ShopifyWebhook] Failed to save SuggestionLog", { requestId, e });
  }

  console.log("[ShopifyWebhook] ✅ Traitement terminé", {
    requestId,
    webhookId: hdr["x-shopify-webhook-id"],
    topic: hdr["x-shopify-topic"],
    shop: hdr["x-shopify-shop-domain"],
    items: cart.items.length,
    total: cart.total,
    aiProvider: aiResult?.provider,
    aiMs: aiResult?.ms,
  });
  // 6) Réponse 200 à Shopify (toujours), mais on renvoie aussi nos infos pour debug
  return NextResponse.json(
    {
      ok: true,
      requestId,
      latencyMs: latency,
      cart,
      ai: aiResult,
    },
    { status: 200 }
  );
}
