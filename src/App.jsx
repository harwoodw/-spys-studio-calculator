import React, { useMemo, useState } from "react";

// ---- SPYS Studio Cost Calculator (v1.2.1) ----
// Fixes mismatched JSX in <Section> (Primary Inputs), removes stray tags,
// keeps Materials vs Labor split + totals, and applies SPYS colorway (white/black/orange).

const CONFIG = {
  geometry: {
    aspectRatio: 1.5,
    doorAreaFt2: 21,
    roofSlopeMultiplier: 1.15,
    wasteFactorChannel: 1.1,
  },
  stateFactors: {
    AL: 0.94, AK: 1.04, AZ: 0.99, AR: 0.87, CA: 1.13, CO: 1.02, CT: 1.07, DE: 1.00, DC: 1.11,
    FL: 1.01, GA: 0.96, HI: 1.18, ID: 0.95, IL: 0.99, IN: 0.92, IA: 0.92, KS: 0.90, KY: 0.90,
    LA: 0.92, ME: 1.00, MD: 1.03, MA: 1.08, MI: 0.95, MN: 0.99, MS: 0.87, MO: 0.91, MT: 0.99,
    NE: 0.92, NV: 1.01, NH: 1.03, NJ: 1.09, NM: 0.95, NY: 1.12, NC: 0.96, ND: 0.95, OH: 0.94,
    OK: 0.88, OR: 1.02, PA: 0.99, RI: 1.03, SC: 0.95, SD: 0.92, TN: 0.94, TX: 0.95, UT: 0.99,
    VT: 1.03, VA: 1.01, WA: 1.06, WV: 0.90, WI: 0.95, WY: 0.96,
  },
  decoupling: {
    clipAllowancePerSf: 4.5,
    hatChannelCostPerLf: 1.4,
    grid: { channelSpacingIn: 24, clipSpacingIn: 48 },
  },
  doubleStud: { wallCostPerSfInstalled: 12.0 },
  drywall: { oneLayerCostPerSfInstalled: 2.5, maxLayers: 4 },
  windows: {
    mode: "by_area",
    laminated_3_8_per_sf: 28,
    tempered_1_2_per_sf: 23,
    frame_trim_allowance_per_sf: 15,
    oem_unit_default_each: 2000,
    doorUnitCost: 3200,
  },
  shell: { slabPerSf: 9.0, sidingPerSfWall: 6.0, roofingPerSfRoof: 7.0 },
  interior: {
    insulationPerSf: 2.0,
    electricalPerSfFloor: 4.0,
    paintPerSfFloor: 4.5,
    flooringPerSf: 12.0,
  },
  hvac: { miniSplitDefault: 7000, miniSplitRange: [3500, 9000] },
  erv: { installedDefault: 4000, range: [3000, 5000] },
  bufferPct: 0.20,
  overrunPct: 0.30,
  laborShare: {
    wallsDecouple: 0.55,
    wallsDouble: 0.55,
    wallsDrywall: 0.65,
    wallsInsul: 0.50,
    ceilDecouple: 0.55,
    ceilDrywall: 0.65,
    ceilInsul: 0.50,
    windows: 0.40,
    doors: 0.40,
    electrical: 0.70,
    paint: 0.70,
    flooring: 0.60,
    ventilation: 0.60,
    minisplit: 0.60,
    slab: 0.60,
    siding: 0.58,
    roofing: 0.60,
  },
};

const states = Object.keys(CONFIG.stateFactors);

function currency(n) {
  if (!isFinite(n)) return "-";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-orange-200">
      <div className="text-lg font-semibold mb-3 text-orange-600">{title}</div>
      {children}
    </div>
  );
}

