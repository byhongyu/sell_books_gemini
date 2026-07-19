# Book-Selling Platform Comparison — Design Spec

**Status:** Approved
**Date:** 2026-07-18
**Sub-project 1 of 3** in the used-book selling assistant. See also (planned, not yet spec'd): (2) photo → book info → pricing tool, (3) automated listing.

## Purpose

Before building anything that lists books, decide *where* books should be sold. The user has a mixed collection — common used books plus some valuable/collectible ones — and wants routing logic, not a single one-size-fits-all platform choice.

This sub-project produces a one-time research artifact plus a small structured data file that later tools (the pricing tool, the listing tool) can read to recommend a platform per book.

## Scope

**Platforms compared** (fixed set, not extensible in this phase):
1. Amazon (individual seller marketplace listings)
2. ThriftBooks
3. HalfPriceBooks
4. Facebook Marketplace / local sale
5. BookScouter (buyback aggregator)

**Criteria evaluated per platform:**
- Payout potential (typical price realized relative to market value)
- Fees (referral %, listing fees, payment processing)
- Shipping (who pays, who packs/labels, prepaid vs. seller-arranged)
- Listing effort (fields required, photo requirements, per-item vs. bulk)
- Sell-through time (how fast items typically sell)
- Automation surface: public seller API vs. browser-automatable vs. fully manual (informs sub-project 3)

This is a **point-in-time research synthesis**, not a live-scraping system. Fee schedules and program terms will be captured with a research date in the output doc; if the doc is later found stale, re-running this same process refreshes it. No scheduled job or scraper is being built here.

## Tiering logic

Books are routed to a platform based on estimated resale value:

| Tier | Threshold (starting point) | Recommended platform(s) | Rationale |
|---|---|---|---|
| High-value / collectible | Est. resale > $25, OR rare/first-edition/current-edition-textbook | Amazon individual listing (or eBay-style) | Highest payout justifies per-item listing effort |
| Mid-value common | Est. resale ~$5–$25 | ThriftBooks or HalfPriceBooks | Moderate payout, low per-item effort (bulk intake / prepaid shipping where available) |
| Low-value / clear-out | Est. resale < $5, or no listing effort wanted | BookScouter (buyback) or Facebook Marketplace/local | BookScouter: instant, lowest payout. Local: no fees/shipping, but manual and local-only |

Exact dollar thresholds are a **starting proposal** and will be tuned once real fee/payout numbers are gathered during research — e.g., if Amazon's referral fee + shipping cost eats most of the margin below $25, the threshold may move.

## Deliverables

1. **`docs/research/platform-comparison.md`** — readable writeup: per-platform breakdown (payout, fees, shipping, effort, sell-through, automation surface) plus the recommendation rationale and research date.
2. **`data/platform-rules.json`** — structured decision rules consumed programmatically by later tools:
   ```json
   {
     "researched_at": "2026-07-18",
     "tiers": [
       { "name": "high_value", "min_value_usd": 25, "platforms": ["amazon"] },
       { "name": "mid_value", "min_value_usd": 5, "max_value_usd": 25, "platforms": ["thriftbooks", "halfpricebooks"] },
       { "name": "low_value", "max_value_usd": 5, "platforms": ["bookscouter", "facebook_marketplace"] }
     ],
     "platforms": {
       "amazon": { "fee_pct": null, "who_pays_shipping": null, "api_available": null, "notes": "" },
       "thriftbooks": { "...": "same shape" },
       "halfpricebooks": { "...": "same shape" },
       "facebook_marketplace": { "...": "same shape" },
       "bookscouter": { "...": "same shape" }
     }
   }
   ```
   (Exact field values filled in during research; schema may gain fields like `sell_through_days` if useful.)

## Validation

No automated tests — this is a research artifact, not executable logic. Validation is a sanity check: after the JSON is filled in, walk through 2–3 example books (one clearly high-value/collectible, one clearly common, one near a tier boundary) and confirm the tiering logic recommends a sensible platform for each.

## Out of scope (deferred to later sub-projects)

- Extracting book info from photos
- Looking up actual market prices for specific books
- Any code that lists or automates posting to a platform
- Revisiting this comparison on a schedule (manual re-run only, if ever needed)
