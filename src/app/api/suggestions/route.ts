// /app/api/suggestions/route.ts
import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";

/** Autoriser uniquement ton domaine (ajouter le staging plus tard si besoin) */
const allowedOrigin = "https://soforino.com";

/* ------------------------ Types Shopify (simplifiés) ------------------------ */
type ShopifyVariant = {
  id: number | string;
  available?: boolean;
  price?: number | string;
};

type ShopifyProduct = {
  id: number | string;
  title: string;
  handle: string;
  image?: { src?: string };
  images?: Array<{ src?: string }>;
  variants?: ShopifyVariant[];
  price?: number | string;
};

type CartItem = {
  title?: string;
  quantity?: number;
  price?: number; // en cents
  product_id?: number | string;
  variant_id?: number | string;
  id?: number | string;
};

type Cart = {
  items: CartItem[];
  total_price?: number; // cents
};

/* ---------------------- Types réponse widget / front ----------------------- */
export type Suggestion = {
  id: string;
  title: string;
  price?: number;
  reason?: string;
  handle?: string;
  image?: string;
  variant_id?: string;
  has_multiple_variants?: boolean;
  action?: "add" | "set_qty" | "view";
  add_quantity?: number;
  target_qty?: number;
};

/* ----------------------------- Utils généraux ------------------------------ */
function corsify(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isCart(v: unknown): v is Cart {
  return (
    isObj(v) &&
    Array.isArray((v as { items?: unknown }).items) &&
    ((v as { items: unknown[] }).items as unknown[]).every(() => true)
  );
}
function asEuroNumber(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
function firstImage(p: ShopifyProduct): string | undefined {
  return p.image?.src || p.images?.[0]?.src || undefined;
}
function getVariantInfo(p: ShopifyProduct): {
  variantId?: string;
  hasMultiple: boolean;
} {
  const vars = p.variants || [];
  if (vars.length === 0) return { hasMultiple: false };
  if (vars.length === 1)
    return { variantId: String(vars[0]?.id ?? ""), hasMultiple: false };
  const avail = vars.find((v) => v.available) || vars[0];
  return { variantId: String(avail?.id ?? ""), hasMultiple: true };
}
function productToSuggestion(p: ShopifyProduct): Suggestion {
  const price =
    asEuroNumber(p.variants?.[0]?.price) ??
    asEuroNumber((p.variants || []).find((v) => v.available)?.price) ??
    asEuroNumber(p.price);
  const { variantId, hasMultiple } = getVariantInfo(p);
  return {
    id: String(p.id),
    title: String(p.title),
    price,
    handle: p.handle,
    image: firstImage(p),
    variant_id: hasMultiple ? undefined : variantId,
    has_multiple_variants: hasMultiple,
    action: hasMultiple ? "view" : "add",
    add_quantity: hasMultiple ? undefined : 1,
  };
}

/* -------------------------- Type guards pour JSON -------------------------- */
function isShopifyProductArray(u: unknown): u is ShopifyProduct[] {
  return (
    Array.isArray(u) &&
    u.every((e) => isObj(e) && "id" in e && "title" in e && "handle" in e)
  );
}
function hasProductsArray(u: unknown): u is { products: unknown } {
  return isObj(u) && "products" in u;
}
function isAiSuggestions(
  u: unknown
): u is { suggestions: { product_id: string; reason: string }[] } {
  return (
    isObj(u) &&
    Array.isArray((u as { suggestions?: unknown }).suggestions) &&
    (u as { suggestions: unknown[] }).suggestions.every(
      (s) =>
        isObj(s) &&
        typeof (s as { product_id?: unknown }).product_id !== "undefined"
    )
  );
}

/* -------------------------- OpenAI SDK (Groq baseURL) ---------------------- */
const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});

function buildContextProducts(filtered: ShopifyProduct[], limit = 10): string {
  return filtered
    .slice(0, limit)
    .map((p) => {
      const price =
        asEuroNumber(p.variants?.[0]?.price) ??
        asEuroNumber((p.variants || []).find((v) => v.available)?.price) ??
        asEuroNumber(p.price);
      return `- ID: ${p.id} | ${p.title}${
        price != null ? ` | €${price.toFixed(2)}` : ""
      }`;
    })
    .join("\n");
}

