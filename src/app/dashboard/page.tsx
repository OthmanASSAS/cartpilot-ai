// /Users/oassas/Projets/cartpilot-ai/src/app/dashboard/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JsonViewerButton } from "@/components/ui/JsonViewerButton"; // Import JsonViewerButton
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

interface Suggestion {
  product_name: string;
  reason: string;
  estimated_price: number;
}

interface AIResultPayload {
  provider: string;
  model?: string;
  response: {
    suggestions: Suggestion[];
  };
  err?: string;
  ms?: number;
  fallbackReason?: string;
}

export const dynamic = "force-dynamic";

const short = (s: string | null | undefined, n = 10) => {
  if (!s) return "N/A";
  if (s.length <= n) return s;
  return `${s.slice(0, n)}…${s.slice(-4)}`;
};

export default async function DashboardPage() {
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
                  <TableHead>Raw Body</TableHead>
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
                      <JsonViewerButton jsonData={event.rawBody} />
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
                  <TableHead>Raw Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartSnapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell>{short(snapshot.cartToken, 10)}</TableCell>
                    <TableCell>{snapshot.total.toFixed(2)}€</TableCell>
                    <TableCell>{(snapshot.items as Prisma.JsonValue as CartItem[]).length} items</TableCell>
                    <TableCell>{format(snapshot.createdAt, "dd/MM/yyyy HH:mm:ss")}</TableCell>
                    <TableCell>
                      <JsonViewerButton jsonData={snapshot.items} />
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
                <TableHead>Payload</TableHead>
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
                    {((log.payload as unknown) as AIResultPayload)?.response?.suggestions?.map((s) => s.product_name).join(", ") || "N/A"}
                  </TableCell>
                  <TableCell>{format(log.createdAt, "dd/MM/yyyy HH:mm:ss")}</TableCell>
                  <TableCell>
                    <JsonViewerButton jsonData={log.payload} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
