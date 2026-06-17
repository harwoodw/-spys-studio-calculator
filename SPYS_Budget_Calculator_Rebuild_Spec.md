# SPYS Designs — Budget Calculator Rebuild Spec

**For:** Claude Code session
**Repo:** existing GitHub repo for the deployed app at `spys-studio-calculator.vercel.app` (auto-deploys to Vercel on push to `main`)
**Goal:** Replace the current generic $300–$350/sqft model with a hybrid cost model grounded in real SPYS Designs project data, so the calculator outputs honest, professional-grade numbers that filter for serious buyers instead of underquoting and breaking trust later.

---

## 0. Context for Claude Code (read first)

The current calculator underestimates real cost by roughly half. A 269 sqft internal studio that actually budgets at ~$71,000 currently returns a "reality check" of ~$43,000. This is actively harmful: a real buyer plans around a number that is too low, then gets sticker shock on the planning call. The rebuild fixes this by basing every rate on real completed-project data.

**The model is now validated against TWO real projects:**
1. **Wilson's own studio (Nashville TN):** 269 sqft internal conversion, $71,147 fully loaded. Double-wall + Genie Clip RST system, mini-split + ERV + dehumidifier + baffle boxes, 1 soundproof door.
2. **Jon Hegel project (Denver CO):** 600 sqft ground-up backyard studio, real design-build proposal from Prenvalley Builders. Comparable construction scope (excluding permits, utility tie-ins, and the design fee) ≈ $163,000 with the builder's 28% margin.

The same hybrid model fits BOTH projects within ~1% (see Section 6). That is the key fact: the rates below are not calibrated to a single data point — they hold across a 2.2x size difference, two build types, and two states.