function buildCartLines(cart: Cart): string {
  if (!cart?.items?.length) return "(panier vide)";
  return cart.items
    .map((i) => {
      const q = Number(i.quantity ?? 1);
      const euros = Number(i.price ?? 0) / 100;
      return `• ${i.title ?? "Produit"} x${q}${
        Number.isFinite(euros) && euros > 0 ? ` | €${euros.toFixed(2)}` : ""
      }`;
    })
    .join("\n");
}

async function rankWithGroqRAG(cart: Cart, filtered: ShopifyProduct[]) {
  if (!process.env.GROQ_API_KEY)
    return [] as { product_id: string; reason: string }[];

  const context_products = buildContextProducts(filtered, 10);
  const lines = buildCartLines(cart);
  const total = (cart.total_price ?? 0) / 100;

  const prompt = [
    "Tu es un expert en merchandising e-commerce.",
    "Analyse le panier et choisis EXACTEMENT 2 produits parmi la liste fournie.",
    "",
    "--- PANIER ACTUEL ---",
    lines,
    `Total: €${total.toFixed(2)}`,
    "",
    "--- PRODUITS CANDIDATS DISPONIBLES ---",
    context_products,
    "",
    "--- INSTRUCTIONS ---",
    "1) Choisis 2 produits de la liste.",
    "2) Ajoute une raison marketing courte (max 10 mots).",
    '3) Réponds UNIQUEMENT en JSON: {"suggestions":[{"product_id":"...","reason":"..."}]}',
  ].join("\n");

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsedUnknown: unknown = JSON.parse(raw);
    if (isAiSuggestions(parsedUnknown)) {
      // Nettoyage minimal (raison max 80 chars)
      return parsedUnknown.suggestions
        .map((s) => ({
          product_id: String(s.product_id),
          reason: String(s.reason ?? "").slice(0, 80),
        }))
        .slice(0, 2);
    }
    return [];
  } catch {
    return [];
  }
}

/* ----------------------------- Mono-produit -------------------------------- */
function monoProductSuggestions(cart: Cart): Suggestion[] {
  const first = cart.items?.[0];
  if (!first) return [];
  const vId = String(first.variant_id || first.id || "");
  const title = String(first.title || "Produit");
  const qty = Number(first.quantity || 1);

  return [
    {
      id: "to-three",
      title: "Passez au pack de 3",
      reason: qty < 3 ? `Passez de ${qty} à 3 unités` : "Économies immédiates",
      variant_id: vId,
      action: "set_qty",
      target_qty: 3,
    },
    {
      id: "add-one",
      title: `Ajoutez un ${title}`,
      reason: "Rechange ou cadeau",
      variant_id: vId,
      action: "add",
      add_quantity: 1,
    },
  ];
}

/* ----------------------------- Collecte produits --------------------------- */
async function fetchRecommendations(
  shopOrigin: string,
  productId: string
): Promise<ShopifyProduct[]> {
  const url = `${shopOrigin}/recommendations/products.json?product_id=${encodeURIComponent(
    productId
  )}&limit=8`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return [];
    const dataUnknown: unknown = await r.json();
    if (isShopifyProductArray(dataUnknown)) return dataUnknown;
    if (
      hasProductsArray(dataUnknown) &&
      isShopifyProductArray((dataUnknown as { products: unknown }).products)
    ) {
      return (dataUnknown as { products: ShopifyProduct[] }).products;
    }
    return [];
  } catch {
    return [];
  }
}
async function fetchAllProducts(shopOrigin: string): Promise<ShopifyProduct[]> {
  const url = `${shopOrigin}/products.json?limit=50`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return [];
    const dataUnknown: unknown = await r.json();
    if (
      hasProductsArray(dataUnknown) &&
      isShopifyProductArray((dataUnknown as { products: unknown }).products)
    ) {
      return (dataUnknown as { products: ShopifyProduct[] }).products;
    }
    return [];
  } catch {
    return [];
  }
}

