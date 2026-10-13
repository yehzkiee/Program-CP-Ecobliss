"use client";

import { useMemo } from "react";
import { SearchableCombobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

type CustomerOption = {
  id: string;
  nama: string;
};

export function CustomerFilterCombobox({
  customers,
  value,
  onValueChange,
  className,
}: {
  customers: CustomerOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  const items = useMemo(
    () => [
      { value: "all", label: "Semua Customer" },
      ...customers.map((customer) => ({
        value: customer.id,
        label: customer.nama,
      })),
    ],
    [customers],
  );

  return (
    <div className={cn("min-w-0", className)}>
      <SearchableCombobox
        items={items}
        value={value || "all"}
        onValueChange={(next) => onValueChange(next || "all")}
        clearValueOnInput={false}
        filterItem={(item, query) => {
          if (item.value === "all") return true;
          return item.label.toLowerCase().includes(query.toLowerCase());
        }}
        placeholder="Semua Customer"
        emptyText="Tidak ada customer"
        itemNoun="customer"
        className="bg-white"
      />
    </div>
  );
}
