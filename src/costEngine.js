// ============================================================================
//  SPYS Designs — Soundproof Studio Budget cost engine (v2.0, hybrid model)
// ----------------------------------------------------------------------------
//  Pure cost model per SPYS_Budget_Calculator_Rebuild_Spec.md (Section 3).
//  No React / no DOM — imported by App.jsx and by the validation harness
//  (scripts/validate.mjs), so the validated numbers are the shipped numbers.
//
//  EVERY tunable rate lives in CONFIG below. To retune as project data comes
//  in, edit CONFIG only — no need to touch the math or UI.
// ============================================================================

export const CONFIG = {
  // --- Construction envelope: SCALES WITH SQFT (3A) -------------------------
  // Standard SPYS build (double-wall system, Genie Clip RST ceiling, two
  // layers 5/8" drywall, insulation, framing, electrical, drywall, duct
  // liner, flooring, paint). Loaded rate. Primary tuning lever.
  // Calibration: Wilson solved $136/sf, Hegel $123/sf; $130 sits between.
  //
  // NOTE ON REGIONAL SIGNAL: this $130 is back-solved from two REAL projects
  // — Wilson (Nashville TN) and Hegel (Denver CO). Notably Wilson's TN build
  // solved HIGHER ($136) than Hegel's CO build ($123), the opposite of what
  // the state index (TN 0.94 < CO 1.02) would predict. So $130 already carries
  // some baked-in regional pricing from the anchors. Consequence: the state
  // index (3F) is a DIRECTIONAL screening adjustment, not a surgical one, and
  // the two anchor projects do NOT validate at their own state factors (they
  // double-count region). The honest model test is at factor 1.0, where both
  // anchors land within ~1% (see scripts/validate.mjs). CLEAN FIX, when more
  // project data exists: re-derive this rate as a regionally-neutral national
  // average so the state index can carry ALL of the regional signal.
  envelopePerSqft: 130,

  // Ceiling-height modifier baseline. envelope = sqft * rate * (height / base).
  ceilingHeightBase: 8,

  // --- Mechanical block: FIXED PER ROOM (3B) --------------------------------
  // Does NOT scale with sqft. Split into labor-bearing (subcontractor) vs.
  // owner-purchased (national-priced equipment) for state-factor scoping.
  mechanical: {
    hvacSubLabor: 13440, // mini-split (~$7,500) + ERV install + dehum install + baffle boxes (loaded) — LABOR-BEARING
    ervUnit: 1087,       // ERV unit, owner-purchased — NATIONAL
    dehumidifier: 1365,  // Santa Fe dehumidifier, owner-purchased — NATIONAL
  },

  // --- Openings: PER COUNT (3C) ---------------------------------------------
  door: {
    unitCost: 4500,      // IsoStore HDLF + shipping, owner-purchased — NATIONAL
    installLabor: 900,   // flat per door, hung & trimmed — LABOR-BEARING
  },
  windowEach: 1500,      // soundproof window, flat baseline, owner-purchased — NATIONAL

  // --- Ground-up shell adder: CONDITIONAL (3D) ------------------------------
  // Outer shell only (slab + exterior structural wall + roof). The SPYS
  // double-wall interior is already in the envelope rate. US national average;
  // state factor applies the regional correction. LABOR-BEARING.
  groundUpPerSqft: 85,

  // --- Finish electronics + low-voltage package: FIXED-ISH (3G) -------------
  // Audio receptacles, low-voltage wiring, headphone passthrough, WallCats,
  // network drops, lighting/sconces and similar finish items. Owner-purchased
  // — NATIONAL. NOTE: acoustic treatment (bass traps, diffusers, panels) is
  // NOT in this number — it is excluded and named in the disclaimer (4B),
  // since treatment scope ranges ~$5k–$20k+ by room size and finish level.
  treatmentFlat: 5000,

  // --- Contingency (4C) -----------------------------------------------------
  contingencyPct: 0.15,

  // Range upper bound shown alongside the headline total (Section 4).
  rangeUpliftPct: 0.10,

  // --- State cost index (3F) ------------------------------------------------
  // Applied to LABOR-BEARING portions only (envelope, mechanical sub labor,
  // door install, ground-up shell). NOT applied to owner-purchased national
  // equipment (ERV, dehumidifier, door unit, windows, treatment).
  // Sanity-checked: CA/NE/HI high, Southeast/inland low; TN 0.94, CO 1.02.
  stateFactors: {
    AL: 0.94, AK: 1.04, AZ: 0.99, AR: 0.87, CA: 1.13, CO: 1.02, CT: 1.07, DE: 1.0, DC: 1.11,
    FL: 1.01, GA: 0.96, HI: 1.18, ID: 0.95, IL: 0.99, IN: 0.92, IA: 0.92, KS: 0.9, KY: 0.9,
    LA: 0.92, ME: 1.0, MD: 1.03, MA: 1.08, MI: 0.95, MN: 0.99, MS: 0.87, MO: 0.91, MT: 0.99,
    NE: 0.92, NV: 1.01, NH: 1.03, NJ: 1.09, NM: 0.95, NY: 1.12, NC: 0.96, ND: 0.95, OH: 0.94,
    OK: 0.88, OR: 1.02, PA: 0.99, RI: 1.03, SC: 0.95, SD: 0.92, TN: 0.94, TX: 0.95, UT: 0.99,
    VT: 1.03, VA: 1.01, WA: 1.06, WV: 0.9, WI: 0.95, WY: 0.96,
  },
};