/* ------------------------------- GET (stub) -------------------------------- */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cartToken = searchParams.get("cart_token");
  console.log("[CartPilot] API hit (GET) cart_token:", cartToken);

  const res = NextResponse.json(
    {
      suggestions: [
        { id: "1", title: "Produit A", price: 19.99 },
        { id: "2", title: "Produit B", price: 29.99 },
      ] as Suggestion[],
    },
    { status: 200 }
  );
  return corsify(res);
}

/* ------------------------------- POST handler ------------------------------ */
export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return corsify(
      NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    );
  }

  const body = isObj(raw) ? (raw as Record<string, unknown>) : undefined;
  const cart =
    body && isCart((body as { cart?: unknown }).cart)
      ? ((body as { cart: unknown }).cart as Cart)
      : undefined;
  const shopOrigin =
    body && typeof (body as { shopOrigin?: unknown }).shopOrigin === "string"
      ? (body as { shopOrigin: string }).shopOrigin
      : undefined;

  if (!cart?.items || !shopOrigin) {
    return corsify(
      NextResponse.json(
        { error: "Missing cart or shopOrigin" },
        { status: 400 }
      )
    );
  }

  // IDs déjà au panier
  const inCartProductIds = new Set(
    cart.items
      .map((i) => String(i.product_id || i.id || ""))
      .filter((s) => s.length > 0)
  );

  // Candidats via recommendations
  const recsArrays = await Promise.all(
    Array.from(inCartProductIds).map((pid) =>
      fetchRecommendations(shopOrigin, pid)
    )
  );
  let candidates: ShopifyProduct[] = recsArrays.flat();
  if (candidates.length === 0) candidates = await fetchAllProducts(shopOrigin);

  // Filtre & déduplication
  const seen = new Set<string>();
  const filtered: ShopifyProduct[] = [];
  for (const p of candidates) {
    const pid = String(p.id);
    if (inCartProductIds.has(pid) || seen.has(pid)) continue;
    seen.add(pid);
    filtered.push(p);
  }

  // Mono-produit
  if (filtered.length === 0) {
    return corsify(
      NextResponse.json({ suggestions: monoProductSuggestions(cart) })
    );
  }

  // IA RAG
  const aiPicks = await rankWithGroqRAG(cart, filtered);
  let suggestions: Suggestion[] = [];

  if (aiPicks.length > 0) {
    suggestions = aiPicks
      .map((ai) => {
        const product = filtered.find(
          (p) => String(p.id) === String(ai.product_id)
        );
        if (!product) return null;
        const s = productToSuggestion(product);
        s.reason = ai.reason;
        return s;
      })
      .filter((s): s is Suggestion => !!s)
      .slice(0, 2);
  }

  // Fallback règles si IA vide
  if (suggestions.length === 0) {
    const firstPriceEUR = (cart.items?.[0]?.price ?? 0) / 100;
    filtered.sort((a, b) => {
      const ap =
        asEuroNumber(a.variants?.[0]?.price) ??
        asEuroNumber((a.variants || []).find((v) => v.available)?.price) ??
        asEuroNumber(a.price) ??
        0;
      const bp =
        asEuroNumber(b.variants?.[0]?.price) ??
        asEuroNumber((b.variants || []).find((v) => v.available)?.price) ??
        asEuroNumber(b.price) ??
        0;
      return Math.abs(ap - firstPriceEUR) - Math.abs(bp - firstPriceEUR);
    });
    suggestions = filtered.slice(0, 2).map(productToSuggestion);
    suggestions.forEach((s) => {
      if (!s.reason) s.reason = "Populaire et complémentaire";
    });
  }

  return corsify(NextResponse.json({ suggestions }, { status: 200 }));
}

/* -------------------------------- OPTIONS -------------------------------- */
export async function OPTIONS() {
  return corsify(new NextResponse(null, { status: 204 }));
}
