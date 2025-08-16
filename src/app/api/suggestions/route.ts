import { NextResponse } from "next/server";

const allowedOrigin = "https://soforino.com";

export async function POST(req: Request) {
  const { cart } = await req.json();
  console.log("[CartPilot] Cart reçu:", cart);

  // Construire un prompt simple pour Groq
  const prompt = `
  Voici le contenu du panier :
  ${cart.items.map((i: any) => `- ${i.title} (x${i.quantity})`).join("\n")}

  Suggère 2 produits complémentaires ou alternatifs, au format JSON :
  [{"id":"string","title":"string","price":number}]
  `;

  try {
    // ⚡ Exemple appel à l’API Groq
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // ou un autre modèle dispo
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 300,
        }),
      }
    );
    const groqData = await groqRes.json();
    const text = groqData.choices?.[0]?.message?.content?.trim() || "[]";

    let suggestions = [];
    try {
      suggestions = JSON.parse(text);
    } catch {
      suggestions = [];
    }

    const res = NextResponse.json({ suggestions });
    res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res;
  } catch (err) {
    console.error("[CartPilot] erreur Groq", err);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return res;
}
