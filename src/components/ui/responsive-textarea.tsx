"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";

type ResponsiveTextareaProps = Omit<
  React.ComponentProps<typeof Textarea>,
  "value" | "onChange" | "defaultValue"
> & {
  value: string;
  onChange: (value: string) => void;
};

/** Textarea lokal + startTransition — pengetikan tidak memblokir tree induk. */
function ResponsiveTextarea({
  value,
  onChange,
  onBlur,
  ...props
}: ResponsiveTextareaProps) {
  const external = value ?? "";
  const [local, setLocal] = React.useState(external);
  const [seen, setSeen] = React.useState(external);

  if (external !== seen) {
    setSeen(external);
    setLocal(external);
  }

  return (
    <Textarea
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

export { ResponsiveTextarea };
