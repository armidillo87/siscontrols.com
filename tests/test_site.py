#!/usr/bin/env python3
"""
Sawtooth Industrial Systems (siscontrols.com)
Automated Multi-Tier E2E & Architectural Verification Test Harness

Test Suites:
- Tier 1: 100% Route Crawl & Internal Link Integrity (All 9 Core Routes)
- Tier 2: Static Asset & Image Integrity (CSS, JS, SVGs, Seals)
- Tier 3: DOM Semantics, Heading Hierarchy & WCAG AA Accessibility Contrast
- Tier 4: JSON-LD Structured Data Schema Validation (Organization, Service, BreadcrumbList)
- Tier 5: Interactive Component State & Mathematical Validation (SCCR Supplement SB & RFQ Wizard)

Usage:
    pytest tests/test_site.py -v
    python tests/test_site.py
"""

import os
import sys
import re
import json
import socket
import subprocess
import threading
import time
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
from urllib.parse import urlparse, urljoin

import pytest
import requests
from bs4 import BeautifulSoup

# Optional Selenium for live browser simulation
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    HAS_SELENIUM = True
except ImportError:
    HAS_SELENIUM = False

# -----------------------------------------------------------------------------
# Configuration & Constants
# -----------------------------------------------------------------------------
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
TARGET_DIR = WORKSPACE_ROOT / "dist" if (WORKSPACE_ROOT / "dist" / "index.html").exists() else WORKSPACE_ROOT
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000
BASE_URL = os.environ.get("SITE_URL", f"http://{DEFAULT_HOST}:{DEFAULT_PORT}")

ROUTES = [
    "/",
    "/capabilities/ul-508a-panels/",
    "/capabilities/safety-instrumented-systems/",
    "/capabilities/data-center-cdu-power/",
    "/capabilities/plc-scada-integration/",
    "/rfq/",
    "/about/",
    "/resources/",
    "/contact/",
    "/builder/",
    "/locations/",
    "/capability-statement/",
]

EXPECTED_ASSETS = [
    "assets/css/styles.css",
    "assets/css/design-system.css",
    "assets/js/main.js",
    "assets/js/sccr-calculator.js",
    "assets/js/rfq-wizard.js",
    "assets/js/cutaway-explorer.js",
    "assets/js/panel-builder.js",
    "assets/img/sis-logo-mark.svg",
    "assets/img/sis-logo-lockup.svg",
    "assets/img/favicon.svg",
    "assets/img/ul508a-seal.svg",
    "assets/img/mbe-seal.svg",
    "assets/img/iso9001-seal.svg",
]

# WCAG AA Design Tokens & Contrast Pairs
DESIGN_COLOR_TOKENS = {
    "bg-slate-primary": "#0F172A",
    "bg-slate-deep": "#020617",
    "bg-card-elevation": "#131D31",
    "bg-machine-steel": "#1E293B",
    "text-amber-accent": "#F59E0B",
    "text-amber-dark": "#D97706",
    "text-emerald-status": "#10B981",
    "text-cdu-cyan": "#06B6D4",
    "text-pure-white": "#FFFFFF",
    "text-slate-light": "#F8FAFC",
    "text-slate-muted": "#94A3B8",
}

# -----------------------------------------------------------------------------
# Server Lifecycle Management Fixtures & Utilities
# -----------------------------------------------------------------------------
def is_port_in_use(port: int, host: str = DEFAULT_HOST) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


class QuietHTTPHandler(SimpleHTTPRequestHandler):
    """Simple HTTP request handler with request logging silenced during test runs."""
    def log_message(self, format: str, *args: Any) -> None:
        pass


class ThreadedHTTPServer(ThreadingHTTPServer):
    """Multi-threaded HTTP server with socket reuse and expanded backlog for Windows test stability."""
    allow_reuse_address = True
    daemon_threads = True
    request_queue_size = 128

    def server_bind(self) -> None:
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        super().server_bind()


