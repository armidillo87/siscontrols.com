#!/usr/bin/env python3
"""
Sawtooth Industrial Systems — Challenger 1 Bug Reproduction Harness
Executes empirical reproduction for the 3 identified regressions:
1. SCCR Calculator script unreferenced and non-functional on /capabilities/ul-508a-panels/
2. Cutaway 12-Component Explorer script unreferenced on all pages
3. Sticky Mobile RFQ Bar click interception on /rfq/ under mobile viewport (375x667)
"""

import sys
import time
import subprocess
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.common.exceptions import NoSuchElementException

WORKSPACE_ROOT = Path(r"C:\Users\El Hombre de Burrito\teamwork_projects\sawtooth_industrial_systems_site")
PORT = 8139
HOST = "127.0.0.1"

def main():
    print("=" * 80)
    print("CHALLENGER 1 — EMPIRICAL BUG REPRODUCTION HARNESS")
    print("=" * 80)
    
    server_cmd = [sys.executable, "-m", "http.server", str(PORT), "--bind", HOST, "--directory", str(WORKSPACE_ROOT)]
    server_proc = subprocess.Popen(server_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    
    try:
        # ---------------------------------------------------------------------
        # REPRODUCTION 1: SCCR Calculator Dead State
        # ---------------------------------------------------------------------
        print("\n[TEST 1] Verifying SCCR Calculator interactivity on /capabilities/ul-508a-panels/...")
        opts = Options()
        opts.add_argument("--headless=new")
        opts.add_argument("--window-size=1440,900")
        driver = webdriver.Chrome(options=opts)
        
        try:
            driver.get(f"http://{HOST}:{PORT}/capabilities/ul-508a-panels/")
            time.sleep(0.5)
            
            # Check script tags
            scripts = driver.execute_script("return Array.from(document.scripts).map(s => s.src);")
            has_sccr_script = any("sccr-calculator.js" in s for s in scripts)
            print(f"  Script 'sccr-calculator.js' present in DOM: {has_sccr_script}")
            
            sccr_val_el = driver.find_element(By.ID, "sccr-result-value")
            initial_val = sccr_val_el.text
            print(f"  Initial calculated SCCR value: '{initial_val}'")
            
            # Select uncoordinated 10kA PDB
            pdb_select = Select(driver.find_element(By.ID, "feeder-pdb-select"))
            try:
                pdb_select.select_by_value("10")
            except NoSuchElementException:
                pdb_select.select_by_value("pdb-standard")
            time.sleep(0.5)
            
            after_val = sccr_val_el.text
            print(f"  SCCR value after selecting 10kA PDB: '{after_val}'")
            
            if initial_val == after_val and not has_sccr_script:
                print("  --> [CONFIRMED BUG 1]: SCCR calculator is static HTML and fails to recalculate!")
            else:
                print("  --> BUG 1 not reproduced.")
        finally:
            driver.quit()

        # ---------------------------------------------------------------------
        # REPRODUCTION 2: Cutaway 12-Component Explorer Unreferenced
        # ---------------------------------------------------------------------
        print("\n[TEST 2] Verifying Cutaway 12-Component Explorer presence across all routes...")
        routes = ["/", "/capabilities/ul-508a-panels/", "/capabilities/safety-instrumented-systems/",
                  "/capabilities/data-center-cdu-power/", "/capabilities/plc-scada-integration/",
                  "/rfq/", "/about/", "/resources/", "/contact/"]
        
        unreferenced_count = 0
        for r in routes:
            html_path = WORKSPACE_ROOT / ("index.html" if r == "/" else f"{r.strip('/')}/index.html")
            with open(html_path, "r", encoding="utf-8") as f:
                content = f.read()
            if "cutaway-explorer.js" not in content:
                unreferenced_count += 1
                
        print(f"  Routes missing 'cutaway-explorer.js': {unreferenced_count}/{len(routes)}")
        if unreferenced_count == len(routes):
            print("  --> [CONFIRMED BUG 2]: cutaway-explorer.js is completely unreferenced across all routes!")

        # ---------------------------------------------------------------------
        # REPRODUCTION 3: Sticky Mobile RFQ Bar Click Interception on /rfq/
        # ---------------------------------------------------------------------
        print("\n[TEST 3] Verifying Mobile RFQ Bar click interception on /rfq/ (iPhone 375x667)...")
        mobile_emulation = {
            "deviceMetrics": {"width": 375, "height": 667, "pixelRatio": 2.0},
            "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
        }
        m_opts = Options()
        m_opts.add_argument("--headless=new")
        m_opts.add_experimental_option("mobileEmulation", mobile_emulation)
        m_driver = webdriver.Chrome(options=m_opts)
        
        try:
            m_driver.get(f"http://{HOST}:{PORT}/rfq/")
            time.sleep(0.5)
            
            sticky_bar = m_driver.find_element(By.ID, "sticky-mobile-rfq")
            print(f"  Sticky mobile RFQ bar present on /rfq/: {sticky_bar.is_displayed()}")
            
            next_btn = m_driver.find_element(By.ID, "btn-next")
            m_driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", next_btn)
            time.sleep(0.5)
            rect = m_driver.execute_script("return arguments[0].getBoundingClientRect();", next_btn)
            print("  Rect:", rect)
            elem_at_point = m_driver.execute_script("return document.elementFromPoint(arguments[0].left + 10, arguments[0].top + 10);", rect)
            print("  Element at point:", elem_at_point.tag_name if elem_at_point else None, elem_at_point.get_attribute("id") if elem_at_point else None, elem_at_point.get_attribute("class") if elem_at_point else None)
            
            try:
                next_btn.click()
                print("  --> Next button click succeeded.")
            except Exception as e:
                print(f"  --> Exception details: {e}")
                print(f"  --> [CONFIRMED BUG 3]: Next button click intercepted: {type(e).__name__}")
        finally:
            m_driver.quit()

    finally:
        server_proc.terminate()
        server_proc.wait()
    
    print("\n" + "=" * 80)
    print("ALL EMPIRICAL REPRODUCTIONS COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    main()
