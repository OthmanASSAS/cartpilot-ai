// /app/api/suggestions/route.ts
import { NextResponse } from 'next/server'

const allowedOrigin = 'https://soforino.com' //  sécuriser au domaine précis

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cartToken = searchParams.get('cart_token')

  console.log('[CartPilot] API hit with cart_token:', cartToken)

  const res = NextResponse.json({
    suggestions: [
      { id: '1', title: 'Produit A', price: 19.99 },
      { id: '2', title: 'Produit B', price: 29.99 }
    ]
  })

  //  ajoute les headers CORS
  res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  return res
}

// Pour gérer les preflight requests (OPTIONS)
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 })
  res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}