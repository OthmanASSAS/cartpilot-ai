'use client';

import { Card, CardContent, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
      </div>

      <p className="text-lg text-gray-700 mb-8">
        Bienvenue, Utilisateur !
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder for other metrics */}
        <Card className="p-4">
          <CardTitle className="text-xl font-semibold mb-2">Métriques Clés</CardTitle>
          <CardContent>
            <p>Nombre de requêtes IA : N/A</p>
            <p>Taux de clic (CTR) : N/A</p>
            <p>Latence moyenne : N/A</p>
            <p className="text-sm text-gray-500 mt-2">Ces métriques seront disponibles prochainement.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
