# Product Requirements Document (PRD)

## Golden Jewelers Memphis — Custom Jewelry Counter Estimator & Atelier Quoting Engine

**Document Version:** 2.1  
**Last Updated:** November 2026  
**Status:** In Production / Active Release  
**Platform Target:** Apple iPad (Touch-First Counter POS / Landscape & Portrait), Desktop & PWA  
**Target Repository:** `https://github.com/kevindean4779-oss/jewel_memphis.git`  
**Primary Industry:** High-End Custom Jewelry Retail, Hip-Hop Jewelry, Bespoke Medallions & Pendants

---

## 1. Executive Summary & Vision

### 1.1 Problem Statement
In custom jewelry retail (pendants, charm medallions, iced-out initials, logo crosses), providing on-the-spot quotes is traditionally slow, opaque, and prone to costly pricing errors:
1. **Slow Counter Quoting**: Sales associates frequently take 20–30 minutes or require the client to wait for a bench jeweler or CAD designer to quote a piece, causing customer drop-off.
2. **Volatile Precious Metal Markets**: Daily fluctuations in gold ($4,000+/oz), silver, and platinum create risk of selling at a loss or quoting outdated catalog prices.
3. **The "Budget Walk-Away" Dilemma**: When a quote exceeds a client's stated budget (e.g., initial quote is $2,100, but customer says *"I only have $1,500 to spend"*), sales associates often don't know which exact metal, stone grade, or backplate permutation hits $1,500 **without shrinking the piece's physical dimensions**.
4. **Scrap Price Shopping & Discretion**: Customers who see raw gram weights often try to negotiate based on raw scrap value rather than bespoke artisanal craftsmanship, casting labor, and diamond micro-setting.

### 1.2 Core Solution
**Golden Jewelers Memphis Custom Quoter** is an iPad-optimized, luxury counter application that calculates instant (<1 second), mathematically precise wholesale costs and retail prices based on:
- Live real-time market spot feeds for all precious metals (Gold, Silver, Platinum, Brass) and diamond/gem benchmarks.
- Interactive physical dimensions with dynamic volume, surface area, and density calculation.
- Guaranteed **Keystone 2.0x Double-Cost Pricing** (100% store profit markup) with protected minimum walk-away margin floors.
- **Fixed-Price Dimension-Locked Combination Matrix**: A dedicated engine that generates all metal, stone, coverage, and backplate options tailored to the customer's exact budget while strictly preserving the piece's physical dimensions.
- **Guided Step-by-Step Flow**: A progressive disclosure experience where only one step is visible at once, eliminating cognitive overload for both staff and customers.
- **Staff-Only Tap-to-Reveal Weight Masking**: Protects showroom margins from raw scrap price comparisons.

---

## 2. User Personas & Counter Workflows

| Persona | Role | Key Goals & Needs | System Pain Points Solved |
| :--- | :--- | :--- | :--- |
| **Marcus (Counter Sales Jeweler)** | Retail Sales Specialist | Close custom charm orders across the iPad counter in <3 minutes; protect 100% store markup; handle customer counter-offers smoothly. | Instant price updates on any change; 1-click Fixed Budget matrix; masked gram weight to prevent scrap haggling. |
| **Walk-In Client** | Retail Customer | Wants a custom medallion or initial charm; wants full transparency on gold karat and diamond choices; wants to visualize the size. | Interactive scale silhouette; visual stone clarity grades; crystal-clear 50% deposit and delivery payment schedule. |
| **Tony (Master Bench Caster)** | Workshop / Bench Jeweler | Needs accurate job tickets with metal casting specs, wax printing fees, CAD fees, stone counts, and total carats. | Printable workshop job ticket with complete wholesale cost breakdown, stone melee count, and casting loss allowances. |

---

## 3. Product Architecture & Progressive Step-by-Step Flow

The client-facing application is organized into a **5-step progressive disclosure flow** where **only one step is active and visible on the counter screen at a time**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Top Bar Contract (Brand & Actions)                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│             Real-Time Spot Price Ticker Bar (Metals & Diamond Benchmarks)              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [1. Dimensions] ─── [2. Base Metal] ─── [3. Stones] ─── [4. Quote] ─── [5. 3D CAD]   │
└────────────────────────────────────┬───────────────────────────────────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
    │    STEP 1    │          │    STEP 2    │          │    STEP 3    │
    │ Dimensions & │  ─────►  │ Base Metal & │  ─────►  │   Stones,    │
    │ Scale Box    │          │ Color Luster │          │ Setting & Bail│
    └──────────────┘          └──────────────┘          └──────────────┘
                                                               │
                                                               ▼
                                                        ┌──────────────┐
                                                        │    STEP 4    │
                                                        │ Master Quote │
                                                        │ & Fixed Matrix│
                                                        └──────────────┘
                                                               │
                                                               ▼
                                                        ┌──────────────┐
                                                        │    STEP 5    │
                                                        │ 3D CAD Studio│
                                                        │ & Sketch Cam │
                                                        └──────────────┘
