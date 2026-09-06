# Philippine Account Provider Catalog

Last researched: 2026-09-06

## Purpose

This file is the continuation point for turning **Add account** into a provider-first flow. A user should be able to choose a Philippine bank or wallet, receive its real icon and recommended card color automatically, then enter only the account-specific details and opening balance.

The catalog boundary is the **BSP/BancNet InstaPay participant list dated 31 July 2026**. It is a practical, regulator-backed definition of institutions that a Philippine user can plausibly add as a transferable bank or e-money account. It contains 95 participants: 22 universal/commercial banks, 20 thrift banks, 19 rural banks, 6 digital banks, and 28 non-bank EMIs.

This is not the same as every BSP-licensed institution. BSP reported 139 supervised banks in March 2026, while many smaller banks are not InstaPay participants. A later phase may add those institutions behind an expanded “More institutions” search.

## Product decision

### Proposed Add Account flow

1. Choose `Bank`, `Digital bank`, `E-wallet`, `Cash`, `Investment`, or `Other`.
2. For bank/digital-bank/e-wallet, show a searchable provider grid with logo, display name, and category.
3. Selecting a provider sets `provider_id`, suggested display name, institution/legal name, account type, icon, and card color.
4. Let the user override the account nickname (for example, “BPI Payroll”).
5. Ask for opening balance and save.
6. “Can’t find yours?” selects a generic icon and custom institution name.

### Data model addition

Add a nullable stable `provider_id` to accounts. Do not infer branding from the editable account name long-term.

```text
accounts.provider_id -> ph_account_providers.id
```

Suggested provider record:

```ts
type PhilippineAccountProvider = {
  id: string;
  displayName: string;
  legalName: string;
  kind: "bank" | "digital_bank" | "e_wallet";
  aliases: string[];
  iconPath: string | null;
  brandColor: string;
  iconStatus: "ready" | "official_asset_needed" | "generic_fallback";
  officialUrl: string | null;
  source: "instapay_2026_07" | "bsp_emi_2026_05";
};
```

### Icon contract

- Store approved icons in `public/icons/ph-accounts/<provider-id>.png` or `.svg`.
- Prefer a first-party app icon, brand kit, press kit, or logo from the provider’s official domain.
- Do not hotlink production icons. Record the exact source URL and retrieval date below when an asset is added.
- Preserve trademarks without recoloring or redrawing them.
- Normalize assets to a transparent or brand-colored 128 × 128 square master; render at 28–32 CSS pixels.
- Use the existing Lucide category icon until an official asset is verified.
- Do not ship scraped search-result thumbnails or unofficial logo-library copies.

## Priority rollout

### Wave 1 — common consumer providers

These are the first provider choices for the picker. All Wave 1 icons are now available locally as normalized PNG files.

