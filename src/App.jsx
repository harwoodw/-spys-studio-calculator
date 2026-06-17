import React, { useMemo, useState } from "react";
import { CONFIG, STATE_NAMES, states, computeBudget } from "./costEngine.js";

// ============================================================================
//  SPYS Designs — Soundproof Studio Budget Calculator (v2.0, hybrid model)
// ----------------------------------------------------------------------------
//  UI shell. All cost logic + tunable rates live in ./costEngine.js (CONFIG).
//  Model + branding per SPYS_Budget_Calculator_Rebuild_Spec.md.
// ============================================================================

const BRAND = {
  orange: "#F47e57",
  ink: "#1a1a1a",
  body: "#555555",
  label: "#888888",
  canvas: "#f9f8f6",
  card: "#ffffff",
  serif: "Georgia, 'EB Garamond', serif",
  mono: "'Courier New', Courier, monospace",
};

function currency(n) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function StudioBudgetEstimator() {
  const [stateCode, setStateCode] = useState("TN");
  const [area, setArea] = useState(300);
  const [height, setHeight] = useState(8);
  const [buildType, setBuildType] = useState("internal");
  const [doors, setDoors] = useState(1);
  const [windows, setWindows] = useState(0);

  const b = useMemo(
    () => computeBudget({ area, height, buildType, doors, windows, stateCode }),
    [area, height, buildType, doors, windows, stateCode]
  );

  // ---- shared inline styles ----
  const card = {
    background: BRAND.card,
    border: `1px solid #ececec`,
    borderRadius: 4,
    padding: "20px 22px",
  };
  const labelStyle = {
    fontFamily: BRAND.mono,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: BRAND.label,
    display: "block",
    marginBottom: 6,
  };
  const inputStyle = {
    fontFamily: BRAND.mono,
    fontSize: 15,
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 10px",
    border: "1px solid #ddd",
    borderRadius: 3,
    background: "#fff",
    color: BRAND.ink,
  };
  const sectionTitle = {
    fontFamily: BRAND.serif,
    fontWeight: 700,
    fontSize: 20,
    color: BRAND.ink,
    margin: "0 0 14px",
  };

  const Row = ({ label, value, strong }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "7px 0",
        borderBottom: "1px solid #f1efec",
        fontFamily: BRAND.mono,
        fontSize: 14,
      }}
    >
      <span style={{ color: strong ? BRAND.ink : BRAND.body, fontWeight: strong ? 700 : 400 }}>
        {label}
      </span>
      <span style={{ color: BRAND.ink, fontWeight: strong ? 700 : 600, whiteSpace: "nowrap" }}>
        {currency(value)}
      </span>
    </div>
  );

  return (
    <div style={{ minHeight: "100%", background: BRAND.canvas, color: BRAND.body }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 22px 64px" }}>
        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              fontFamily: BRAND.mono,
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: BRAND.orange,
              marginBottom: 10,
            }}
          >
            SPYS Designs
          </div>
          <h1
            style={{
              fontFamily: BRAND.serif,
              fontWeight: 700,
              fontSize: 34,
              lineHeight: 1.15,
              color: BRAND.ink,
              margin: "0 0 12px",
            }}
          >
            Soundproof Studio Budget Calculator
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, maxWidth: 680, margin: 0 }}>
            An honest construction budget for a professionally engineered sound-isolated
            room, built to SPYS Designs standards. Enter a few high-level numbers; the
            tool assumes the standard SPYS build (double-wall isolation system, Genie Clip
            RST ceiling, standalone mini-split mechanical system).
          </p>
        </div>

        {/* Inputs */}
        <div style={{ ...card, marginTop: 28 }}>
          <h2 style={sectionTitle}>Project Inputs</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 18,
            }}
          >
            <div>
              <label style={labelStyle}>Floor area (ft²)</label>
              <input
                type="number"
                value={area}
                onChange={(e) => setArea(+e.target.value || 0)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Ceiling height (ft)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(+e.target.value || 0)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Build type</label>
              <select
                value={buildType}
                onChange={(e) => setBuildType(e.target.value)}
                style={inputStyle}
              >
                <option value="internal">Internal conversion</option>
                <option value="groundup">Ground-up build (backyard)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Soundproof doors</label>
              <input
                type="number"
                value={doors}
                onChange={(e) => setDoors(Math.max(0, +e.target.value || 0))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Soundproof windows</label>
              <input
                type="number"
                value={windows}
                onChange={(e) => setWindows(Math.max(0, +e.target.value || 0))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                style={inputStyle}
              >
                {states.map((s) => (
                  <option key={s} value={s}>
                    {STATE_NAMES[s]}
                  </option>
                ))}
              </select>
              <div style={{ fontFamily: BRAND.mono, fontSize: 11, color: BRAND.label, marginTop: 6 }}>
                Regional cost index: {b.factor.toFixed(3)}
              </div>
            </div>
          </div>
        </div>

        {/* Section A — Contractor Scope */}
        <div style={{ ...card, marginTop: 20 }}>
          <h2 style={sectionTitle}>A · Contractor Scope</h2>
          <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: -6, marginBottom: 12, color: BRAND.body }}>
            Work the general contractor performs or subs out, shown as fully loaded totals
            (labor, materials, and management fee included). The regional cost index is
            applied to this section.
          </p>
          {b.sectionA.map((r) => (
            <Row key={r.key} label={r.label} value={r.value} />
          ))}
          <Row label="Section A subtotal" value={b.sectionATotal} strong />
        </div>

        {/* Section B — Owner-Purchased */}
        <div style={{ ...card, marginTop: 20 }}>
          <h2 style={sectionTitle}>B · Owner-Purchased Materials</h2>
          <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: -6, marginBottom: 12, color: BRAND.body }}>
            The sound-isolation-specific items the client buys directly. These are
            national-priced, so the regional index does not apply to them.
          </p>
          {b.sectionB.map((r) => (
            <Row key={r.key} label={r.label} value={r.value} />
          ))}
          <Row label="Section B subtotal" value={b.sectionBTotal} strong />
        </div>

        {/* Section C — Totals */}
        <div style={{ ...card, marginTop: 20, borderColor: BRAND.orange }}>
          <h2 style={sectionTitle}>C · Project Totals</h2>
          <Row label="Combined subtotal (A + B)" value={b.subtotal} />
          <Row label={`Contingency (${Math.round(CONFIG.contingencyPct * 100)}%)`} value={b.contingency} />
          <div
            style={{
              marginTop: 18,
              paddingTop: 18,
              borderTop: `2px solid ${BRAND.ink}`,
            }}
          >
            <div style={{ fontFamily: BRAND.mono, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: BRAND.label }}>
              Total Anticipated Budget
            </div>
            <div style={{ fontFamily: BRAND.serif, fontWeight: 700, fontSize: 40, color: BRAND.orange, lineHeight: 1.1, margin: "4px 0 8px" }}>
              {currency(b.total)}
            </div>
            <div style={{ fontFamily: BRAND.mono, fontSize: 13, color: BRAND.body }}>
              Most SPYS Designs projects this size land between {currency(b.total)} and{" "}
              {currency(b.rangeHigh)}.
            </div>
          </div>
        </div>

        {/* Framing copy */}
        <div
          style={{
            marginTop: 20,
            padding: "18px 22px",
            borderLeft: `3px solid ${BRAND.orange}`,
            background: "#fffaf7",
            fontFamily: BRAND.serif,
            fontSize: 15,
            lineHeight: 1.6,
            color: BRAND.ink,
          }}
        >
          This estimate reflects a professionally designed and engineered sound isolated
          room built to SPYS Designs standards — not a DIY or patched build. If this number
          is higher than you expected, that is the most useful thing this calculator can
          tell you. A real build done right costs what it costs.
        </div>

        {/* CTA */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <a
            href="https://www.soundproofyourstudio.com/Step1"
            style={{
              display: "inline-block",
              background: BRAND.orange,
              color: "#fff",
              fontFamily: BRAND.mono,
              fontSize: 15,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              textDecoration: "none",
              padding: "15px 30px",
              borderRadius: 3,
            }}
          >
            Book a Soundproof Planning Call
          </a>
        </div>

        {/* Disclaimer (4B) */}
        <div style={{ ...card, marginTop: 32, background: "#fff" }}>
          <h3 style={{ fontFamily: BRAND.serif, fontWeight: 700, fontSize: 17, color: BRAND.ink, margin: "0 0 10px" }}>
            What this calculator shows — and what it doesn't.
          </h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: "0 0 10px" }}>
            This is an estimate for a typical SPYS Designs build: a standard double-wall
            isolation system with a Genie Clip RST ceiling and a standalone mini-split
            mechanical system. It reflects construction cost only. It does <b>not</b> include:
          </p>
          <ul style={{ fontSize: 13.5, lineHeight: 1.6, margin: "0 0 10px", paddingLeft: 20 }}>
            <li>
              <b>The acoustic design fee — our fee.</b> This calculator shows what the{" "}
              <i>build</i> costs. It does not include the SPYS Designs sound isolation design
              fee, which is what ensures the build is engineered correctly and avoids costly
              scope gaps. A $10,000–$15,000 design fee that surfaces a $75,000 scope gap is
              not a cost — it is the best money spent on the entire project.
            </li>
            <li><b>HVAC tie-in to an existing system</b> (highly variable; may require a new unit)</li>
            <li><b>Structural or foundational work beyond a standard slab</b></li>
            <li><b>Permitting and architectural fees</b></li>
            <li><b>Site access challenges</b></li>
            <li><b>High-end finish upgrades</b></li>
            <li>
              <b>Acoustic treatment</b> — not included in this estimate. Treatment packages
              typically range from $5,000 on a smaller room to $20,000 or more depending on
              room size, diffusion, and finish level.
            </li>
          </ul>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
            Your actual budget may be higher depending on these factors. On a real 600 sqft
            ground-up project we have data for, permits, utility tie-ins, and site costs
            alone added roughly $19,000 on top of construction. The most accurate next step
            is a Soundproof Planning Call.
          </p>
        </div>

        {/* Footer watermark */}
        <div
          style={{
            marginTop: 36,
            textAlign: "center",
            fontFamily: BRAND.mono,
            fontSize: 11,
            color: BRAND.label,
          }}
        >
          SPYS Designs · soundproofyourstudio.com · Nashville, TN
        </div>
      </div>
    </div>
  );
}