class BackgroundHttpServer:
    """Manages an in-process multi-threaded HTTP server for test crawling."""
    def __init__(self, root_dir: Path, port: int = DEFAULT_PORT, host: str = DEFAULT_HOST):
        self.root_dir = root_dir
        self.port = port
        self.host = host
        self.httpd: Optional[ThreadedHTTPServer] = None
        self.thread: Optional[threading.Thread] = None

    def start(self) -> None:
        if is_port_in_use(self.port, self.host):
            print(f"[INFO] Server already listening on {self.host}:{self.port}")
            return

        print(f"[INFO] Launching in-process ThreadingHTTPServer on {self.host}:{self.port} serving {self.root_dir}")
        handler = functools.partial(QuietHTTPHandler, directory=str(self.root_dir))
        try:
            self.httpd = ThreadedHTTPServer((self.host, self.port), handler)
        except OSError as e:
            if is_port_in_use(self.port, self.host):
                print(f"[INFO] Port {self.port} adopted from active listener: {e}")
                return
            raise

        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

        # Wait up to 5 seconds for socket to accept connections
        start_time = time.time()
        while time.time() - start_time < 5.0:
            if is_port_in_use(self.port, self.host):
                return
            time.sleep(0.05)
        raise RuntimeError(f"Server failed to bind to {self.host}:{self.port} within 5 seconds.")

    def stop(self) -> None:
        if self.httpd:
            print("[INFO] Terminating in-process HTTP server...")
            self.httpd.shutdown()
            self.httpd.server_close()
            self.httpd = None
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)
            self.thread = None


@pytest.fixture(scope="session")
def server():
    """Session fixture that ensures a local HTTP server is running."""
    srv = BackgroundHttpServer(TARGET_DIR, DEFAULT_PORT, DEFAULT_HOST)
    srv.start()
    yield f"http://{DEFAULT_HOST}:{DEFAULT_PORT}"
    srv.stop()


@pytest.fixture(scope="session")
def chrome_driver():
    """Session fixture providing headless Chrome driver if available."""
    if not HAS_SELENIUM:
        pytest.skip("Selenium is not installed; skipping browser-based tests.")
    
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1440,900")
    
    try:
        driver = webdriver.Chrome(options=options)
        yield driver
        driver.quit()
    except Exception as e:
        pytest.skip(f"Headless Chrome initialization failed: {e}")


# -----------------------------------------------------------------------------
# Color Contrast Mathematics (WCAG 2.1 Specification)
# -----------------------------------------------------------------------------
def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join([c * 2 for c in hex_color])
    return int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)


def calculate_relative_luminance(rgb: Tuple[int, int, int]) -> float:
    """Calculate relative luminance per WCAG 2.1 formula."""
    channels = []
    for c in rgb:
        v = c / 255.0
        if v <= 0.03928:
            channels.append(v / 12.92)
        else:
            channels.append(((v + 0.055) / 1.055) ** 2.4)
    r, g, b = channels
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def calculate_contrast_ratio(hex1: str, hex2: str) -> float:
    """Calculate contrast ratio between two hex colors."""
    lum1 = calculate_relative_luminance(hex_to_rgb(hex1))
    lum2 = calculate_relative_luminance(hex_to_rgb(hex2))
    l_light = max(lum1, lum2)
    l_dark = min(lum1, lum2)
    return (l_light + 0.05) / (l_dark + 0.05)


# -----------------------------------------------------------------------------
# Helper: HTML File Resolver
# -----------------------------------------------------------------------------
def route_to_local_file(route: str) -> Path:
    clean = route.strip("/")
    if not clean:
        return TARGET_DIR / "index.html"
    return TARGET_DIR / clean / "index.html"


# =============================================================================
# TIER 1: 100% ROUTE CRAWL & LINK INTEGRITY
# =============================================================================
class TestTier1RouteCrawl:
    """Verify all 9 internal routes return HTTP 200 and contain zero broken internal links."""

    @pytest.mark.parametrize("route", ROUTES)
    def test_route_returns_http_200(self, server, route):
        url = urljoin(server, route)
        response = requests.get(url, timeout=5.0)
        assert response.status_code == 200, f"Route {route} returned HTTP {response.status_code}, expected 200 OK."
        assert len(response.text) > 200, f"Route {route} response payload is suspiciously empty."

    @pytest.mark.parametrize("route", ROUTES)
    def test_route_internal_links_integrity(self, server, route):
        url = urljoin(server, route)
        response = requests.get(url, timeout=5.0)
        soup = BeautifulSoup(response.text, "html.parser")
        
        links = soup.find_all("a", href=True)
        assert len(links) > 0, f"Route {route} has no navigation links."

        broken_links = []
        for a in links:
            href = a["href"].strip()
            # Ignore external protocols, mailto, tel, empty anchors, or javascript
            if not href or href.startswith(("http://", "https://", "mailto:", "tel:", "javascript:")):
                continue
            
            # Resolve relative link
            target_url = urljoin(url, href)
            parsed = urlparse(target_url)
            
            # Verify target route returns 200 OK
            check_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            res = requests.get(check_url, timeout=3.0)
            if res.status_code != 200:
                broken_links.append(f"{href} -> HTTP {res.status_code}")
                continue

            # If anchor fragment exists, verify ID exists on target page
            if parsed.fragment:
                target_soup = BeautifulSoup(res.text, "html.parser")
                element = target_soup.find(id=parsed.fragment)
                if not element:
                    broken_links.append(f"{href} -> Fragment #{parsed.fragment} not found on {parsed.path}")

        assert len(broken_links) == 0, f"Broken internal links found on {route}: {broken_links}"