export const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "Washington DC", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
  MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export const states = Object.keys(CONFIG.stateFactors).sort((a, b) =>
  STATE_NAMES[a].localeCompare(STATE_NAMES[b])
);

// ----------------------------------------------------------------------------
//  The hybrid model. Pure function of inputs + CONFIG.
// ----------------------------------------------------------------------------
export function computeBudget({ area, height, buildType, doors, windows, stateCode }) {
  const factor = CONFIG.stateFactors[stateCode] ?? 1.0;
  const isGroundUp = buildType === "groundup";

  // ---- Section A: Contractor scope (LABOR-BEARING, state-factored) ----------
  const envelope =
    area * CONFIG.envelopePerSqft * (height / CONFIG.ceilingHeightBase) * factor;
  const hvac = CONFIG.mechanical.hvacSubLabor * factor;
  const doorInstall = doors * CONFIG.door.installLabor * factor;
  const shell = (isGroundUp ? area * CONFIG.groundUpPerSqft : 0) * factor;

  const sectionA = [
    { key: "envelope", label: "Construction envelope (SPYS double-wall + Genie Clip RST)", value: envelope },
    { key: "hvac", label: "Mechanical / HVAC subcontractor (mini-split, ERV, dehum, baffle boxes)", value: hvac },
    { key: "doorInstall", label: `Soundproof door install labor (${doors} × $${CONFIG.door.installLabor})`, value: doorInstall },
  ];
  if (isGroundUp) {
    sectionA.push({
      key: "shell",
      label: "Ground-up building shell (slab + exterior wall + roof)",
      value: shell,
    });
  }
  const sectionATotal = sectionA.reduce((s, r) => s + r.value, 0);

  // ---- Section B: Owner-purchased materials (NATIONAL, no state factor) ------
  const doorUnits = doors * CONFIG.door.unitCost;
  const windowUnits = windows * CONFIG.windowEach;

  const sectionB = [
    { key: "doorUnits", label: `Soundproof door units (${doors} × $${CONFIG.door.unitCost.toLocaleString()})`, value: doorUnits },
    { key: "windowUnits", label: `Soundproof windows (${windows} × $${CONFIG.windowEach.toLocaleString()})`, value: windowUnits },
    { key: "ervUnit", label: "ERV unit", value: CONFIG.mechanical.ervUnit },
    { key: "dehumidifier", label: "Santa Fe dehumidifier", value: CONFIG.mechanical.dehumidifier },
    { key: "treatment", label: "Finish electronics and low-voltage package", value: CONFIG.treatmentFlat },
  ];
  const sectionBTotal = sectionB.reduce((s, r) => s + r.value, 0);

  // ---- Section C: Project totals --------------------------------------------
  const subtotal = sectionATotal + sectionBTotal;
  const contingency = subtotal * CONFIG.contingencyPct;
  const total = subtotal + contingency;
  const rangeHigh = total * (1 + CONFIG.rangeUpliftPct);

  return {
    factor, isGroundUp,
    sectionA, sectionATotal,
    sectionB, sectionBTotal,
    subtotal, contingency, total, rangeHigh,
  };
}
