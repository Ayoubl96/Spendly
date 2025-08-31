import React from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Landmark, Plus } from "lucide-react";

interface BankConnectionEmptyStateProps {
  onAddConnection: () => void;
}

export function BankConnectionEmptyState({
  onAddConnection,
}: BankConnectionEmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <Landmark className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No accounts connected</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your accounts to start tracking your spending.
          </p>
          <Button className="gap-2" onClick={onAddConnection}>
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
