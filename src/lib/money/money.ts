const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCentavos(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) {
    throw new Error("Money must be represented as integer centavos");
  }

  return phpFormatter.format(centavos / 100);
}

export function pesoInputToCentavos(value: string): number {
  const normalized = value.replaceAll(",", "").trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Enter a valid peso amount");
  }

  const [pesos, decimals = ""] = normalized.split(".");
  const centavos = Number(pesos) * 100 + Number(decimals.padEnd(2, "0"));

  if (!Number.isSafeInteger(centavos)) {
    throw new Error("Enter a valid peso amount");
  }

  return centavos;
}

export function signedPesoInputToCentavos(value: string): number {
  const normalized = value.replaceAll(",", "").trim();
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const centavos = pesoInputToCentavos(unsigned);

  return negative ? -centavos : centavos;
}

export function centavosToPesoInput(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) {
    throw new Error("Money must be represented as integer centavos");
  }

  return (centavos / 100).toFixed(2);
}
