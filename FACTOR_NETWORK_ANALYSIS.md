# Factor Relationship Network - Analysis & Improvement Strategy

## What It Currently Does (And Why It's Unclear)

The factor relationship network visualizes how different factors/variables in a scenario prediction influence each other. However, it's currently **too abstract and lacks context**.

### Current Issues:

1. **No Labels** — Nodes show factor names but no descriptions of what they measure
2. **No Edge Labels** — Lines connecting factors don't show relationship strength or type
3. **No Legend** — Users don't know what colors/sizes mean
4. **No Interactivity** — Clicking nodes doesn't reveal details
5. **No Context** — Network appears without explanation of its relevance to the prediction
6. **Generic Data** — Shows synthetic relationships, not actual causal chains from the scenario

---

## What It SHOULD Do (Improved Version)

### 1. **Causal Chain Visualization**
Instead of generic factor relationships, show the **actual causal chain** from the prediction:

```
User Question: "If a product raises its price, how will customers react?"

CAUSAL CHAIN:
Price Increase → Customer Sentiment ↓ → Purchase Intent ↓ → Revenue Impact
     ↓                    ↓                      ↓                  ↓
  [+15%]            [-45% positive]        [-30% likely]      [-$2.5M/quarter]
```

**Improvement:** Each node shows the predicted impact (% change, confidence score)

---

### 2. **Interactive Node Details**
Clicking any node reveals:
- **Definition** — What this factor measures
- **Current Value** — Baseline state
- **Predicted Change** — How it changes in the scenario
- **Confidence** — How certain the model is (0-100%)
- **Dependencies** — What factors influence it
- **Influenced By** — What it influences

Example:
```
NODE: Customer Sentiment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Definition: Overall perception of brand/product among target customers
Current Value: 72% positive (baseline)
Predicted Change: -45% → 27% positive
Confidence: 87%
Time to Change: 2-4 weeks

Influenced By:
  • Price Change (+15%) — Strong negative correlation
  • Product Quality (stable) — No change
  • Competitor Actions (unknown) — Weak influence

Influences:
  • Purchase Intent (strong)
  • Brand Loyalty (medium)
  • Word-of-Mouth (medium)
```

---

### 3. **Relationship Edge Labels**
Show what type of relationship exists between factors:

```
Positive Correlation (→)  : Factor A increases, Factor B increases
Negative Correlation (⊣)  : Factor A increases, Factor B decreases
Causal (→→)               : Factor A causes Factor B
Correlated (↔)            : Factors move together
Strength: 0.1 (weak) to 1.0 (strong)
```

Example:
```
Price Increase ⊣ Customer Sentiment (strength: 0.85)
```

---

### 4. **Sensitivity Analysis Integration**
Show how sensitive the outcome is to each factor:

```
SENSITIVITY ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Factor                    Impact on Revenue    Sensitivity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Price Change              ████████░░ 85%       CRITICAL
Customer Sentiment        ██████░░░░ 62%       HIGH
Competitor Response       ████░░░░░░ 45%       MEDIUM
Market Conditions         ███░░░░░░░ 32%       LOW
Brand Loyalty            ██░░░░░░░░ 18%       LOW
```

**Improvement:** Users can see which factors matter most for the outcome

---

### 5. **Scenario Comparison Mode**
Show how the network changes across different scenarios:

```
SCENARIO 1: Price +15%
Customer Sentiment: -45%
Revenue Impact: -$2.5M

SCENARIO 2: Price +10%
Customer Sentiment: -28%
Revenue Impact: -$1.2M

SCENARIO 3: Price +20%
Customer Sentiment: -62%
Revenue Impact: -$4.1M
```

**Improvement:** Users can see how sensitive predictions are to parameter changes

---

### 6. **Export & Drill-Down**
- **Export as CSV** — Download factor relationships and values
- **Drill-down** — Click any factor to see sub-factors (e.g., "Customer Sentiment" → "Price Sensitivity", "Brand Perception", "Product Quality")
- **Timeline** — Show how factors evolve over time (week 1 → week 4)

---

## Implementation Roadmap

### Phase 1 (Quick Win - 2 hours)
- [x] Add node labels with factor descriptions
- [x] Add edge labels showing relationship strength
- [x] Add legend explaining colors/sizes
- [ ] Add hover tooltips with factor details

### Phase 2 (Core - 4 hours)
- [ ] Extract actual causal chains from LLM predictions
- [ ] Add interactive node details panel
- [ ] Integrate sensitivity analysis visualization
- [ ] Add scenario comparison mode

### Phase 3 (Advanced - 6 hours)
- [ ] Timeline animation showing factor evolution
- [ ] Export to CSV/PDF
- [ ] Drill-down to sub-factors
- [ ] 3D network visualization option

---

## Why This Matters

**Current:** "Here's a network graph... I guess these factors are related?"

**Improved:** "Price increase (↑15%) → Customer Sentiment (↓45%, 87% confidence) → Revenue (↓$2.5M). Most sensitive to price change (85% impact). If we only increase by 10%, revenue drops only $1.2M."

**Result:** Users can make **informed decisions** instead of just looking at pretty visualizations.

---

## Recommended Next Steps

1. **Start with Phase 1** — Add labels and tooltips (2 hours, 10x clarity improvement)
2. **Move to Phase 2** — Extract real causal chains from LLM (4 hours, 100x usefulness improvement)
3. **Consider Phase 3** — Advanced features for power users (6 hours, enterprise appeal)

Would you like me to implement Phase 1 first to make the network actually useful?
