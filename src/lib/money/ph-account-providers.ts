export type PhilippineAccountProviderKind =
  "bank" | "digital_bank" | "e_wallet";

export type PhilippineAccountProvider = {
  id: string;
  displayName: string;
  legalName: string;
  kind: PhilippineAccountProviderKind;
  aliases: readonly string[];
  iconPath: string | null;
  brandColor: `#${string}`;
  iconStatus: "ready" | "official_asset_needed";
  officialUrl: string;
  source: "instapay_2026_07" | "bsp_emi_2026_05";
};

export const PHILIPPINE_ACCOUNT_PROVIDERS = [
  {
    id: "gcash",
    displayName: "GCash",
    legalName: "G-Xchange, Inc.",
    kind: "e_wallet",
    aliases: ["g cash", "g-xchange", "gxi"],
    iconPath: "/icons/gcash-official.png",
    brandColor: "#2F7DF4",
    iconStatus: "ready",
    officialUrl: "https://gcash.com/",
    source: "instapay_2026_07",
  },
  {
    id: "bpi",
    displayName: "BPI",
    legalName: "Bank of the Philippine Islands",
    kind: "bank",
    aliases: ["bank of the philippine islands"],
    iconPath: "/icons/ph-accounts/bpi.png",
    brandColor: "#B11116",
    iconStatus: "ready",
    officialUrl: "https://www.bpi.com.ph/",
    source: "instapay_2026_07",
  },
  {
    id: "bdo",
    displayName: "BDO",
    legalName: "BDO Unibank, Inc.",
    kind: "bank",
    aliases: ["bdo unibank"],
    iconPath: "/icons/ph-accounts/bdo.png",
    brandColor: "#0B4EA2",
    iconStatus: "ready",
    officialUrl: "https://www.bdo.com.ph/",
    source: "instapay_2026_07",
  },
  {
    id: "metrobank",
    displayName: "Metrobank",
    legalName: "Metropolitan Bank and Trust Company",
    kind: "bank",
    aliases: ["metropolitan bank", "mbtc"],
    iconPath: "/icons/ph-accounts/metrobank.png",
    brandColor: "#0066B3",
    iconStatus: "ready",
    officialUrl: "https://www.metrobank.com.ph/",
    source: "instapay_2026_07",
  },
  {
    id: "unionbank",
    displayName: "UnionBank",
    legalName: "Union Bank of the Philippines",
    kind: "bank",
    aliases: ["union bank", "ubp"],
    iconPath: "/icons/ph-accounts/unionbank.png",
    brandColor: "#F58220",
    iconStatus: "ready",
    officialUrl: "https://www.unionbankph.com/",
    source: "instapay_2026_07",
  },
  {
    id: "rcbc",
    displayName: "RCBC",
    legalName: "Rizal Commercial Banking Corporation",
    kind: "bank",
    aliases: ["rizal commercial banking corporation"],
    iconPath: "/icons/ph-accounts/rcbc.png",
    brandColor: "#0076A8",
    iconStatus: "ready",
    officialUrl: "https://www.rcbc.com/",
    source: "instapay_2026_07",
  },
  {
    id: "security-bank",
    displayName: "Security Bank",
    legalName: "Security Bank Corporation",
    kind: "bank",
    aliases: ["sbc"],
    iconPath: "/icons/ph-accounts/security-bank.png",
    brandColor: "#00529B",
    iconStatus: "ready",
    officialUrl: "https://www.securitybank.com/",
    source: "instapay_2026_07",
  },
  {
    id: "eastwest",
    displayName: "EastWest",
    legalName: "East West Banking Corporation",
    kind: "bank",
    aliases: ["eastwest bank", "east west bank"],
    iconPath: "/icons/ph-accounts/eastwest.png",
    brandColor: "#7A1B7E",
    iconStatus: "ready",
    officialUrl: "https://www.eastwestbanker.com/",
    source: "instapay_2026_07",
  },
  {
    id: "chinabank",
    displayName: "Chinabank",
    legalName: "China Banking Corporation",
    kind: "bank",
    aliases: ["china bank", "cbc"],
    iconPath: "/icons/ph-accounts/chinabank.png",
    brandColor: "#D71920",
    iconStatus: "ready",
    officialUrl: "https://www.chinabank.ph/",
    source: "instapay_2026_07",
  },
  {
    id: "pnb",
    displayName: "PNB",
    legalName: "Philippine National Bank",
    kind: "bank",
    aliases: ["philippine national bank"],
    iconPath: "/icons/ph-accounts/pnb.png",
    brandColor: "#003F87",
    iconStatus: "ready",
    officialUrl: "https://www.pnb.com.ph/",
    source: "instapay_2026_07",
  },
  {
    id: "landbank",
    displayName: "LANDBANK",
    legalName: "Land Bank of the Philippines",
    kind: "bank",
    aliases: ["land bank", "lbp"],
    iconPath: "/icons/ph-accounts/landbank.png",
    brandColor: "#00843D",
    iconStatus: "ready",
    officialUrl: "https://www.landbank.com/",
    source: "instapay_2026_07",
  },
  {
    id: "maya",
    displayName: "Maya Wallet",
    legalName: "Maya Philippines, Inc.",
    kind: "e_wallet",
    aliases: ["maya", "paymaya", "maya philippines"],
    iconPath: "/icons/ph-accounts/maya.png",
    brandColor: "#6BCB45",
    iconStatus: "ready",
    officialUrl: "https://www.maya.ph/",
    source: "bsp_emi_2026_05",
  },
  {
    id: "maya-bank",
    displayName: "Maya Bank",
    legalName: "Maya Bank, Inc.",
    kind: "digital_bank",
    aliases: ["maya savings"],
    iconPath: "/icons/ph-accounts/maya-bank.png",
    brandColor: "#6BCB45",
    iconStatus: "ready",
    officialUrl: "https://www.mayabank.ph/",
    source: "instapay_2026_07",
  },
  {
    id: "gotyme",
    displayName: "GoTyme Bank",
    legalName: "GoTyme Bank Corporation",
    kind: "digital_bank",
    aliases: ["gotyme", "go tyme"],
    iconPath: "/icons/ph-accounts/gotyme.png",
    brandColor: "#6AE4D8",
    iconStatus: "ready",
    officialUrl: "https://www.gotyme.com.ph/",
    source: "instapay_2026_07",
  },
  {
    id: "maribank",
    displayName: "MariBank",
    legalName: "MariBank Philippines Inc.",
    kind: "digital_bank",
    aliases: ["seabank", "mari bank"],
    iconPath: "/icons/ph-accounts/maribank.png",
    brandColor: "#EE4D2D",
    iconStatus: "ready",
    officialUrl: "https://www.maribank.ph/",
    source: "instapay_2026_07",
  },
  {
    id: "tonik",
    displayName: "Tonik",
    legalName: "Tonik Digital Bank, Inc.",
    kind: "digital_bank",
    aliases: ["tonik bank"],
    iconPath: "/icons/ph-accounts/tonik.png",
    brandColor: "#6E2C91",
    iconStatus: "ready",
    officialUrl: "https://tonikbank.com/",
    source: "instapay_2026_07",
  },
  {
    id: "uno-digital-bank",
    displayName: "UNO Digital Bank",
    legalName: "UNObank, Inc.",
    kind: "digital_bank",
    aliases: ["uno bank", "unobank"],
    iconPath: "/icons/ph-accounts/uno-digital-bank.png",
    brandColor: "#52247F",
    iconStatus: "ready",
    officialUrl: "https://www.uno.bank/",
    source: "instapay_2026_07",
  },
  {
    id: "cimb",
    displayName: "CIMB Bank PH",
    legalName: "CIMB Bank Philippines, Inc.",
    kind: "bank",
    aliases: ["cimb", "cimb philippines"],
    iconPath: "/icons/ph-accounts/cimb.png",
    brandColor: "#D71920",
    iconStatus: "ready",
    officialUrl: "https://www.cimbbank.com.ph/",
    source: "instapay_2026_07",
  },
  {
    id: "grabpay",
    displayName: "GrabPay",
    legalName: "Gpay Network PH, Inc.",
    kind: "e_wallet",
    aliases: ["grab pay", "gpay network"],
    iconPath: "/icons/ph-accounts/grabpay.png",
    brandColor: "#00B14F",
    iconStatus: "ready",
    officialUrl: "https://www.grab.com/ph/pay/",
    source: "instapay_2026_07",
  },
  {
    id: "shopeepay",
    displayName: "ShopeePay",
    legalName: "ShopeePay Philippines, Inc.",
    kind: "e_wallet",
    aliases: ["shopee pay"],
    iconPath: "/icons/ph-accounts/shopeepay.png",
    brandColor: "#EE4D2D",
    iconStatus: "ready",
    officialUrl: "https://shopeepay.com.ph/",
    source: "instapay_2026_07",
  },
  {
    id: "coins-ph",
    displayName: "Coins.ph",
    legalName: "DCPAY Philippines, Inc.",
    kind: "e_wallet",
    aliases: ["coins", "dc pay", "dcpay"],
    iconPath: "/icons/ph-accounts/coins-ph.png",
    brandColor: "#2F80ED",
    iconStatus: "ready",
    officialUrl: "https://www.coins.ph/",
    source: "instapay_2026_07",
  },
  {
    id: "palawanpay",
    displayName: "PalawanPay",
    legalName: "PPS-PEPP Financial Services Corp.",
    kind: "e_wallet",
    aliases: ["palawan pay", "pps-pepp"],
    iconPath: "/icons/ph-accounts/palawanpay.png",
    brandColor: "#1769AA",
    iconStatus: "ready",
    officialUrl: "https://www.palawanpay.com/",
    source: "instapay_2026_07",
  },
  {
    id: "bayad",
    displayName: "Bayad",
    legalName: "CIS Bayad Center, Inc.",
    kind: "e_wallet",
    aliases: ["bayad center", "cis bayad center"],
    iconPath: "/icons/ph-accounts/bayad.png",
    brandColor: "#F58220",
    iconStatus: "ready",
    officialUrl: "https://www.bayad.com/",
    source: "instapay_2026_07",
  },
  {
    id: "wise",
    displayName: "Wise",
    legalName: "Wise Pilipinas, Inc.",
    kind: "e_wallet",
    aliases: ["transferwise", "wise philippines", "wise pilipinas"],
    iconPath: "/icons/ph-accounts/wise.png",
    brandColor: "#9FE870",
    iconStatus: "ready",
    officialUrl: "https://wise.com/ph/",
    source: "instapay_2026_07",
  },
] as const satisfies readonly PhilippineAccountProvider[];

function normalizeProviderText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en-PH")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getPhilippineAccountProvider(providerId: string | null) {
  if (!providerId) return null;
  return (
    PHILIPPINE_ACCOUNT_PROVIDERS.find(
      (provider) => provider.id === providerId,
    ) ?? null
  );
}

export function isPhilippineAccountProviderId(value: string) {
  return getPhilippineAccountProvider(value) !== null;
}

export function matchPhilippineAccountProvider(value: string) {
  const query = normalizeProviderText(value);
  if (!query) return null;

  return (
    PHILIPPINE_ACCOUNT_PROVIDERS.find((provider) =>
      [
        provider.id,
        provider.displayName,
        provider.legalName,
        ...provider.aliases,
      ]
        .map(normalizeProviderText)
        .includes(query),
    ) ?? null
  );
}
