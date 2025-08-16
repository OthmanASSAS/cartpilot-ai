// /Users/oassas/Projets/cartpilot-ai/src/app/dashboard/page.tsx
"use client"; // Add use client directive
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"; // Import Dialog components
import { Button } from "@/components/ui/button"; // Import Button
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { useState } from "react"; // Import useState

export const dynamic = "force-dynamic";

const short = (s: string | null | undefined, n = 10) => {
  if (!s) return "N/A";
  if (s.length <= n) return s;
  return `${s.slice(0, n)}…${s.slice(-4)}`;
};

export default async function DashboardPage() {
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [jsonContent, setJsonContent] = useState("");

  const webhookEvents = await prisma.webhookEvent.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    select: { id: true, topic: true, hmacValid: true, createdAt: true, webhookId: true, shop: true, rawBody: true },
  });

  const cartSnapshots = await prisma.cartSnapshot.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    select: { id: true, cartToken: true, total: true, items: true, createdAt: true },
  });

  const suggestionLogs = await prisma.suggestionLog.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    select: { id: true, requestId: true, cartToken: true, provider: true, model: true, createdAt: true, payload: true },
  });

  const handleViewJson = (content: any) => {
    setJsonContent(JSON.stringify(content, null, 2));
    setShowJsonDialog(true);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Tableau de Bord Ops</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Derniers Webhook Events</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>HMAC Valide</TableHead>
                  <TableHead>Webhook ID</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Reçu le</TableHead>
                  <TableHead>Raw Body</TableHead> {/* New column for Raw Body */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhookEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{event.topic}</TableCell>
                    <TableCell>{event.hmacValid ? "Oui" : "Non"}</TableCell>
                    <TableCell>{short(event.webhookId, 12)}</TableCell>
                    <TableCell>{event.shop ?? "N/A"}</TableCell>
                    <TableCell>{format(event.createdAt, "dd/MM/yyyy HH:mm:ss")}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewJson(event.rawBody)}>
                        Voir JSON
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Derniers Cart Snapshots</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token Panier</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Raw Items</TableHead> {/* New column for Raw Items */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartSnapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell>{short(snapshot.cartToken, 10)}</TableCell>
                    <TableCell>{snapshot.total.toFixed(2)}€</TableCell>
                    <TableCell>{(snapshot.items as any).length} items</TableCell>
                    <TableCell>{format(snapshot.createdAt, "dd/MM/yyyy HH:mm:ss")}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewJson(snapshot.items)}>
                        Voir JSON
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dernières Suggestions IA</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requête ID</TableHead>
                <TableHead>Token Panier</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Modèle</TableHead>
                <TableHead>Suggestions</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead>Payload</TableHead> {/* New column for Payload */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestionLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{short(log.requestId, 12)}</TableCell>
                  <TableCell>{short(log.cartToken, 10)}</TableCell>
                  <TableCell>{log.provider}</TableCell>
                  <TableCell>{log.model ?? "N/A"}</TableCell>
                  <TableCell>
                    {(log.payload as any)?.response?.suggestions?.map((s: any) => s.product_name).join(", ") || "N/A"}
                  </TableCell>
                  <TableCell>{format(log.createdAt, "dd/MM/yyyy HH:mm:ss")}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleViewJson(log.payload)}>
                      Voir JSON
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Contenu JSON</DialogTitle>
            <DialogDescription>
              Contenu brut de l'événement/snapshot/suggestion.
            </DialogDescription>
          </DialogHeader>
          <pre className="mt-4 p-4 bg-gray-100 rounded-md overflow-auto max-h-[60vh]">
            <code>{jsonContent}</code>
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
