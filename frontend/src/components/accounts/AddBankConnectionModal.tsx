import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { BankSelect } from "../ui/bank-select";
import { X, AlertCircle } from "lucide-react";
import {
  BankConnectionInit,
  BankConnectionAuthInitResponse,
} from "../../types/api.types";
import { apiService } from "../../services/api.service";
import { SUPPORTED_COUNTRIES, getBankById } from "../../config/banks";

interface AddBankConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddBankConnectionModal({
  isOpen,
  onClose,
  onSuccess,
}: AddBankConnectionModalProps) {
  const [formData, setFormData] = useState({
    selectedBankId: "",
    selectedCountry: "IT", // Default to Italy
    access_type: "personal" as "personal" | "business",
    validity_hours: 24,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.selectedBankId) {
      setError("Please select a bank");
      return false;
    }
    if (!formData.selectedCountry) {
      setError("Please select a country");
      return false;
    }
    if (formData.validity_hours < 1 || formData.validity_hours > 168) {
      setError("Validity hours must be between 1 and 168 (7 days)");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    const selectedBank = getBankById(formData.selectedBankId);
    if (!selectedBank) {
      setError("Invalid bank selection");
      return;
    }

    const requestData: BankConnectionInit = {
      bank_name: selectedBank.name,
      bank_country: formData.selectedCountry,
      access_type: formData.access_type,
      validity_hours: formData.validity_hours,
      redirect_url: `https://localhost:3000/verify`,
    };

    setIsSubmitting(true);
    try {
      const response: BankConnectionAuthInitResponse =
        await apiService.createBankConnectionInit(requestData);

      if (response.url) {
        // Success - redirect user to bank authorization
        window.location.href = response.url;
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to initialize bank connection:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to connect to bank. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        selectedBankId: "",
        selectedCountry: "IT",
        access_type: "personal",
        validity_hours: 24,
      });
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Add Bank Account</CardTitle>
              <CardDescription>
                Connect your bank account to start importing transactions
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Country Selection */}
            <div className="space-y-2">
              <label htmlFor="country" className="text-sm font-medium">
                Country *
              </label>
              <Select
                value={formData.selectedCountry}
                onValueChange={(value) => {
                  handleInputChange("selectedCountry", value);
                  handleInputChange("selectedBankId", ""); // Reset bank selection when country changes
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <div className="flex items-center">
                        <span className="mr-2">{country.flag}</span>
                        {country.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bank Selection */}
            <div className="space-y-2">
              <label htmlFor="bank" className="text-sm font-medium">
                Bank *
              </label>
              <BankSelect
                value={formData.selectedBankId}
                onValueChange={(value) =>
                  handleInputChange("selectedBankId", value)
                }
                countryCode={formData.selectedCountry}
                disabled={isSubmitting}
                placeholder="Search and select your bank..."
              />
            </div>

            {/* Access Type */}
            <div className="space-y-2">
              <label htmlFor="access_type" className="text-sm font-medium">
                Account Type
              </label>
              <Select
                value={formData.access_type}
                onValueChange={(value: "personal" | "business") =>
                  handleInputChange("access_type", value)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal Account</SelectItem>
                  <SelectItem value="business">Business Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Validity Hours */}
            <div className="space-y-2">
              <label htmlFor="validity_hours" className="text-sm font-medium">
                Session Duration (hours)
              </label>
              <Input
                id="validity_hours"
                type="number"
                min="1"
                max="168"
                value={formData.validity_hours}
                onChange={(e) =>
                  handleInputChange(
                    "validity_hours",
                    parseInt(e.target.value) || 24,
                  )
                }
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                How long the bank connection session will remain active (1-168
                hours)
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Connecting..." : "Connect Bank"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
