/**
 * SAWTOOTH INDUSTRIAL SYSTEMS - CUSTOM PANEL BUILDER ENGINE (V1.0)
 * Real-time thermodynamic, dimensional footprint, and budgetary estimating engine.
 * Pure Vanilla JavaScript ES6 - Zero dependencies.
 */

(function () {
  'use strict';

  // Component database & pricing model
  const PRICING_MODEL = {
    enclosures: {
      'nema1': { name: 'NEMA 1 General Purpose (Indoor)', baseCost: 1200, width: 24, height: 36, depth: 10, kVal: 0.30 },
      'nema12': { name: 'NEMA 12 Dust & Oil-Tight (Industrial)', baseCost: 1850, width: 30, height: 42, depth: 12, kVal: 0.30 },
      'nema3r': { name: 'NEMA 3R Rainproof & Sleet Resistant', baseCost: 2100, width: 30, height: 48, depth: 14, kVal: 0.30 },
      'nema4': { name: 'NEMA 4 Carbon Steel Watertight', baseCost: 2600, width: 36, height: 48, depth: 14, kVal: 0.30 },
      'nema4x-316': { name: 'NEMA 4X 316L Stainless Steel Washdown', baseCost: 4800, width: 36, height: 60, depth: 16, kVal: 0.15 },
      'hygienic-sloped': { name: '30° Hygienic Slope-Top 316L (IP69K)', baseCost: 6200, width: 36, height: 72, depth: 18, kVal: 0.15 }
    },
    voltages: {
      '480v-3p': { name: '480V 3-Phase (Industrial / Data Center)', factor: 1.25, baseHeat: 120 },
      '208v-3p': { name: '208V 3-Phase (Commercial / Light Tech)', factor: 1.10, baseHeat: 90 },
      '240v-1p': { name: '240V Single Phase (Ag / Commercial)', factor: 1.00, baseHeat: 60 },
      '120v-24vdc': { name: '120VAC / 24VDC Instrument Panel', factor: 0.90, baseHeat: 45 }
    },
    sccr: {
      '5ka': { name: 'Standard 5kA (Uncoordinated)', cost: 0 },
      '10ka': { name: '10kA Baseline (Standard Breakers)', cost: 350 },
      '22ka': { name: '22kA Rated (High Fault Commercial)', cost: 850 },
      '65ka': { name: '65kA Coordinated (Industrial Substation)', cost: 1850 },
      '100ka': { name: '100kA Tested (Data Center / Utility Entrance)', cost: 3200 }
    },
    controllers: {
      'rockwell-compact': { name: 'Rockwell CompactLogix 5380', cost: 3800, heat: 35, slots: 8 },
      'rockwell-control': { name: 'Rockwell ControlLogix 5580', cost: 7200, heat: 55, slots: 16 },
      'siemens-s71500': { name: 'Siemens S7-1500 TIA Portal', cost: 4200, heat: 40, slots: 12 },
      'siemens-s71200': { name: 'Siemens S7-1200 Basic Controller', cost: 1450, heat: 25, slots: 6 },
      'automation-direct': { name: 'AutomationDirect Productivity 2000', cost: 1100, heat: 20, slots: 8 },
      'customer-print': { name: 'Build-to-Print (Customer Supplies PLC)', cost: 0, heat: 30, slots: 8 }
    },
    elevations: {
      '0': { name: 'Sea Level to 1,000 ft (Standard)', derateFactor: 1.00, airSafety: 1.00 },
      '2730': { name: 'Boise, ID (2,730 ft)', derateFactor: 0.95, airSafety: 1.10 },
      '3745': { name: 'Twin Falls, ID (3,745 ft)', derateFactor: 0.92, airSafety: 1.15 },
      '4226': { name: 'Salt Lake City, UT (4,226 ft)', derateFactor: 0.90, airSafety: 1.18 },
      '4705': { name: 'Idaho Falls, ID (4,705 ft)', derateFactor: 0.88, airSafety: 1.22 }
    }
  };

  // State
  let state = {
    enclosure: 'nema4x-316',
    voltage: '480v-3p',
    mainBreakerAmps: 200,
    sccrRating: '65ka',
    controller: 'rockwell-compact',
    vfdQty: 2,
    vfdHp: 15,
    elevation: '2730',
    digitalIo: 32,
    analogIo: 8,
    leakRopes: true,
    telemetryProtocol: 'modbus-bacnet'
  };

  function init() {
    bindInputs();
    calculateAndRender();
  }

  function bindInputs() {
    // Select dropdowns and radio buttons
    const bindSelect = (id, prop) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          state[prop] = e.target.value;
          calculateAndRender();
        });
      }
    };

    bindSelect('builder-enclosure', 'enclosure');
    bindSelect('builder-voltage', 'voltage');
    bindSelect('builder-sccr', 'sccrRating');
    bindSelect('builder-controller', 'controller');
    bindSelect('builder-elevation', 'elevation');
    bindSelect('builder-vfd-qty', 'vfdQty');
    bindSelect('builder-vfd-hp', 'vfdHp');
    bindSelect('builder-digital-io', 'digitalIo');
    bindSelect('builder-analog-io', 'analogIo');

    const leakCheckbox = document.getElementById('builder-leak-ropes');
    if (leakCheckbox) {
      leakCheckbox.addEventListener('change', (e) => {
        state.leakRopes = e.target.checked;
        calculateAndRender();
      });
    }

    const breakerInput = document.getElementById('builder-main-amps');
    if (breakerInput) {
      breakerInput.addEventListener('input', (e) => {
        state.mainBreakerAmps = parseInt(e.target.value, 10) || 100;
        calculateAndRender();
      });
    }

    // Lead submission form
    const form = document.getElementById('builder-submittal-form');
    if (form) {
      form.addEventListener('submit', handleSubmittalSubmit);
    }
  }

  function calculateAndRender() {
    const enc = PRICING_MODEL.enclosures[state.enclosure] || PRICING_MODEL.enclosures['nema4x-316'];
    const volt = PRICING_MODEL.voltages[state.voltage] || PRICING_MODEL.voltages['480v-3p'];
    const sccr = PRICING_MODEL.sccr[state.sccrRating] || PRICING_MODEL.sccr['65ka'];
    const ctrl = PRICING_MODEL.controllers[state.controller] || PRICING_MODEL.controllers['rockwell-compact'];
    const elev = PRICING_MODEL.elevations[state.elevation] || PRICING_MODEL.elevations['2730'];

    // 1. Calculate Thermal Dissipation (Watts)
    const baseHeat = volt.baseHeat;
    const ctrlHeat = ctrl.heat;
    const vfdQty = parseInt(state.vfdQty, 10) || 0;
    const vfdHp = parseInt(state.vfdHp, 10) || 0;
    // VFD dissipation approx 25W per HP + 30W base logic
    const vfdHeat = vfdQty * (vfdHp * 25 + 30);
    const ioHeat = (parseInt(state.digitalIo, 10) * 0.5) + (parseInt(state.analogIo, 10) * 1.5);
    const totalWatts = Math.round(baseHeat + ctrlHeat + vfdHeat + ioHeat);
    const totalBtu = Math.round(totalWatts * 3.412);

    // Thermal cooling recommendation based on BTU & Elevation
    let coolingType = 'Filtered Louver Fan Pack (Indoor)';
    let coolingCost = 450;
    if (totalBtu > 3000 || state.enclosure.includes('nema4') || state.enclosure.includes('hygienic')) {
      const requiredBtu = Math.round(totalBtu * elev.airSafety);
      coolingType = `Closed-Loop NEMA 4X AC (${requiredBtu} BTU/hr rated with altitude factor)`;
      coolingCost = 2800;
    }

    // 2. Calculate Dimensional Footprint
    let height = enc.height;
    let width = enc.width;
    let depth = enc.depth;
    if (vfdQty >= 3 || vfdHp >= 30) {
      height = Math.max(height, 72);
      width = Math.max(width, 48);
      depth = Math.max(depth, 18);
    } else if (vfdQty >= 1) {
      height = Math.max(height, 60);
      width = Math.max(width, 36);
      depth = Math.max(depth, 14);
    }

    // 3. Calculate Budgetary Hardware & Fabrication Cost
    const encCost = enc.baseCost;
    const sccrCost = sccr.cost;
    const ctrlCost = ctrl.cost;
    const vfdCost = vfdQty * (600 + (vfdHp * 55));
    const ioCost = (parseInt(state.digitalIo, 10) * 18) + (parseInt(state.analogIo, 10) * 45);
    const leakCost = state.leakRopes ? 1650 : 0;
    const breakerCost = (state.mainBreakerAmps > 400 ? 2400 : (state.mainBreakerAmps > 200 ? 1200 : 650));
    
    // Partner shop labor, Perforex CNC milling, terminal wiring & 100% FAT traveler
    const baseLabor = 4800 + (vfdQty * 450) + (parseInt(state.digitalIo, 10) * 25);
    
    const subtotal = encCost + sccrCost + ctrlCost + vfdCost + ioCost + leakCost + breakerCost + coolingCost + baseLabor;
    const lowEstimate = Math.round((subtotal * 0.95) / 100) * 100;
    const highEstimate = Math.round((subtotal * 1.15) / 100) * 100;

    // 4. Update DOM Elements
    updateText('summary-dimensions', `${height}"H × ${width}"W × ${depth}"D`);
    updateText('summary-thermal', `${totalWatts} Watts (${totalBtu.toLocaleString()} BTU/hr)`);
    updateText('summary-cooling', coolingType);
    updateText('summary-budget', `$${lowEstimate.toLocaleString()} - $${highEstimate.toLocaleString()}`);
    updateText('summary-lead-time', '8-10 Weeks (vs 50+ Wks)');
    updateText('summary-sccr-display', `${sccr.name}`);
    updateText('summary-enclosure-display', `${enc.name}`);
    updateText('summary-controller-display', `${ctrl.name}`);

    // Update BOM Table
    renderBomTable([
      { item: 'Structural Enclosure', desc: `${enc.name} (${height}"×${width}"×${depth}")`, status: 'Sourced' },
      { item: 'Main Circuit Breaker', desc: `${state.mainBreakerAmps}A Main Disconnect (${sccr.name})`, status: 'Sourced' },
      { item: 'Control Platform', desc: `${ctrl.name}`, status: 'Sourced' },
      { item: 'Motor Drives', desc: `${vfdQty}× ${vfdHp}HP VFDs (Altitude Derated to ${elev.name})`, status: 'Sourced' },
      { item: 'I/O Distribution', desc: `${state.digitalIo} Digital / ${state.analogIo} Analog Channels`, status: 'Sourced' },
      { item: 'Thermal Management', desc: coolingType, status: 'Engineered' },
      ...(state.leakRopes ? [{ item: 'Mission-Critical Protection', desc: '500ms Optical Leak Rope Detection Package', status: 'Included' }] : []),
      { item: 'FAT QA Traveler', desc: 'Torque Witnessing, 1000V Hi-Pot, 100% Point Continuity & Live I/O', status: 'Certified' }
    ]);
  }

  function renderBomTable(items) {
    const tbody = document.getElementById('builder-bom-tbody');
    if (!tbody) return;
    tbody.innerHTML = items.map((row) => `
      <tr class="border-b border-slate-800 text-xs">
        <td class="py-2.5 font-bold text-white">${escapeHtml(row.item)}</td>
        <td class="py-2.5 text-slate-300 font-mono">${escapeHtml(row.desc)}</td>
        <td class="py-2.5 text-right font-mono text-emerald-400 font-semibold">${escapeHtml(row.status)}</td>
      </tr>
    `).join('');
  }

  function handleSubmittalSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('builder-submit-btn');
    const msg = document.getElementById('builder-submit-msg');
    if (!btn || !msg) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="inline-block w-3 h-3 rounded-full bg-slate-950 animate-pulse mr-2"></span>SUBMITTING SPECIFICATIONS...';

    // Simulate instant capture
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = 'SPECIFICATIONS SUBMITTED ✓';
      btn.classList.remove('btn-sis-rfq');
      btn.classList.add('bg-emerald-500', 'text-slate-950', 'font-black');
      msg.classList.remove('hidden');
      msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 800);
  }

  function updateText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
