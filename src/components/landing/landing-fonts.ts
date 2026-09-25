import { Instrument_Serif } from "next/font/google";

// Editorial accent used only by the landing page's italic display lines.
export const landingSerif = Instrument_Serif({
  variable: "--font-landing-serif",
  weight: "400",
  style: ["italic"],
  subsets: ["latin"],
  display: "swap",
});
