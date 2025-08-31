import React from "react";
import { CheckCircle, AlertCircle, RefreshCw, Info } from "lucide-react";

interface BankConnectionStatusBadgeProps {
  status: string;
}

export function BankConnectionStatusBadge({
  status,
}: BankConnectionStatusBadgeProps) {
  switch (status) {
    case "AUTHORIZED":
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100
    text-green-800"
        >
          <CheckCircle className="h-3 w-3" />
          Connected
        </span>
      );
    case "CANCELLED":
    case "CLOSED":
    case "EXPIRED":
    case "INVALID":
    case "REVOKED":
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100
    text-red-800"
        >
          <AlertCircle className="h-3 w-3" />
          Error
        </span>
      );
    case "PENDING_AUTHORIZATION":
    case "RETURNED_FROM_BANK":
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100
    text-yellow-800"
        >
          <RefreshCw className="h-3 w-3 animate-spin" />
          Pending
        </span>
      );
    default:
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100
    text-gray-800"
        >
          <Info className="h-3 w-3" />
          Unknown
        </span>
      );
  }
}