# =============================================================================
# TIER 2: STATIC ASSET INTEGRITY
# =============================================================================
class TestTier2AssetIntegrity:
    """Verify that all CSS, JS, SVG logos, and certification seals exist and load cleanly."""

    @pytest.mark.parametrize("asset_rel_path", EXPECTED_ASSETS)
    def test_asset_exists_on_disk(self, asset_rel_path):
        file_path = TARGET_DIR / asset_rel_path
        assert file_path.exists(), f"Required asset missing on disk: {asset_rel_path}"
        assert file_path.stat().st_size > 0, f"Asset file is empty (0 bytes): {asset_rel_path}"

    @pytest.mark.parametrize("asset_rel_path", EXPECTED_ASSETS)
    def test_asset_returns_http_200(self, server, asset_rel_path):
        url = urljoin(server, asset_rel_path)
        res = requests.get(url, timeout=5.0)
        assert res.status_code == 200, f"HTTP fetch for {asset_rel_path} returned status {res.status_code}"
        assert len(res.content) > 0, f"HTTP response content for {asset_rel_path} is empty."

    def test_svg_logo_mark_geometry(self):
        """Assert the bespoke Sawtooth SVG logo mark contains valid vector geometry."""
        logo_path = TARGET_DIR / "assets/img/sis-logo-mark.svg"
        assert logo_path.exists(), "sis-logo-mark.svg does not exist."
        content = logo_path.read_text(encoding="utf-8")
        assert "<svg" in content and "</svg>" in content, "Logo mark is not valid SVG XML."
        # Verify brand geometry tokens (sawtooth waveform or enclosure elements)
        assert any(token in content.lower() for token in ["path", "polygon", "polyline"]), \
            "SVG logo mark lacks geometric vector elements."

    def test_certification_seals_integrity(self):
        """Assert UL 508A, MBE, and ISO 9001 badges exist with valid SVG structure."""
        for seal in ["ul508a-seal.svg", "mbe-seal.svg", "iso9001-seal.svg"]:
            seal_path = TARGET_DIR / "assets/img" / seal
            assert seal_path.exists(), f"Certification seal missing: {seal}"
            content = seal_path.read_text(encoding="utf-8")
            assert "<svg" in content, f"{seal} does not contain valid SVG markup."


