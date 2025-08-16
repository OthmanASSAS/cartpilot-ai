// /Users/oassas/Projets/cartpilot-ai/src/components/ui/JsonViewerButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface JsonViewerButtonProps {
  jsonData: unknown; // Refined type
}

export function JsonViewerButton({ jsonData }: JsonViewerButtonProps) {
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const jsonContent = JSON.stringify(jsonData, null, 2);

  return (
    <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
      <Button variant="outline" size="sm" onClick={() => setShowJsonDialog(true)}>
        Voir JSON
      </Button>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Contenu JSON</DialogTitle>
          <DialogDescription>
            Contenu brut de l&#39;événement/snapshot/suggestion.
          </DialogDescription>
        </DialogHeader>
        <pre className="mt-4 p-4 bg-gray-100 rounded-md overflow-auto max-h-[60vh]">
          <code>{jsonContent}</code>
        </pre>
      </DialogContent>
    </Dialog>
  );
}