```

### 3.1 Step 1: Dimensions & Physical Footprint
- **Counter Size Presets**: 1-click selection of standard retail sizes:
  - `1" × 1"` (Small Dainty Charm)
  - `1.5" × 1.5"` (Popular Medium Pendant)
  - `2" × 1"` (Vertical Dog Tag / Cross)
  - `2" × 2"` (Statement Charm / Customer Standard)
  - `2.5" × 2"` (Large Executive Medallion)
- **iPad Touch Steppers**: Large ($\ge 44\text{px}$) `+` and `−` tactile steppers:
  - Height / Length ($0.5"$ to $6.0"$, $0.25"$ increments)
  - Width ($0.5"$ to $6.0"$, $0.25"$ increments)
  - Depth / Casting Thickness ($1.5\text{mm}$ to $10.0\text{mm}$, $0.5\text{mm}$ increments)
- **Interactive Proportional Blueprint Silhouette**: Real-time proportional bounding box displaying scaled dimensions in both inches and metric millimeters ($2.0" = 50.8\text{mm}$).
- **Staff-Only Masked Weight**: Displays `•••• g` by default. Tap-to-reveal toggles between masked state and actual calculated casting weight (e.g. `~24.8g`) for staff discretion.
- **Navigation Action**: Single primary CTA: `Continue to Base Metal (Step 2) →`.

### 3.2 Step 2: Base Precious Metal & Color Luster
- **Metal Alloy Selection**:
  - `10KT Solid Gold`: 41.7% pure gold, high durability for daily wear.
  - `14KT Solid Gold`: 58.3% pure gold, rich warm color, atelier best seller.
  - `925 Sterling Silver`: Solid precious silver, rhodium dipped, high value.
  - `Platinum 950`: 95.0% pure platinum, ultra-dense heft, hypoallergenic.
  - `18KT Solid Gold`: 75.0% pure gold, premium European purity standard.
  - `Jewelers Brass`: Commercial display alloy, vermeil-ready.
- **Color Luster Switcher**:
  - Yellow Gold (Natural warm rich yellow)
  - White Gold (Bright rhodium-finished white)
  - Rose Gold (Copper-alloyed warm blush)
- **Navigation Actions**: `← Back to Dimensions` and `Continue to Stones & Setting (Step 3) →`.

### 3.3 Step 3: Diamonds, Stones & Backplate Architecture
- **Stone Brilliance Tiers**:
  - `Natural Earth Diamond`: VS-SI clarity, GH color, natural earth-mined brilliance.
  - `Certified Lab-Grown Diamond`: DEF color, VS clarity, 100% chemically identical carbon diamond.
  - `VVS1 D-Color Moissanite`: Incredible refractive fire, passes thermal diamond testers.
  - `5A Cubic Zirconia (CZ)`: Machine-cut faceted micro-pavé for accessible glamor.
  - `Plain High-Polish Mirror`: Solid precious metal surface without stones.
- **Pavé Coverage Density**:
  - *Top Face Pavé*: Front aesthetic surfaces (~120 stones for a $2" \times 2"$ build).
  - *Full 3D Bust Down*: Multi-directional micro-pavé setting including side borders and bezel (~180 stones).
- **Backplate Structure**:
  - *Honeycomb Breathing Grill*: Luxury open-cage breathing backplate (optimal weight and light transmission).
  - *Solid Mirror Backplate*: Heavy solid polished precious metal plate for maximum heft.
  - *Open Hollow Cavity*: Lightweight open back for cost optimization.
  - *Solid Plate + Laser Engraving*: Mirror plate with custom client text engraving.
- **Chain Bail Sizing**:
  - *Standard Loop* (chains up to 4mm)
  - *Medium Cuban Bail* (chains up to 8mm)
  - *Large Miami Cuban Bail* (heavy links up to 14mm)
  - *Iced Pavé Bail* (hand-set diamond pavé bail)
- **Navigation Actions**: `← Back to Base Metal` and `Generate Customer Quote (Step 4) →`.

### 3.4 Step 4: Certified Customer Quotation & Deal Maker
- **Customer Price Display**: Massive tabular gold figures (e.g. `$1,450 USD`).
- **Standard Retail Terms**:
  - `50% Deposit to Cast`: Immediate payment required to start 3D printing and casting ($725.00).
  - `Balance on Delivery`: Remaining balance collected upon finished delivery ($725.00).
- **Physical Specs Pill Summary**: Height/Width, Base Metal, Stone Grade, and Masked Weight.
- **Fixed-Price Dimension-Locked Matrix Trigger**: Large banner button:  
  *"Customer Stated a Fixed Budget? Lock Dimensions & Browse All Metal/Stone Builds"*.
- **Quick Counter-Assist**: Real-time counter input (e.g. `$1,500`) with instant match button.
- **Atelier Actions**: `Print Client Quote Sheet`, `Save Quote to History`, `Open 3D CAD Studio (Step 5)`.

### 3.5 Step 5: Atelier 3D CAD & Napkin Sketch Studio
- **Procedural 2D / 3D Canvas Viewport**:
  - Front 2D CAD drafting projection with millimeter scale grids.
  - 45° 3D Isometric projection with ray-cast metallic specular highlights.
  - Backplate Honeycomb Cage inspection view.
- **Napkin Sketch & Customer Photo Integration**:
  - Snap Device Camera directly across the counter.
  - Upload customer photo, sketch, or competitor reference from iPad camera roll.
- **Customer Monogram & Letter Parser**:
  - Automatically identifies letters, monograms (e.g. `"CEO"`, `"M"`, `"777"`), and motifs (cross, crown, wings, medallion) from custom text notes.
- **Download & Presentation**:
  - Save high-res PNG CAD rendering.
  - Full-screen client presentation mode for tablet demonstration.

---

## 4. Fixed-Price Dimension-Locked Combination Matrix

### 4.1 The Dimension Lock Rule
When a customer states a fixed budget (e.g. *"I have exactly $1,500"*), standard quoting software erroneously recommends shrinking the charm (e.g. from 2 inches down to 1.25 inches).  
**Under the Golden Jewelers Memphis rule, dimensions are strictly invariant:**
$$\Delta\text{Height} = 0, \quad \Delta\text{Width} = 0, \quad \Delta\text{Depth} = 0$$

Only material proportions change:
1. Base metal alloy ($10\text{K Gold} \leftrightarrow 14\text{K Gold} \leftrightarrow \text{Silver} \leftrightarrow \text{Platinum} \leftrightarrow \text{Brass}$)
2. Stone type ($\text{Natural Diamond} \leftrightarrow \text{Lab Diamond} \leftrightarrow \text{Moissanite} \leftrightarrow \text{CZ} \leftrightarrow \text{Plain}$)
3. Coverage density ($\text{Full 3D Bust Down} \leftrightarrow \text{Top Face Pavé}$)
4. Backplate cavity ($\text{Solid Plate} \leftrightarrow \text{Honeycomb Grill} \leftrightarrow \text{Open Cavity}$)

### 4.2 Multi-Permutation Matrix Generator
The engine evaluates all permutations of metals, stones, coverages, and backplates, computing the exact complete Keystone retail price for each permutation at the piece's locked dimensions.

### 4.3 5-Way Sorting Engine
Combinations are sortable by:
1. **Closest to Target Budget**: Minimum absolute difference: $|P_{\text{retail}} - \text{Budget}|$
2. **Price: Low to High**: Ascending retail price order.
3. **Price: High to Low**: Descending retail price order.
4. **Highest Metal Quality**: Prioritizes Platinum $\to$ 18K Gold $\to$ 14K Gold $\to$ 10K Gold $\to$ Silver $\to$ Brass.
5. **Highest Stone Quality**: Prioritizes Natural Diamonds $\to$ Lab-Grown Diamonds $\to$ Moissanite $\to$ CZ $\to$ Plain Polish.

### 4.4 1-Click "Select This Build"
Selecting any combination updates the active piece's materials instantly, updates the customer quote, and transitions the iPad interface to Step 4. **Dimensions remain 100% locked.**

---

## 5. Live Market Spot Pricing & Financial Cost Engine

### 5.1 Real-Time Metal Feeds
The system integrates real-time spot price feeds via `api.gold-api.com`:
- **Gold (XAU)**: Spot price per troy ounce (default benchmark: $4,070.00/oz).
- **Silver (XAG)**: Spot price per troy ounce (default benchmark: $52.00/oz).
- **Platinum (XPT)**: Spot price per troy ounce (default benchmark: $1,545.00/oz).
- **Jewelers Brass**: Standard base alloy rate ($0.08/g).

**Pure Gram Conversion Formula:**
$$\text{Price per Gram (Pure)} = \frac{\text{Spot Price per Troy Oz}}{31.1034768}$$

$$\text{Alloy Raw Cost per Gram} = \text{Price per Gram (Pure)} \times \text{Purity Ratio}$$

| Metal Alloy | Purity Ratio | Density ($\text{g/cm}^3$) |
| :--- | :--- | :--- |
| **Gold 10K** | 41.67% (0.4167) | $11.57$ |
| **Gold 14K** | 58.33% (0.5833) | $13.07$ |
| **Gold 18K** | 75.00% (0.7500) | $15.58$ |
| **Platinum 950** | 95.00% (0.9500) | $21.45$ |
| **Silver 925** | 92.50% (0.9250) | $10.36$ |
| **Jewelers Brass** | 0.00% (Base Metal) | $8.45$ |

### 5.2 Stone Wholesale Market Benchmarks
Wholesale stone market costs are indexed to commercial diamond district benchmarks:
- **Natural Earth Diamonds (VS-SI GH)**: $420.00 / \text{carat}$ (~$35.00 per 0.08ct stone)
- **Certified Lab-Grown Diamonds (DEF VS)**: $110.00 / \text{carat}$ (~$11.50 per stone)
- **Moissanite VVS1 D-Color**: $25.00 / \text{carat}$ (~$2.30 per stone)
- **5A Cubic Zirconia**: $0.07 / \text{piece}$

### 5.3 Complete Cost of Goods Sold (COGS) Formula
$$\text{Total COGS} = C_{\text{metal}} + C_{\text{making}} + C_{\text{labor}} + C_{\text{stones}} + C_{\text{setting}}$$

Where:
- $C_{\text{metal}} = \text{Cast Grams} \times (1 + \text{Refiner Loss \%}) \times \text{Alloy Gram Rate}$ (Default refiner fire loss: 9%)
- $C_{\text{making}} = \text{Cast Grams} \times \text{Alloy Gram Rate} \times \text{Making Charge \%}$ (Default standard: 20%)
- $C_{\text{labor}} = \text{CAD Fee (\$65)} + \text{Wax 3D Print Fee (\$35)} + \text{Casting Labor (\$40)} + \text{Polish/Finishing (\$45)}$
- $C_{\text{stones}} = \text{Stone Count} \times \text{Wholesale Stone Cost per Piece}$
- $C_{\text{setting}} = \text{Stone Count} \times \text{Setting Labor per Stone}$ ($1.25 to $1.85/stone)

### 5.4 Keystone 2.0x Retail Markup
$$\text{Retail Customer Price} = \text{Total COGS} \times \text{Target Markup (2.0x)}$$
- Yields a **100% store markup** (50% gross profit margin).
- Guaranteed protection against inflation and bench rework.

### 5.5 Minimum Walk-Away Margin Floor
$$\text{Walk-Away Floor Price} = \frac{\text{Total COGS}}{1 - \text{Minimum Margin \% (30\%)}}$$
- Prevents counter associates from negotiating below workshop break-even.

---

## 6. Staff Mode (Page 2) & Confidential Workshop Sheet

When sales staff tap the **"Workshop Cost Sheet"** header button, the interface transitions to confidential Page 2:

### 6.1 Workshop COGS Breakdown
- Raw Metal Alloy Cost ($)
- Making Charge Amount ($)
- Bench Fabrication Labor ($185 total for CAD, wax, casting, polish)
- Total Stones Wholesale Cost + Setting Labor ($)
- Store Net Profit ($) and Gross Margin (%)

### 6.2 Counter Deal Maker & Walk-Away Floor
- **Direct Acceptance Indicator**: If customer counter-offer is above the walk-away floor, a green approval banner confirms:  
  *"You Can Accept \$1,500 Directly! Gross profit: +\$520 (38% margin) without shrinking or downgrading."*
- **1-Click Lock**: Applies the negotiated price instantly.
- **Walk-Away Floor Warning**: If an offer is below 30% margin, the system blocks the price and offers 1-click material adjustments to hit the target price safely.

### 6.3 Printable Workshop Job Envelope
Prints a standard job envelope ticket for the caster and bench setter, detailing:
- Client Name & Contact Number
- Dimensions in inches and millimeters
- Exact alloy to cast (including gold color and karat)
- Total wax weight and expected metal casting weight in grams
- Stone melee count and carat weight
- Backplate cage specifications and bail link size

---

## 7. UI/UX Design Constitution & iPad Optimization

### 7.1 Anti-Slop Luxury Aesthetic
In accordance with high-end retail guidelines:
- **Zero-Pill Metadata**: No candy-colored pill capsules for plain text. Information is rendered as clean unboxed text with typographic bullet separators (`·`).
- **Tabular Figures (`tabular-nums`)**: All currency numbers and measurements use monospace tabular alignment to prevent layout jitter.
- **Refined Typography**:
  - Brand Display: *Playfair Display* (Editorial luxury serif).
  - Body & Controls: *Plus Jakarta Sans* (Clean, readable neo-grotesque sans).
  - Data & Telemetry: *JetBrains Mono* (High-precision monospace).
- **Color Distribution (60-30-10 Rule)**:
  - 60% Canvas: Clean alabaster white (`#F8FAFC`).
  - 30% Surfaces: Subtle card boundaries, hairline slate borders (`#E2E8F0`).
  - 10% Accents: Rich warm atelier gold (`#D4AF37` / `#B45309`) and deep midnight navy card (`#0B0F19`).

