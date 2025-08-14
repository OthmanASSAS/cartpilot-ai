import { NextResponse } from "next/server";
import OpenAI from "openai";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Cart {
  items: CartItem[];
  total: number;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Configuration Groq avec OpenAI SDK
const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});

// Fallback local (gardé comme sécurité)
function getFallbackSuggestions(cart: Cart) {
  const suggestions = [
    {
      product_name: "Ceinture en cuir",
      reason: "Accessoire élégant pour compléter votre tenue",
      estimated_price: 35,
    },
    {
      product_name: "Chaussettes premium",
      reason: "Confort et style au quotidien",
      estimated_price: 18,
    },
    {
      product_name: "Sac de voyage",
      reason: "Pratique pour vos déplacements",
      estimated_price: 45,
    },
    {
      product_name: "Portefeuille RFID",
      reason: "Sécurité et élégance",
      estimated_price: 32,
    },
    {
      product_name: "Écharpe en laine",
      reason: "Chaleur et confort",
      estimated_price: 28,
    },
  ];

  const targetMin = cart.total * 0.1;
  const targetMax = cart.total * 0.5;

  return suggestions
    .filter(
      (s) => s.estimated_price >= targetMin && s.estimated_price <= targetMax
    )
    .slice(0, 2);
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  let provider = "groq";
  let model = "llama-3.1-8b-instant";
  let suggestions = [];
  let errorDetails: string | null = null;

  try {
    const body = await request.json();
    const { cart } = body as { cart?: Cart };

    console.log("[AI Agent] Request received:", {
      requestId,
      cartItems: cart?.items?.length || 0,
      cartTotal: cart?.total || 0,
      provider,
    });

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: "Cart is required and cannot be empty.",
        },
        { status: 400 }
      );
    }

    try {
      console.log("[AI Agent] Calling Groq API (Llama 3.1 8B)...");

      // Prompt optimisé pour Llama
      // Prompt optimisé pour Llama — sans \n errants dans les expressions
      const lines = cart.items
        .map((i) => `- ${i.name}: €${i.price}`)
        .join('\n');

      const min = Math.round(cart.total * 0.1);
      const max = Math.round(cart.total * 0.5);

      const prompt = [
        'Tu réponds en français. You are an e-commerce assistant.',
        'Based on this cart, suggest exactly 2 complementary products.',
        'Les produits doivent être en lien avec les produits sélectionnés et complémentaires.',
        '',
        'Current cart contains:',
        lines,
        `Total: €${cart.total}`,
        '',
        'Rules:',
        `- Each product should cost between €${min} and €${max}`,
        '- Be specific with product names',
        '- Keep reasons short (max 10 words)',
        '',
        'Return ONLY a JSON object with a "products" key like this, nothing else:',
        '{"products": [',
        '  {"product_name": "Product Name", "reason": "Short reason", "estimated_price": 25},',
        '  {"product_name": "Another Product", "reason": "Another reason", "estimated_price": 35}',
        ']}',
      ].join('\n');

      const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" }, // Force JSON
      });

      const content = completion.choices[0]?.message?.content;
      console.log("[AI Agent] Groq raw response:", content);

      if (content) {
        try {
          // Essayer de parser la réponse JSON
          const parsed = JSON.parse(content);

          // Gérer différents formats de réponse possibles
          if (parsed.products && Array.isArray(parsed.products)) {
            suggestions = parsed.products;
          } else if (Array.isArray(parsed)) {
            suggestions = parsed;
          } else {
            // Si le format est inattendu, créer des suggestions depuis l'objet
            suggestions = [parsed].filter((s) => s.product_name);
          }

          // Validation basique
          suggestions = suggestions
            .filter(
              (s: { product_name: any; reason: any; estimated_price: any }) =>
                s.product_name &&
                s.reason &&
                typeof s.estimated_price === "number"
            )
            .slice(0, 2);

          console.log("[AI Agent] Parsed suggestions:", suggestions);
        } catch (parseError) {
          console.error("[AI Agent] JSON parse error:", parseError);
          throw new Error("Invalid JSON response from Groq");
        }
      }

      if (!suggestions.length) {
        throw new Error("No valid suggestions generated");
      }

      // Calcul du coût approximatif
      const tokensUsed = completion.usage?.total_tokens || 0;
      const costUSD =
        (completion.usage?.prompt_tokens || 0) * 0.00005 +
        (completion.usage?.completion_tokens || 0) * 0.00008;

      console.log("[AI Agent] Groq success:", {
        tokensUsed,
        costUSD: costUSD.toFixed(6),
        responseTimeMs: Date.now() - startedAt,
      });
    } catch (groqError: any) {
      errorDetails = groqError?.message || "Groq API error";
      console.error("[AI Agent] Groq failed, using fallback:", {
        error: errorDetails,
        code: groqError?.code,
        requestId,
      });

      // Fallback local
      provider = "fallback";
      suggestions = getFallbackSuggestions(cart);
      console.log("[AI Agent] Using fallback suggestions:", suggestions);
    }

    const latencyMs = Date.now() - startedAt;

    console.log("[AI Agent] Request completed", {
      requestId,
      latencyMs,
      provider,
      model,
      suggestionsCount: suggestions.length,
    });

    return NextResponse.json({
      provider,
      model,
      response: { suggestions },
      ms: latencyMs,
      ...(provider === "fallback" && { fallbackReason: errorDetails }),
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startedAt;
    console.error("[AI Agent] Complete failure:", {
      requestId,
      latencyMs,
      error: err?.message,
    });

    return NextResponse.json(
      {
        error: "Service temporairement indisponible",
        details: err?.message || "Unknown error",
        requestId,
      },
      { status: 500 }
    );
  }
}