| Provider ID        | Display name     | Kind         | Card color | Icon status | Planned/local icon                              | Official source                                                                                  |
| ------------------ | ---------------- | ------------ | ---------- | ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `gcash`            | GCash            | e_wallet     | `#2F7DF4`  | ready       | `public/icons/gcash-official.png`               | https://gcash.com/                                                                               |
| `bpi`              | BPI              | bank         | `#B11116`  | ready       | `public/icons/ph-accounts/bpi.png`              | https://www.bpi.com.ph/etc.clientlibs/bpi/clientlibs/clientlib-bpi-ph/resources/Android-Icon.png |
| `bdo`              | BDO              | bank         | `#0B4EA2`  | ready       | `public/icons/ph-accounts/bdo.png`              | https://www.bdo.com.ph/                                                                          |
| `metrobank`        | Metrobank        | bank         | `#0066B3`  | ready       | `public/icons/ph-accounts/metrobank.png`        | https://www.metrobank.com.ph/                                                                    |
| `unionbank`        | UnionBank        | bank         | `#F58220`  | ready       | `public/icons/ph-accounts/unionbank.png`        | https://www.unionbankph.com/                                                                     |
| `rcbc`             | RCBC             | bank         | `#0076A8`  | ready       | `public/icons/ph-accounts/rcbc.png`             | https://www.rcbc.com/                                                                            |
| `security-bank`    | Security Bank    | bank         | `#00529B`  | ready       | `public/icons/ph-accounts/security-bank.png`    | https://www.securitybank.com/                                                                    |
| `eastwest`         | EastWest         | bank         | `#7A1B7E`  | ready       | `public/icons/ph-accounts/eastwest.png`         | https://www.eastwestbanker.com/                                                                  |
| `chinabank`        | Chinabank        | bank         | `#D71920`  | ready       | `public/icons/ph-accounts/chinabank.png`        | https://www.chinabank.ph/                                                                        |
| `pnb`              | PNB              | bank         | `#003F87`  | ready       | `public/icons/ph-accounts/pnb.png`              | https://www.pnb.com.ph/                                                                          |
| `landbank`         | LANDBANK         | bank         | `#00843D`  | ready       | `public/icons/ph-accounts/landbank.png`         | https://www.landbank.com/                                                                        |
| `maya`             | Maya Wallet      | e_wallet     | `#6BCB45`  | ready       | `public/icons/ph-accounts/maya.png`             | https://www.maya.ph/                                                                             |
| `maya-bank`        | Maya Bank        | digital_bank | `#6BCB45`  | ready       | `public/icons/ph-accounts/maya-bank.png`        | https://www.mayabank.ph/                                                                         |
| `gotyme`           | GoTyme Bank      | digital_bank | `#6AE4D8`  | ready       | `public/icons/ph-accounts/gotyme.png`           | https://www.gotyme.com.ph/                                                                       |
| `maribank`         | MariBank         | digital_bank | `#EE4D2D`  | ready       | `public/icons/ph-accounts/maribank.png`         | https://www.maribank.ph/                                                                         |
| `tonik`            | Tonik            | digital_bank | `#6E2C91`  | ready       | `public/icons/ph-accounts/tonik.png`            | https://tonikbank.com/                                                                           |
| `uno-digital-bank` | UNO Digital Bank | digital_bank | `#52247F`  | ready       | `public/icons/ph-accounts/uno-digital-bank.png` | https://www.uno.bank/                                                                            |
| `cimb`             | CIMB Bank PH     | bank         | `#D71920`  | ready       | `public/icons/ph-accounts/cimb.png`             | https://www.cimbbank.com.ph/                                                                     |
| `grabpay`          | GrabPay          | e_wallet     | `#00B14F`  | ready       | `public/icons/ph-accounts/grabpay.png`          | https://www.grab.com/ph/pay/                                                                     |
| `shopeepay`        | ShopeePay        | e_wallet     | `#EE4D2D`  | ready       | `public/icons/ph-accounts/shopeepay.png`        | https://shopeepay.com.ph/                                                                        |
| `coins-ph`         | Coins.ph         | e_wallet     | `#2F80ED`  | ready       | `public/icons/ph-accounts/coins-ph.png`         | https://www.coins.ph/                                                                            |
| `palawanpay`       | PalawanPay       | e_wallet     | `#1769AA`  | ready       | `public/icons/ph-accounts/palawanpay.png`       | https://www.palawanpay.com/                                                                      |
| `bayad`            | Bayad            | e_wallet     | `#F58220`  | ready       | `public/icons/ph-accounts/bayad.png`            | https://www.bayad.com/                                                                           |
| `wise`             | Wise             | e_wallet     | `#9FE870`  | ready       | `public/icons/ph-accounts/wise.png`             | https://wise.com/ph/                                                                             |

Brand colors above are implementation starting points and must be checked against each provider’s current official asset before release.

## Full InstaPay-backed catalog

Every entry below gets a stable ID and planned icon path. `official_asset_needed` means use a generic category icon until the first-party asset is downloaded and reviewed.

### Universal and commercial banks — 22

