import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { LeadSource } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, boutique, urlShopify, consent, source } = body ?? {};

    if (!email || !boutique) {
      return NextResponse.json(
        { error: "Email et nom de boutique requis" },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.upsert({
      where: { email },
      update: {
        boutiqueName: boutique,
        shopUrl: urlShopify ?? null,
        consent: Boolean(consent),
        source: (source as LeadSource) ?? LeadSource.LANDING,
      },
      create: {
        email,
        boutiqueName: boutique,
        shopUrl: urlShopify ?? null,
        consent: Boolean(consent),
        source: (source as LeadSource) ?? LeadSource.LANDING,
      },
    });

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (error) {
    console.error("/api/leads POST error", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
