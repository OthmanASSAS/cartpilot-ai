// /app/api/suggestions/route.ts
import { NextResponse, type NextRequest } from "next/server";

/** Autoriser uniquement ton domaine (ajouter le staging plus tard si besoin) */
const allowedOrigin = "https://soforino.com";

/* ------------------------ Types Shopify (simplifiés) ------------------------ */
type ShopifyVariant = {
  id: number | string;
  available?: boolean;
  price?: number | string; // "59.99" côté /products.json
};

type ShopifyProduct = {
  id: number | string;
  title: string;
  handle: string;
  image?: { src?: string };
  images?: Array<{ src?: string }>;
  variants?: ShopifyVariant[];
  price?: number | string; // parfois présent côté recommendations
};

type CartItem = {
  title?: string;
  quantity?: number;
  price?: number; // en cents (/cart.js)
  product_id?: number | string;
  variant_id?: number | string;
  id?: number | string; // parfois = variant_id
};

type Cart = {
  items: CartItem[];
  total_price?: number; // cents
  item_count?: number;
};

/* ---------------------- Types réponse widget / front ----------------------- */
export type Suggestion = {
  id: string;
  title: string;
  price?: number; // en euros
  reason?: string;
  handle?: string;
  image?: string;
  variant_id?: string; // présent si ajout direct possible (1 variante)
  has_multiple_variants?: boolean;
};

/* --------------------------------- Utils ---------------------------------- */
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
  return isObj(v) && Array.isArray((v as Record<string, unknown>).items);
}

/** Convertit "59.99" | 59.99 | undefined -> number (euros) */
function asEuroNumber(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Extrait la 1re image disponible */
function firstImage(p: ShopifyProduct): string | undefined {
  return p.image?.src || p.images?.[0]?.src || undefined;
}

/** Détermine la variant "ajoutable" et s'il y a plusieurs variantes */
function getVariantInfo(p: ShopifyProduct): {
  variantId?: string;
  hasMultiple: boolean;
} {
  const vars = p.variants || [];
  if (vars.length === 0) return { hasMultiple: false };
  if (vars.length === 1) {
    return { variantId: String(vars[0]?.id ?? ""), hasMultiple: false };
  }
  // plusieurs variantes → "Choisir" (pas d'ajout direct)
  const avail = vars.find((v) => v.available) || vars[0];
  return { variantId: String(avail?.id ?? ""), hasMultiple: true };
}

/** Transforme un produit Shopify en Suggestion */
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
  };
}

/** GET: stub simple pour test */
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

/* --------------------------- Collecte catalogue --------------------------- */

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
    const data: unknown = await r.json();
    if (Array.isArray(data)) return data as ShopifyProduct[];
    if (
      isObj(data) &&
      Array.isArray((data as { products?: unknown }).products)
    ) {
      return (data as { products: unknown }).products as ShopifyProduct[];
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
    const data: unknown = await r.json();
    if (
      isObj(data) &&
      Array.isArray((data as { products?: unknown }).products)
    ) {
      return (data as { products: unknown }).products as ShopifyProduct[];
    }
    return [];
  } catch {
    return [];
  }
}

/* --------------------------------- POST ---------------------------------- */
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
  const cart = body && isCart(body.cart) ? (body.cart as Cart) : undefined;
  const shopOrigin =
    body && typeof body.shopOrigin === "string" ? body.shopOrigin : undefined;

  if (!cart?.items || !shopOrigin) {
    return corsify(
      NextResponse.json(
        { error: "Missing cart or shopOrigin" },
        { status: 400 }
      )
    );
  }

  // Ensemble d'IDs produits déjà au panier (pour filtrer)
  const inCartProductIds = new Set(
    (cart.items || [])
      .map((i) => String(i.product_id || i.id || ""))
      .filter(Boolean)
  );

  // 1) Candidats via Shopify Recommendations par produit du panier
  const productIds = Array.from(inCartProductIds);
  const recsArrays = await Promise.all(
    productIds.map((pid) => fetchRecommendations(shopOrigin, pid))
  );
  let candidates: ShopifyProduct[] = recsArrays.flat();

  // 2) Fallback : lister des produits du shop si rien n'est revenu
  if (candidates.length === 0) {
    const all = await fetchAllProducts(shopOrigin);
    candidates = all;
  }

  // 3) Filtrer (pas déjà au panier) & dédupliquer par product.id
  const seen = new Set<string>();
  const filtered: ShopifyProduct[] = [];
  for (const p of candidates) {
    const pid = String(p.id);
    if (inCartProductIds.has(pid)) continue;
    if (seen.has(pid)) continue;
    seen.add(pid);
    filtered.push(p);
  }

  // 4) Si aucun candidat exploitable → mode mono (actions utilitaires)
  if (filtered.length === 0) {
    const first = cart.items[0];
    if (first) {
      const vId = String(first.variant_id || first.id || "");
      const title = String(first.title || "Produit");
      const qty = Number(first.quantity || 1); // ← on s'en sert dans la raison
      const suggestions: Suggestion[] = [
        {
          id: "add-one",
          title: `Ajoutez un ${title}`,
          reason: "Rechange ou cadeau",
          variant_id: vId,
        },
        {
          id: "to-three",
          title: "Passez au pack de 3",
          reason:
            qty < 3 ? `Passez de ${qty} à 3 unités` : "Économies immédiates",
          variant_id: vId,
        },
      ];
      const res = NextResponse.json({ suggestions });
      return corsify(res);
    }
    // Panier vide → rien
    return corsify(NextResponse.json({ suggestions: [] }));
  }

  // 5) Ordonnancement simple (proche en prix du 1er item du panier)
  const firstPriceEUR = (cart.items?.[0]?.price ?? 0) / 100;
  filtered.sort((a, b) => {
    const ap =
      asEuroNumber(
        a.variants?.[0]?.price ??
          a.variants?.find((v) => v.available)?.price ??
          a.price
      ) ?? 0;
    const bp =
      asEuroNumber(
        b.variants?.[0]?.price ??
          b.variants?.find((v) => v.available)?.price ??
          b.price
      ) ?? 0;
    return Math.abs(ap - firstPriceEUR) - Math.abs(bp - firstPriceEUR);
  });

  // 6) Construire 2 suggestions max (catalogue uniquement)
  const picked = filtered.slice(0, 2).map(productToSuggestion);

  const res = NextResponse.json({ suggestions: picked }, { status: 200 });
  return corsify(res);
}

/* -------------------------------- OPTIONS -------------------------------- */
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  return corsify(res);
}
