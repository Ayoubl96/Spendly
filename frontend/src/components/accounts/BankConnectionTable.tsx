import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Landmark, MoreHorizontal } from "lucide-react";
import { BankConnection } from "../../types/api.types";
import { BankConnectionStatusBadge } from "./BankConnectionStatusBadge";

interface BankConnectionTableProps {
  connections: BankConnection[];
}

export function BankConnectionTable({ connections }: BankConnectionTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>
          {connections.length} bank account{connections.length !== 1 ? "s" : ""}{" "}
          connected
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Bank
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Country
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Session Expires At
                </th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {connections.map((connection) => (
                <tr key={connection.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Landmark className="w-4 h-4 text-primary" />
                      </div>
                      <div className="font-medium">{connection.bank_name}</div>
                      {connection.bank_code && (
                        <div className="text-sm text-muted-foreground">
                          {connection.bank_code.slice(-4)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {connection.country_code}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <BankConnectionStatusBadge status={connection.status} />
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {connection.token_expires_at
                      ? new Date(connection.token_expires_at).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
