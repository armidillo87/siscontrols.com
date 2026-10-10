/**
 * Sawtooth Industrial Systems (siscontrols.com)
 * Interactive Short-Circuit Current Rating (SCCR) Calculator & Thermodynamic Previewer
 * 
 * Standards & Engineering Reference:
 * - UL 508A Supplement SB (SB4.1 Default Ratings, SB4.2 Tested Combinations)
 * - NEC Article 409 (Industrial Control Panels SCCR Requirements)
 * - NEC 312.6 (Wire Bending Space for Power Conductors)
 * - Enclosure Thermodynamics & Climate Sizing (Heat Dissipation & Cooling Selection)
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Engineering Catalog & Supplement SB Rating Data
  // ---------------------------------------------------------------------------
  const COMPONENT_DATA = {
    mainDisconnect: {
      'mccb-std': {
        name: 'Standard Thermal-Mag MCCB (18kA)',
        aic: 18,
        defaultSccr: 18,
        widthMm: 105,
        watts: 20,
        type: 'breaker',
        desc: 'Eaton BAB / Square D QO industrial branch frame (18kA @ 480V)'
      },
      'mccb-high': {
        name: 'High-Interrupting MCCB (65kA)',
        aic: 65,
        defaultSccr: 65,
        widthMm: 120,
        watts: 25,
        type: 'breaker',
        desc: 'Eaton HFD / Square D H-Frame current-limiting breaker (65kA @ 480V)'
      },
      'mccb-ultra': {
        name: 'Mission-Critical High-AIC MCCB (100kA)',
        aic: 100,
        defaultSccr: 100,
        widthMm: 140,
        watts: 35,
        type: 'breaker',
        desc: 'Eaton HMCPE / ABB Tmax XT current-limiting frame (100kA @ 480V)'
      },
      'fuse-class-j': {
        name: 'Class J Current-Limiting Fuse Switch (200kA)',
        aic: 200,
        defaultSccr: 200,
        widthMm: 130,
        watts: 15,
        type: 'fuse',
        desc: 'Mersen UltraSafe / Bussmann Class J rotary disconnect (200kA IR)'
      }
    },

    feederPdb: {
      'pdb-standard': {
        name: 'Standard Open PDB (10kA Uncoordinated)',
        sccr: 10,
        defaultSccr: 10,
        widthMm: 75,
        watts: 5,
        desc: 'Standard unlisted distribution block. Table SB4.1 defaults to 10kA bottleneck.'
      },
      'pdb-high-fault': {
        name: 'High-Fault Finger-Safe PDB (100kA Coordinated)',
        sccr: 100,
        defaultSccr: 100,
        widthMm: 95,
        watts: 8,
        desc: 'Mersen FSPDB series rated 100kA/200kA when protected by Class J fuses.'
      }
    },

    branchStarters: {
      'starter-std': {
        name: 'Standard IEC Contactor + Overload (5kA)',
        sccr: 5,
        defaultSccr: 5,
        widthMm: 45,
        watts: 8,
        desc: 'Standard non-combination motor starter without certified high-fault coordination.'
      },
      'starter-coordinated-65': {
        name: 'Type E Combination Motor Controller (65kA)',
        sccr: 65,
        defaultSccr: 65,
        widthMm: 55,
        watts: 10,
        desc: 'Self-protected Type E starter (Rockwell 140G / Eaton XTCR) rated 65kA @ 480V.'
      },
      'starter-fused-100': {
        name: 'Class J Fused Motor Contactor (100kA)',
        sccr: 100,
        defaultSccr: 100,
        widthMm: 70,
        watts: 12,
        desc: 'Tested combination with Class J fuse protection achieving 100kA fault withstand.'
      }
    },

    branchVfds: {
      'vfd-std-5': {
        name: 'Compact VFD (5kA Default SB4.1)',
        sccr: 5,
        defaultSccr: 5,
        widthMm: 72,
        watts: 125, // ~5HP @ 25W/HP
        desc: 'Standard inverter drive without line reactor. UL 508A Table SB4.1 mandates 5kA rating.'
      },
      'vfd-reactor-65': {
        name: 'VFD with 3% Line Reactor + Semiconductor Fuses (65kA)',
        sccr: 65,
        defaultSccr: 65,
        widthMm: 110,
        watts: 145,
        desc: 'ABB ACS580 / PowerFlex 525 with coordinated line reactor and Class J/aR branch fuses.'
      },
      'vfd-high-fault-100': {
        name: 'Mission-Critical VFD with Class J Fuses (100kA)',
        sccr: 100,
        defaultSccr: 100,
        widthMm: 140,
        watts: 160,
        desc: 'Factory-certified high-fault drive package rated 100kA for AI data center pumping skids.'
      }
    },

    fixedControls: {
      plc: { name: 'CompactLogix / S7-1500 Controller', widthMm: 110, watts: 35 },
      ioSlice: { name: '8-Channel I/O Slice', widthMm: 25, watts: 4 },
      powerSupply: { name: '24VDC 10A Power Supply (QUINT4)', widthMm: 50, watts: 25 },
      safetyRelay: { name: 'SIL-3 Safety Controller', widthMm: 45, watts: 8 },
      ethernetSwitch: { name: 'Managed 8-Port Switch', widthMm: 50, watts: 12 },
      terminalsPerSlice: { name: 'Spring-Cage Terminal Block', widthMm: 5.2, watts: 0.1 }
    }
  };

  const STANDARD_ENCLOSURES = [
    { name: '24"H x 20"W x 8"D Wall-Mount', h: 24, w: 20, d: 8, usableDinMm: 700, maxAmps: 60 },
    { name: '30"H x 24"W x 10"D Wall-Mount', h: 30, w: 24, d: 10, usableDinMm: 1000, maxAmps: 100 },
    { name: '36"H x 30"W x 10"D Wall-Mount', h: 36, w: 30, d: 10, usableDinMm: 1400, maxAmps: 200 },
    { name: '48"H x 36"W x 12"D Wall-Mount', h: 48, w: 36, d: 12, usableDinMm: 2100, maxAmps: 400 },
    { name: '60"H x 36"W x 12"D Free-Standing', h: 60, w: 36, d: 12, usableDinMm: 2800, maxAmps: 400 },
    { name: '72"H x 48"W x 18"D Free-Standing Bay', h: 72, w: 48, d: 18, usableDinMm: 4200, maxAmps: 800 },
    { name: '72"H x 72"W x 24"D Dual-Door Modular', h: 72, w: 72, d: 24, usableDinMm: 6500, maxAmps: 1200 },
    { name: '84"H x 72"W x 24"D AI Data Center Skid', h: 84, w: 72, d: 24, usableDinMm: 8000, maxAmps: 1600 }
  ];

  // ---------------------------------------------------------------------------
  // 2. Pure Mathematical Engine (UL 508A Supplement SB & Thermodynamics)
  // ---------------------------------------------------------------------------

  /**
   * Implements UL 508A Supplement SB Weakest-Link Rule:
   * Panel SCCR = min(Main Disconnect Interrupting Rating, Feeder PDB SCCR, min(Branch Components))
   */
  function calculatePanelSccr(mainDisconnectAic, feederPdbSccr, branchComponents) {
    const all = [
      { name: 'Main Disconnect', rating: Number(mainDisconnectAic) },
      { name: 'Feeder PDB', rating: Number(feederPdbSccr) }
    ];

    if (Array.isArray(branchComponents)) {
      branchComponents.forEach((b, idx) => {
        all.push({
          name: typeof b === 'object' && b.name ? b.name : `Branch Component #${idx + 1}`,
          rating: typeof b === 'object' && b.rating !== undefined ? Number(b.rating) : Number(b)
        });
      });
    }

    let minItem = all[0];
    for (let i = 1; i < all.length; i++) {
      if (all[i].rating < minItem.rating) {
        minItem = all[i];
      }
    }

    return {
      sccr: minItem.rating,
      weakestLink: minItem.name,
      components: all
    };
  }

  /**
   * Implements industrial enclosure thermodynamic dissipation model:
   * Area A (sq ft) = 2(H*W + H*D + W*D) / 144
   * Delta T (deg F) = Watts / (k * A)
   * Internal Temp = Ambient + Delta T
   * Threshold: 104 deg F (40 deg C)
   * Fan CFM = (3.16 * Watts) / max(1.0, 104 - Ambient)
   * AC BTU/hr = Watts * 3.412 * 1.25 (25% safety factor)
   */
  function calculateThermalDissipation(watts, heightIn, widthIn, depthIn, ambientTempF = 85.0, kCoeff = 0.30) {
    const w = Number(watts) || 0;
    const h = Number(heightIn) || 36;
    const wid = Number(widthIn) || 30;
    const d = Number(depthIn) || 10;
    const amb = Number(ambientTempF) || 85.0;
    const k = Number(kCoeff) || 0.30;

    const surfaceAreaSqFt = (2.0 * (h * wid + h * d + wid * d)) / 144.0;
    const deltaT = surfaceAreaSqFt > 0 ? w / (k * surfaceAreaSqFt) : 0;
    const internalTemp = amb + deltaT;
    const coolingRequired = internalTemp > 104.0;

    let fanCfm = 0.0;
    let acBtu = 0.0;

    if (coolingRequired) {
      fanCfm = (3.16 * w) / Math.max(1.0, (104.0 - amb));
      const qBtu = w * 3.412;
      acBtu = qBtu * 1.25; // 25% safety margin
    }

    return {
      surfaceAreaSqFt: Number(surfaceAreaSqFt.toFixed(2)),
      deltaT: Number(deltaT.toFixed(1)),
      internalTemp: Number(internalTemp.toFixed(1)),
      coolingRequired,
      fanCfm: Number(fanCfm.toFixed(1)),
      acBtu: Number(acBtu.toFixed(1))
    };
  }

  /**
   * Calculates required DIN rail length and suggests quantized enclosure
   */
  function calculatePhysicalDimensions(itemCounts, incomingAmps = 100) {
    let totalLinearMm = 0;
    let totalWatts = 0;

    // Main Disconnect
    const disc = COMPONENT_DATA.mainDisconnect[itemCounts.mainDisconnect] || COMPONENT_DATA.mainDisconnect['mccb-std'];
    totalLinearMm += disc.widthMm;
    totalWatts += disc.watts;

    // Feeder PDB
    const pdb = COMPONENT_DATA.feederPdb[itemCounts.feederPdb] || COMPONENT_DATA.feederPdb['pdb-standard'];
    totalLinearMm += pdb.widthMm;
    totalWatts += pdb.watts;

    // Branch Starters
    const starterQty = Math.max(0, parseInt(itemCounts.starterQty, 10) || 0);
    const starter = COMPONENT_DATA.branchStarters[itemCounts.branchStarter] || COMPONENT_DATA.branchStarters['starter-std'];
    totalLinearMm += (starter.widthMm * starterQty);
    totalWatts += (starter.watts * starterQty);

    // Branch VFDs
    const vfdQty = Math.max(0, parseInt(itemCounts.vfdQty, 10) || 0);
    const vfd = COMPONENT_DATA.branchVfds[itemCounts.branchVfd] || COMPONENT_DATA.branchVfds['vfd-std-5'];
    totalLinearMm += (vfd.widthMm * vfdQty);
    totalWatts += (vfd.watts * vfdQty);

    // Fixed Standard Core Components
    totalLinearMm += COMPONENT_DATA.fixedControls.plc.widthMm;
    totalWatts += COMPONENT_DATA.fixedControls.plc.watts;

    const ioQty = Math.max(2, parseInt(itemCounts.ioSlices, 10) || 4);
    totalLinearMm += (COMPONENT_DATA.fixedControls.ioSlice.widthMm * ioQty);
    totalWatts += (COMPONENT_DATA.fixedControls.ioSlice.watts * ioQty);

    totalLinearMm += COMPONENT_DATA.fixedControls.powerSupply.widthMm;
    totalWatts += COMPONENT_DATA.fixedControls.powerSupply.watts;

    totalLinearMm += COMPONENT_DATA.fixedControls.safetyRelay.widthMm;
    totalWatts += COMPONENT_DATA.fixedControls.safetyRelay.watts;

    totalLinearMm += COMPONENT_DATA.fixedControls.ethernetSwitch.widthMm;
    totalWatts += COMPONENT_DATA.fixedControls.ethernetSwitch.watts;

    const termQty = Math.max(12, parseInt(itemCounts.terminalBlocks, 10) || 24);
    totalLinearMm += (COMPONENT_DATA.fixedControls.terminalsPerSlice.widthMm * termQty);
    totalWatts += (COMPONENT_DATA.fixedControls.terminalsPerSlice.watts * termQty);

    // Add 25% Mandatory Spare Expansion Space
    const requiredDinMm = Math.round(totalLinearMm * 1.25);

    // Select smallest suitable NEMA enclosure
    let matchedEnc = STANDARD_ENCLOSURES[STANDARD_ENCLOSURES.length - 1];
    for (const enc of STANDARD_ENCLOSURES) {
      if (enc.usableDinMm >= requiredDinMm && enc.maxAmps >= incomingAmps) {
        matchedEnc = enc;
        break;
      }
    }

    return {
      rawDinMm: totalLinearMm,
      requiredDinMm,
      totalWatts: Math.round(totalWatts),
      enclosure: matchedEnc
    };
  }

  // ---------------------------------------------------------------------------
  // 3. UI Component & DOM Mounting Engine
  // ---------------------------------------------------------------------------
  class SccrCalculatorWidget {
    constructor(container) {
      this.container = container;
      this.state = {
        mainDisconnect: 'mccb-high',
        feederPdb: 'pdb-high-fault',
        branchStarter: 'starter-coordinated-65',
        starterQty: 2,
        branchVfd: 'vfd-reactor-65',
        vfdQty: 2,
        ioSlices: 4,
        terminalBlocks: 32,
        ambientTempF: 85,
        voltage: 480,
        incomingAmps: 100,
        enclosureMaterial: 'painted-steel' // painted-steel (k=0.30) or stainless (k=0.18)
      };

      this.render();
      this.bindEvents();
      this.recalculate();
    }

    render() {
      this.container.innerHTML = `
        <div class="sccr-calculator sis-card-enclosure p-6 md:p-8" data-widget="sccr">
          <!-- Widget Header -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-700/80">
            <div>
              <div class="flex items-center gap-2">
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span class="font-mono text-xs uppercase tracking-widest text-amber-400 font-bold">UL 508A SUPPLEMENT SB ENGINE</span>
              </div>
              <h2 class="text-xl md:text-2xl font-black text-white tracking-wide mt-1">Interactive SCCR & Thermodynamic Analyzer</h2>
              <p class="text-xs md:text-sm text-slate-400 mt-0.5">Calculate panel short-circuit withstand rating, weakest-link bottleneck, and enclosure cooling requirements in real-time.</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="sis-badge sis-badge--amber font-mono text-xs">NEC 409 COMPLIANT</span>
              <span class="sis-badge sis-badge--emerald font-mono text-xs">100% FAT READY</span>
            </div>
          </div>

          <!-- Main Interactive Body: 2 Columns (Controls vs Real-Time Engineering Output) -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
            
            <!-- LEFT COLUMN: Component & Power Selectors (7 cols) -->
            <div class="lg:col-span-7 space-y-5">
              
              <!-- SECTION A: Main Service & Feeder Coordination -->
              <div class="bg-slate-900/80 rounded-lg p-4 border border-slate-800 space-y-4">
                <div class="flex items-center justify-between">
                  <span class="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <span class="w-2 h-2 bg-amber-500 rounded-sm"></span>
                    1. Incoming Feeder & Power Circuit
                  </span>
                  <span class="text-[11px] font-mono text-slate-400">480V 3-Phase Standard</span>
                </div>

                <!-- Main Disconnect Selector -->
                <div>
                  <label for="main-disconnect-select" class="block text-xs font-bold text-slate-300 mb-1.5">
                    Main Disconnect / Overcurrent Protective Device (OCPD)
                  </label>
                  <select id="main-disconnect-select" class="w-full bg-[#0F172A] border border-slate-700 rounded-md px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500 transition-colors">
                    <option value="mccb-std">Standard Thermal-Mag MCCB (18kA @ 480V)</option>
                    <option value="mccb-high" selected>High-Interrupting MCCB Frame (65kA @ 480V)</option>
                    <option value="mccb-ultra">Current-Limiting High-AIC MCCB (100kA @ 480V)</option>
                    <option value="fuse-class-j">Class J High-Speed Fused Disconnect (200kA IR)</option>
                  </select>
                </div>

                <!-- Feeder PDB Selector -->
                <div>
                  <label for="feeder-pdb-select" class="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Power Distribution Block (PDB)</span>
                    <span class="text-amber-400 text-[10px] uppercase font-mono font-normal">Common Bottleneck Point</span>
                  </label>
                  <select id="feeder-pdb-select" class="w-full bg-[#0F172A] border border-slate-700 rounded-md px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500 transition-colors">
                    <option value="pdb-standard">Standard Open PDB (10kA Default per Table SB4.1)</option>
                    <option value="pdb-high-fault" selected>High-Fault Finger-Safe PDB (100kA Coordinated with Class J)</option>
                  </select>
                </div>

                <!-- Incoming Service Amperage & Voltage -->
                <div class="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label for="voltage-select" class="block text-xs font-bold text-slate-300 mb-1">System Voltage</label>
                    <select id="voltage-select" class="w-full bg-[#0F172A] border border-slate-700 rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500">
                      <option value="480" selected>480V 3-Phase</option>
                      <option value="208">208V 3-Phase</option>
                      <option value="240">240V 3-Phase</option>
                      <option value="600">600V 3-Phase</option>
                    </select>
                  </div>
                  <div>
                    <label for="incoming-amps-input" class="block text-xs font-bold text-slate-300 mb-1">Service Amps (FLA)</label>
                    <select id="incoming-amps-input" class="w-full bg-[#0F172A] border border-slate-700 rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500">
                      <option value="30">30 Amperes</option>
                      <option value="60">60 Amperes</option>
                      <option value="100" selected>100 Amperes</option>
                      <option value="200">200 Amperes</option>
                      <option value="400">400 Amperes</option>
                      <option value="800">800 Amperes</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- SECTION B: Branch Circuit Loads & Motor Controllers -->
              <div class="bg-slate-900/80 rounded-lg p-4 border border-slate-800 space-y-4">
                <div class="flex items-center justify-between">
                  <span class="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <span class="w-2 h-2 bg-amber-500 rounded-sm"></span>
                    2. Branch Motor Circuits & Inverters
                  </span>
                  <span class="text-[11px] font-mono text-slate-400">UL 508A Table SB4.2</span>
                </div>

                <!-- Branch Contactor Selection + Quantity -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div class="md:col-span-2">
                    <label for="branch-starter-select" class="block text-xs font-bold text-slate-300 mb-1">Motor Starters / Contactors</label>
                    <select id="branch-starter-select" class="w-full bg-[#0F172A] border border-slate-700 rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500">
                      <option value="starter-std">Standard Contactor + Overload (5kA Default)</option>
                      <option value="starter-coordinated-65" selected>Type E Manual Comb. Controller (65kA)</option>
                      <option value="starter-fused-100">Class J Fused Contactor Array (100kA)</option>
                    </select>
                  </div>
                  <div>
                    <label for="starter-qty-input" class="block text-xs font-bold text-slate-300 mb-1">Starter Qty</label>
                    <input type="number" id="starter-qty-input" min="0" max="16" value="2" class="w-full bg-[#0F172A] border border-slate-700 rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500">
                  </div>
                </div>

                <!-- Branch VFD Selection + Quantity -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div class="md:col-span-2">
                    <label for="branch-vfd-select" class="block text-xs font-bold text-slate-300 mb-1">Variable Frequency Drives (VFD)</label>
                    <select id="branch-vfd-select" class="w-full bg-[#0F172A] border border-slate-700 rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500">
                      <option value="vfd-std-5">Standard Compact Drive (5kA Table SB4.1)</option>
                      <option value="vfd-reactor-65" selected>Drive + 3% Line Reactor + Fuses (65kA)</option>
                      <option value="vfd-high-fault-100">High-Fault Tested VFD Package (100kA)</option>
                    </select>
                  </div>
                  <div>
                    <label for="vfd-qty-input" class="block text-xs font-bold text-slate-300 mb-1">VFD Qty</label>
                    <input type="number" id="vfd-qty-input" min="0" max="8" value="2" class="w-full bg-[#0F172A] border border-slate-700 rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500">
                  </div>
                </div>
              </div>

              <!-- SECTION C: Enclosure Climate & Operating Environment -->
              <div class="bg-slate-900/80 rounded-lg p-4 border border-slate-800 space-y-4">
                <div class="flex items-center justify-between">
                  <span class="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <span class="w-2 h-2 bg-amber-500 rounded-sm"></span>
                    3. Enclosure Environment & Ambient Thermal
                  </span>
                  <span class="text-[11px] font-mono text-slate-400">Thermodynamic ΔT</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="enclosure-select" class="block text-xs font-bold text-slate-300 mb-1">Enclosure Material</label>
                    <select id="enclosure-select" class="w-full bg-[#0F172A] border border-slate-700 rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500">
                      <option value="painted-steel" selected>Painted Mild Carbon Steel (k = 0.30)</option>
                      <option value="stainless-steel">316L Stainless Steel NEMA 4X (k = 0.18)</option>
                    </select>
                  </div>
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <label for="ambient-temp-slider" class="text-xs font-bold text-slate-300">Ambient Temperature</label>
                      <span id="ambient-temp-display" class="font-mono text-xs text-amber-400 font-bold">85°F</span>
                    </div>
                    <input type="range" id="ambient-temp-slider" min="60" max="115" value="85" class="w-full accent-amber-500 cursor-pointer">
                  </div>
                </div>
              </div>

            </div>

            <!-- RIGHT COLUMN: Live Engineering Telemetry & Diagnostics (5 cols) -->
            <div class="lg:col-span-5 space-y-6">

              <!-- CARD 1: Overall Panel SCCR Rating & Weakest Link -->
              <div class="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border-2 border-amber-500/50 rounded-xl p-6 shadow-2xl relative overflow-hidden">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-mono uppercase tracking-widest text-slate-400">PANEL WITHSTAND RATING</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">UL 508A SB</span>
                </div>

                <div class="flex items-baseline gap-2">
                  <span id="sccr-result-value" class="text-4xl md:text-5xl font-black text-amber-400 font-mono tracking-tight">65 kA</span>
                  <span class="text-sm font-mono text-slate-400">@ 480V RMS Sym</span>
                </div>

                <!-- Weakest Link Component Alert -->
                <div class="mt-4 pt-4 border-t border-slate-700/80">
                  <div class="text-xs text-slate-400 font-sans">Bottleneck Governing Device:</div>
                  <div id="sccr-weakest-link" class="text-sm font-bold text-white font-mono mt-0.5 flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    <span>Main Disconnect & Branch VFD (Coordinated at 65kA)</span>
                  </div>
                  <div id="sccr-optimization-tip" class="text-xs text-amber-300/90 mt-2 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-md leading-relaxed">
                    <!-- Dynamic Tip injected here -->
                  </div>
                </div>
              </div>

              <!-- CARD 2: Physical Enclosure Sizing Preview -->
              <div class="bg-slate-900/90 border border-slate-700 rounded-xl p-5 space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span class="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold">ENCLOSURE SIZING ESTIMATE</span>
                  <span class="text-xs font-mono text-emerald-400 font-semibold">+25% DIN SPARE</span>
                </div>

                <div class="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <span class="text-slate-400 block text-[11px]">Recommended Enclosure:</span>
                    <span id="enclosure-name-est" class="text-white font-bold text-sm block mt-0.5">36"H x 30"W x 10"D</span>
                  </div>
                  <div>
                    <span class="text-slate-400 block text-[11px]">Required DIN Rail:</span>
                    <span id="din-space-est" class="text-amber-400 font-bold text-sm block mt-0.5">1,240 mm</span>
                  </div>
                  <div>
                    <span class="text-slate-400 block text-[11px]">NEC 312.6 Wire Bend Space:</span>
                    <span id="wire-bend-est" class="text-white font-bold block mt-0.5">4.0 in (Min)</span>
                  </div>
                  <div>
                    <span class="text-slate-400 block text-[11px]">Cabinet Footprint:</span>
                    <span id="enclosure-dims-est" class="text-white font-bold block mt-0.5">
                      <span id="panel-width-est">30"W</span> × <span id="panel-height-est">36"H</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- CARD 3: Thermodynamic Dissipation & Active Cooling -->
              <div class="bg-slate-900/90 border border-slate-700 rounded-xl p-5 space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span class="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold">THERMAL DISSIPATION ENGINE</span>
                  <span id="cooling-badge" class="sis-badge sis-badge--emerald text-[10px]">CONVECTION OK</span>
                </div>

                <div class="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <span class="text-slate-400 block text-[11px]">Internal Heat Load:</span>
                    <span id="heat-dissipation-watts" class="text-amber-400 font-bold text-base block mt-0.5">390 W</span>
                    <span id="heat-dissipation-btu" class="text-slate-400 text-[10px] block">1,331 BTU/hr</span>
                  </div>
                  <div>
                    <span class="text-slate-400 block text-[11px]">Enclosure ΔT Rise:</span>
                    <span id="temp-rise-delta" class="text-white font-bold text-base block mt-0.5">+18.2 °F</span>
                    <span id="internal-temp-est" class="text-slate-300 text-[10px] block">Internal: 103.2°F (Limit: 104°F)</span>
                  </div>
                </div>

                <!-- Climate Recommendation Callout -->
                <div class="pt-3 border-t border-slate-800">
                  <div class="text-[11px] font-sans text-slate-400">Cooling System Recommendation:</div>
                  <div id="cooling-recommendation" class="text-xs font-mono font-bold text-white mt-1 p-2.5 rounded bg-slate-800/80 border border-slate-700 leading-relaxed">
                    Natural Convection Cooling Sufficient (Internal Temp ≤ 104°F)
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- Bottom Action Prompt -->
          <div class="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="text-xs text-slate-400 flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>Calculations verified against UL 508A 3rd Edition and NEC Article 409 standards.</span>
            </div>
            <a href="/rfq" class="btn-sis-rfq text-xs shrink-0 w-full sm:w-auto text-center">
              APPLY TO PROJECT RFQ &rarr;
            </a>
          </div>
        </div>
      `;
    }

    bindEvents() {
      const get = (id) => this.container.querySelector(`#${id}`);

      const mainSelect = get('main-disconnect-select');
      const pdbSelect = get('feeder-pdb-select');
      const starterSelect = get('branch-starter-select');
      const starterQty = get('starter-qty-input');
      const vfdSelect = get('branch-vfd-select');
      const vfdQty = get('vfd-qty-input');
      const voltSelect = get('voltage-select');
      const ampSelect = get('incoming-amps-input');
      const encSelect = get('enclosure-select');
      const ambSlider = get('ambient-temp-slider');
      const ambDisplay = get('ambient-temp-display');

      const triggerRecalc = () => {
        this.state.mainDisconnect = mainSelect.value;
        this.state.feederPdb = pdbSelect.value;
        this.state.branchStarter = starterSelect.value;
        this.state.starterQty = parseInt(starterQty.value, 10) || 0;
        this.state.branchVfd = vfdSelect.value;
        this.state.vfdQty = parseInt(vfdQty.value, 10) || 0;
        this.state.voltage = parseInt(voltSelect.value, 10) || 480;
        this.state.incomingAmps = parseInt(ampSelect.value, 10) || 100;
        this.state.enclosureMaterial = encSelect.value;
        this.state.ambientTempF = parseFloat(ambSlider.value) || 85;

        if (ambDisplay) {
          ambDisplay.textContent = `${this.state.ambientTempF}°F`;
        }

        this.recalculate();
      };

      [mainSelect, pdbSelect, starterSelect, starterQty, vfdSelect, vfdQty, voltSelect, ampSelect, encSelect].forEach(el => {
        if (el) el.addEventListener('change', triggerRecalc);
      });

      if (ambSlider) {
        ambSlider.addEventListener('input', triggerRecalc);
      }
    }

    recalculate() {
      const get = (id) => this.container.querySelector(`#${id}`);

      // 1. Calculate SCCR
      const mainData = COMPONENT_DATA.mainDisconnect[this.state.mainDisconnect];
      const pdbData = COMPONENT_DATA.feederPdb[this.state.feederPdb];
      const starterData = COMPONENT_DATA.branchStarters[this.state.branchStarter];
      const vfdData = COMPONENT_DATA.branchVfds[this.state.branchVfd];

      const branches = [];
      if (this.state.starterQty > 0) {
        branches.push({ name: `Branch Motor Starter (${this.state.starterQty}x)`, rating: starterData.sccr });
      }
      if (this.state.vfdQty > 0) {
        branches.push({ name: `Branch VFD Inverter (${this.state.vfdQty}x)`, rating: vfdData.sccr });
      }

      const sccrResult = calculatePanelSccr(mainData.aic, pdbData.sccr, branches);

      // Update SCCR Output
      const sccrValEl = get('sccr-result-value');
      const weakestLinkEl = get('sccr-weakest-link');
      const tipEl = get('sccr-optimization-tip');

      if (sccrValEl) sccrValEl.textContent = `${sccrResult.sccr} kA`;
      if (weakestLinkEl) {
        if (sccrResult.sccr >= 65) {
          weakestLinkEl.innerHTML = `<span class="text-emerald-400">✓ Fully Coordinated for High-Fault Duty (${sccrResult.weakestLink}: ${sccrResult.sccr}kA)</span>`;
        } else {
          weakestLinkEl.innerHTML = `<span class="text-amber-400">⚠ Bottleneck: ${sccrResult.weakestLink} limits panel to ${sccrResult.sccr}kA</span>`;
        }
      }

      // Generate Optimization Recommendation
      if (tipEl) {
        if (sccrResult.sccr === 5) {
          tipEl.innerHTML = `<strong>Bottleneck Remediation:</strong> Unlisted standard components are holding this panel at 5kA. Upgrade to Type E manual starters and add 3% line reactors with Class J fuses on inverters to reach <strong>65kA</strong>.`;
        } else if (sccrResult.sccr === 10) {
          tipEl.innerHTML = `<strong>Bottleneck Remediation:</strong> Standard uncoordinated PDB is restricting the entire panel to 10kA per UL 508A Table SB4.1. Replace with a Mersen FSPDB Finger-Safe block to immediately unlock <strong>65kA or 100kA</strong>.`;
        } else if (sccrResult.sccr === 18) {
          tipEl.innerHTML = `<strong>Bottleneck Remediation:</strong> 18kA thermal-magnetic main breaker is the limiting component. Upgrade to Eaton HFD / Square D H-Frame (65kA) or Class J fused disconnect (200kA) to achieve mission-critical rating.`;
        } else {
          tipEl.innerHTML = `<strong>High-Fault Qualified:</strong> Panel complies with Tier-1 hyperscale data center and utility interconnection fault criteria (≥65kA @ 480V). Fully documented on serialized UL 508A nameplate.`;
        }
      }

      // 2. Calculate Physical Enclosure
      const phys = calculatePhysicalDimensions({
        mainDisconnect: this.state.mainDisconnect,
        feederPdb: this.state.feederPdb,
        branchStarter: this.state.branchStarter,
        starterQty: this.state.starterQty,
        branchVfd: this.state.branchVfd,
        vfdQty: this.state.vfdQty,
        ioSlices: 4,
        terminalBlocks: 32
      }, this.state.incomingAmps);

      const encNameEl = get('enclosure-name-est');
      const dinSpaceEl = get('din-space-est');
      const wireBendEl = get('wire-bend-est');
      const panelWidthEl = get('panel-width-est');
      const panelHeightEl = get('panel-height-est');

      if (encNameEl) encNameEl.textContent = phys.enclosure.name;
      if (dinSpaceEl) dinSpaceEl.textContent = `${phys.requiredDinMm} mm (${(phys.requiredDinMm / 25.4).toFixed(1)}")`;
      if (panelWidthEl) panelWidthEl.textContent = `${phys.enclosure.w}"W`;
      if (panelHeightEl) panelHeightEl.textContent = `${phys.enclosure.h}"H`;

      if (wireBendEl) {
        const bendSpace = this.state.incomingAmps <= 30 ? '2.0 in (NEC 312.6)' :
                         this.state.incomingAmps <= 100 ? '4.0 in (NEC 312.6)' :
                         this.state.incomingAmps <= 200 ? '6.0 in (NEC 312.6)' :
                         this.state.incomingAmps <= 400 ? '8.0 in (NEC 312.6)' : '10.0 in (NEC 312.6)';
        wireBendEl.textContent = bendSpace;
      }

      // 3. Calculate Thermodynamics
      const kCoeff = this.state.enclosureMaterial === 'stainless-steel' ? 0.18 : 0.30;
      const thermo = calculateThermalDissipation(
        phys.totalWatts,
        phys.enclosure.h,
        phys.enclosure.w,
        phys.enclosure.d,
        this.state.ambientTempF,
        kCoeff
      );

      const wattsEl = get('heat-dissipation-watts');
      const btuEl = get('heat-dissipation-btu');
      const deltaTEl = get('temp-rise-delta');
      const internalTempEl = get('internal-temp-est');
      const coolingBadge = get('cooling-badge');
      const coolingRecEl = get('cooling-recommendation');

      if (wattsEl) wattsEl.textContent = `${phys.totalWatts} W`;
      if (btuEl) btuEl.textContent = `${Math.round(phys.totalWatts * 3.412)} BTU/hr`;
      if (deltaTEl) deltaTEl.textContent = `+${thermo.deltaT}°F`;
      if (internalTempEl) internalTempEl.textContent = `Internal: ${thermo.internalTemp}°F (Limit: 104°F)`;

      if (coolingBadge && coolingRecEl) {
        if (!thermo.coolingRequired) {
          coolingBadge.className = 'sis-badge sis-badge--emerald text-[10px]';
          coolingBadge.textContent = 'CONVECTION OK';
          coolingRecEl.className = 'text-xs font-mono font-bold text-emerald-400 mt-1 p-2.5 rounded bg-emerald-950/30 border border-emerald-800 leading-relaxed';
          coolingRecEl.textContent = 'Natural Convection Sufficient  -  Sealed NEMA 4/4X Enclosure (Internal Temp ≤ 104°F)';
        } else if (this.state.enclosureMaterial === 'painted-steel' && this.state.ambientTempF <= 85) {
          coolingBadge.className = 'sis-badge sis-badge--amber text-[10px]';
          coolingBadge.textContent = 'FAN PACKAGE REQ';
          coolingRecEl.className = 'text-xs font-mono font-bold text-amber-300 mt-1 p-2.5 rounded bg-amber-950/30 border border-amber-800 leading-relaxed';
          coolingRecEl.textContent = `Forced-Air Filter Fan Package Required: Minimum ${thermo.fanCfm} CFM airflow with cleanable IP54 louvers.`;
        } else {
          coolingBadge.className = 'sis-badge sis-badge--amber text-[10px]';
          coolingBadge.textContent = 'ACTIVE AC REQ';
          coolingRecEl.className = 'text-xs font-mono font-bold text-cyan-300 mt-1 p-2.5 rounded bg-cyan-950/30 border border-cyan-800 leading-relaxed';
          coolingRecEl.textContent = `Closed-Loop NEMA 4X Industrial Air Conditioner Required: Minimum ${Math.round(thermo.acBtu)} BTU/hr (Rittal Blue e+ / Hoffman Spectracool).`;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Auto-Mount on DOM Ready
  // ---------------------------------------------------------------------------
  function initSccrCalculators() {
    const mounts = document.querySelectorAll('#sccr-calculator-mount, .sccr-calculator-auto, [data-mount="sccr"]');
    mounts.forEach(mount => {
      if (!mount.__sccr_initialized) {
        mount.__sccr_initialized = true;
        new SccrCalculatorWidget(mount);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSccrCalculators);
  } else {
    initSccrCalculators();
  }

  // Expose API for external scripts & test runners
  window.SawtoothSCCR = {
    calculatePanelSccr,
    calculateThermalDissipation,
    calculatePhysicalDimensions,
    SccrCalculatorWidget,
    init: initSccrCalculators,
    COMPONENT_DATA,
    STANDARD_ENCLOSURES
  };

})();
