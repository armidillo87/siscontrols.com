#!/usr/bin/env python3
"""
Challenger 2 Live Browser Adversarial Verification Harness
Sawtooth Industrial Systems (siscontrols.com)

Spins up local HTTP server and executes Headless Chrome to assert:
1. Live SCCR Calculator UI state transitions, weakest link calculation, and active cooling threshold
2. Live RFQ Wizard 5-step state machine, step gating, email validation, and modal generation
"""

import os
import sys
import time
import socket
import subprocess
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
PORT = 8011
BASE_URL = f"http://127.0.0.1:{PORT}"

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0

def run_tests():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    print("=" * 80)
    print("  CHALLENGER 2: LIVE BROWSER EMPIRICAL STRESS TEST HARNESS")
    print("=" * 80)

    # 1. Start HTTP Server
    server_proc = None
    if not is_port_in_use(PORT):
        print(f"[INFO] Spawning HTTP server on port {PORT}...")
        server_proc = subprocess.Popen(
            [sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1", "--directory", str(WORKSPACE_ROOT)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        time.sleep(1.2)

    # 2. Launch Headless Chrome
    chrome_opts = Options()
    chrome_opts.add_argument("--headless=new")
    chrome_opts.add_argument("--disable-gpu")
    chrome_opts.add_argument("--no-sandbox")
    chrome_opts.add_argument("--disable-dev-shm-usage")
    chrome_opts.add_argument("--window-size=1440,900")

    driver = webdriver.Chrome(options=chrome_opts)
    wait = WebDriverWait(driver, 5)

    passed = 0
    failed = 0

    def assert_true(condition, message, meta=None):
        nonlocal passed, failed
        if condition:
            passed += 1
            print(f"  [PASS] {message}")
        else:
            failed += 1
            print(f"  [FAIL] {message} (Meta: {meta})")

    try:
        # =====================================================================
        # PART 1: SCCR Calculator Live DOM Interaction on /capabilities/ul-508a-panels/
        # =====================================================================
        print("\n\033[36m--- PART 1: SCCR Calculator Live DOM Tests (/capabilities/ul-508a-panels/) ---\033[0m")
        driver.get(f"{BASE_URL}/capabilities/ul-508a-panels/")
        time.sleep(1.0)

        # Check mount
        calc_widget = driver.find_elements(By.CSS_SELECTOR, "[data-widget='sccr'], .sccr-calculator")
        assert_true(len(calc_widget) > 0, "SCCR Calculator widget mounted in DOM")

        # 1.1 Test Initial State
        result_val = driver.find_element(By.ID, "sccr-result-value").text
        assert_true("65" in result_val, f"Default initial SCCR is 65 kA (got: {result_val})")

        # 1.2 Test Bottleneck: Set Feeder PDB to standard uncoordinated (10kA)
        pdb_select = Select(driver.find_element(By.ID, "feeder-pdb-select"))
        pdb_select.select_by_value("pdb-standard")
        time.sleep(0.3)

        result_val = driver.find_element(By.ID, "sccr-result-value").text
        weakest_link = driver.find_element(By.ID, "sccr-weakest-link").text
        assert_true("10" in result_val, f"Uncoordinated PDB immediately drops panel SCCR to 10 kA (got: {result_val})")
        assert_true("Feeder PDB" in weakest_link, f"Weakest link alert names Feeder PDB (got: {weakest_link})")

        # 1.3 Test Bottleneck: Set Branch Starter to standard contactor (5kA)
        pdb_select.select_by_value("pdb-high-fault") # restore PDB
        starter_select = Select(driver.find_element(By.ID, "branch-starter-select"))
        starter_select.select_by_value("starter-std")
        time.sleep(0.3)

        result_val = driver.find_element(By.ID, "sccr-result-value").text
        weakest_link = driver.find_element(By.ID, "sccr-weakest-link").text
        assert_true("5" in result_val, f"Standard motor contactor drops panel SCCR to 5 kA (got: {result_val})")
        assert_true("Starter" in weakest_link or "starter" in weakest_link.lower(), f"Weakest link alert names Starter (got: {weakest_link})")

        # 1.4 Test High-Fault 100kA Mission-Critical Coordination
        main_select = Select(driver.find_element(By.ID, "main-disconnect-select"))
        main_select.select_by_value("fuse-class-j") # 200kA
        starter_select.select_by_value("starter-fused-100") # 100kA
        vfd_select = Select(driver.find_element(By.ID, "branch-vfd-select"))
        vfd_select.select_by_value("vfd-high-fault-100") # 100kA
        time.sleep(0.3)

        result_val = driver.find_element(By.ID, "sccr-result-value").text
        weakest_link = driver.find_element(By.ID, "sccr-weakest-link").text
        assert_true("100" in result_val, f"Coordinated high-fault components achieve 100 kA rating (got: {result_val})")
        assert_true("Fully Coordinated" in weakest_link, f"Weakest link text confirms full coordination (got: {weakest_link})")

        # 1.5 Test Amperage Boundary Sizing (800A service)
        amps_select = Select(driver.find_element(By.ID, "incoming-amps-input"))
        amps_select.select_by_value("800")
        time.sleep(0.3)

        enc_name = driver.find_element(By.ID, "enclosure-name-est").text
        wire_bend = driver.find_element(By.ID, "wire-bend-est").text
        assert_true("72\"H x 48\"W" in enc_name or "Free-Standing" in enc_name, f"800A service selects large free-standing bay enclosure (got: {enc_name})")
        assert_true("10.0 in" in wire_bend, f"800A service allocates 10.0 in NEC 312.6 wire bend space (got: {wire_bend})")

        # 1.6 Test Thermodynamic Active Cooling Threshold (> 104°F)
        # Increase VFDs to 4, Starters to 4, Ambient to 95°F
        vfd_qty = driver.find_element(By.ID, "vfd-qty-input")
        vfd_qty.clear()
        vfd_qty.send_keys("4")
        
        amb_slider = driver.find_element(By.ID, "ambient-temp-slider")
        driver.execute_script("arguments[0].value = 95; arguments[0].dispatchEvent(new Event('input'));", amb_slider)
        time.sleep(0.3)

        cooling_badge = driver.find_element(By.ID, "cooling-badge").text
        cooling_rec = driver.find_element(By.ID, "cooling-recommendation").text
        internal_temp = driver.find_element(By.ID, "internal-temp-est").text
        assert_true("AC REQ" in cooling_badge or "FAN" in cooling_badge, f"High thermal load flags cooling required (got badge: {cooling_badge})")
        assert_true("Air Conditioner" in cooling_rec or "Fan" in cooling_rec, f"Cooling recommendation specifies cooling equipment (got: {cooling_rec})")


        # =====================================================================
        # PART 2: RFQ Wizard Live DOM Interaction on /rfq/
        # =====================================================================
        print("\n\033[36m--- PART 2: RFQ Wizard 5-Step State Machine Tests (/rfq/) ---\033[0m")
        driver.get(f"{BASE_URL}/rfq/")
        time.sleep(1.0)

        # 2.1 Initial State: Step 1 visible, Step 2 hidden
        step1 = driver.find_element(By.ID, "step-1")
        step2 = driver.find_element(By.ID, "step-2")
        btn_next = driver.find_element(By.CSS_SELECTOR, "button[data-action='next']")
        btn_prev = driver.find_element(By.CSS_SELECTOR, "button[data-action='prev']")
        btn_submit = driver.find_element(By.CSS_SELECTOR, "button[data-action='submit']")

        assert_true(step1.is_displayed(), "Step 1 container is visible initially")
        assert_true(not step2.is_displayed(), "Step 2 container is hidden initially")
        assert_true("invisible" in btn_prev.get_attribute("class"), "Previous button is invisible on Step 1")
        assert_true("hidden" in btn_submit.get_attribute("class"), "Submit button is hidden on Step 1")

        def safe_click(elem):
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", elem)
            time.sleep(0.1)
            elem.click()

        # 2.2 Step 1 -> Step 2
        safe_click(btn_next)
        time.sleep(0.4)
        assert_true(not step1.is_displayed(), "Step 1 hidden after advancing")
        assert_true(step2.is_displayed(), "Step 2 visible after advancing")
        assert_true("invisible" not in btn_prev.get_attribute("class"), "Previous button is visible on Step 2")

        # 2.3 Step 2 -> Step 1 (Previous navigation)
        safe_click(btn_prev)
        time.sleep(0.4)
        assert_true(step1.is_displayed(), "Step 1 visible after clicking Previous")
        assert_true(not step2.is_displayed(), "Step 2 hidden after clicking Previous")

        # Advance through Step 2, Step 3, Step 4 to Step 5
        safe_click(btn_next) # to Step 2
        time.sleep(0.3)
        safe_click(btn_next) # to Step 3
        time.sleep(0.3)
        step3 = driver.find_element(By.ID, "step-3")
        assert_true(step3.is_displayed(), "Advanced to Step 3 (Controller & Platform)")

        safe_click(btn_next) # to Step 4
        time.sleep(0.3)
        step4 = driver.find_element(By.ID, "step-4")
        assert_true(step4.is_displayed(), "Advanced to Step 4 (I/O & Telemetry)")

        safe_click(btn_next) # to Step 5
        time.sleep(0.3)
        step5 = driver.find_element(By.ID, "step-5")
        assert_true(step5.is_displayed(), "Advanced to Step 5 (Timeline & Contact)")
        assert_true("hidden" in btn_next.get_attribute("class"), "Next button hidden on Step 5")
        assert_true(btn_submit.is_displayed(), "Submit button visible on Step 5")

        # 2.4 Step 5 Validation Gate: Attempt submission with empty contact fields
        safe_click(btn_submit)
        time.sleep(0.3)

        modal_check = driver.find_elements(By.ID, "rfq-confirmation-modal")
        assert_true(len(modal_check) == 0, "Submission blocked when required contact fields are empty (no modal)")

        # Verify error indicators exist in DOM
        field_errors = driver.find_elements(By.CLASS_SETECTOR if hasattr(By, 'CLASS_SETECTOR') else By.CSS_SELECTOR, ".rfq-field-error")
        assert_true(len(field_errors) >= 3, f"Validation errors highlighted for empty fields (found {len(field_errors)})")

        # 2.5 Test Invalid Email Rejection
        name_input = driver.find_element(By.ID, "contact-name")
        company_input = driver.find_element(By.ID, "contact-company")
        email_input = driver.find_element(By.ID, "contact-email")
        phone_input = driver.find_element(By.ID, "contact-phone")

        name_input.send_keys("Marcus Vance, PE")
        company_input.send_keys("Pacific Northwest Water Authority")
        email_input.send_keys("invalid-email-address")
        phone_input.send_keys("208-555-0199")

        safe_click(btn_submit)
        time.sleep(0.3)
        modal_check = driver.find_elements(By.ID, "rfq-confirmation-modal")
        assert_true(len(modal_check) == 0, "Submission blocked when email is malformed (no modal)")

        # 2.6 Test Valid Submission and Submittal Modal Generation
        email_input.clear()
        email_input.send_keys("marcus.vance@pnwwater.gov")
        time.sleep(0.2)

        safe_click(btn_submit)
        time.sleep(0.5)

        modal = driver.find_element(By.ID, "rfq-confirmation-modal")
        assert_true(modal.is_displayed(), "Confirmation modal generated upon valid form submission")

        modal_text = modal.text
        assert_true("SIS-RFQ-" in modal_text, f"Submittal tracking ID generated in modal (got text excerpt)")
        assert_true("Marcus Vance" in modal_text, "Client name reflected in confirmation summary")
        assert_true("Target SCCR" in modal_text, "Engineering specification reflected in modal")
        assert_true("Estimated Budget" in modal_text, "Estimated budget range reflected in modal")

        close_btn = modal.find_element(By.ID, "rfq-modal-close-btn")
        assert_true(close_btn.is_displayed(), "Modal provides functional dismiss button")

    finally:
        driver.quit()
        if server_proc:
            server_proc.terminate()

    print("\n" + "=" * 80)
    print(f"LIVE BROWSER SUMMARY: {passed} passed, {failed} failed.")
    print("=" * 80)
    return failed

if __name__ == "__main__":
    sys.exit(run_tests())
