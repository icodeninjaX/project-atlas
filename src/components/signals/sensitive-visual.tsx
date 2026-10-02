"use client";

import type { ReactNode } from "react";
import { usePrivacyMode } from "@/components/privacy/privacy-provider";

/**
 * A chart drawn from sensitive figures. While privacy mode hides values,
 * it shows `hidden` instead, so bar lengths and changes do not reveal the
 * proportions the masked figures would.
 */
export function SensitiveVisual({
  sensitive,
  hidden = null,
  children,
}: {
  sensitive: boolean;
  hidden?: ReactNode;
  children: ReactNode;
}) {
  const { hidden: masked } = usePrivacyMode();
  return sensitive && masked ? hidden : children;
}