| ID                        | Picker display name      | BSP/BancNet legal name                          | Icon path/status                                                  |
| ------------------------- | ------------------------ | ----------------------------------------------- | ----------------------------------------------------------------- |
| `aub`                     | AUB                      | Asia United Bank Corporation                    | `ph-accounts/aub.png` — official_asset_needed                     |
| `bank-of-china-hk-manila` | Bank of China            | Bank of China (Hong Kong) Limited-Manila Branch | `ph-accounts/bank-of-china-hk-manila.png` — official_asset_needed |
| `bankcom`                 | BankCom                  | Bank of Commerce                                | `ph-accounts/bankcom.png` — official_asset_needed                 |
| `bpi`                     | BPI                      | Bank of the Philippine Islands                  | `ph-accounts/bpi.png` — ready                                     |
| `bdo`                     | BDO                      | BDO Unibank, Inc.                               | `ph-accounts/bdo.png` — official_asset_needed                     |
| `chinabank`               | Chinabank                | China Banking Corporation                       | `ph-accounts/chinabank.png` — official_asset_needed               |
| `cimb`                    | CIMB Bank PH             | CIMB Bank Philippines, Inc.                     | `ph-accounts/cimb.png` — official_asset_needed                    |
| `ctbc`                    | CTBC Bank PH             | CTBC Bank (Philippines) Corporation             | `ph-accounts/ctbc.png` — official_asset_needed                    |
| `dbp`                     | DBP                      | Development Bank of the Philippines             | `ph-accounts/dbp.png` — official_asset_needed                     |
| `eastwest`                | EastWest                 | East West Banking Corporation                   | `ph-accounts/eastwest.png` — official_asset_needed                |
| `landbank`                | LANDBANK                 | Land Bank of the Philippines                    | `ph-accounts/landbank.png` — official_asset_needed                |
| `maybank-ph`              | Maybank Philippines      | Maybank Philippines, Inc.                       | `ph-accounts/maybank-ph.png` — official_asset_needed              |
| `metrobank`               | Metrobank                | Metropolitan Bank and Trust Company             | `ph-accounts/metrobank.png` — official_asset_needed               |
| `pbcom`                   | PBCOM                    | Philippine Bank of Communications               | `ph-accounts/pbcom.png` — official_asset_needed                   |
| `pnb`                     | PNB                      | Philippine National Bank                        | `ph-accounts/pnb.png` — official_asset_needed                     |
| `philtrust`               | Philtrust Bank           | Philippine Trust Company                        | `ph-accounts/philtrust.png` — official_asset_needed               |
| `veterans-bank`           | Philippine Veterans Bank | Philippine Veterans Bank                        | `ph-accounts/veterans-bank.png` — official_asset_needed           |
| `rcbc`                    | RCBC                     | Rizal Commercial Banking Corporation            | `ph-accounts/rcbc.png` — official_asset_needed                    |
| `security-bank`           | Security Bank            | Security Bank Corporation                       | `ph-accounts/security-bank.png` — official_asset_needed           |
| `standard-chartered-ph`   | Standard Chartered PH    | Standard Chartered Bank                         | `ph-accounts/standard-chartered-ph.png` — official_asset_needed   |
| `hsbc-ph`                 | HSBC Philippines         | The Hongkong and Shanghai Banking Corporation   | `ph-accounts/hsbc-ph.png` — official_asset_needed                 |
| `unionbank`               | UnionBank                | Union Bank of the Philippines                   | `ph-accounts/unionbank.png` — official_asset_needed               |

### Thrift banks — 20

