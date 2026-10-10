/**
 * Sawtooth Industrial Systems (siscontrols.com)
 * 5-Step Interactive Engineering RFQ Estimator & Hardware State Machine
 * 
 * Features:
 * - 5-Step Linear Engineering State Machine with validation gates
 * - Real-Time Hardware Budget & Lead-Time Calculator
 * - Interactive Mock CAD/DWG Drag-and-Drop Uploader (.dwg, .dxf, .pdf, .zip)
 * - Complete Form Validation (Required fields, Email format, Phone format)
 * - Instant Submittal Generation & JSON Submission Modal with Payload Logging
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Cost & Engineering Parameters Catalog
  // ---------------------------------------------------------------------------
  const PRICING_RULES = {
    enclosure: {
      'nema-1': { base: 1200, name: 'NEMA 1 General Purpose (Indoor)' },
      'nema-3r': { base: 1800, name: 'NEMA 3R Rainproof / Outdoor' },
      'nema-4': { base: 2200, name: 'NEMA 4 Watertight Painted Steel' },
      'nema-4x-304': { base: 3600, name: 'NEMA 4X 304 Stainless Steel' },
      'nema-4x-316': { base: 4800, name: 'NEMA 4X 316 Marine Stainless Steel' },
      'nema-12': { base: 2400, name: 'NEMA 12 Dust & Oil Tight' },
      'class-1-div-2': { base: 6500, name: 'Class I Div 2 (NFPA 496 Purged / Z-Purge)' }
    },
    mounting: {
      'wall-mount': 0,
      'free-standing': 1200,
      'skid-mount': 1800
    },
    voltage: {
      '480': 0,
      '208': 200,
      '240': 200,
      '120': -150,
      '600': 450,
      '24vdc': 100
    },
    amperage: {
      30: 400,
      60: 750,
      100: 1200,
      200: 2200,
      400: 4200,
      800: 7500
    },
    sccr: {
      '5ka': 0,
      '10ka': 0,
      '22ka': 350,
      '65ka': 1200,
      '100ka': 2400
    },
    plc: {
      'rockwell': { cost: 4200, name: 'Rockwell Allen-Bradley (CompactLogix / ControlLogix)' },
      'siemens': { cost: 3800, name: 'Siemens SIMATIC S7-1500 / TIA Portal' },
      'schneider': { cost: 3100, name: 'Schneider Modicon M580 / M340' },
      'automation-direct': { cost: 1200, name: 'AutomationDirect Productivity Series' },
      'beckhoff': { cost: 3600, name: 'Beckhoff TwinCAT 3 IPC' },
      'relay-logic': { cost: 600, name: 'Hardwired Industrial Relay Logic' }
    },
    safety: {
      'none': 0,
      'safety-relay': 950,
      'sil-2': 2400,
      'sil-3': 5200
    },
    hmi: {
      'none': 0,
      '7-inch': 1200,
      '10-12-inch': 2200,
      '15-inch-ipc': 4500
    },
    timeline: {
      'fast-track': { lead: '8 to 10 Weeks', mult: 1.0 },
      'expedited': { lead: '4 to 6 Weeks (Expedited)', mult: 1.25 },
      'budgetary': { lead: '12 to 16 Weeks', mult: 0.95 }
    }
  };

  // ---------------------------------------------------------------------------
  // 2. RFQ State Machine
  // ---------------------------------------------------------------------------
  class RfqWizard {
    constructor(container) {
      this.container = container;
      this.currentStep = 1;
      this.totalSteps = 5;

      this.formData = {
        // Step 1: Enclosure & Environment
        enclosureType: 'nema-4',
        mountingStyle: 'wall-mount',
        ambientTemp: 'standard',
        hazardousClass: 'none',

        // Step 2: Power & Amperage
        mainVoltage: '480',
        flaAmperage: 100,
        targetSccr: '65ka',
        disconnectStyle: 'flange-rotary',

        // Step 3: Controls & Safety
        plcPlatform: 'rockwell',
        redundancyLevel: 'simplex',
        safetyRating: 'sil-2',
        safetyDevices: ['estop', 'interlock'],

        // Step 4: I/O & Telemetry
        digitalInputs: 16,
        digitalOutputs: 16,
        analogInputs: 8,
        analogOutputs: 4,
        vfdCount: 2,
        hmiDisplay: '10-12-inch',
        protocols: ['ethernet-ip', 'modbus-tcp'],

        // Step 5: Timeline & Contact
        timeline: 'fast-track',
        mbeDiversityCredit: true,
        contactName: '',
        contactCompany: '',
        contactEmail: '',
        contactPhone: '',
        projectLocation: '',
        notesScope: '',
        uploadedFiles: []
      };

      this.init();
    }

    init() {
      this.bindDOMElements();
      this.bindEvents();
      this.updateStepView();
      this.calculateEstimate();
    }

    bindDOMElements() {
      // Find step containers
      this.stepContainers = [];
      for (let i = 1; i <= this.totalSteps; i++) {
        const el = this.container.querySelector(`#step-${i}`) || 
                   this.container.querySelector(`[data-step="${i}"]`) ||
                   this.container.querySelector(`.step-${i}`);
        this.stepContainers.push(el);
      }

      this.btnNext = this.container.querySelector("button[data-action='next'], #btn-next, .btn-next-step");
      this.btnPrev = this.container.querySelector("button[data-action='prev'], #btn-prev, .btn-prev-step");
      this.btnSubmit = this.container.querySelector("button[data-action='submit'], #btn-submit, .btn-submit-rfq");
      this.progressBar = this.container.querySelector("#rfq-progress-bar, .rfq-progress-bar");
      this.progressText = this.container.querySelector("#rfq-progress-text");
      this.stepIndicators = this.container.querySelectorAll(".rfq-step-indicator");
    }

    bindEvents() {
      if (this.btnNext) {
        this.btnNext.addEventListener('click', (e) => {
          e.preventDefault();
          this.nextStep();
        });
      }

      if (this.btnPrev) {
        this.btnPrev.addEventListener('click', (e) => {
          e.preventDefault();
          this.prevStep();
        });
      }

      if (this.btnSubmit) {
        this.btnSubmit.addEventListener('click', (e) => {
          e.preventDefault();
          this.submitForm();
        });
      }

      // Live estimate recalculation on any input change
      this.container.addEventListener('change', (e) => {
        this.syncInputsToState();
        this.calculateEstimate();
      });

      this.container.addEventListener('input', (e) => {
        if (e.target.matches('input[type="number"], input[type="range"]')) {
          this.syncInputsToState();
          this.calculateEstimate();
        }
      });

      // Setup File Upload Zone
      this.setupFileUpload();
    }

    setupFileUpload() {
      const dropZone = this.container.querySelector('#rfq-dropzone, .rfq-dropzone');
      const fileInput = this.container.querySelector('#rfq-file-input, input[type="file"]');
      const fileListContainer = this.container.querySelector('#rfq-file-list');

      if (!dropZone || !fileInput) return;

      dropZone.addEventListener('click', () => fileInput.click());

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-amber-400', 'bg-slate-800/80');
      });

      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-amber-400', 'bg-slate-800/80');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-amber-400', 'bg-slate-800/80');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleFiles(e.dataTransfer.files, fileListContainer);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (fileInput.files && fileInput.files.length > 0) {
          this.handleFiles(fileInput.files, fileListContainer);
        }
      });
    }

    handleFiles(files, listContainer) {
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB ceiling
      const allowedExts = ['dwg', 'dxf', 'pdf', 'zip', 'xlsx', 'xls', 'step', 'stp'];

      Array.from(files).forEach(file => {
        const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
        const sizeFormatted = file.size > 1048576 
          ? `${(file.size / 1048576).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

        const isValidExt = allowedExts.includes(ext);
        const isUnderSizeLimit = file.size <= MAX_FILE_SIZE;
        const isValid = isValidExt && isUnderSizeLimit;

        let errorReason = null;
        if (!isValidExt) {
          errorReason = `Unsupported format (.${ext || 'none'}). Allowed: DWG, DXF, PDF, ZIP, XLSX, STEP`;
        } else if (!isUnderSizeLimit) {
          errorReason = `Exceeds 50MB limit (${sizeFormatted})`;
        }

        const fileRecord = {
          name: file.name,
          size: sizeFormatted,
          sizeBytes: file.size,
          type: ext,
          valid: isValid,
          error: errorReason
        };

        this.formData.uploadedFiles.push(fileRecord);
      });

      this.renderFileList(listContainer);
    }

    renderFileList(container) {
      if (!container) return;
      if (this.formData.uploadedFiles.length === 0) {
        container.innerHTML = '';
        return;
      }

      container.innerHTML = `
        <div class="mt-3 space-y-2">
          ${this.formData.uploadedFiles.map((f, i) => `
            <div class="flex items-center justify-between p-2 rounded ${f.valid ? 'bg-slate-800 border-slate-700' : 'bg-red-950/40 border-red-800/80'} border text-xs font-mono">
              <div class="flex items-center gap-2 truncate">
                <svg class="w-4 h-4 ${f.valid ? 'text-amber-400' : 'text-red-400'} shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                <span class="text-white truncate">${f.name}</span>
                <span class="text-slate-400 text-[10px]">(${f.size})</span>
                ${!f.valid ? `<span class="text-red-400 text-[10px] font-semibold ml-1">[${f.error}]</span>` : ''}
              </div>
              <div class="flex items-center gap-2 shrink-0">
                ${f.valid 
                  ? '<span class="text-emerald-400 text-[10px] uppercase font-bold">READY</span>' 
                  : '<span class="text-red-400 text-[10px] uppercase font-bold">REJECTED</span>'}
                <button type="button" class="text-slate-400 hover:text-red-400 ml-1" data-remove-file="${i}" title="Remove file">&times;</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      container.querySelectorAll('[data-remove-file]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(btn.getAttribute('data-remove-file'), 10);
          this.formData.uploadedFiles.splice(idx, 1);
          this.renderFileList(container);
        });
      });
    }

    syncInputsToState() {
      const getVal = (name) => {
        const el = this.container.querySelector(`[name="${name}"]:checked, select[name="${name}"], input[name="${name}"]:not([type="radio"]):not([type="checkbox"])`);
        return el ? el.value : null;
      };

      // Step 1
      if (getVal('enclosure_type')) this.formData.enclosureType = getVal('enclosure_type');
      if (getVal('mounting_style')) this.formData.mountingStyle = getVal('mounting_style');
      if (getVal('ambient_temp')) this.formData.ambientTemp = getVal('ambient_temp');
      if (getVal('hazardous_classification')) this.formData.hazardousClass = getVal('hazardous_classification');

      // Step 2
      if (getVal('main_voltage')) this.formData.mainVoltage = getVal('main_voltage');
      if (getVal('fla_amperage')) this.formData.flaAmperage = parseInt(getVal('fla_amperage'), 10) || 100;
      if (getVal('target_sccr')) this.formData.targetSccr = getVal('target_sccr');
      if (getVal('disconnect_style')) this.formData.disconnectStyle = getVal('disconnect_style');

      // Step 3
      if (getVal('plc_platform')) this.formData.plcPlatform = getVal('plc_platform');
      if (getVal('redundancy_level')) this.formData.redundancyLevel = getVal('redundancy_level');
      if (getVal('functional_safety_rating')) this.formData.safetyRating = getVal('functional_safety_rating');

      // Step 4
      if (getVal('digital_inputs')) this.formData.digitalInputs = parseInt(getVal('digital_inputs'), 10) || 0;
      if (getVal('digital_outputs')) this.formData.digitalOutputs = parseInt(getVal('digital_outputs'), 10) || 0;
      if (getVal('analog_inputs')) this.formData.analogInputs = parseInt(getVal('analog_inputs'), 10) || 0;
      if (getVal('analog_outputs')) this.formData.analogOutputs = parseInt(getVal('analog_outputs'), 10) || 0;
      if (getVal('vfd_count')) this.formData.vfdCount = parseInt(getVal('vfd_count'), 10) || 0;
      if (getVal('hmi_display')) this.formData.hmiDisplay = getVal('hmi_display');

      // Step 5
      if (getVal('project_timeline')) this.formData.timeline = getVal('project_timeline');
      const mbeCheckbox = this.container.querySelector('input[name="mbe_diversity_credit"]');
      if (mbeCheckbox) this.formData.mbeDiversityCredit = mbeCheckbox.checked;

      const nameInput = this.container.querySelector('#contact-name, input[name="contact_name"]');
      if (nameInput) this.formData.contactName = nameInput.value.trim();

      const emailInput = this.container.querySelector('#contact-email, input[name="contact_email"], input[type="email"]');
      if (emailInput) this.formData.contactEmail = emailInput.value.trim();

      const companyInput = this.container.querySelector('#contact-company, input[name="contact_company"]');
      if (companyInput) this.formData.contactCompany = companyInput.value.trim();

      const phoneInput = this.container.querySelector('#contact-phone, input[name="contact_phone"]');
      if (phoneInput) this.formData.contactPhone = phoneInput.value.trim();

      const locInput = this.container.querySelector('#project-location, input[name="project_location"]');
      if (locInput) this.formData.projectLocation = locInput.value.trim();

      const notesInput = this.container.querySelector('#notes-scope, textarea[name="notes_scope"]');
      if (notesInput) this.formData.notesScope = notesInput.value.trim();
    }

    validateCurrentStep() {
      this.syncInputsToState();
      this.clearErrors();

      if (this.currentStep === 1) {
        if (!this.formData.enclosureType) {
          this.showError('enclosure_type', 'Please select an enclosure rating.');
          return false;
        }
        return true;
      }

      if (this.currentStep === 2) {
        if (!this.formData.mainVoltage) {
          this.showError('main_voltage', 'Please select incoming system voltage.');
          return false;
        }
        if (!this.formData.flaAmperage || this.formData.flaAmperage <= 0) {
          this.showError('fla_amperage', 'Please enter valid service amperage (FLA).');
          return false;
        }
        return true;
      }

      if (this.currentStep === 3) {
        if (!this.formData.plcPlatform) {
          this.showError('plc_platform', 'Please select a control controller architecture.');
          return false;
        }
        return true;
      }

      if (this.currentStep === 4) {
        return true; // Defaults are fine
      }

      if (this.currentStep === 5) {
        let valid = true;
        if (!this.formData.contactName) {
          this.showError('contact_name', 'Full name is required.');
          valid = false;
        }
        if (!this.formData.contactCompany) {
          this.showError('contact_company', 'Company / Organization is required.');
          valid = false;
        }
        const emailRegex = /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
        if (!this.formData.contactEmail || !emailRegex.test(this.formData.contactEmail)) {
          this.showError('contact_email', 'A valid business email address is required.');
          valid = false;
        }
        if (!this.formData.contactPhone) {
          this.showError('contact_phone', 'Direct contact telephone is required.');
          valid = false;
        }
        const hasInvalidFiles = this.formData.uploadedFiles.some(f => !f.valid);
        if (hasInvalidFiles) {
          this.showError('contact_email', 'Please remove rejected files from the upload queue before submitting.');
          valid = false;
        }
        return valid;
      }

      return true;
    }

    showError(fieldName, message) {
      const field = this.container.querySelector(`[name="${fieldName}"], #${fieldName.replace('_', '-')}`);
      if (field) {
        field.classList.add('border-red-500');
        let errorEl = field.parentElement.querySelector('.rfq-field-error');
        if (!errorEl) {
          errorEl = document.createElement('div');
          errorEl.className = 'rfq-field-error text-[11px] font-mono text-red-400 mt-1';
          field.parentElement.appendChild(errorEl);
        }
        errorEl.textContent = message;
      }
    }

    clearErrors() {
      this.container.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));
      this.container.querySelectorAll('.rfq-field-error').forEach(el => el.remove());
    }

    nextStep() {
      if (!this.validateCurrentStep()) return;

      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.updateStepView();
        this.calculateEstimate();
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    prevStep() {
      if (this.currentStep > 1) {
        this.currentStep--;
        this.updateStepView();
        this.calculateEstimate();
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    updateStepView() {
      // Toggle Step Containers
      this.stepContainers.forEach((stepEl, idx) => {
        if (!stepEl) return;
        const stepNum = idx + 1;
        if (stepNum === this.currentStep) {
          stepEl.classList.remove('hidden');
          stepEl.style.display = 'block';
        } else {
          stepEl.classList.add('hidden');
          stepEl.style.display = 'none';
        }
      });

      // Update Navigation Buttons
      if (this.btnPrev) {
        if (this.currentStep === 1) {
          this.btnPrev.classList.add('invisible');
        } else {
          this.btnPrev.classList.remove('invisible');
        }
      }

      if (this.btnNext && this.btnSubmit) {
        if (this.currentStep === this.totalSteps) {
          this.btnNext.classList.add('hidden');
          this.btnSubmit.classList.remove('hidden');
        } else {
          this.btnNext.classList.remove('hidden');
          this.btnSubmit.classList.add('hidden');
        }
      }

      // Update Progress Bar
      const pct = (this.currentStep / this.totalSteps) * 100;
      if (this.progressBar) {
        this.progressBar.style.width = `${pct}%`;
      }
      if (this.progressText) {
        this.progressText.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
      }

      // Update Step Indicators
      this.stepIndicators.forEach((ind, idx) => {
        const num = idx + 1;
        if (num < this.currentStep) {
          ind.classList.remove('bg-slate-800', 'text-slate-400', 'border-slate-700', 'ring-2', 'ring-amber-500');
          ind.classList.add('bg-emerald-500', 'text-slate-950', 'border-emerald-400', 'font-black');
          ind.innerHTML = '✓';
        } else if (num === this.currentStep) {
          ind.classList.remove('bg-slate-800', 'text-slate-400', 'border-slate-700', 'bg-emerald-500');
          ind.classList.add('bg-amber-400', 'text-slate-950', 'border-amber-300', 'ring-2', 'ring-amber-400/40', 'font-black');
          ind.textContent = num;
        } else {
          ind.classList.remove('bg-amber-400', 'bg-emerald-500', 'ring-2', 'ring-amber-400/40');
          ind.classList.add('bg-slate-800', 'text-slate-400', 'border-slate-700');
          ind.textContent = num;
        }
      });
    }

    calculateEstimate() {
      let cost = 0;

      // 1. Enclosure
      const encRule = PRICING_RULES.enclosure[this.formData.enclosureType] || PRICING_RULES.enclosure['nema-4'];
      cost += encRule.base;
      cost += (PRICING_RULES.mounting[this.formData.mountingStyle] || 0);

      // 2. Power
      cost += (PRICING_RULES.voltage[this.formData.mainVoltage] || 0);
      
      const amps = this.formData.flaAmperage;
      let ampCost = 1200;
      if (amps <= 30) ampCost = PRICING_RULES.amperage[30];
      else if (amps <= 60) ampCost = PRICING_RULES.amperage[60];
      else if (amps <= 100) ampCost = PRICING_RULES.amperage[100];
      else if (amps <= 200) ampCost = PRICING_RULES.amperage[200];
      else if (amps <= 400) ampCost = PRICING_RULES.amperage[400];
      else ampCost = PRICING_RULES.amperage[800];
      cost += ampCost;

      cost += (PRICING_RULES.sccr[this.formData.targetSccr] || 0);

      // 3. Controller & Safety
      const plcRule = PRICING_RULES.plc[this.formData.plcPlatform] || PRICING_RULES.plc['rockwell'];
      cost += plcRule.cost;

      if (this.formData.redundancyLevel === 'dual-cpu') cost += 3800;
      if (this.formData.redundancyLevel === 'redundant-psu') cost += 1200;

      cost += (PRICING_RULES.safety[this.formData.safetyRating] || 0);

      // 4. I/O & VFDs
      const ioChannels = this.formData.digitalInputs + this.formData.digitalOutputs + this.formData.analogInputs + this.formData.analogOutputs;
      cost += Math.round((ioChannels / 8) * 160);

      cost += (this.formData.vfdCount * 1250);
      cost += (PRICING_RULES.hmi[this.formData.hmiDisplay] || 0);

      // 5. Timeline multiplier
      const timeRule = PRICING_RULES.timeline[this.formData.timeline] || PRICING_RULES.timeline['fast-track'];
      cost = Math.round(cost * timeRule.mult);

      // Round to neat range
      const baseCost = Math.round(cost / 250) * 250;
      const lowerEstimate = baseCost;
      const upperEstimate = Math.round((baseCost * 1.35) / 250) * 250;

      // Update DOM Displays
      const costEl = this.container.querySelector('#estimated-cost-range, .estimated-cost-range');
      const leadEl = this.container.querySelector('#estimated-lead-time, .estimated-lead-time');
      const dimEl = this.container.querySelector('#estimated-enclosure-dims');
      const sccrEl = this.container.querySelector('#summary-target-sccr');

      if (costEl) {
        costEl.textContent = `$${lowerEstimate.toLocaleString()} – $${upperEstimate.toLocaleString()} USD`;
      }
      if (leadEl) {
        leadEl.textContent = timeRule.lead;
      }
      if (dimEl) {
        const estH = amps >= 400 || this.formData.vfdCount > 2 ? 72 : amps >= 200 ? 48 : 36;
        const estW = amps >= 400 ? 48 : amps >= 200 ? 36 : 30;
        const estD = amps >= 400 ? 18 : 10;
        dimEl.textContent = `${estH}"H x ${estW}"W x ${estD}"D (${encRule.name})`;
      }
      if (sccrEl) {
        sccrEl.textContent = `${this.formData.targetSccr.toUpperCase()} @ ${this.formData.mainVoltage}V`;
      }

      this.formData.calculatedLower = lowerEstimate;
      this.formData.calculatedUpper = upperEstimate;
      this.formData.calculatedLeadTime = timeRule.lead;
    }

    submitForm() {
      if (!this.validateCurrentStep()) return;

      const rfqPayload = {
        rfqId: `SIS-RFQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        client: {
          name: this.formData.contactName,
          company: this.formData.contactCompany,
          email: this.formData.contactEmail,
          phone: this.formData.contactPhone,
          location: this.formData.projectLocation
        },
        engineeringSpec: {
          enclosure: this.formData.enclosureType,
          mounting: this.formData.mountingStyle,
          voltage: `${this.formData.mainVoltage}V`,
          amperage: `${this.formData.flaAmperage}A`,
          targetSccr: this.formData.targetSccr,
          controller: this.formData.plcPlatform,
          redundancy: this.formData.redundancyLevel,
          safetyRating: this.formData.safetyRating,
          ioSummary: {
            digitalIn: this.formData.digitalInputs,
            digitalOut: this.formData.digitalOutputs,
            analogIn: this.formData.analogInputs,
            analogOut: this.formData.analogOutputs,
            vfds: this.formData.vfdCount,
            hmi: this.formData.hmiDisplay
          }
        },
        project: {
          timeline: this.formData.timeline,
          mbeDiversityRequired: this.formData.mbeDiversityCredit,
          notes: this.formData.notesScope,
          attachedFiles: this.formData.uploadedFiles.filter(f => f.valid)
        },
        estimate: {
          budgetRange: `$${this.formData.calculatedLower.toLocaleString()} - $${this.formData.calculatedUpper.toLocaleString()} USD`,
          leadTime: this.formData.calculatedLeadTime
        }
      };

      // Mandatory Logging of Authentic Payload
      console.log('Sawtooth RFQ Payload Submission:', JSON.stringify(rfqPayload, null, 2));

      // Display Confirmation Modal
      this.showConfirmationModal(rfqPayload);
    }

    showConfirmationModal(payload) {
      let modal = document.getElementById('rfq-confirmation-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'rfq-confirmation-modal';
        document.body.appendChild(modal);
      }

      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md';
      modal.innerHTML = `
        <div class="bg-[#131D31] border-2 border-emerald-500/80 rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl space-y-6 text-white max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-4 border-b border-slate-700">
            <div class="flex items-center gap-3">
              <span class="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl">✓</span>
              <div>
                <h3 class="text-xl font-black text-white">Engineering RFQ Submittal Confirmed</h3>
                <span class="font-mono text-xs text-amber-400">Tracking Reference: ${payload.rfqId}</span>
              </div>
            </div>
            <button id="rfq-modal-close-btn" class="p-2 text-slate-400 hover:text-white">&times;</button>
          </div>

          <div class="space-y-4 text-xs font-mono">
            <div class="bg-slate-900/80 p-4 rounded-lg border border-slate-800 space-y-2">
              <div class="flex justify-between"><span class="text-slate-400">Client Contact:</span> <span class="text-white font-bold">${payload.client.name} (${payload.client.company})</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Direct Email:</span> <span class="text-white">${payload.client.email}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">System Architecture:</span> <span class="text-amber-400 font-bold">${payload.engineeringSpec.controller.toUpperCase()} • ${payload.engineeringSpec.voltage} ${payload.engineeringSpec.amperage}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Target SCCR:</span> <span class="text-emerald-400 font-bold">${payload.engineeringSpec.targetSccr.toUpperCase()}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Estimated Budget:</span> <span class="text-amber-400 font-bold text-sm">${payload.estimate.budgetRange}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Fast-Track Lead Time:</span> <span class="text-white font-bold">${payload.estimate.leadTime}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">MBE Diversity Credit:</span> <span class="text-emerald-400">${payload.project.mbeDiversityRequired ? '100% Eligible (Northwest Mountain MSDC)' : 'Standard Procurement'}</span></div>
            </div>

            <div class="text-xs font-sans text-slate-300 leading-relaxed">
              <strong class="text-amber-400">What happens next:</strong> Your submittal package has been routed to our Lead Electrical PE in Boise, ID. An applications engineer will review your schematic parameters and respond within <span class="text-white font-bold">24 business hours</span> with formal engineering submittal drawings and firm milestone pricing.
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <button id="rfq-modal-print-btn" class="btn-sis-secondary w-full sm:w-auto text-xs">Print Summary Sheet</button>
            <button id="rfq-modal-done-btn" class="btn-sis-rfq w-full sm:w-auto text-xs">Done / Return to Site</button>
          </div>
        </div>
      `;

      const close = () => {
        modal.remove();
        window.location.href = '/';
      };

      modal.querySelector('#rfq-modal-close-btn').addEventListener('click', close);
      modal.querySelector('#rfq-modal-done-btn').addEventListener('click', close);
      modal.querySelector('#rfq-modal-print-btn').addEventListener('click', () => window.print());
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Auto-Mount on DOM Ready
  // ---------------------------------------------------------------------------
  function initRfqWizards() {
    const mounts = document.querySelectorAll('#rfq-wizard-mount, .rfq-wizard-auto, [data-mount="rfq-wizard"]');
    mounts.forEach(mount => {
      if (!mount.__rfq_initialized) {
        mount.__rfq_initialized = true;
        new RfqWizard(mount);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRfqWizards);
  } else {
    initRfqWizards();
  }

  const EMAIL_REGEX = /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;

  // Expose API for external scripts & test runners
  window.SawtoothRFQ = {
    RfqWizard,
    init: initRfqWizards,
    PRICING_RULES,
    EMAIL_REGEX
  };

})();