### 7.2 iPad Touch Constraints
- **44px–48px Touch Targets**: All steppers, buttons, swatches, and preset chips meet or exceed Apple Human Interface Guidelines for touch.
- **15% Floating Sticky Dock**: The aggregate height of the floating quote dock is strictly $\le 15\%$ of the tablet viewport height.
- **Viewport Lock**: Prevents accidental pinch-to-zoom or elastic overscroll bounce during rapid customer taps.

---

## 8. Technical Architecture & File Map

```
/
├── PRD.md                                 # Product Requirements Document
├── index.html                             # Web App Entry Point (SEO, Apple Web App Tags)
├── vite.config.ts                         # Vite Build Configuration
├── tsconfig.json                          # TypeScript Strict Configuration
├── package.json                           # Dependencies and scripts
└── src/
    ├── main.tsx                           # React 18 Root Mounting
    ├── App.tsx                            # Root Application & State Manager
    ├── index.css                          # Tailwind CSS & Typography Styles
    ├── types/
    │   └── jewelry.ts                     # TypeScript Schemas & Interfaces
    ├── utils/
    │   └── jewelryCalculations.ts         # Pure Mathematical Quoting Engine
    └── components/
        ├── CustomerFrontPage.tsx          # 5-Step Progressive Disclosure Quoter
        ├── StaffCalculationsPage.tsx      # Page 2: Confidential Workshop COGS
        ├── SpotPriceBar.tsx               # Real-Time Metal & Stone Spot Ticker
        ├── FixedBudgetMatrixModal.tsx     # Dimension-Locked Combination Matrix
        ├── VisualSketchSection.tsx        # Procedural 2D/3D Canvas & Camera Cam
        ├── PrintQuoteModal.tsx            # Printable Customer Quote Sheet
        ├── SettingsModal.tsx              # Workshop Bench Rates & Fees Editor
        └── SavedQuotesModal.tsx           # Customer Quote History & Retrieval
```