**Do not over-specify.** Remove wall/ceiling assembly pickers and presets. The user picks a small number of high-level inputs; the tool assumes the standard SPYS build (double-wall exterior system, two layers 5/8" drywall, Genie Clip RST ceiling). The output is a credible budget range, not a line-item estimate of their exact build.

**Work directly in the existing repo.** Pull the current code, keep what works (the materials/labor/total breakdown display, the state cost index, the overall layout shell), and replace the cost engine and inputs. Push to `main` when done so Vercel redeploys.

---

## 1. Keep / Change / Remove

**KEEP**
- Materials / Labor / Total Installed Cost breakdown display (this framing is good)
- State cost index multiplier
- Floor area input
- Ceiling height input
- Number of doors input
- Number of windows input
- Three-number output structure, recalibrated and restructured as a contractor-style proposal (see Section 4)

**CHANGE**
- "Detached building" → rename to **"Ground-up build (backyard)"**, which adds slab, siding, and roof costs
- Cost engine → hybrid model (per-sqft envelope + fixed mechanical + per-count openings), see Section 3
- Branding → full SPYS Designs visual identity, see Section 5

**REMOVE**
- Ceiling assembly picker
- Wall assembly picker
- All build presets
- Any input that asks the user to specify drywall layers or assembly type (default everything)

---

## 2. Inputs (final list)

1. **Floor area** (sqft) — numeric
2. **Ceiling height** (ft) — numeric, default 8
3. **Build type** — single select:
   - Internal conversion (room inside an existing structure)
   - Ground-up build (backyard) — adds slab/siding/roof
4. **Number of soundproof doors** — numeric, default 1
5. **Number of soundproof windows** — numeric, default 0
6. **State** — dropdown driving the state cost index multiplier

That is the complete input set. Nothing else. (No HVAC tie-in option, no assembly pickers, no presets — see Section 3E for why HVAC tie-in is excluded.)

---

## 3. Cost Model (the important part)

All base rates below are derived from Wilson's actual 269 sqft studio budget (total $71,147 fully loaded with 15% contingency). The model splits costs into three behaviors: **scales with sqft**, **fixed per room**, and **per count**.

### 3A. Construction Envelope — SCALES WITH SQFT
This is the standard SPYS build: double-wall exterior system (two layers 23/32" OSB + siding, 2x4 wall + insulation, 1" air gap, second 2x4 wall + insulation, two layers 5/8" drywall), Genie Clip RST ceiling (clips 48" OC along channel, channel 24" OC, two layers 5/8" drywall), R15 wall / R30 ceiling insulation, framing, electrical, drywall, duct liner, flooring, paint.

**Envelope rate: $130 / sqft** (loaded — includes subcontractor labor, materials, and 20% management fee where applicable)

> Derivation and two-point calibration: solving each real project's envelope rate (with fixed costs pulled out) gives **$136/sqft from Wilson's internal build** and **$123/sqft from Hegel's ground-up build** (with builder margin). **$130/sqft sits sensibly between the two** and lands both validation cases within ~1% (see Section 6). This is no longer a single-project calibration — it holds across both. Keep this rate in a single editable config value for future retuning.

This rate covers: framing, clips & hat channel, electrical, insulation, drywall, duct liner, Genie Clips RST + mounts, flooring, paint.

Apply ceiling height as a minor envelope modifier: heights above 8 ft increase wall surface area. Use a simple multiplier: `envelope_cost = sqft * 130 * (ceiling_height / 8)`. Keep it simple; do not model wall perimeter separately.

### 3B. Mechanical Block — FIXED PER ROOM (does not scale with sqft)
This is a flat block added once per studio regardless of size, because a small room and a moderately larger room use the same core system.

- HVAC subcontractor work (mini-split install by HVAC installer, ERV install, dehumidifier install, contractor-built baffle boxes), fully loaded: **$13,440**
  - Note for internal display logic: mini-split install ≈ $7,500 of this; remainder is ERV install, dehumidifier install, and baffle box labor (Henry Thompson / HoldFast quote).
- ERV unit (owner-purchased): **$1,087**
- Santa Fe dehumidifier (owner-purchased): **$1,365**

**Mechanical block total: $15,892 fixed**

### 3C. Openings — PER COUNT
- **Soundproof door: $4,500 each** — door unit cost only (IsoStore HDLF + shipping; larger or glazed doors push higher). Validated against two real projects: Hegel's IsoStore HDLF was $3,400, Wilson's was ~$4,231; $4,500 is a sound average with a small buffer for larger/glazed doors. Track this separately and label it as door cost, NOT including install labor.
- **Door install labor: $900 per door, flat, applied to every door** — install labor does not scale away on additional doors; each door still has to be hung and trimmed. So total door line = `door_count * ($4,500 + $900)`.
- **Soundproof window: $1,500 each** — flat baseline regardless of size. Hegel's 6 custom STC-63 windows ran ~$925 each, but those were narrow slot windows; $1,500 holds as a sound average across typical sizes.

### 3D. Ground-Up Adder — CONDITIONAL
If build type = "Ground-up build (backyard)", add costs for the building shell that an internal conversion doesn't need: concrete slab, exterior structural wall (framing + double 23/32" OSB sheathing + siding + house wrap), and roof (structure + sheathing + shingles). This is the OUTER shell only; the SPYS double-wall interior isolation system is already covered in the $130/sqft envelope.

**Ground-up shell adder: $85 / floor-sqft (fully loaded, material + labor)**

> Derivation AND real-project validation: US-average 2026 data put this at ~$83/floor-sqft (slab at $8/sqft installed; exterior structural shell ~$57/floor-sqft; roof ~$18/floor-sqft). The **Jon Hegel project independently confirms this**: his real ground-up shell (slab + foundation + roofing + gutters + siding) came to ~$40,050 hard cost over 600 sqft, which with the builder's 28% margin is **$85/floor-sqft loaded** — landing exactly on the research figure. This is the most strongly validated number in the model. For a 269 sqft studio it adds ~$22,000; for Hegel's 600 sqft it adds ~$51,000.

> IMPORTANT: this is a US national average. Do NOT bake in Tennessee or any state. The state cost index (Section 3F) applies the regional correction on top, which keeps the logic consistent across all build types.

### 3E. HVAC Tie-In — REMOVED
Do NOT build an HVAC tie-in option. Tying into an existing HVAC system is too variable to estimate honestly — in some cases it's cheap, but if the existing system needs a new unit to handle the added load, the cost explodes. The calculator assumes a standalone mini-split system every time. HVAC tie-in is named in the disclaimer (Section 4B) as a cost the calculator cannot account for.

### 3F. State Cost Index
The current app already has a state cost index built in. **Verify the existing multiplier table is sane before trusting it** — it was generated by ChatGPT and should be sanity-checked against known regional cost differences (e.g. California and the Northeast should run meaningfully higher than the Southeast and inland markets). Apply the state multiplier to the **labor-bearing portions** (envelope, mechanical sub labor, openings install, ground-up shell). Do NOT apply it to owner-purchased equipment (ERV, dehumidifier, doors, windows, treatment) since those are national-priced. If applying selectively is too complex in v1, apply the index to the full subtotal and note it as an approximation.

### 3G. Acoustic Treatment + Finish Electronics — FIXED-ISH PER ROOM
Owner-purchased treatment and finish package (GIK soffit bass traps, amplitude panel, MCA diffusers, acoustic cloud, ELCO + Govee lighting, sconces, headphone passthrough, putty pads, air terminals, WallCats): **$5,000 flat**. Scales only very loosely with room size; keep flat for simplicity.

---

## 4. Output — Structured Like a Contractor's Line-Item Proposal

The output should mirror how a real contractor structures a budget proposal — specifically how Henry Thompson (HoldFast Construction) structured Wilson's actual studio budget. This structure is itself a filter: a serious buyer recognizes it as a real construction document and feels reassured; a DIYer sees it and feels out of their depth. Reproduce the three-section logic from the real budget.

**Section A — Contractor Scope (subcontractor work).**
The work a general contractor performs or subs out, shown as a loaded total (labor + their materials + management fee). Maps to: envelope construction, mechanical/HVAC subcontractor work, door install labor, and (if ground-up) the building shell.

**Section B — Owner-Purchased Materials.**
The sound-isolation-specific items the client buys directly. Maps to: ERV, dehumidifier, soundproof doors (unit cost), soundproof windows, Genie Clips, acoustic treatment package, finish electronics. Showing this bucket explicitly signals that SPYS Designs specifies real, named products — which is authority. Do NOT make this an interactive toggle; just display the two buckets. (The high-end "contractor purchases with markup" model is a real delivery question but does not belong in a lead-magnet calculator.)

**Section C — Project Totals.**
- **Combined Subtotal** (Section A + Section B, before contingency)
- **Contingency (15%)** — applied to the subtotal
- **Total Anticipated Budget** — the headline number

Keep the existing Materials / Labor / Total Installed Cost breakdown logic where it maps cleanly (owner-purchased = materials; subcontractor work = labor + their materials).

**Present the headline total as a range, not a false-precision single number:** show "Total Anticipated Budget" with the contingency-inclusive figure, and note "Most SPYS Designs projects this size land between [total] and [total × 1.10]." Real budgets are ranges; presenting one looks more credible than a single exact dollar figure.

**Output framing copy (display directly beneath the total):**
> This estimate reflects a professionally designed and engineered sound isolated room built to SPYS Designs standards — not a DIY or patched build. If this number is higher than you expected, that is the most useful thing this calculator can tell you. A real build done right costs what it costs.

CTA button beneath output: **"Book a Soundproof Planning Call"** → `https://www.soundproofyourstudio.com/Step1`

---

## 4B. Disclaimer (bottom of app — important)

Display a clear disclaimer at the bottom. It does double duty: it protects against the "but your calculator said" conversation, and it does sales work by naming the design fee first and framing it correctly.

> **What this calculator shows — and what it doesn't.**
> This is an estimate for a typical SPYS Designs build: a standard double-wall isolation system with a Genie Clip RST ceiling and a standalone mini-split mechanical system. It reflects construction cost only. It does **not** include:
>
> - **The acoustic design fee — our fee.** This calculator shows what the *build* costs. It does not include the SPYS Designs sound isolation design fee, which is what ensures the build is engineered correctly and avoids costly scope gaps. A $10,000–$15,000 design fee that surfaces a $75,000 scope gap is not a cost — it is the best money spent on the entire project.
> - **HVAC tie-in to an existing system** (highly variable; may require a new unit)
> - **Structural or foundational work beyond a standard slab**
> - **Permitting and architectural fees**
> - **Site access challenges**
> - **High-end finish upgrades**
>
> Your actual budget may be higher depending on these factors. On a real 600 sqft ground-up project we have data for, permits, utility tie-ins, and site costs alone added roughly $19,000 on top of construction. The most accurate next step is a Soundproof Planning Call.

---

## 5. Branding (SPYS Designs visual identity)

Apply the SPYS Designs style:
- **Primary accent / CTAs / highlights:** Orange `#F47e57`
- **Headlines / primary text:** Near-black `#1a1a1a`
- **Body text:** Dark gray `#555555`
- **Labels / secondary:** Mid gray `#888888`
- **Canvas background:** Warm off-white `#f9f8f6`
- **Input/card fill:** White `#ffffff`
- **Headlines / titles:** Georgia (or EB Garamond), bold
- **Labels / numeric inputs / spec detail:** Courier New (monospace)
- No gradients, no drop shadows, no decorative effects. Flat geometry only.
- Footer watermark: `SPYS Designs · soundproofyourstudio.com · Nashville, TN` in Courier New, small, gray.

---

## 6. Validation Test (must pass before deploy)

The model must hit BOTH real projects. Run both cases through the rebuilt calculator:

**Case 1 — Wilson (Nashville TN), internal conversion:**
- Inputs: 269 sqft, 8 ft ceiling, internal, 1 door, 0 windows, Tennessee
- Expected baseline: ~$61,300 → with 15% contingency ~$70,500
- Real budget: $61,867 baseline, $71,147 total → **within ~1%** ✓

**Case 2 — Hegel (Denver CO), ground-up build:**
- Inputs: 600 sqft, 8 ft ceiling, ground-up, 1 door, 6 windows, Colorado
- Expected baseline (pre-contingency, construction scope only): ~$164,300
- Real comparable scope with builder's 28% margin, excluding permits/utilities/design fee: ~$163,050 → **within ~1%** ✓

If either case drifts more than ~5%, the envelope rate is the primary tuning lever. Note that Case 2's real total proposal was $203,804 — the ~$40K difference from our estimate is the permits, utility tie-ins, and site costs the calculator deliberately excludes and names in the disclaimer (Section 4B). This is correct behavior, not error.

---

## 7. Notes on Tunable Values (all resolved for v1, retune as data comes in)

All open questions from the initial draft are now resolved, and the model is validated against two real projects. These are the values most worth revisiting as more project data accumulates:

1. **Door:** $4,500 unit + $900 install per door, flat on every door. Validated against two real IsoStore doors ($3,400 and ~$4,231).
2. **Ground-up shell adder:** $85/floor-sqft loaded. **Strongly validated** — US-average research and the Hegel real project independently agree on $85/sqft.
3. **Envelope rate ($130/sqft):** validated against both projects (Wilson solved $136, Hegel $123). Still the primary tuning lever as more data comes in.
4. **Windows ($1,500 each):** Hegel real was ~$925 for narrow slot windows; $1,500 holds as an average across sizes. Retune if typical projects skew larger or smaller.
5. **HVAC tie-in:** removed entirely (too variable; named in disclaimer).
6. **State cost index:** already in code; verify the ChatGPT-generated multiplier table is sane (e.g. Colorado and Tennessee should differ appropriately).

Keep ALL of these in one clearly-commented config object at the top of the cost engine so Wilson can adjust them without hunting through code.

---

## 8. Build Instructions for Claude Code

1. Clone/pull the existing repo (the one deploying to `spys-studio-calculator.vercel.app`).
2. Inventory the current code: identify the cost engine, the input components, and the output/breakdown display.
3. Replace the cost engine with the Section 3 hybrid model. Keep it in a single clearly-commented config object so rates are easy to tune later (Wilson will want to adjust these as more project data comes in).
4. Replace inputs per Section 2; remove assembly pickers and presets.
5. Reskin to SPYS Designs branding per Section 5.
6. Run the Section 6 validation test; confirm ~$71K output.
7. Commit and push to `main`; confirm Vercel redeploy succeeds.
8. Report back the deployed test result for the 269 sqft validation case.