| ID                       | Picker display name      | BSP/BancNet legal name                                        | Icon path/status                                                 |
| ------------------------ | ------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `allbank`                | AllBank                  | AllBank (A Thrift Bank), Inc.                                 | `ph-accounts/allbank.png` — official_asset_needed                |
| `bdo-network-bank`       | BDO Network Bank         | BDO Network Bank, Inc.                                        | `ph-accounts/bdo-network-bank.png` — official_asset_needed       |
| `bpi-banko`              | BPI BanKo                | BPI Direct BanKo, Inc., A Savings Bank                        | `ph-accounts/bpi-banko.png` — official_asset_needed              |
| `card-sme-bank`          | CARD SME Bank            | Card SME Bank Inc., A Thrift Bank                             | `ph-accounts/card-sme-bank.png` — official_asset_needed          |
| `chinabank-savings`      | Chinabank Savings        | China Bank Savings, Inc.                                      | `ph-accounts/chinabank-savings.png` — official_asset_needed      |
| `city-savings-bank`      | CitySavings              | City Savings Bank, Inc.                                       | `ph-accounts/city-savings-bank.png` — official_asset_needed      |
| `equicom-savings`        | Equicom Savings Bank     | Equicom Savings Bank, Inc.                                    | `ph-accounts/equicom-savings.png` — official_asset_needed        |
| `isla-bank`              | ISLA Bank                | ISLA Bank (A Thrift Bank), Inc.                               | `ph-accounts/isla-bank.png` — official_asset_needed              |
| `legazpi-savings`        | Legazpi Savings Bank     | Legazpi Savings Bank, Inc.                                    | `ph-accounts/legazpi-savings.png` — official_asset_needed        |
| `malayan-savings`        | Malayan Savings Bank     | Malayan Savings Bank, Inc.                                    | `ph-accounts/malayan-savings.png` — official_asset_needed        |
| `pacific-ace-savings`    | Pacific Ace Savings Bank | Pacific Ace Savings Bank, Inc.                                | `ph-accounts/pacific-ace-savings.png` — official_asset_needed    |
| `pbb`                    | Philippine Business Bank | Philippine Business Bank, Inc., A Savings Bank                | `ph-accounts/pbb.png` — official_asset_needed                    |
| `psbank`                 | PSBank                   | Philippine Savings Bank                                       | `ph-accounts/psbank.png` — official_asset_needed                 |
| `producers-bank`         | Producers Bank           | Producers Savings Bank Corporation                            | `ph-accounts/producers-bank.png` — official_asset_needed         |
| `queenbank`              | Queenbank                | Queen City Development Bank, Inc. or Queenbank, A Thrift Bank | `ph-accounts/queenbank.png` — official_asset_needed              |
| `sterling-bank-asia`     | Sterling Bank of Asia    | Sterling Bank of Asia, Inc. (A Savings Bank)                  | `ph-accounts/sterling-bank-asia.png` — official_asset_needed     |
| `sun-savings-bank`       | Sun Savings Bank         | Sun Savings Bank, Inc.                                        | `ph-accounts/sun-savings-bank.png` — official_asset_needed       |
| `wealthbank`             | WealthBank               | Wealth Development Bank Corporation                           | `ph-accounts/wealthbank.png` — official_asset_needed             |
| `luzon-development-bank` | Luzon Development Bank   | Luzon Development Bank                                        | `ph-accounts/luzon-development-bank.png` — official_asset_needed |
| `ucpb-savings`           | UCPB Savings Bank        | UCPB Savings Bank                                             | `ph-accounts/ucpb-savings.png` — official_asset_needed           |

### Rural banks — 19

| ID                          | Picker display name                    | BSP/BancNet legal name                               | Icon path/status                                                    |
| --------------------------- | -------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| `bayanihan-bank`            | Bayanihan Bank                         | Bayanihan Bank, Inc.                                 | `ph-accounts/bayanihan-bank.png` — official_asset_needed            |
| `camalig-bank`              | Camalig Bank                           | Camalig Bank, Inc. (A Rural Bank)                    | `ph-accounts/camalig-bank.png` — official_asset_needed              |
| `cantilan-bank`             | Cantilan Bank                          | Cantilan Bank, Inc. (A Rural Bank)                   | `ph-accounts/cantilan-bank.png` — official_asset_needed             |
| `card-bank`                 | CARD Bank                              | Card Bank, Inc. (A Microfinance-Oriented Rural Bank) | `ph-accounts/card-bank.png` — official_asset_needed                 |
| `card-mri-rizal-bank`       | CARD MRI Rizal Bank                    | CARD MRI Rizal Bank, Inc.                            | `ph-accounts/card-mri-rizal-bank.png` — official_asset_needed       |
| `cebuana-lhuillier-bank`    | Cebuana Lhuillier Bank                 | Cebuana Lhuillier Rural Bank, Inc.                   | `ph-accounts/cebuana-lhuillier-bank.png` — official_asset_needed    |
| `dungganon-bank`            | Dungganon Bank                         | Dungganon Bank (A Microfinance Rural Bank), Inc.     | `ph-accounts/dungganon-bank.png` — official_asset_needed            |
| `eastwest-rural-bank`       | EastWest Rural Bank                    | East West Rural Bank, Inc.                           | `ph-accounts/eastwest-rural-bank.png` — official_asset_needed       |
| `mindanao-cooperative-bank` | Mindanao Consolidated Cooperative Bank | Mindanao Consolidated Cooperative Bank               | `ph-accounts/mindanao-cooperative-bank.png` — official_asset_needed |
| `netbank`                   | Netbank                                | Netbank (A Rural Bank), Inc.                         | `ph-accounts/netbank.png` — official_asset_needed                   |
| `ownbank`                   | OwnBank                                | Own Bank, The Rural Bank of Cavite City, Inc.        | `ph-accounts/ownbank.png` — official_asset_needed                   |
| `rangay-bank`               | Rang-Ay Bank                           | Rang-Ay Bank, Inc. (A Rural Bank)                    | `ph-accounts/rangay-bank.png` — official_asset_needed               |
| `rural-bank-guinobatan`     | Rural Bank of Guinobatan               | Rural Bank of Guinobatan, Inc.                       | `ph-accounts/rural-bank-guinobatan.png` — official_asset_needed     |
| `southeast-country-bank`    | Southeast Country Bank                 | Southeast Country Bank, Inc. (A Rural Bank)          | `ph-accounts/southeast-country-bank.png` — official_asset_needed    |
| `bangko-mabuhay`            | Bangko Mabuhay                         | Bangko Mabuhay (A Rural Bank), Inc.                  | `ph-accounts/bangko-mabuhay.png` — official_asset_needed            |
| `entrepreneur-rural-bank`   | Entrepreneur Rural Bank                | Entrepreneur Rural Bank, Inc.                        | `ph-accounts/entrepreneur-rural-bank.png` — official_asset_needed   |
| `quezon-capital-rural-bank` | Quezon Capital Rural Bank              | Quezon Capital Rural Bank, Inc.                      | `ph-accounts/quezon-capital-rural-bank.png` — official_asset_needed |
| `rural-bank-apalit`         | Rural Bank of Apalit                   | Rural Bank of Apalit, Inc.                           | `ph-accounts/rural-bank-apalit.png` — official_asset_needed         |
| `vbri`                      | Vigan Banco Rural                      | Vigan Banco Rural, Incorporada (VBRI)                | `ph-accounts/vbri.png` — official_asset_needed                      |

