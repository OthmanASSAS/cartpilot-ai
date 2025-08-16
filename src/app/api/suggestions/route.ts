// /app/api/suggestions/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cartToken = searchParams.get('cart_token')

  console.log('[CartPilot] API hit with cart_token:', cartToken)

  //  Pour l’instant on renvoie du fake
  return NextResponse.json({
    suggestions: [
      { id: '1', title: 'Produit A', price: 19.99 },
      { id: '2', title: 'Produit B', price: 29.99 }
    ]
  })
}