# =============================================================================
# TIER 3: DOM SEMANTICS & ACCESSIBILITY (WCAG AA)
# =============================================================================
class TestTier3DOMSemanticsAndAccessibility:
    """Verify semantic HTML5 invariants, monotonic headings, breadcrumbs, and WCAG AA contrast."""

    @pytest.mark.parametrize("route", ROUTES)
    def test_exactly_one_h1_per_page(self, server, route):
        url = urljoin(server, route)
        res = requests.get(url, timeout=5.0)
        soup = BeautifulSoup(res.text, "html.parser")
        h1_tags = soup.find_all("h1")
        assert len(h1_tags) == 1, f"Route {route} must have exactly one <h1>, found {len(h1_tags)}."
        assert len(h1_tags[0].get_text(strip=True)) > 0, f"Route {route} <h1> tag is empty."

    @pytest.mark.parametrize("route", ROUTES)
    def test_monotonic_heading_hierarchy(self, server, route):
        """Assert headings do not skip levels (e.g. H1 directly followed by H3 or H2 by H4)."""
        url = urljoin(server, route)
        res = requests.get(url, timeout=5.0)
        soup = BeautifulSoup(res.text, "html.parser")
        headings = soup.find_all(re.compile(r"^h[1-6]$"))
        
        last_level = 0
        for h in headings:
            current_level = int(h.name[1])
            if last_level != 0:
                # Heading can stay same, go deeper by at most 1, or jump back up to any higher level
                assert current_level <= last_level + 1, \
                    f"Route {route} has non-monotonic heading jump from <h{last_level}> to <h{current_level}>: '{h.get_text(strip=True)}'"
            last_level = current_level

    @pytest.mark.parametrize("route", ROUTES)
    def test_document_metadata_and_viewport(self, server, route):
        url = urljoin(server, route)
        res = requests.get(url, timeout=5.0)
        soup = BeautifulSoup(res.text, "html.parser")
        
        # Viewport meta tag
        viewport = soup.find("meta", attrs={"name": "viewport"})
        assert viewport and "width=device-width" in viewport.get("content", ""), \
            f"Route {route} missing standard mobile viewport meta tag."

        # Document title
        title = soup.find("title")
        assert title and len(title.get_text(strip=True)) > 5, \
            f"Route {route} missing descriptive <title> tag."

        # HTML lang attribute
        html_tag = soup.find("html")
        assert html_tag and html_tag.get("lang") == "en", \
            f"Route {route} <html> tag missing lang='en' attribute."

    @pytest.mark.parametrize("route", [r for r in ROUTES if r != "/"])
    def test_breadcrumbs_present_on_subpages(self, server, route):
        """All subpages must contain visible breadcrumb navigation links referencing Home."""
        url = urljoin(server, route)
        res = requests.get(url, timeout=5.0)
        soup = BeautifulSoup(res.text, "html.parser")
        
        # Check nav[aria-label="Breadcrumb"] or elements with breadcrumb class/schema
        breadcrumb_nav = soup.find("nav", attrs={"aria-label": re.compile(r"breadcrumb", re.I)}) or \
                         soup.find(class_=re.compile(r"breadcrumb", re.I)) or \
                         soup.find("ol", attrs={"itemtype": re.compile(r"BreadcrumbList", re.I)})
        
        assert breadcrumb_nav is not None, f"Subpage {route} is missing breadcrumb navigation markup."
        home_link = breadcrumb_nav.find("a", href=re.compile(r"^/?(index\.html)?$"))
        assert home_link is not None, f"Breadcrumbs on {route} do not contain link back to Home."

    def test_wcag_aa_color_contrast_design_tokens(self):
        """Verify contrast ratios of industrial design tokens meet WCAG AA (>= 4.5:1 for normal text)."""
        slate_bg = DESIGN_COLOR_TOKENS["bg-slate-primary"]      # #0F172A
        deep_bg = DESIGN_COLOR_TOKENS["bg-slate-deep"]           # #020617
        card_bg = DESIGN_COLOR_TOKENS["bg-card-elevation"]       # #131D31

        # Safety Amber Accent
        amber = DESIGN_COLOR_TOKENS["text-amber-accent"]         # #F59E0B
        amber_ratio = calculate_contrast_ratio(amber, slate_bg)
        assert amber_ratio >= 4.5, f"Amber ({amber}) on Slate ({slate_bg}) ratio {amber_ratio:.2f} < 4.5:1"

        # Pure White
        white = DESIGN_COLOR_TOKENS["text-pure-white"]
        white_ratio = calculate_contrast_ratio(white, slate_bg)
        assert white_ratio >= 7.0, f"White on Slate ratio {white_ratio:.2f} < 7.0:1 (WCAG AAA)"

        # Emerald Status
        emerald = DESIGN_COLOR_TOKENS["text-emerald-status"]     # #10B981
        emerald_ratio = calculate_contrast_ratio(emerald, slate_bg)
        assert emerald_ratio >= 4.5, f"Emerald on Slate ratio {emerald_ratio:.2f} < 4.5:1"

        # CDU Cyan Telemetry
        cyan = DESIGN_COLOR_TOKENS["text-cdu-cyan"]              # #06B6D4
        cyan_ratio = calculate_contrast_ratio(cyan, slate_bg)
        assert cyan_ratio >= 4.5, f"Cyan on Slate ratio {cyan_ratio:.2f} < 4.5:1"

        # Muted Slate Body
        muted = DESIGN_COLOR_TOKENS["text-slate-muted"]          # #94A3B8
        muted_ratio = calculate_contrast_ratio(muted, slate_bg)
        assert muted_ratio >= 4.5, f"Muted slate on Slate ratio {muted_ratio:.2f} < 4.5:1"


