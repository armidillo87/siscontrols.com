/**
 * Sawtooth Industrial Systems (siscontrols.com)
 * Interactive Panel Cutaway & 12-Component Bill of Materials (BOM) Explorer
 * 
 * Features:
 * - Clickable coordinate hotspot pins on visual NEMA subpanel chassis
 * - Technical spec popover with part number, SCCR withstand, and engineering function
 * - Dual-synchronized view: Interactive SVG Graphic & Structured Engineering BOM Table
 * - Categorized filtering (Power Distribution, Automation/PLC, Functional Safety, Telemetry)
 * - Accessible keyboard navigation & mobile touch friendly
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Authoritative 12-Component Bill of Materials Catalog
  // ---------------------------------------------------------------------------
  const BOM_COMPONENTS = [
    {
      id: 'item-1',
      number: 1,
      category: 'power',
      name: 'Flange-Mount Disconnect Handle',
      mfrPart: 'Eaton C361NC12 / Square D 9422',
      x: 92,
      y: 12,
      sccrRating: '200 kA (with Class J Fuses)',
      cert: 'UL 508A / NEMA 4X',
      specs: 'Variable-depth heavy-duty operating mechanism, door-interlocked defeatable handle with padlock provisions.',
      purpose: 'Mechanically locks panel door closed while energized; enables emergency power isolation per NFPA 79.'
    },
    {
      id: 'item-2',
      number: 2,
      category: 'power',
      name: 'Primary Overcurrent Protection (Class J)',
      mfrPart: 'Mersen US6J3I UltraSafe / Eaton HFD3100',
      x: 20,
      y: 18,
      sccrRating: '200 kA Interrupting Rating (IR)',
      cert: 'UL 4248-8 / Class J',
      specs: '3-Pole 600V 60A finger-safe fuse holder with blown-fuse LED indicators and current-limiting rejection clips.',
      purpose: 'Fast-acting current-limiting branch and feeder protection providing maximum thermal and magnetic let-through energy suppression.'
    },
    {
      id: 'item-3',
      number: 3,
      category: 'power',
      name: 'High-Fault Power Distribution Block (FSPDB)',
      mfrPart: 'Mersen FSPDB2A Finger-Safe Series',
      x: 20,
      y: 30,
      sccrRating: '100 kA / 200 kA (UL 508A Table SB4.2)',
      cert: 'UL 1953 / IP20 Touch-Safe',
      specs: 'High-fault distribution block; dual 2/0 to 8-port 14 AWG distribution lines; aluminum/copper rated.',
      purpose: 'Distributes 480V 3-phase feeder power to branch circuits while completely eliminating 10kA panel rating bottlenecks.'
    },
    {
      id: 'item-4',
      number: 4,
      category: 'power',
      name: 'Control Power Transformer (CPT)',
      mfrPart: 'Micron ImperviTRAN B500-2007-1',
      x: 75,
      y: 22,
      sccrRating: '100 kA Primary (Class CC Fused)',
      cert: 'UL 506 / NEMA ST-1',
      specs: '500VA 480V Primary to 120V Secondary isolation transformer with epoxy-encapsulated core and dual secondary fuse block.',
      purpose: 'Steps down 480V incoming line voltage to 120VAC to power control electronics and isolated low-voltage circuits.'
    },
    {
      id: 'item-5',
      number: 5,
      category: 'power',
      name: '24VDC Regulated Power Supply',
      mfrPart: 'Phoenix Contact QUINT4-PS/1AC/24DC/20',
      x: 75,
      y: 34,
      sccrRating: 'Class 2 / Overload Protected',
      cert: 'UL 508 / ATEX Zone 2 / IEC 61010',
      specs: '24VDC 20A (480W) switch-mode power supply with SFB technology, 93% efficiency, active PFC, and dry contact DC-OK relay.',
      purpose: 'Supplies ultra-clean, noise-filtered 24VDC power for PLC I/O, safety interlocks, optical sensors, and HMI displays.'
    },
    {
      id: 'item-6',
      number: 6,
      category: 'control',
      name: 'Programmable Automation Controller (PLC)',
      mfrPart: 'Rockwell 5069-L320ERM / Siemens S7-1500',
      x: 28,
      y: 48,
      sccrRating: 'Control Circuit Isolated',
      cert: 'UL 61010-2-201 / CE / ISA-Secure',
      specs: 'Dual-core processor with 2MB memory, dual 1Gbps Ethernet ports supporting CIP motion, DLR ring redundancy, and Modbus TCP.',
      purpose: 'Central automation brain executing sequence of operations, PID temperature/pressure modulation, and DCIM telemetry.'
    },
    {
      id: 'item-7',
      number: 7,
      category: 'safety',
      name: 'Functional Safety Controller (SIL 3 / PL e)',
      mfrPart: 'Allen-Bradley Guardmaster 440C-CR30',
      x: 72,
      y: 48,
      sccrRating: 'Fail-Safe De-Energize to Trip',
      cert: 'TÜV Rheinland / SIL 3 / PLe Cat 4',
      specs: 'Configurable software safety relay with 22 safety I/O, pulse testing, dual force-guided safety outputs, and USB diagnostics.',
      purpose: 'Monitors E-stops, optical safety light curtains, and door interlocks; guarantees deterministic sub-20ms shutdown.'
    },
    {
      id: 'item-8',
      number: 8,
      category: 'control',
      name: 'Variable Frequency Drives (Dual VFD)',
      mfrPart: 'ABB ACS580-01-018A-4 / PowerFlex 525',
      x: 28,
      y: 68,
      sccrRating: '65 kA (with 3% Line Reactor & Class J)',
      cert: 'UL 508C / Safe Torque Off (STO SIL 3)',
      specs: 'Dual 10HP sensorless vector motor drives with built-in EMC filters, Modbus TCP, EtherNet/IP, and conformal coated boards.',
      purpose: 'Modulates secondary liquid cooling pump speeds maintaining precision differential pressure across server cold plates.'
    },
    {
      id: 'item-9',
      number: 9,
      category: 'network',
      name: 'Managed Industrial Ethernet Switch',
      mfrPart: 'Hirschmann RS20-0800M2M2SDAE / Moxa EDS',
      x: 75,
      y: 68,
      sccrRating: 'Galvanically Isolated',
      cert: 'IEEE 802.3 / IEC 62443-4-2',
      specs: '8-Port 10/100/1000Base-TX managed DIN-rail switch, RSTP ring redundancy (<20ms recovery), VLAN isolation, and QoS prioritization.',
      purpose: 'Hardened network backbone connecting PLC, VFD drives, HMI, and upstream hyperscale DCIM monitoring systems.'
    },
    {
      id: 'item-10',
      number: 10,
      category: 'wiring',
      name: 'Push-In Terminal Block Array',
      mfrPart: 'Phoenix Contact PT 2.5 / Weidmuller A-Series',
      x: 35,
      y: 88,
      sccrRating: '100 kA with Upstream Fusing',
      cert: 'UL 1059 / IEC 60947-7-1',
      specs: '2.5mm² push-in spring-cage terminals with laser-printed wire tags, multi-level disconnects, and plug-in cross-jumpers.',
      purpose: 'Gas-tight field wiring landing array providing rapid commissioning, zero vibration loosening, and clear signal separation.'
    },
    {
      id: 'item-11',
      number: 11,
      category: 'power',
      name: 'Solid Electrolytic Copper Ground Bus',
      mfrPart: 'Hoffman GSK8 / Panduit GB2B0304TPI-1',
      x: 82,
      y: 88,
      sccrRating: 'Direct Chassis Bonded',
      cert: 'UL 467 / NEC 250.64',
      specs: '1/4" x 1" tin-plated electrolytic copper bar with tapped 10-32 and 1/4-20 mounting holes, directly bonded to enclosure chassis.',
      purpose: 'Equipotential protective bonding path ensuring zero ground loop offset, low impedance, and safe fault path to earth.'
    },
    {
      id: 'item-12',
      number: 12,
      category: 'wiring',
      name: 'High-Density Wire Duct Cableway',
      mfrPart: 'Panduit Panduct G2X3LG6 Narrow-Slot',
      x: 50,
      y: 40,
      sccrRating: 'NFPA 79 Cable Separation Compliant',
      cert: 'UL 94V-0 Flame Retardant / CSA',
      specs: '2" W x 3" H lead-free PVC wiring duct with snap-on non-slip cover, narrow fingers for wire breakouts, and divider channels.',
      purpose: 'Maintains strict physical routing segregation between 480V high-voltage power lines and sensitive 24VDC/Ethernet cables.'
    }
  ];

  // ---------------------------------------------------------------------------
  // 2. Cutaway Explorer Controller Class
  // ---------------------------------------------------------------------------
  class CutawayExplorer {
    constructor(container) {
      this.container = container;
      this.selectedId = 'item-1';
      this.currentFilter = 'all';

      this.render();
      this.bindEvents();
      this.selectComponent(this.selectedId);
    }

    render() {
      this.container.innerHTML = `
        <div class="sis-card-enclosure p-6 md:p-8" data-widget="cutaway-explorer">
          <!-- Explorer Header -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-700/80">
            <div>
              <div class="flex items-center gap-2">
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span class="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold">INTERACTIVE PANEL ARCHITECTURE</span>
              </div>
              <h2 class="text-xl md:text-2xl font-black text-white tracking-wide mt-1">12-Component Subpanel Cutaway & BOM Explorer</h2>
              <p class="text-xs md:text-sm text-slate-400 mt-0.5">Explore standard UL 508A engineering layout. Click any numbered pin or BOM row to inspect component specifications.</p>
            </div>
            
            <!-- Category Filter Tabs -->
            <div class="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
              <button class="cutaway-filter-btn px-2.5 py-1.5 rounded text-white bg-slate-800 font-bold transition-colors" data-filter="all">ALL (12)</button>
              <button class="cutaway-filter-btn px-2.5 py-1.5 rounded text-slate-400 hover:text-white transition-colors" data-filter="power">POWER</button>
              <button class="cutaway-filter-btn px-2.5 py-1.5 rounded text-slate-400 hover:text-white transition-colors" data-filter="control">CONTROL</button>
              <button class="cutaway-filter-btn px-2.5 py-1.5 rounded text-slate-400 hover:text-white transition-colors" data-filter="safety">SAFETY</button>
              <button class="cutaway-filter-btn px-2.5 py-1.5 rounded text-slate-400 hover:text-white transition-colors" data-filter="wiring">WIRING</button>
            </div>
          </div>

          <!-- Main Interactive Display: 2 Columns (Visual Schematic vs Detail Card + BOM Table) -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
            
            <!-- Visual Schematic Panel with Coordinate Hotspots (7 Cols) -->
            <div class="lg:col-span-7 flex flex-col items-center">
              <div class="w-full relative bg-[#0B1120] border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl p-4 md:p-6" style="min-height: 480px;">
                
                <!-- SVG Schematic Graphic Layer -->
                <svg viewBox="0 0 1000 700" class="w-full h-auto select-none pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Subpanel Plate Background with Rivets & Mounting Grid -->
                  <rect x="20" y="20" width="960" height="660" rx="12" fill="#131D31" stroke="#334155" stroke-width="4"/>
                  
                  <!-- Corner Machine Fasteners -->
                  <circle cx="50" cy="50" r="10" fill="#475569" stroke="#0F172A" stroke-width="2"/>
                  <circle cx="950" cy="50" r="10" fill="#475569" stroke="#0F172A" stroke-width="2"/>
                  <circle cx="950" cy="650" r="10" fill="#475569" stroke="#0F172A" stroke-width="2"/>
                  <circle cx="50" cy="650" r="10" fill="#475569" stroke="#0F172A" stroke-width="2"/>

                  <!-- Horizontal Panduit Wire Ducts (Gray Ribbed Slotted Ducts) -->
                  <!-- Top Duct -->
                  <rect x="60" y="100" width="880" height="40" fill="#1E293B" stroke="#475569" stroke-width="2"/>
                  <line x1="60" y1="120" x2="940" y2="120" stroke="#334155" stroke-width="2" stroke-dasharray="8 6"/>
                  <!-- Middle Duct 1 -->
                  <rect x="60" y="250" width="880" height="40" fill="#1E293B" stroke="#475569" stroke-width="2"/>
                  <line x1="60" y1="270" x2="940" y2="270" stroke="#334155" stroke-width="2" stroke-dasharray="8 6"/>
                  <!-- Middle Duct 2 -->
                  <rect x="60" y="400" width="880" height="40" fill="#1E293B" stroke="#475569" stroke-width="2"/>
                  <line x1="60" y1="420" x2="940" y2="420" stroke="#334155" stroke-width="2" stroke-dasharray="8 6"/>
                  <!-- Bottom Duct -->
                  <rect x="60" y="550" width="880" height="40" fill="#1E293B" stroke="#475569" stroke-width="2"/>
                  <line x1="60" y1="570" x2="940" y2="570" stroke="#334155" stroke-width="2" stroke-dasharray="8 6"/>

                  <!-- DIN Rails (Metallic Gold/Steel stripes) -->
                  <rect x="80" y="60" width="840" height="12" fill="#64748B" stroke="#94A3B8" stroke-width="1"/>
                  <rect x="80" y="210" width="840" height="12" fill="#64748B" stroke="#94A3B8" stroke-width="1"/>
                  <rect x="80" y="360" width="840" height="12" fill="#64748B" stroke="#94A3B8" stroke-width="1"/>
                  <rect x="80" y="510" width="840" height="12" fill="#64748B" stroke="#94A3B8" stroke-width="1"/>

                  <!-- Component Silhouettes for Visual Realism -->
                  <!-- Flange Handle (Top Right) -->
                  <rect x="870" y="40" width="60" height="90" rx="4" fill="#0F172A" stroke="#F59E0B" stroke-width="2"/>
                  <line x1="900" y1="40" x2="900" y2="130" stroke="#F59E0B" stroke-width="4"/>

                  <!-- Class J Fuse Block (Top Left) -->
                  <rect x="130" y="150" width="120" height="90" rx="4" fill="#0F172A" stroke="#38BDF8" stroke-width="2"/>
                  <!-- PDB (Mid Left) -->
                  <rect x="130" y="300" width="120" height="80" rx="4" fill="#0F172A" stroke="#38BDF8" stroke-width="2"/>
                  <!-- CPT & PSU (Top/Mid Right) -->
                  <rect x="700" y="150" width="100" height="90" rx="4" fill="#0F172A" stroke="#F59E0B" stroke-width="2"/>
                  <rect x="700" y="300" width="100" height="90" rx="4" fill="#0F172A" stroke="#10B981" stroke-width="2"/>

                  <!-- PLC Rack (Row 2 Left) -->
                  <rect x="180" y="450" width="200" height="90" rx="4" fill="#0F172A" stroke="#38BDF8" stroke-width="2"/>
                  <!-- Safety Controller (Row 2 Right) -->
                  <rect x="670" y="450" width="100" height="90" rx="4" fill="#0F172A" stroke="#EF4444" stroke-width="2"/>

                  <!-- VFD Inverters (Row 3 Left) -->
                  <rect x="180" y="450" width="180" height="90" rx="4" fill="#0F172A" stroke="#06B6D4" stroke-width="2"/>
                  <!-- Managed Switch (Row 3 Right) -->
                  <rect x="700" y="450" width="100" height="90" rx="4" fill="#0F172A" stroke="#06B6D4" stroke-width="2"/>

                  <!-- Terminal Strip & Ground Bar (Bottom) -->
                  <rect x="140" y="600" width="400" height="40" rx="2" fill="#0F172A" stroke="#64748B" stroke-width="1.5"/>
                  <rect x="750" y="600" width="150" height="30" rx="2" fill="#B45309" stroke="#F59E0B" stroke-width="2"/>
                </svg>

                <!-- Hotspot Coordinate Pins Overlay -->
                <div id="cutaway-pins-container" class="absolute inset-0 p-4 md:p-6">
                  <!-- Injected via JavaScript -->
                </div>
              </div>

              <!-- Schematic Legend Helper -->
              <div class="w-full flex items-center justify-between text-xs font-mono text-slate-400 mt-3 px-2">
                <span>Click pin to inspect component</span>
                <span class="text-amber-400">12 / 12 Components Active</span>
              </div>
            </div>

            <!-- RIGHT COLUMN: Selected Component Detail Popover & BOM List (5 Cols) -->
            <div class="lg:col-span-5 space-y-6">
              
              <!-- Popover Card for Selected Component -->
              <div id="cutaway-popover-card" class="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border-2 border-amber-500/60 rounded-xl p-6 shadow-2xl space-y-4">
                <!-- Injected via JavaScript -->
              </div>

              <!-- Quick BOM Directory Table -->
              <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span class="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold">PANEL BILL OF MATERIALS (BOM)</span>
                  <span class="text-[11px] font-mono text-slate-400">CLICK ROW TO FOCUS</span>
                </div>
                
                <div class="mt-2 max-h-64 overflow-y-auto space-y-1 divide-y divide-slate-800/60" id="cutaway-bom-list">
                  <!-- Injected via JavaScript -->
                </div>
              </div>

            </div>

          </div>
        </div>
      `;
    }

    bindEvents() {
      // Filter buttons
      const filterBtns = this.container.querySelectorAll('.cutaway-filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => {
            b.classList.remove('bg-slate-800', 'text-white', 'font-bold');
            b.classList.add('text-slate-400');
          });
          btn.classList.add('bg-slate-800', 'text-white', 'font-bold');
          btn.classList.remove('text-slate-400');

          this.currentFilter = btn.getAttribute('data-filter') || 'all';
          this.renderPinsAndList();
        });
      });
    }

    renderPinsAndList() {
      const pinsContainer = this.container.querySelector('#cutaway-pins-container');
      const bomList = this.container.querySelector('#cutaway-bom-list');

      if (!pinsContainer || !bomList) return;

      const filtered = BOM_COMPONENTS.filter(item => {
        if (this.currentFilter === 'all') return true;
        return item.category === this.currentFilter;
      });

      // 1. Render Pins
      pinsContainer.innerHTML = filtered.map(item => {
        const isSelected = item.id === this.selectedId;
        return `
          <button
            class="cutaway-pin-btn absolute transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-200 z-10 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
              isSelected 
                ? 'bg-amber-400 text-slate-950 scale-125 ring-4 ring-amber-400/40 shadow-lg shadow-amber-500/50' 
                : 'bg-slate-800 text-slate-200 border-2 border-slate-600 hover:bg-slate-700 hover:border-amber-400 hover:scale-110'
            }"
            style="left: ${item.x}%; top: ${item.y}%;"
            data-id="${item.id}"
            aria-label="Component #${item.number}: ${item.name}"
            title="#${item.number}: ${item.name}"
          >
            ${item.number}
          </button>
        `;
      }).join('');

      // Add pin click listeners
      pinsContainer.querySelectorAll('.cutaway-pin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const id = btn.getAttribute('data-id');
          if (id) this.selectComponent(id);
        });
      });

      // 2. Render BOM List Rows
      bomList.innerHTML = filtered.map(item => {
        const isSelected = item.id === this.selectedId;
        return `
          <div
            class="bom-row-item p-2.5 rounded cursor-pointer transition-colors flex items-center justify-between text-xs ${
              isSelected ? 'bg-slate-800/90 text-amber-400 font-bold' : 'hover:bg-slate-800/40 text-slate-300'
            }"
            data-id="${item.id}"
          >
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] ${
                isSelected ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
              }">${item.number}</span>
              <span class="truncate max-w-[200px]">${item.name}</span>
            </div>
            <span class="font-mono text-[11px] text-slate-400 shrink-0">${item.mfrPart.split('/')[0].trim()}</span>
          </div>
        `;
      }).join('');

      // Add row click listeners
      bomList.querySelectorAll('.bom-row-item').forEach(row => {
        row.addEventListener('click', () => {
          const id = row.getAttribute('data-id');
          if (id) this.selectComponent(id);
        });
      });
    }

    selectComponent(id) {
      this.selectedId = id;
      const comp = BOM_COMPONENTS.find(c => c.id === id) || BOM_COMPONENTS[0];

      // Update Popover Card
      const popover = this.container.querySelector('#cutaway-popover-card');
      if (popover) {
        popover.innerHTML = `
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-mono text-xs font-black flex items-center justify-center shrink-0">
                  ${comp.number}
                </span>
                <span class="font-mono text-xs uppercase tracking-wider text-amber-400 font-bold">${comp.category.toUpperCase()} SUBSYSTEM</span>
              </div>
              <h3 class="text-lg font-black text-white mt-1 leading-snug">${comp.name}</h3>
            </div>
            <span class="sis-badge sis-badge--amber text-[10px] shrink-0">${comp.cert}</span>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <span class="text-slate-400 block text-[11px] font-mono">Manufacturer Part Number:</span>
              <span class="text-white font-mono font-bold block mt-0.5 text-sm">${comp.mfrPart}</span>
            </div>

            <div>
              <span class="text-slate-400 block text-[11px] font-mono">Fault Withstand / SCCR Rating:</span>
              <span class="text-emerald-400 font-mono font-bold block mt-0.5">${comp.sccrRating}</span>
            </div>

            <div class="pt-2 border-t border-slate-700/80">
              <span class="text-slate-400 block text-[11px] font-mono">Engineering Purpose & Architecture:</span>
              <p class="text-slate-300 mt-1 leading-relaxed">${comp.purpose}</p>
            </div>

            <div class="pt-2 border-t border-slate-700/80">
              <span class="text-slate-400 block text-[11px] font-mono">Technical Specifications:</span>
              <p class="text-slate-400 mt-1 leading-relaxed">${comp.specs}</p>
            </div>
          </div>
        `;
      }

      // Re-render pins & BOM list to reflect new active state
      this.renderPinsAndList();
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Auto-Mount on DOM Ready
  // ---------------------------------------------------------------------------
  function initCutawayExplorers() {
    const mounts = document.querySelectorAll('#cutaway-explorer-mount, .cutaway-explorer-auto, [data-mount="cutaway"]');
    mounts.forEach(mount => {
      if (!mount.__cutaway_initialized) {
        mount.__cutaway_initialized = true;
        new CutawayExplorer(mount);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCutawayExplorers);
  } else {
    initCutawayExplorers();
  }

  // Expose API for external scripts & test runners
  window.SawtoothCutaway = {
    BOM_COMPONENTS,
    CutawayExplorer,
    init: initCutawayExplorers
  };

})();
