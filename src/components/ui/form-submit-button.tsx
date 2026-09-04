"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function FormSubmitButton({
  pendingLabel,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "pending" | "type">) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      pending={pending}
      pendingLabel={pendingLabel}
      {...props}
    />
  );
}