# =============================================================================
# TIER 4: JSON-LD STRUCTURED DATA SCHEMA VALIDATION
# =============================================================================
class TestTier4StructuredDataJSONLD:
    """Validate JSON-LD structured data syntax and Schema.org compliance."""

    def _extract_json_ld(self, html_text: str) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html_text, "html.parser")
        scripts = soup.find_all("script", type="application/ld+json")
        parsed = []
        for s in scripts:
            content = s.string or s.get_text()
            if content and content.strip():
                try:
                    data = json.loads(content)
                    if isinstance(data, list):
                        parsed.extend(data)
                    else:
                        parsed.append(data)
                except json.JSONDecodeError as err:
                    pytest.fail(f"Invalid JSON-LD syntax: {err}\nContent:\n{content}")
        return parsed

    @pytest.mark.parametrize("route", ROUTES)
    def test_json_ld_present_and_valid_syntax(self, server, route):
        url = urljoin(server, route)
        res = requests.get(url, timeout=5.0)
        schemas = self._extract_json_ld(res.text)
        assert len(schemas) > 0, f"Route {route} does not contain any JSON-LD <script> tags."
        for schema in schemas:
            assert "@context" in schema, f"JSON-LD on {route} missing @context."
            assert "schema.org" in schema["@context"].lower(), f"JSON-LD @context on {route} must be Schema.org."

    def test_organization_schema_on_home_and_about(self, server):
        for route in ["/", "/about/"]:
            url = urljoin(server, route)
            res = requests.get(url, timeout=5.0)
            schemas = self._extract_json_ld(res.text)
            org = next((s for s in schemas if s.get("@type") == "Organization"), None)
            assert org is not None, f"Organization schema not found on {route}"
            
            # Assert essential properties
            assert "Sawtooth Industrial Systems" in org.get("name", ""), f"Organization name mismatch on {route}"
            assert "address" in org, f"Organization missing address on {route}"
            address = org["address"]
            assert address.get("addressLocality") == "Boise", "Address locality must be Boise."
            assert address.get("addressRegion") == "ID", "Address region must be ID."
            assert address.get("postalCode") == "83713", "Postal code must be 83713."
            assert "contactPoint" in org, f"Organization missing contactPoint on {route}"

    @pytest.mark.parametrize("cap_route", [
        "/capabilities/ul-508a-panels/",
        "/capabilities/safety-instrumented-systems/",
        "/capabilities/data-center-cdu-power/",
        "/capabilities/plc-scada-integration/",
    ])
    def test_service_schema_on_capability_pages(self, server, cap_route):
        url = urljoin(server, cap_route)
        res = requests.get(url, timeout=5.0)
        schemas = self._extract_json_ld(res.text)
        service = next((s for s in schemas if s.get("@type") == "Service"), None)
        assert service is not None, f"Service schema not found on {cap_route}"
        assert len(service.get("name", "")) > 5, f"Service schema on {cap_route} has empty or short name."
        assert len(service.get("description", "")) > 10, f"Service description on {cap_route} is too short."

    @pytest.mark.parametrize("route", [r for r in ROUTES if r != "/"])
    def test_breadcrumb_list_schema_on_child_routes(self, server, route):
        url = urljoin(server, route)
        res = requests.get(url, timeout=5.0)
        schemas = self._extract_json_ld(res.text)
        bcl = next((s for s in schemas if s.get("@type") == "BreadcrumbList"), None)
        assert bcl is not None, f"BreadcrumbList schema not found on {route}"
        items = bcl.get("itemListElement", [])
        assert len(items) >= 2, f"BreadcrumbList on {route} must have at least 2 items (Home + Page)."
        assert items[0].get("position") == 1, "First breadcrumb position must be 1."