### Digital banks — 6

| ID                 | Picker display name | BSP/BancNet legal name    | Icon path/status                                           |
| ------------------ | ------------------- | ------------------------- | ---------------------------------------------------------- |
| `gotyme`           | GoTyme Bank         | GoTyme Bank Corporation   | `ph-accounts/gotyme.png` — official_asset_needed           |
| `maribank`         | MariBank            | MariBank Philippines Inc. | `ph-accounts/maribank.png` — official_asset_needed         |
| `maya-bank`        | Maya Bank           | Maya Bank, Inc.           | `ph-accounts/maya-bank.png` — official_asset_needed        |
| `tonik`            | Tonik               | Tonik Digital Bank, Inc.  | `ph-accounts/tonik.png` — official_asset_needed            |
| `uniondigital`     | UnionDigital Bank   | Union Digital Bank        | `ph-accounts/uniondigital.png` — official_asset_needed     |
| `uno-digital-bank` | UNO Digital Bank    | UNObank, Inc.             | `ph-accounts/uno-digital-bank.png` — official_asset_needed |

### Non-bank e-money issuers — 28

| ID                    | Picker display name       | BSP/BancNet legal name                            | Icon path/status                                              |
| --------------------- | ------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| `bayad`               | Bayad                     | CIS Bayad Center, Inc.                            | `ph-accounts/bayad.png` — official_asset_needed               |
| `coins-ph`            | Coins.ph                  | DCPAY Philippines, Inc.                           | `ph-accounts/coins-ph.png` — official_asset_needed            |
| `easypay-global`      | Easypay Global            | Easypay Global EMI Corporation                    | `ph-accounts/easypay-global.png` — official_asset_needed      |
| `ecashpay-asia`       | Ecashpay Asia             | Ecashpay Asia, Inc.                               | `ph-accounts/ecashpay-asia.png` — official_asset_needed       |
| `grabpay`             | GrabPay                   | Gpay Network PH, Inc.                             | `ph-accounts/grabpay.png` — official_asset_needed             |
| `gcash`               | GCash                     | G-Xchange, Inc.                                   | `gcash-official.png` — ready                                  |
| `infoserve`           | Nationlink / Infoserve    | Infoserve, Inc.                                   | `ph-accounts/infoserve.png` — official_asset_needed           |
| `iremit`              | iRemit                    | I-Remit, Inc.                                     | `ph-accounts/iremit.png` — official_asset_needed              |
| `lulu-money`          | LuLu Money                | Lulu Financial Services (Phils.), Inc.            | `ph-accounts/lulu-money.png` — official_asset_needed          |
| `marcopay`            | MarCoPay                  | MarcoPay, Inc.                                    | `ph-accounts/marcopay.png` — official_asset_needed            |
| `maya`                | Maya Wallet               | Maya Philippines, Inc.                            | `ph-accounts/maya.png` — official_asset_needed                |
| `omnipay`             | OmniPay                   | OmniPay, Inc.                                     | `ph-accounts/omnipay.png` — official_asset_needed             |
| `paymongo`            | PayMongo                  | PayMongo Payments, Inc.                           | `ph-accounts/paymongo.png` — official_asset_needed            |
| `paynamics`           | Paynamics                 | Paynamics Technologies, Inc.                      | `ph-accounts/paynamics.png` — official_asset_needed           |
| `bizmoto`             | Bizmoto                   | Peppermint Bizmoto Inc.                           | `ph-accounts/bizmoto.png` — official_asset_needed             |
| `pdax`                | PDAX                      | Philippine Digital Asset Exchange, Inc.           | `ph-accounts/pdax.png` — official_asset_needed                |
| `palawanpay`          | PalawanPay                | PPS-PEPP Financial Services Corp.                 | `ph-accounts/palawanpay.png` — official_asset_needed          |
| `shopeepay`           | ShopeePay                 | ShopeePay Philippines, Inc.                       | `ph-accounts/shopeepay.png` — official_asset_needed           |
| `speedypay`           | SpeedyPay                 | SpeedyPay, Inc.                                   | `ph-accounts/speedypay.png` — official_asset_needed           |
| `starpay`             | Starpay                   | StarPay Corporation                               | `ph-accounts/starpay.png` — official_asset_needed             |
| `tayocash`            | TayoCash                  | TayoCash, Inc.                                    | `ph-accounts/tayocash.png` — official_asset_needed            |
| `toktokwallet`        | Toktokwallet              | Toktokwallet, Inc.                                | `ph-accounts/toktokwallet.png` — official_asset_needed        |
| `topjuan`             | TopJuan                   | TopJuan Tech Corporation                          | `ph-accounts/topjuan.png` — official_asset_needed             |
| `toyota-financial-ph` | Toyota Financial Services | Toyota Financial Services Philippines Corporation | `ph-accounts/toyota-financial-ph.png` — official_asset_needed |
| `traxionpay`          | TraXionPay                | Traxion Pay, Inc.                                 | `ph-accounts/traxionpay.png` — official_asset_needed          |
| `ussc`                | USSC                      | USSC Money Services, Inc.                         | `ph-accounts/ussc.png` — official_asset_needed                |
| `wise`                | Wise                      | Wise Pilipinas, Inc.                              | `ph-accounts/wise.png` — official_asset_needed                |
| `alipay-ph`           | Alipay Philippines        | Alipay Philippines, Inc.                          | `ph-accounts/alipay-ph.png` — official_asset_needed           |