---

## 9. Quality Assurance & Verification Standards

1. **Strict Dimension Invariance**: Under no circumstances should the Fixed Budget Combination Matrix modify `heightInches`, `widthInches`, or `depthMm`.
2. **Double-Cost Keystone Invariance**: Base retail prices must always equal $\text{Total COGS} \times 2.0$.
3. **Hermetic Build Guarantee**: Zero external untrusted CDN dependencies; all styles compile via Tailwind CSS v4; 100% clean TypeScript build (`tsc --noEmit`).
4. **Zero Broken Imagery**: All visual components feature styled CSS/Canvas fallbacks.

---

## 10. Release History & Milestones

- **v1.0.0**: Initial custom charm cost estimator and basic gold spot calculator.
- **v1.5.0**: Added Page 2 Staff Calculations, Keystone 2.0x markup, and bench labor fees.
- **v2.0.0**: iPad touch-first counter overhaul, camera upload, and procedural 3D CAD engine.
- **v2.1.0 (Current)**:
  - Implementation of the **Fixed-Price Dimension-Locked Combination Matrix**.
  - Real-time spot pricing for **all metals** and **stone benchmarks** (Natural, Lab, Moissanite, CZ).
  - Division of the entire system into a **5-step progressive disclosure flow** where only one step is visible at once.
  - Full luxury atelier styling with zero-pill discipline and staff tap-to-reveal weight masking.

---

*Golden Jewelers Memphis — Precision Craftsmanship, Real-Time Market Transparency, Guaranteed Store Profitability.*