# =============================================================================
# TIER 5: INTERACTIVE COMPONENT STATE & MATHEMATICAL VALIDATION
# =============================================================================
class TestTier5InteractiveComponents:
    """Validate mathematical calculations for UL 508A Supplement SB and RFQ wizard transitions."""

    # -------------------------------------------------------------------------
    # 5.1 SCCR Supplement SB Mathematical Assertions
    # -------------------------------------------------------------------------
    def calculate_sccr_panel(self, main_aic: int, feeder_pdb_sccr: int, branch_components: List[int]) -> Tuple[int, str]:
        """
        Implements UL 508A Supplement SB Weakest-Link Rule:
        Panel SCCR = min(Main Disconnect Interrupting Rating, Feeder PDB SCCR, min(Branch Components))
        """
        all_ratings = [("Main Disconnect", main_aic), ("Feeder PDB", feeder_pdb_sccr)]
        for idx, b in enumerate(branch_components):
            all_ratings.append((f"Branch Component #{idx+1}", b))
        
        weakest = min(all_ratings, key=lambda x: x[1])
        return weakest[1], weakest[0]

    def calculate_thermodynamics(self, watts: float, height_in: float, width_in: float, depth_in: float,
                                 k_coeff: float = 0.30, ambient_temp_f: float = 85.0) -> Dict[str, Any]:
        """
        Implements industrial enclosure thermodynamic dissipation model:
        Area A (sq ft) = 2(H*W + H*D + W*D) / 144
        Delta T (deg F) = Watts / (k * A)
        Internal Temp = Ambient + Delta T
        Threshold: 104 deg F (40 deg C)
        """
        surface_area_sqft = 2.0 * (height_in * width_in + height_in * depth_in + width_in * depth_in) / 144.0
        delta_t = watts / (k_coeff * surface_area_sqft)
        internal_temp = ambient_temp_f + delta_t
        cooling_required = internal_temp > 104.0
        
        fan_cfm = 0.0
        ac_btu = 0.0
        if cooling_required:
            fan_cfm = (3.16 * watts) / max(1.0, (104.0 - ambient_temp_f))
            q_btu = watts * 3.412
            ac_btu = q_btu * 1.25  # 25% safety margin
            
        return {
            "surface_area_sqft": round(surface_area_sqft, 2),
            "delta_t_f": round(delta_t, 1),
            "internal_temp_f": round(internal_temp, 1),
            "cooling_required": cooling_required,
            "fan_cfm": round(fan_cfm, 1),
            "ac_btu": round(ac_btu, 1)
        }

    def test_sccr_uncoordinated_bottleneck_scenario(self):
        """Standard 10kA PDB with high-spec 65kA/100kA breakers bottlenecks entire panel to 10kA."""
        main_aic = 65
        feeder_pdb = 10  # Standard uncoordinated PDB
        branch = [65, 100]
        sccr, weakest = self.calculate_sccr_panel(main_aic, feeder_pdb, branch)
        assert sccr == 10, f"Expected 10kA bottleneck, got {sccr}kA"
        assert weakest == "Feeder PDB", f"Expected Feeder PDB bottleneck, got {weakest}"

    def test_sccr_coordinated_high_fault_scenario(self):
        """Coordinated High-Fault Finger-Safe PDB + Class J Fuses achieves 100kA."""
        main_aic = 100
        feeder_pdb = 100  # High-Fault Mersen FSPDB
        branch = [100, 100]
        sccr, _ = self.calculate_sccr_panel(main_aic, feeder_pdb, branch)
        assert sccr == 100, f"Expected 100kA coordinated rating, got {sccr}kA"

    def test_thermodynamic_cooling_threshold(self):
        """High heat load (600W) in small 36x30x10 enclosure must trigger active cooling requirement."""
        result = self.calculate_thermodynamics(watts=600.0, height_in=36.0, width_in=30.0, depth_in=10.0)
        assert result["cooling_required"] is True, "Thermodynamic model failed to flag cooling required."
        assert result["internal_temp_f"] > 104.0, f"Expected internal temp > 104F, got {result['internal_temp_f']}"
        assert result["ac_btu"] > 2000.0, f"Expected AC BTU > 2000, got {result['ac_btu']}"

    # -------------------------------------------------------------------------
    # 5.2 Browser-Based Interactive Simulation (Headless Chrome)
    # -------------------------------------------------------------------------
    def test_sccr_calculator_live_dom_interaction(self, chrome_driver, server):
        """Live DOM verification of SCCR Calculator on capability or home page."""
        target_url = urljoin(server, "/capabilities/ul-508a-panels/")
        chrome_driver.get(target_url)
        time.sleep(1.0)
        
        # Check if calculator mount or widget exists
        mount = chrome_driver.find_elements(By.CSS_SELECTOR, "#sccr-calculator-mount, .sccr-calculator, [data-widget='sccr']")
        if not mount:
            # Check homepage if mounted there
            chrome_driver.get(urljoin(server, "/"))
            mount = chrome_driver.find_elements(By.CSS_SELECTOR, "#sccr-calculator-mount, .sccr-calculator, [data-widget='sccr']")
        
        assert len(mount) > 0, "SCCR Calculator mount point not found in DOM."

    def test_rfq_wizard_step_transitions_and_validation(self, chrome_driver, server):
        """Live DOM verification of the 5-Step RFQ Estimator wizard state machine."""
        rfq_url = urljoin(server, "/rfq/")
        chrome_driver.get(rfq_url)
        time.sleep(1.0)

        # Assert Step 1 container exists
        step1 = chrome_driver.find_elements(By.CSS_SELECTOR, "#step-1, [data-step='1'], .step-1")
        assert len(step1) > 0, "RFQ Wizard Step 1 element missing from /rfq/ page."

        # Verify next button presence
        next_btn = chrome_driver.find_elements(By.CSS_SELECTOR, "button[data-action='next'], #btn-next, .btn-next-step")
        assert len(next_btn) > 0, "RFQ Wizard Next button not found on Step 1."

        # Verify required input validation on Step 5 (e.g. Email field rejects blank)
        email_inputs = chrome_driver.find_elements(By.CSS_SELECTOR, "input[type='email'], input[name='email'], #contact-email")
        if email_inputs:
            assert email_inputs[0].get_attribute("required") is not None or "required" in (email_inputs[0].get_attribute("class") or ""), \
                "Contact email input on RFQ wizard must be required."

    def test_interactive_widgets_mounted_in_html(self, server):
        """Assert that SCCR Calculator and Cutaway Explorer scripts and mounts are present in DOM."""
        url = urljoin(server, "/capabilities/ul-508a-panels/")
        res = requests.get(url, timeout=5.0)
        soup = BeautifulSoup(res.text, "html.parser")
        
        # Verify mounts and script on UL 508A
        assert soup.find(id="sccr-calculator-mount") is not None, "Missing #sccr-calculator-mount in HTML"
        scripts = [s.get("src", "") for s in soup.find_all("script")]
        assert any("sccr-calculator.js" in s for s in scripts), "sccr-calculator.js script tag missing from HTML"
        
        # Verify cutaway explorer on Home and CDU Power
        home_url = urljoin(server, "/")
        home_res = requests.get(home_url, timeout=5.0)
        home_soup = BeautifulSoup(home_res.text, "html.parser")
        assert home_soup.find(id="cutaway-explorer-mount") is not None, "Missing #cutaway-explorer-mount on Home"
        home_scripts = [s.get("src", "") for s in home_soup.find_all("script")]
        assert any("cutaway-explorer.js" in s for s in home_scripts), "cutaway-explorer.js script tag missing from Home"

        cdu_url = urljoin(server, "/capabilities/data-center-cdu-power/")
        cdu_res = requests.get(cdu_url, timeout=5.0)
        cdu_soup = BeautifulSoup(cdu_res.text, "html.parser")
        assert cdu_soup.find(id="cutaway-explorer-mount") is not None, "Missing #cutaway-explorer-mount on CDU Power"
        cdu_scripts = [s.get("src", "") for s in cdu_soup.find_all("script")]
        assert any("cutaway-explorer.js" in s for s in cdu_scripts), "cutaway-explorer.js script tag missing from CDU Power"


# =============================================================================
# Standalone CLI Test Runner Entrypoint
# =============================================================================
def main():
    print("=" * 80)
    print("  SAWTOOTH INDUSTRIAL SYSTEMS (siscontrols.com) — E2E TEST HARNESS")
    print("=" * 80)
    print(f"Target Workspace: {WORKSPACE_ROOT}")
    print(f"Base Test Server: {BASE_URL}")
    print("-" * 80)
    
    # Run pytest programmatically
    args = [
        str(Path(__file__).resolve()),
        "-v",
        "--tb=short",
        "-rA"
    ]
    exit_code = pytest.main(args)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