## Important source reconciliation

- The July 2026 InstaPay list is the picker’s canonical availability source because it is newer and directly represents transfer participants.
- The BSP EMI directory dated 31 May 2026 is broader for licensing. It includes licensed EMIs that are not in the InstaPay list and provides legal-name confirmation.
- `Maya Wallet` and `Maya Bank` must remain separate provider IDs because the regulated entities and account types differ even though the consumer brand is shared.
- `UnionBank` and `UnionDigital`, `BDO` and `BDO Network Bank`, `BPI` and `BPI BanKo`, and `Chinabank` and `Chinabank Savings` are separate picker choices.
- Some entries are receiver-only. Keep them searchable but optionally label transfer capability later; it does not affect manual balance tracking.

## Acquired icon ledger

| Provider         | Local file                                      | Verified source                                                                                  | Retrieved  | Review notes                                                                                        |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------- |
| GCash            | `public/icons/gcash-official.png`               | https://cdn.prod.website-files.com/6385b55675a0bd614777a5c1/64265cd252f7516ad684940c_Webclip.png | 2026-09-06 | Official 256 × 256 GCash website webclip; visually checked in the live account card.                |
| BPI              | `public/icons/ph-accounts/bpi.png`              | https://www.bpi.com.ph/etc.clientlibs/bpi/clientlibs/clientlib-bpi-ph/resources/Android-Icon.png | 2026-09-06 | Official 196 × 196 transparent gold crest from BPI's website icon declarations; visually inspected. |
| BDO              | `public/icons/ph-accounts/bdo.png`              | https://www.bdo.com.ph/favicon.ico                                                               | 2026-09-06 | First-party site icon.                                                                              |
| Metrobank        | `public/icons/ph-accounts/metrobank.png`        | https://play.google.com/store/apps/details?id=ph.com.metrobank.mcc.mbonline                      | 2026-09-06 | Official app listing published by Metropolitan Bank & Trust Company.                                |
| UnionBank        | `public/icons/ph-accounts/unionbank.png`        | https://play.google.com/store/apps/details?id=com.unionbankph.online                             | 2026-09-06 | Official app listing published by Union Bank of the Philippines.                                    |
| RCBC             | `public/icons/ph-accounts/rcbc.png`             | https://www.rcbc.com/uploads/media/RCBC-Logo-(1x1).png                                           | 2026-09-06 | First-party square logo asset.                                                                      |
| Security Bank    | `public/icons/ph-accounts/security-bank.png`    | https://play.google.com/store/apps/details?id=com.securitybank.bbx                               | 2026-09-06 | Official app listing published by Security Bank Corporation.                                        |
| EastWest         | `public/icons/ph-accounts/eastwest.png`         | https://play.google.com/store/apps/details?id=com.eastwest.mobile.dxp                            | 2026-09-06 | Official EasyWay listing published by East West Banking Corporation.                                |
| Chinabank        | `public/icons/ph-accounts/chinabank.png`        | https://www.chinabank.ph/favicon.ico                                                             | 2026-09-06 | First-party site icon.                                                                              |
| PNB              | `public/icons/ph-accounts/pnb.png`              | https://www.pnb.com.ph/favicon.ico                                                               | 2026-09-06 | First-party site icon.                                                                              |
| LANDBANK         | `public/icons/ph-accounts/landbank.png`         | https://play.google.com/store/apps/details?id=com.landbank.mobilebanking                         | 2026-09-06 | Official app listing published by Land Bank of the Philippines.                                     |
| Maya Wallet      | `public/icons/ph-accounts/maya.png`             | https://play.google.com/store/apps/details?id=com.paymaya                                        | 2026-09-06 | Official app listing published by Maya Philippines, Inc.                                            |
| Maya Bank        | `public/icons/ph-accounts/maya-bank.png`        | https://play.google.com/store/apps/details?id=com.paymaya                                        | 2026-09-06 | Maya's official app represents both Wallet and Bank products.                                       |
| GoTyme Bank      | `public/icons/ph-accounts/gotyme.png`           | https://www.gotyme.com.ph/static-assets/images/favicon.ico                                       | 2026-09-06 | First-party site icon.                                                                              |
| MariBank         | `public/icons/ph-accounts/maribank.png`         | https://play.google.com/store/apps/details?id=ph.seabank.seabank                                 | 2026-09-06 | Official MariBank listing; it retains the former SeaBank package ID.                                |
| Tonik            | `public/icons/ph-accounts/tonik.png`            | https://tonikbank.com/sites/default/files/favicon_0.ico                                          | 2026-09-06 | First-party site icon.                                                                              |
| UNO Digital Bank | `public/icons/ph-accounts/uno-digital-bank.png` | https://play.google.com/store/apps/details?id=com.iexceed.unoConsumerBanking                     | 2026-09-06 | Official UNO Digital Bank app listing.                                                              |
| CIMB Bank PH     | `public/icons/ph-accounts/cimb.png`             | https://www.cimbbank.com.ph/content/dam/cimb/favicon/apple-touch-icon-152x152.png                | 2026-09-06 | First-party touch icon.                                                                             |
| GrabPay          | `public/icons/ph-accounts/grabpay.png`          | https://www.grab.com/favicon.ico                                                                 | 2026-09-06 | First-party Grab icon used for GrabPay.                                                             |
| ShopeePay        | `public/icons/ph-accounts/shopeepay.png`        | https://play.google.com/store/apps/details?id=com.shopee.ph                                      | 2026-09-06 | Official Shopee PH app icon; ShopeePay is provided within the app.                                  |
| Coins.ph         | `public/icons/ph-accounts/coins-ph.png`         | https://static.pro.coins.xyz/resource/static_web/logo/favicon.ico                                | 2026-09-06 | First-party Coins product CDN icon.                                                                 |
| PalawanPay       | `public/icons/ph-accounts/palawanpay.png`       | https://www.palawanpay.com/wp-content/uploads/2026/05/cropped-PPAYNavBarLogo-2-192x192.png       | 2026-09-06 | First-party square site icon.                                                                       |
| Bayad            | `public/icons/ph-accounts/bayad.png`            | https://www.bayad.com/src/images/bayad-icon.png                                                  | 2026-09-06 | First-party site icon.                                                                              |
| Wise             | `public/icons/ph-accounts/wise.png`             | https://wise.com/public-resources/assets/icons/wise-personal/android_chrome_256x256.png          | 2026-09-06 | First-party Wise Personal Android icon.                                                             |

