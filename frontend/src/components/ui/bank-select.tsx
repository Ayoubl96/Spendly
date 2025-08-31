import React, { useState } from "react";
import { Check, ChevronDown, Search, Building2 } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "../../lib/utils";
import { BankConfig, getBanksByCountry } from "../../config/banks";

interface BankSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  countryCode: string;
  disabled?: boolean;
  placeholder?: string;
}

export function BankSelect({
  value,
  onValueChange,
  countryCode,
  disabled,
  placeholder = "Select a bank",
}: BankSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const availableBanks = getBanksByCountry(countryCode);
  const selectedBank = availableBanks.find((bank) => bank.id === value);

  const filteredBanks = availableBanks.filter(
    (bank) =>
      bank.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bank.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const handleSelect = (bankId: string) => {
    onValueChange(bankId);
    setIsOpen(false);
    setSearchQuery("");
  };

  if (!countryCode) {
    return (
      <Button
        variant="outline"
        disabled
        className="w-full justify-start text-muted-foreground"
      >
        <Building2 className="mr-2 h-2 w-4" />
        Please select a country
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className="w-full justify-between"
        disabled={disabled || availableBanks.length === 0}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedBank ? (
          <div className="flex items-ceter">
            {selectedBank.logo && (
              <img
                src={selectedBank.logo}
                alt={selectedBank.name}
                className="mr-2 h-4 w-4 rounded-sm object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <Building2
              className={cn("mr-2 h-4 w-4", selectedBank.logo && "hidden")}
            />
            <span>{selectedBank.displayName}</span>
          </div>
        ) : (
          <div className="flex items-center text-muted-foreground">
            <Building2 className="mr-2 h-4 w-4" />
            {availableBanks.length === 0 ? "No banks available" : placeholder}
          </div>
        )}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {isOpen && availableBanks.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-me">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search banks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-auto">
            {filteredBanks.length === 0 ? (
              <div className="px-5 py-2 text-sm text-muted-foreground">
                No banks found
              </div>
            ) : (
              filteredBanks.map((bank) => (
                <Button
                  key={bank.id}
                  className="w-full px-5 py-2 text-left text-sm text-accent-foreground flex items-center bg-slate-50 hover:bg-slate-100 my-2"
                  onClick={() => handleSelect(bank.id)}
                >
                  <Building2
                    className={cn("mr-3 h-4 w-4", bank.logo && "hidden")}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{bank.displayName}</div>
                    <div className="text-xs">{bank.code}</div>
                  </div>
                  {value === bank.id && <Check className="ml-2 h-4 w-4" />}
                </Button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
