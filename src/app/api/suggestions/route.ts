// /app/api/suggestions/route.ts
import { NextResponse } from "next/server";

const allowedOrigin = "https://soforino.com";

/* ------------ Types Shopify (simplifiés aux champs utilisés) ------------ */
type CartItem = {
  title: string;
  quantity: number;
  price: number; // en cents dans /cart.js
};

type Cart = {
  items: CartItem[];
  total_price?: number;
};

/* ---------------------- Types pour la réponse IA ----------------------- */
export type Suggestion = {
  id: string;
  title: string;
  price: number;
  reason?: string;
};

type GroqMessage = { role: "system" | "user" | "assistant"; content: string };
type GroqChoice = { message?: { content?: string } };
type GroqResponse = { choices?: GroqChoice[] };

/* ------------------------------ Utils --------------------------------- */
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

function normalizeSuggestions(input: unknown): Suggestion[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 2).map(
    (s): Suggestion => ({
      id: String((s as { id?: unknown }).id ?? ""),
      title: String((s as { title?: unknown }).title ?? "Produit recommandé"),
      price: (() => {
        const val = (s as { price?: unknown }).price;
        const n = typeof val === "number" ? val : Number(val);
        return Number.isFinite(n) ? n : 0;
      })(),
      reason: (() => {
        const val = (s as { reason?: unknown }).reason;
        return val != null ? String(val) : undefined;
      })(),
    })
  );
}

function extractJsonArray(text: string): unknown {
  const m = text.match(/\[[\s\S]*\]/);
  const json = m ? m[0] : text;
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

/* -------------------------------- GET --------------------------------- */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cartToken = searchParams.get("cart_token");
  console.log("[CartPilot] API hit with cart_token (GET):", cartToken);

  const res = NextResponse.json(
    {
      suggestions: [
        { id: "1", title: "Produit A", price: 19.99 },
        { id: "2", title: "Produit B", price: 29.99 },
      ],
    },
    { status: 200 }
  );
  return corsify(res);
}

/* -------------------------------- POST -------------------------------- */
export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return corsify(
      NextResponse.json(
        { error: "Server misconfigured: GROQ_API_KEY missing" },
        { status: 500 }
      )
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return corsify(
      NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    );
  }

  const cart = (body as { cart?: unknown })?.cart as Cart | undefined;
  if (!cart || !Array.isArray(cart.items)) {
    return corsify(
      NextResponse.json({ error: "Missing cart.items" }, { status: 400 })
    );
  }

  console.log("[CartPilot] Cart reçu:", {
    itemCount: cart.items.length,
    total_price: cart.total_price,
  });

  const itemsList = cart.items
    .map(
      (i: CartItem) =>
        `- ${i.title ?? "Unknown"} | qty:${i.quantity ?? 1} | price_cents:${
          i.price ?? 0
        }`
    )
    .join("\n");

  const userPrompt = `
Tu es un expert e-commerce. En te basant UNIQUEMENT sur le panier ci-dessous,
propose exactement 2 suggestions de produits complémentaires ou d'upsell.

PANIER:
${itemsList}

CONTRAINTES DE SORTIE IMPORTANTES:
- Réponds STRICTEMENT en JSON valide (UN tableau), sans texte autour.
- Format: [{"id":"string","title":"string","price":number,"reason":"string"}]
- "price" est un nombre en euros (ex: 29.99).
- "reason" explique brièvement la pertinence (<= 12 mots).
- N'invente pas de caractéristiques incompatibles (reste générique si doute).
- Si aucune idée pertinente, propose 2 best-sellers génériques.
`.trim();

  try {
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "Tu réponds uniquement en JSON valide, sans texte additionnel.",
            },
            { role: "user", content: userPrompt },
          ] as GroqMessage[],
          temperature: 0.5,
          max_tokens: 400,
        }),
      }
    );

    if (!groqRes.ok) {
      const txt = await groqRes.text().catch(() => "");
      console.error("[CartPilot] Groq HTTP error:", groqRes.status, txt);
      return corsify(NextResponse.json({ suggestions: [] }, { status: 502 }));
    }

    const groqData = (await groqRes.json()) as GroqResponse;
    const raw = groqData?.choices?.[0]?.message?.content ?? "[]";
    const parsed = extractJsonArray(raw);
    const suggestions = normalizeSuggestions(parsed);

    return corsify(NextResponse.json({ suggestions }, { status: 200 }));
  } catch (err) {
    console.error("[CartPilot] erreur Groq", err);
    return corsify(NextResponse.json({ suggestions: [] }, { status: 500 }));
  }
}

/* ------------------------------- OPTIONS ------------------------------- */
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  return corsify(res);
}