All files were normalized to 256 × 256 PNG canvases using contain-fit and transparent padding. The logo artwork itself was not redrawn or recolored. Provider trademarks remain the property of their respective owners and are used only for account identification.

## Continuation checklist

### Phase A — provider registry

- [x] Add `src/lib/money/ph-account-providers.ts` with Wave 1 providers and aliases.
- [x] Add the nullable `provider_id` migration and expose it through the balance view.
- [x] Generate TypeScript database types from the migrated ProjectAtlas schema.
- [x] Preserve all existing accounts with `provider_id = null`.
- [x] Backfill GCash only when account name is an exact normalized match; do not auto-brand ambiguous custom names.

### Phase B — icon acquisition

- [x] Create `public/icons/ph-accounts/`.
- [x] Acquire Wave 1 icons from first-party sites or verified official-publisher app listings and record source URLs, retrieval date, and trademark notes in this file.
- [x] Normalize files without altering logos.
- [x] Add a verification test ensuring every `ready` provider icon exists and has a PNG signature.

### Phase C — Add Account UI

- [x] Replace the initial raw account-type select with category tiles.
- [x] Add provider search with aliases (`BPI`, `Bank of the Philippine Islands`, etc.).
- [x] Show a two- or three-column logo grid that remains usable at 320 CSS pixels.
- [x] Add “Custom bank/wallet” fallback.
- [x] Preview the resulting wallet card before Save.
- [x] Keep keyboard navigation, visible focus, labelled controls, and minimum mobile tap targets.

