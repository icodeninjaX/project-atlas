import { describe, expect, it } from "vitest";
import {
  centavosToPesoInput,
  formatCentavos,
  pesoInputToCentavos,
  signedPesoInputToCentavos,
} from "./money";

describe("money helpers", () => {
  it("stores a peso input as exact integer centavos", () => {
    expect(pesoInputToCentavos("1,250.50")).toBe(125_050);
  });

  it("rejects values with more than two decimal places", () => {
    expect(() => pesoInputToCentavos("12.345")).toThrow(
      "Enter a valid peso amount",
    );
  });

  it("accepts a negative balance while preserving exact centavos", () => {
    expect(signedPesoInputToCentavos("-1,250.50")).toBe(-125_050);
  });

  it("formats centavos in Philippine pesos", () => {
    expect(formatCentavos(125_050)).toBe("₱1,250.50");
  });

  it("converts centavos to an editable decimal value", () => {
    expect(centavosToPesoInput(125_050)).toBe("1250.50");
  });
});
