import React, { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Plus } from "lucide-react";
import { BankConnection } from "../../types/api.types";
import { apiService } from "../../services/api.service";
import { BankConnectionTable } from "../../components/accounts/BankConnectionTable";
import { BankConnectionEmptyState } from "../../components/accounts/BankConnectionEmptyState";
import { AddBankConnectionModal } from "../../components/accounts/AddBankConnectionModal";

export function AccountsPage() {
  const [bankConnections, setBankConnections] = useState<BankConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const loadBankConnections = async () => {
      try {
        const response = await apiService.getBankConnections();
        setBankConnections(response.connections);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
      }
    };
    loadBankConnections();
  }, []);

  const handleAddBankConnection = () => {
    setShowAddModal(true);
  };

  const refreshBankConnections = async () => {
    try {
      const response = await apiService.getBankConnections();
      setBankConnections(response.connections);
    } catch (error) {
      console.error("Failed to refresh bank connections:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">
            Loading bank accounts...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3x1 font-bold tracking-tight">Bank Accounts</h1>
          <p className="text-muted-foreground">
            Manage your bank accounts and view your transactions.
          </p>
        </div>
        <Button className="gap-2" onClick={handleAddBankConnection}>
          <Plus className="h-4 w-4" />
          Add Bank Account
        </Button>
      </div>

      {bankConnections.length > 0 ? (
        <BankConnectionTable connections={bankConnections} />
      ) : (
        <BankConnectionEmptyState onAddConnection={handleAddBankConnection} />
      )}

      <AddBankConnectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refreshBankConnections}
      />
    </div>
  );
}