### Phase D — rendering and editing

- [ ] Render cards from `provider_id`, not editable display name.
- [ ] Keep current type-based color and Lucide icon fallback.
- [ ] Allow changing provider during Edit with a warning that branding will change but transactions will not.
- [ ] Add tests for BPI, GCash, Maya Wallet vs Maya Bank, custom provider, unknown legacy account, and deleted/missing icon fallback.

### Phase E — expansion

- [ ] Complete official icons for the remaining InstaPay catalog in category-sized batches.
- [ ] Reconcile the catalog with each newer BSP/BancNet participant release.
- [ ] Consider the remaining BSP-supervised non-InstaPay banks only after the 95-provider picker is stable.

## Primary sources

- Bangko Sentral ng Pilipinas / BancNet, “InstaPay ACH Participants,” as of 31 July 2026: https://www.bsp.gov.ph/PaymentAndSettlement/Instapay%20Participants.pdf
- Bangko Sentral ng Pilipinas, “List of BSP Supervised Electronic Money Issuers (EMIs),” as of 31 May 2026: https://www.bsp.gov.ph/Lists/Directories/Attachments/7/emi.pdf
- Bangko Sentral ng Pilipinas, “Banks with Electronic Banking Facilities,” updated 16 June 2026: https://www.bsp.gov.ph/Statistics/Banking%20Statistics/Physical%20Network/1.2_data.aspx
- GCash official website and first-party web icon source: https://gcash.com/
- BPI official website: https://www.bpi.com.ph/
- BDO official website: https://www.bdo.com.ph/
- GoTyme Bank official website: https://www.gotyme.com.ph/
- Maya official website: https://www.maya.ph/

## Stopping point

The regulated provider universe, stable IDs, display/legal-name mapping, icon path contract, Wave 1 priorities, and implementation sequence are documented. The next useful unit of work is **Phase A plus the Wave 1 icon batch**, not another broad provider search.
