'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lightbulb, DollarSign, PlusCircle, MinusCircle } from 'lucide-react';

// Définition des types pour la réponse de l'API
interface Suggestion {
  product_name: string;
  reason: string;
  estimated_price: number;
}

interface ApiResponse {
  provider: string;
  model: string;
  response: {
    suggestions: Suggestion[];
  };
  ms: number;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export function UpsellWidget() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { id: '1', name: 'T-shirt en coton bio', price: 25, quantity: 1 },
    { id: '2', name: 'Jean slim noir', price: 60, quantity: 1 },
  ]);

  const handleAddItem = () => {
    setCartItems([...cartItems, { id: String(Date.now()), name: '', price: 0, quantity: 1 }]);
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof CartItem, value: any) => {
    setCartItems(cartItems.map(item => 
      item.id === id ? { ...item, [field]: field === 'name' ? value : Number(value) } : item
    ));
  };

  const handleSuggestionClick = async (suggestion: Suggestion) => {
    try {
      const response = await fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'upsell_clicked',
          suggestion: suggestion,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to track click:', errorData);
      } else {
        console.log('Click tracked successfully:', suggestion.product_name);
      }
    } catch (error) {
      console.error('Error sending click tracking:', error);
    }
  };

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions(null);

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const currentCart = { items: cartItems, total };

    try {
      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cart: currentCart }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Une erreur est survenue lors de l'appel API.");
      }

      const data: ApiResponse = await response.json();
      setSuggestions(data.response.suggestions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-12 bg-gray-50 rounded-3xl my-8 shadow-lg">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          Testez notre Agent IA d'Upsell avec votre panier
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Ajoutez les produits de votre panier ci-dessous pour obtenir des suggestions personnalisées.
        </p>

        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md mb-8">
          <h3 className="text-xl font-semibold mb-4">Votre Panier Actuel</h3>
          <div className="space-y-4">
            {cartItems.map((item, index) => (
              <div key={item.id} className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor={`product-name-${item.id}`} className="sr-only">Nom du produit</Label>
                  <Input
                    id={`product-name-${item.id}`}
                    placeholder="Nom du produit"
                    value={item.name}
                    onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="w-24">
                  <Label htmlFor={`product-price-${item.id}`} className="sr-only">Prix</Label>
                  <Input
                    id={`product-price-${item.id}`}
                    type="number"
                    placeholder="Prix"
                    value={item.price}
                    onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                    className="w-full"
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="w-20">
                  <Label htmlFor={`product-qty-${item.id}`} className="sr-only">Quantité</Label>
                  <Input
                    id={`product-qty-${item.id}`}
                    type="number"
                    placeholder="Qté"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                    className="w-full"
                    min={1}
                    step="1"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <MinusCircle className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </div>
          <Button 
            onClick={handleAddItem} 
            variant="outline" 
            className="mt-4 w-full border-dashed border-2 border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un produit
          </Button>
        </div>

        <Button 
          onClick={handleGetSuggestions} 
          disabled={isLoading || cartItems.length === 0 || cartItems.some(item => !item.name || item.price <= 0 || item.quantity <= 0)}
          size="lg"
          className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold text-base px-6 py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 border-0"
        >
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération en cours...</>
          ) : (
            'Obtenir les suggestions IA'
          )}
        </Button>

        {error && (
          <div className="mt-8 p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg max-w-md mx-auto">
            <p className="font-bold">Erreur :</p>
            <p>{error}</p>
          </div>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="cursor-pointer"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <Card className="flex flex-col h-full">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-800">{suggestion.product_name}</CardTitle>
                    <CardDescription className="text-gray-600 flex items-center mt-2">
                      <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                      Prix estimé: {typeof suggestion.estimated_price === 'number' && Number.isFinite(suggestion.estimated_price) ? suggestion.estimated_price.toFixed(2) : '—'}€
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-gray-700 text-left flex items-start">
                      <Lightbulb className="h-5 w-5 mr-2 text-yellow-500 flex-shrink-0" />
                      {suggestion.reason}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        {suggestions && suggestions.length === 0 && !isLoading && (
          <div className="mt-8 p-4 bg-blue-100 text-blue-700 border border-blue-200 rounded-lg max-w-md mx-auto">
            <p>Aucune suggestion trouvée pour le moment. Essayez de nouveau plus tard.</p>
          </div>
        )}
      </div>
    </section>
  );
}