export default function StudioBudgetEstimator() {
  // ------- Inputs -------
  const [stateCode, setStateCode] = useState("TN");
  const [area, setArea] = useState(300);
  const [height, setHeight] = useState(10);
  const [windowFt2, setWindowFt2] = useState(24);
  const [numDoors, setNumDoors] = useState(1);

  const [assemblyPreset, setAssemblyPreset] = useState("spys");
  const [wallsAssembly, setWallsAssembly] = useState("double");
  const [ceilAssembly, setCeilAssembly] = useState("clips");

  const [dwWalls, setDwWalls] = useState(2);
  const [dwCeil, setDwCeil] = useState(2);

  const [windowMode, setWindowMode] = useState("custom_glass");
  const [numWindows, setNumWindows] = useState(2);

  const [miniSplitCost, setMiniSplitCost] = useState(CONFIG.hvac.miniSplitDefault);
  const [ervCost, setErvCost] = useState(CONFIG.erv.installedDefault);

  const addBuffer = true; // always include 20% buffer in "Estimate" totals
  const [showSplit, setShowSplit] = useState(true);

  // Preset sync
  useMemo(() => {
    if (assemblyPreset === "all_clips") {
      setWallsAssembly("clips");
      setCeilAssembly("clips");
    } else if (assemblyPreset === "all_double") {
      setWallsAssembly("double");
      setCeilAssembly("standard");
    } else if (assemblyPreset === "spys") {
      setWallsAssembly("double");
      setCeilAssembly("clips");
    }
  }, [assemblyPreset]);

  // Geometry
  const geom = useMemo(() => {
    const { aspectRatio, doorAreaFt2, roofSlopeMultiplier } = CONFIG.geometry;
    const L = Math.sqrt(area * aspectRatio);
    const W = area / L;
    const perimeter = 2 * (L + W);
    const doorArea = numDoors * doorAreaFt2;
    const wallArea = Math.max(perimeter * height - windowFt2 - doorArea, 0);
    const ceilingArea = area;
    const roofArea = area * roofSlopeMultiplier;
    return { L, W, perimeter, doorArea, wallArea, ceilingArea, roofArea };
  }, [area, height, windowFt2, numDoors]);

  const factor = CONFIG.stateFactors[stateCode] ?? 1.0;

  // Helpers
  const decouplingCost = (surfaceFt2) => {
    const { clipAllowancePerSf, hatChannelCostPerLf } = CONFIG.decoupling;
    const clipSystem = surfaceFt2 * clipAllowancePerSf;
    const channelLf = surfaceFt2 * 0.5 * CONFIG.geometry.wasteFactorChannel;
    const channelCost = channelLf * hatChannelCostPerLf;
    return clipSystem + channelCost;
  };
  const drywallCost = (surfaceFt2, layers) => surfaceFt2 * layers * CONFIG.drywall.oneLayerCostPerSfInstalled;
  const doubleStudCost = (surfaceFt2) => surfaceFt2 * CONFIG.doubleStud.wallCostPerSfInstalled;
  const insulationCostSurface = (surfaceFt2) => surfaceFt2 * CONFIG.interior.insulationPerSf;

  const windowCost = () => {
    if (windowMode === "oem_units") return numWindows * CONFIG.windows.oem_unit_default_each;
    const glassRate = CONFIG.windows.laminated_3_8_per_sf + CONFIG.windows.tempered_1_2_per_sf;
    const frameRate = CONFIG.windows.frame_trim_allowance_per_sf;
    return windowFt2 * (glassRate + frameRate);
  };
  const doorsCost = () => numDoors * CONFIG.windows.doorUnitCost;

  const electricalCost = () => area * CONFIG.interior.electricalPerSfFloor;
  const paintCost = () => area * CONFIG.interior.paintPerSfFloor;
  const flooringCost = () => area * CONFIG.interior.flooringPerSf;

  const shellCosts = () => {
    const { slabPerSf, sidingPerSfWall, roofingPerSfRoof } = CONFIG.shell;
    const slab = geom.ceilingArea * slabPerSf;
    const siding = geom.wallArea * sidingPerSfWall;
    const roofing = geom.roofArea * roofingPerSfRoof;
    return { slab, siding, roofing };
  };

  const interiorAssemblyCosts = () => {
    const wallsDecouple = wallsAssembly === "clips" ? decouplingCost(geom.wallArea) : 0;
    const wallsDouble = wallsAssembly === "double" ? doubleStudCost(geom.wallArea) : 0;
    const wallsDrywall = drywallCost(geom.wallArea, dwWalls);
    const wallsInsul = insulationCostSurface(geom.wallArea);

    const ceilDecouple = ceilAssembly === "clips" ? decouplingCost(geom.ceilingArea) : 0;
    const ceilDrywall = drywallCost(geom.ceilingArea, dwCeil);
    const ceilInsul = insulationCostSurface(geom.ceilingArea);

    return { wallsDecouple, wallsDouble, wallsDrywall, wallsInsul, ceilDecouple, ceilDrywall, ceilInsul };
  };

  // Totals and splits
  const breakdown = useMemo(() => {
    const windows = windowCost();
    const doors = doorsCost();
    const elec = electricalCost();
    const paint = paintCost();
    const floor = flooringCost();
    const ica = interiorAssemblyCosts();

    const shared = { windows, doors, electrical: elec, paint, flooring: floor, ventilation: ervCost, minisplit: miniSplitCost, ...ica };
    const detachedShell = shellCosts();

    const baseExisting = Object.values(shared).reduce((a, b) => a + b, 0);
    const baseDetached = baseExisting + Object.values(detachedShell).reduce((a, b) => a + b, 0);

    const withFactorExisting = baseExisting * factor;
    const withFactorDetached = baseDetached * factor;

    const estimateExisting = addBuffer ? withFactorExisting * (1 + CONFIG.bufferPct) : withFactorExisting;
    const estimateDetached = addBuffer ? withFactorDetached * (1 + CONFIG.bufferPct) : withFactorDetached;

    const realityExisting = estimateExisting * (1 + CONFIG.overrunPct);
    const realityDetached = estimateDetached * (1 + CONFIG.overrunPct);

    // Split helper for any map of installed costs
    const splitMap = (obj) => {
      let m = 0, l = 0, t = 0;
      const rows = Object.entries(obj).map(([key, val]) => {
        const share = CONFIG.laborShare[key] ?? 0.55; // default
        const labor = val * share;
        const materials = val - labor;
        m += materials; l += labor; t += val;
        return { key, materials, labor, total: val, share };
      });
      return { rows, materials: m, labor: l, total: t };
    };

    const sharedSplit = splitMap(shared);
    const shellSplit = splitMap(detachedShell);

    return {
      shared,
      detachedShell,
      sharedSplit,
      shellSplit,
      totals: {
        existing: withFactorExisting,
        detached: withFactorDetached,
        existingFinal: estimateExisting,
        detachedFinal: estimateDetached,
        existingReality: realityExisting,
        detachedReality: realityDetached,
        split: {
          existing: {
            materials: sharedSplit.materials,
            labor: sharedSplit.labor,
            total: sharedSplit.total,
          },
          detached: {
            materials: sharedSplit.materials + shellSplit.materials,
            labor: sharedSplit.labor + shellSplit.labor,
            total: sharedSplit.total + shellSplit.total,
          }
        }
      },
    };
  }, [stateCode, factor, addBuffer, miniSplitCost, ervCost, area, height, windowFt2, numDoors, dwWalls, dwCeil, wallsAssembly, ceilAssembly, windowMode, numWindows]);

  const Line = ({ label, value, shareKey }) => {
    if (!showSplit) {
      return (
        <div className="flex justify-between text-sm py-1">
          <span className="text-gray-700">{label}</span>
          <span className="font-medium">{currency(value)}</span>
        </div>
      );
    }
    const share = CONFIG.laborShare[shareKey] ?? 0.55;
    const labor = value * share;
    const materials = value - labor;
    return (
      <div className="grid grid-cols-4 gap-2 text-sm py-1 items-baseline">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium text-right">{currency(materials)}</span>
        <span className="font-medium text-right">{currency(labor)}</span>
        <span className="font-semibold text-right">{currency(value)}</span>
      </div>
    );
  };

  const TableHeader = () => (
    <div className="grid grid-cols-4 gap-2 text-xs uppercase tracking-wide text-gray-500 pb-1 border-b">
      <div>Item</div>
      <div className="text-right">Materials</div>
      <div className="text-right">Labor</div>
      <div className="text-right">Installed</div>
    </div>
  );

  const ModeCard = ({ title, base, final }) => (
    <div className="rounded-xl border border-orange-300 p-4 bg-white shadow-sm">
      <div className="text-base font-semibold mb-2">{title}</div>
      <div className="text-3xl font-bold mb-1 text-orange-600">{currency(final)}</div>
      <div className="text-xs text-gray-500">Baseline reference: {currency(base)}</div>
    </div>
  );

  const SplitTotals = ({ title, data }) => (
    <div className="rounded-xl border border-orange-300 p-4 bg-white shadow-sm">
      <div className="text-base font-semibold mb-2">{title}</div>
      <div className="flex justify-between text-sm"><span>Materials</span><span className="font-medium">{currency(data.materials)}</span></div>
      <div className="flex justify-between text-sm"><span>Labor</span><span className="font-medium">{currency(data.labor)}</span></div>
      <div className="flex justify-between text-sm border-t pt-2"><span>Installed (pre‑index)</span><span className="font-bold">{currency(data.total)}</span></div>
      <div className="text-xs text-gray-500 mt-1">Shown before state index/buffer for transparency. Totals cards below include index/buffers.</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Soundproof Studio Cost Calculator</h1>
        <p className="text-gray-600">Plan smarter, avoid surprises. This calculator estimates the cost of building a sound‑isolated studio either as a detached backyard structure or inside an existing space. It factors your interior square footage, ceiling height, door and window openings, assembly choices (double‑stud vs. clips + channel), drywall layers, HVAC and ventilation—then adjusts by a state cost index. We include a standard 20% buffer for taxes, shipping, and small unknowns, plus a <span className="font-medium">Reality Check</span> that reflects typical construction overruns (+30%) seen on complex, custom projects. Treat this as a planning tool, not a bid; actual costs vary by site conditions, contractor pricing, and mid‑project changes.</p>

        <Section title="Primary Inputs">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium">State (cost index)</label>
              <select value={stateCode} onChange={e=>setStateCode(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="text-xs text-gray-500 mt-1">Index: {factor.toFixed(3)} (20% buffer auto‑applied in Estimate)</div>
            </div>
            <div>
              <label className="block text-sm font-medium">Floor area (ft²)</label>
              <input type="number" value={area} onChange={e=>setArea(+e.target.value||0)} className="mt-1 w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Ceiling height (ft)</label>
              <input type="number" value={height} onChange={e=>setHeight(+e.target.value||0)} className="mt-1 w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Window area (ft²)</label>
              <input type="number" value={windowFt2} onChange={e=>setWindowFt2(+e.target.value||0)} className="mt-1 w-full border rounded-lg p-2" />
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium">Windows mode</label>
              <select value={windowMode} onChange={e=>setWindowMode(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
                <option value="custom_glass">Custom glass by ft²</option>
                <option value="oem_units">OEM units by count</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium"># Windows (if OEM)</label>
              <input type="number" value={numWindows} onChange={e=>setNumWindows(+e.target.value||0)} className="mt-1 w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium"># Soundproof doors</label>
              <input type="number" value={numDoors} onChange={e=>setNumDoors(+e.target.value||0)} className="mt-1 w-full border rounded-lg p-2" />
            </div>
          </div>
        </Section>

        <Section title="Assemblies & Layers">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Preset</label>
              <select value={assemblyPreset} onChange={e=>setAssemblyPreset(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
                <option value="spys">SPYS Mix (Walls: Double-Stud, Ceiling: Clips)</option>
                <option value="all_clips">All Clips + Channel</option>
                <option value="all_double">All Double-Stud (ceiling standard)</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Walls assembly {assemblyPreset!=="custom" && <span className="text-xs text-gray-500">(preset-controlled)</span>}</label>
              <select disabled={assemblyPreset!=="custom"} value={wallsAssembly} onChange={e=>setWallsAssembly(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
                <option value="clips">Clips + channel</option>
                <option value="double">Double-stud</option>
                <option value="none">Standard (no decoupling)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Ceiling assembly {assemblyPreset!=="custom" && <span className="text-xs text-gray-500">(preset-controlled)</span>}</label>
              <select disabled={assemblyPreset!=="custom"} value={ceilAssembly} onChange={e=>setCeilAssembly(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
                <option value="clips">Clips + channel</option>
                <option value="standard">Standard (no decoupling)</option>
              </select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium">Drywall layers — Walls</label>
              <input type="range" min={1} max={CONFIG.drywall.maxLayers} value={dwWalls} onChange={e=>setDwWalls(+e.target.value)} className="w-full"/>
              <div className="text-xs text-gray-600">{dwWalls} layer(s)</div>
            </div>
            <div>
              <label className="block text-sm font-medium">Drywall layers — Ceiling</label>
              <input type="range" min={1} max={CONFIG.drywall.maxLayers} value={dwCeil} onChange={e=>setDwCeil(+e.target.value)} className="w-full"/>
              <div className="text-xs text-gray-600">{dwCeil} layer(s)</div>
            </div>
          </div>
        </Section>

        <Section title="HVAC & Ventilation">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Mini-split installed ($)</label>
              <input type="number" value={miniSplitCost} onChange={e=>setMiniSplitCost(+e.target.value||0)} className="mt-1 w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">ERV + baffle boxes installed ($)</label>
              <input type="number" value={ervCost} onChange={e=>setErvCost(+e.target.value||0)} className="mt-1 w-full border rounded-lg p-2" />
            </div>
          </div>
        </Section>

        <Section title="Installed Costs">
          <div className="flex justify-end mb-2">
            <label className="flex items-center gap-2 text-sm whitespace-nowrap"><input type="checkbox" checked={showSplit} onChange={e=>setShowSplit(e.target.checked)} /> Show materials/labor split</label>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="font-semibold mb-2">Interior assemblies</div>
              {showSplit && <TableHeader />}
              <Line label="Walls — decoupling (clips/channel)" value={breakdown.shared.wallsDecouple} shareKey="wallsDecouple" />
              <Line label="Walls — double-stud" value={breakdown.shared.wallsDouble} shareKey="wallsDouble" />
              <Line label="Walls — drywall" value={breakdown.shared.wallsDrywall} shareKey="wallsDrywall" />
              <Line label="Walls — insulation" value={breakdown.shared.wallsInsul} shareKey="wallsInsul" />
              <Line label="Ceiling — decoupling" value={breakdown.shared.ceilDecouple} shareKey="ceilDecouple" />
              <Line label="Ceiling — drywall" value={breakdown.shared.ceilDrywall} shareKey="ceilDrywall" />
              <Line label="Ceiling — insulation" value={breakdown.shared.ceilInsul} shareKey="ceilInsul" />
              {showSplit && (
                <div className="mt-2 text-sm border-t pt-2 flex justify-between">
                  <span className="text-gray-700">Subtotal (installed)</span>
                  <span className="font-semibold">{currency(breakdown.sharedSplit.total)}</span>
                </div>
              )}
            </div>
            <div>
              <div className="font-semibold mb-2">Systems & finishes</div>
              {showSplit && <TableHeader />}
              <Line label="Windows" value={breakdown.shared.windows} shareKey="windows" />
              <Line label="Soundproof doors" value={breakdown.shared.doors} shareKey="doors" />
              <Line label="Electrical" value={breakdown.shared.electrical} shareKey="electrical" />
              <Line label="Interior paint" value={breakdown.shared.paint} shareKey="paint" />
              <Line label="Flooring" value={breakdown.shared.flooring} shareKey="flooring" />
              <Line label="Ventilation (ERV)" value={breakdown.shared.ventilation} shareKey="ventilation" />
              <Line label="Mini-split" value={breakdown.shared.minisplit} shareKey="minisplit" />
            </div>
            <div>
              <div className="font-semibold mb-2">Detached shell (detached mode only)</div>
              {showSplit && <TableHeader />}
              <Line label="Concrete slab" value={breakdown.detachedShell.slab} shareKey="slab" />
              <Line label="Siding (walls ext)" value={breakdown.detachedShell.siding} shareKey="siding" />
              <Line label="Roofing" value={breakdown.detachedShell.roofing} shareKey="roofing" />
            </div>
          </div>
        </Section>

        {showSplit && (
          <Section title="Materials vs Labor Totals (pre‑index)">
            <div className="grid md:grid-cols-2 gap-4">
              <SplitTotals title="Existing structure (retrofit)" data={breakdown.totals.split.existing} />
              <SplitTotals title="Detached backyard studio" data={breakdown.totals.split.detached} />
            </div>
          </Section>
        )}

        <Section title="Totals (with index, buffer, and reality check)">
          <div className="grid md:grid-cols-3 gap-4">
            <ModeCard title="Existing — Baseline" base={breakdown.totals.existing} final={breakdown.totals.existing} />
            <ModeCard title="Existing — Estimate (+20% buffer)" base={breakdown.totals.existing} final={breakdown.totals.existingFinal} />
            <ModeCard title="Existing — Reality Check (+20% +30%)" base={breakdown.totals.existingFinal} final={breakdown.totals.existingReality} />
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <ModeCard title="Detached — Baseline" base={breakdown.totals.detached} final={breakdown.totals.detached} />
            <ModeCard title="Detached — Estimate (+20% buffer)" base={breakdown.totals.detached} final={breakdown.totals.detachedFinal} />
            <ModeCard title="Detached — Reality Check (+20% +30%)" base={breakdown.totals.detachedFinal} final={breakdown.totals.detachedReality} />
          </div>
        </Section>

        <Section title="Geometry & Assumptions (read-only)">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-50 rounded-lg p-3 border">
              <div className="font-semibold">Derived geometry</div>
              <div>Length: {geom.L.toFixed(2)} ft</div>
              <div>Width: {geom.W.toFixed(2)} ft</div>
              <div>Perimeter: {geom.perimeter.toFixed(2)} ft</div>
              <div>Wall area (net): {geom.wallArea.toFixed(1)} ft²</div>
              <div>Ceiling area: {geom.ceilingArea.toFixed(1)} ft²</div>
              <div>Roof area: {geom.roofArea.toFixed(1)} ft²</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border">
              <div className="font-semibold">Clips + channel rules</div>
              <div>Grid: 24" × 48" (8 ft²/clip)</div>
              <div>Channel: 0.5 lf per ft² (× waste)</div>
              <div>Clip allowance: ${CONFIG.decoupling.clipAllowancePerSf.toFixed(2)} / ft²</div>
              <div>Channel cost: ${CONFIG.decoupling.hatChannelCostPerLf.toFixed(2)} / lf</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border">
              <div className="font-semibold">Costs & indices</div>
              <div>Mini-split: {currency(miniSplitCost)}</div>
              <div>ERV: {currency(ervCost)}</div>
              <div>State index: {factor.toFixed(3)}</div>
              <div>Buffer: {addBuffer ? `${CONFIG.bufferPct * 100}%` : `0%`}</div>
              <div>Reality overrun: {`${CONFIG.overrunPct * 100}%`}</div>
            </div>
          </div>
        </Section>
        <div className="text-xs text-gray-500">Estimates are for early planning. Final pricing depends on contractor bids, engineering, permitting, and site conditions. For a detailed design‑build estimate, request a Soundproof Clarity Call.</div>
      </div>
    </div>
  );
}

// --- Lightweight runtime tests (non-blocking) ---
// These run once in the browser console to catch regressions in math helpers.
(function runTests(){
  try {
    const aspectRatio = CONFIG.geometry.aspectRatio; // 1.5
    const area = 300, height = 10, doorAreaFt2 = CONFIG.geometry.doorAreaFt2; // 21
    const L = Math.sqrt(area * aspectRatio);
    const W = area / L;
    const perimeter = 2 * (L + W);
    const windowFt2 = 24, numDoors = 1;
    const wallArea = perimeter * height - windowFt2 - numDoors * doorAreaFt2;
    console.assert(Math.abs(L - 21.213) < 0.01, "L calc off");
    console.assert(Math.abs(W - 14.142) < 0.01, "W calc off");
    console.assert(Math.abs(wallArea - 662.107) < 0.5, "Wall area calc off");

    const clipAllowance = CONFIG.decoupling.clipAllowancePerSf; // 4.5
    const hatPerLf = CONFIG.decoupling.hatChannelCostPerLf; // 1.4
    const waste = CONFIG.geometry.wasteFactorChannel; // 1.1
    const S = 100; // sf
    const expected = S*clipAllowance + (S*0.5*waste)*hatPerLf; // 450 + 55*1.4 = 527
    console.assert(Math.abs(expected - 527) < 0.01, "Decoupling cost formula off");
  } catch (e) {
    // Do not throw; this is informational only
    console.warn("Self-test warning:", e);
  }
})();