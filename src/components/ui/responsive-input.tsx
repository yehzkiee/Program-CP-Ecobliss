"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

type ResponsiveInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "defaultValue"
> & {
  value: string | number;
  onChange: (value: string) => void;
};

/**
 * Input dengan state lokal: keystroke langsung terasa di UI,
 * sync ke parent lewat startTransition agar tabel/list di belakang
 * tidak memblokir pengetikan.
 */
function ResponsiveInput({
  value,
  onChange,
  onBlur,
  ...props
}: ResponsiveInputProps) {
  const external = value == null ? "" : String(value);
  const [local, setLocal] = React.useState(external);
  const [seen, setSeen] = React.useState(external);

  if (external !== seen) {
    setSeen(external);
    setLocal(external);
  }

  return (
    <Input
      {...props}
      value={local}
      onChange={(e) => {
        const next = e.target.value;
        setLocal(next);
        React.startTransition(() => {
          onChange(next);
        });
      }}
      onBlur={(e) => {
        if (local !== external) onChange(local);
        onBlur?.(e);
      }}
    />
  );
}

export { ResponsiveInput };
