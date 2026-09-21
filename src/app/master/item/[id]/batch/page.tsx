"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Batch history is shown hierarchically on the material detail page. */
export default function ItemBatchRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";

  useEffect(() => {
    if (id) router.replace(`/master/item/${id}`);
  }, [id, router]);

  return (
    <p className="p-6 text-sm text-muted-foreground">
      Mengalihkan ke detail material...
    </p>
  );
}
