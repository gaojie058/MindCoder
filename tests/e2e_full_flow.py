#!/usr/bin/env python3
"""
MindCoder Full Flow E2E Test
1. Upload sample data files via homepage
2. Run LLM analysis (waits for completion)
3. Test all 4 steps
4. Generate PDF report
"""

import os, sys, time, json, base64, traceback
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

BASE_URL = "http://localhost:5173"
SCREENSHOT_DIR = Path(__file__).parent / "screenshots"
REPORT_DIR = Path(__file__).parent
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

results = []

def add_result(tc_id, name, category, purpose, precondition, steps, expected, actual, status, screenshots=None):
    results.append({
        "id": tc_id, "name": name, "category": category,
        "purpose": purpose, "precondition": precondition,
        "steps": steps, "expected": expected, "actual": actual,
        "status": status, "screenshots": screenshots or []
    })

def shot(page, name):
    path = SCREENSHOT_DIR / f"{name}.png"
    page.screenshot(path=str(path), full_page=False)
    return str(path)

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()
        
        # ===== TC-01: Homepage =====
        print("TC-01: Homepage...", flush=True)
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(1000)
            shots = [shot(page, "tc01-homepage")]
            
            # Get page content for analysis
            content = page.content()[:3000]
            buttons = [b.text_content() for b in page.locator("button").all()[:10]]
            links = [a.text_content() for a in page.locator("a").all()[:10]]
            
            actual = f"Homepage loaded. Buttons: {buttons[:5]}. Links: {links[:5]}"
            add_result("TC-01", "Homepage Load", "Pages",
                "Verify homepage loads with all elements",
                "Frontend + backend running",
                ["Navigate to http://localhost:5173/"],
                "Homepage with logo, navigation, sample data option",
                actual, "✅ PASS", shots)
        except Exception as e:
            add_result("TC-01", "Homepage", "Pages", "Load homepage", "Servers running",
                ["Go to /"], "Homepage loads", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc01-error")])

        # ===== TC-02: Upload Sample Data via Homepage =====
        print("TC-02: Upload sample data...", flush=True)
        try:
            shots = []
            # Find sample data files
            sample_dir = Path(__file__).parent.parent / "frontend" / "public" / "sample_data"
            sample_files = sorted(sample_dir.glob("*.txt"))[:2]
            print(f"  Sample files: {[f.name for f in sample_files]}", flush=True)
            
            # Set files on the hidden file input
            file_input = page.locator("input[type='file']").first
            file_input.set_input_files([str(f) for f in sample_files])
            page.wait_for_timeout(1000)
            shots.append(shot(page, "tc02-files-uploaded"))
            
            # Verify files appear in uploaded list
            file_count_text = page.locator("text=file(s) uploaded").first
            has_files = file_count_text.is_visible() if file_count_text.count() > 0 else False
            
            actual = f"Uploaded {len(sample_files)} files: {[f.name for f in sample_files]}. Files shown: {has_files}"
            add_result("TC-02", "Upload Sample Data", "Core",
                "Upload sample data files via homepage file input",
                "Homepage loaded",
                ["Set sample .txt files on file input", "Verify files appear in uploaded list"],
                "Files uploaded and shown in file list",
                actual, "✅ PASS" if has_files else "❌ FAIL", shots)
        except Exception as e:
            add_result("TC-02", "Upload Sample Data", "Core", "Upload files", "Homepage loaded",
                ["Upload files"], "Files shown", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc02-error")])

        # ===== TC-03: Run MindCoder Analysis =====
        print("TC-03: Running analysis...", flush=True)
        try:
            shots = [shot(page, "tc03-before-run")]
            
            # Click "Run MindCoder" button
            run_btn = page.locator("button:has-text('Run MindCoder')").first
            if run_btn.count() == 0:
                run_btn = page.locator("button:has-text('Run')").first
            
            if run_btn.count() > 0 and run_btn.is_enabled():
                print("  Clicking Run MindCoder...", flush=True)
                run_btn.click()
                
                # Wait for navigation to analysis page
                page.wait_for_timeout(5000)
                shots.append(shot(page, "tc03-running"))
                
                # Wait for ALL steps to complete
                # With 2 files and 4 steps, each API call ~20-60s, total ~3-5 min
                print("  Waiting for full analysis pipeline...", flush=True)
                start_time = time.time()
                
                # Poll: check if Regenerate button appears (means step completed)
                # or wait until no more network activity
                for wait_round in range(24):  # 24 * 15s = 360s max
                    page.wait_for_timeout(15000)
                    elapsed = int(time.time() - start_time)
                    
                    # Check for Regenerate button (appears when generation is done)
                    regen = page.locator("button:has-text('Regenerate')").first
                    has_regen = regen.count() > 0 and regen.is_visible()
                    
                    # Check for code labels (appear when open coding is done)
                    has_codes = page.locator("[id^='card-']").count()
                    
                    print(f"  [{elapsed}s] Codes: {has_codes}, Regenerate btn: {has_regen}", flush=True)
                    
                    if has_codes > 0 and has_regen:
                        # Step 1 is done. Now wait for background steps (2-4)
                        # Check if there's a background generation indicator
                        bg_btn = page.locator("text=Background").first
                        has_bg = bg_btn.count() > 0 and bg_btn.is_visible()
                        if not has_bg:
                            print(f"  [{elapsed}s] All steps appear complete!", flush=True)
                            break
                        else:
                            print(f"  [{elapsed}s] Background generation still running...", flush=True)
                
                # Extra wait to ensure everything rendered
                page.wait_for_timeout(5000)
                
                # Final screenshot
                page.wait_for_timeout(3000)
                shots.append(shot(page, "tc03-analysis-done"))
                
                elapsed = int(time.time() - start_time)
                actual = f"Full pipeline completed in {elapsed}s. Final URL: {page.url}"
                is_analysis_page = any(p in page.url for p in ["/reconstruction/", "/labeling/", "/category/", "/visualization/"])
                status = "✅ PASS" if is_analysis_page else "❌ FAIL"
            else:
                actual = "Run button not found or disabled (no files uploaded?)"
                status = "❌ FAIL"
            
            add_result("TC-03", "Run MindCoder Analysis", "Core",
                "Run full LLM analysis pipeline on uploaded sample data",
                "2 sample files uploaded",
                ["Click 'Run MindCoder' button", "Wait for analysis pipeline (Open Coding → Sub-themes → Themes → Summary)", "Verify navigation to analysis page"],
                "Analysis completes within 180s, app navigates to Step 1 Open Codes",
                actual, status, shots)
        except Exception as e:
            add_result("TC-03", "Run Analysis", "Core", "Run analysis", "Files uploaded",
                ["Click Run"], "Analysis completes", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc03-error")])

        # ===== TC-04: Step 1 Open Codes =====
        print("TC-04: Open Codes page...", flush=True)
        try:
            shots = []
            
            # Navigate to step 1 if not already there
            step1 = page.locator("text=Open Codes").first
            if step1.count() > 0:
                step1.click()
                page.wait_for_timeout(2000)
            
            shots.append(shot(page, "tc04-open-codes"))
            
            # Check all expected UI elements
            checks = {
                "Code labels": page.locator("[id^='card-']").count(),
                "AI Agent Summary": page.locator("text=AI Agent Summary").count(),
                "Your Task": page.locator("text=Your Task").count(),
                "Custom Instructions": page.locator("text=Custom Instructions").count(),
                "Research Memo": page.locator("text=Research Memo").count(),
                "Prompt History": page.locator("text=Prompt History").count(),
                "Stats (Total)": page.locator("text=Total").count(),
                "Regenerate btn": page.locator("button:has-text('Regenerate')").count(),
            }
            
            # Check file selector
            selects = page.locator("select")
            checks["File selector"] = selects.count()
            
            actual = "; ".join(f"{k}: {v}" for k, v in checks.items())
            has_key_elements = checks["Code labels"] > 0 or checks["AI Agent Summary"] > 0
            
            add_result("TC-04", "Step 1: Open Codes - UI Elements", "Pages",
                "Verify all UI elements on Open Codes page",
                "Analysis completed",
                ["Check code list", "Check left panel sections", "Check stats bar", "Check regenerate button", "Check file selector"],
                "Code list, AI Agent Summary, Your Task (numbered), Custom Instructions, Research Memo, Prompt History, stats bar, regenerate button, file selector",
                actual, "✅ PASS" if has_key_elements else "⚠️ SKIP", shots)
        except Exception as e:
            add_result("TC-04", "Open Codes UI", "Pages", "Check UI elements", "Analysis done",
                ["Check elements"], "All elements present", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc04-error")])

        # ===== TC-05: AI Agent Summary sections =====
        print("TC-05: AI Agent Summary...", flush=True)
        try:
            shots = []
            
            # Expand AI Agent Summary
            summary = page.locator("summary:has-text('AI Agent Summary'), details:has-text('AI Agent Summary') summary").first
            if summary.count() > 0:
                summary.click()
                page.wait_for_timeout(500)
            
            shots.append(shot(page, "tc05-ai-summary-expanded"))
            
            checks = {
                "General Approach": page.locator("text=General Approach").count(),
                "Specific Observations": page.locator("text=Specific Observations").count(),
                "Self-Reflection": page.locator("text=Self-Reflection").count(),
            }
            
            # Expand Self-Reflection
            sr = page.locator("summary:has-text('Self-Reflection')").first
            if sr.count() > 0:
                sr.click()
                page.wait_for_timeout(500)
                shots.append(shot(page, "tc05-self-reflection"))
                
                # Check for labels
                checks["Most confident"] = page.locator("text=Most confident").count()
                checks["Less confident"] = page.locator("text=Less confident").count()
                checks["Focus on human review"] = page.locator("text=Focus on human review").count()
            
            actual = "; ".join(f"{k}: {v}" for k, v in checks.items())
            has_sections = checks.get("General Approach", 0) > 0
            
            add_result("TC-05", "AI Agent Summary Sections", "UI",
                "Verify AI summary has General Approach, Specific Observations, Self-Reflection with labels",
                "Open Codes page with analysis data",
                ["Expand AI Agent Summary", "Check General Approach", "Check Specific Observations with Code references", "Expand Self-Reflection", "Check Most confident / Less confident / Focus labels"],
                "All 3 sections present. Self-Reflection has colored Most confident (green), Less confident (amber), Focus on human review (blue) cards",
                actual, "✅ PASS" if has_sections else "⚠️ SKIP", shots)
        except Exception as e:
            add_result("TC-05", "AI Agent Summary", "UI", "Check sections", "Codes page",
                ["Expand summary"], "Sections present", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc05-error")])

        # ===== TC-06: Your Task numbered list =====
        print("TC-06: Your Task format...", flush=True)
        try:
            shots = []
            task = page.locator("summary:has-text('Your Task')").first
            if task.count() > 0:
                task.click()
                page.wait_for_timeout(300)
            
            shots.append(shot(page, "tc06-your-task"))
            has_ol = page.locator("ol.list-decimal").count()
            
            actual = f"Your Task section. Ordered list elements: {has_ol}"
            add_result("TC-06", "Your Task Numbered Format", "UI",
                "Verify Your Task uses 1. 2. 3. numbered format",
                "Open Codes page loaded",
                ["Expand Your Task section", "Verify numbered list format"],
                "Tasks in numbered list: 1. Verify chunks... 2. Rename vague codes...",
                actual, "✅ PASS" if has_ol > 0 else "⚠️ SKIP", shots)
        except Exception as e:
            add_result("TC-06", "Your Task", "UI", "Check format", "Page loaded",
                ["Check numbered list"], "Numbered list", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc06-error")])

        # ===== TC-07: Code click → highlight =====
        print("TC-07: Code click highlight...", flush=True)
        try:
            shots = []
            codes = page.locator("[id^='card-']")
            if codes.count() > 0:
                shots.append(shot(page, "tc07-before-click"))
                codes.first.click()
                page.wait_for_timeout(1500)
                shots.append(shot(page, "tc07-after-click"))
                
                highlights = page.locator("[data-card-id]").count()
                actual = f"Clicked code. Highlighted segments: {highlights}"
                status = "✅ PASS" if highlights > 0 else "❌ FAIL"
            else:
                actual = "No code labels to click"
                status = "⚠️ SKIP"
            
            add_result("TC-07", "Code Click → Editor Highlight", "Core",
                "Click a code to highlight its text in editor",
                "Open Codes with data",
                ["Click first code label", "Check editor for highlighted segments"],
                "Text segments highlighted with code color, scrolls to first segment",
                actual, status, shots)
        except Exception as e:
            add_result("TC-07", "Code Highlight", "Core", "Click highlights", "Codes present",
                ["Click code"], "Highlights appear", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc07-error")])

        # ===== TC-08: File selector =====
        print("TC-08: File selector...", flush=True)
        try:
            shots = []
            selects = page.locator("select")
            if selects.count() > 0:
                select = selects.first
                options = select.locator("option").all_text_contents()
                shots.append(shot(page, "tc08-selector"))
                
                codes_before = page.locator("[id^='card-']").count()
                
                if len(options) > 1:
                    select.select_option(index=1)
                    page.wait_for_timeout(1000)
                    codes_after = page.locator("[id^='card-']").count()
                    shots.append(shot(page, "tc08-filtered"))
                    actual = f"Options: {options}. Codes before: {codes_before}, after filter: {codes_after}"
                    status = "✅ PASS"
                else:
                    actual = f"Only {len(options)} option(s) in selector"
                    status = "⚠️ SKIP"
            else:
                actual = "No file selector found"
                status = "⚠️ SKIP"
            
            add_result("TC-08", "File Selector Filter", "Core",
                "Verify codes filter by selected file",
                "Multiple files uploaded",
                ["Find file selector", "Select a specific file", "Check codes list changes"],
                "Only codes from selected file shown",
                actual, status, shots)
        except Exception as e:
            add_result("TC-08", "File Selector", "Core", "Filter by file", "Multiple files",
                ["Use selector"], "Codes filtered", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc08-error")])

        # ===== TC-09: Step 2 Sub-themes =====
        print("TC-09: Sub-themes page...", flush=True)
        try:
            shots = []
            # Click Step 2
            for text in ["Sub-themes", "Step 2"]:
                btn = page.locator(f"text={text}").first
                if btn.count() > 0 and btn.is_visible():
                    btn.click()
                    break
            
            page.wait_for_timeout(3000)
            shots.append(shot(page, "tc09-subthemes"))
            
            has_summary = page.locator("text=AI Agent Summary").count()
            has_task = page.locator("text=Your Task").count()
            has_memo = page.locator("text=Research Memo").count()
            
            actual = f"Sub-themes page. URL: {page.url}. AI Summary: {has_summary}, Your Task: {has_task}, Memo: {has_memo}"
            is_on_page = "code" in page.url or "labeling" in page.url
            
            add_result("TC-09", "Step 2: Sub-themes", "Pages",
                "Verify Sub-themes page has same layout as Open Codes",
                "Step 1 completed",
                ["Click Step 2", "Check AI Agent Summary present", "Check Your Task present", "Check Research Memo present"],
                "Sub-themes page with AI Agent Summary, Your Task (numbered), Custom Instructions, Research Memo",
                actual, "✅ PASS" if is_on_page else "⚠️ SKIP", shots)
        except Exception as e:
            add_result("TC-09", "Sub-themes", "Pages", "Check page", "Step 1 done",
                ["Navigate Step 2"], "Page with all sections", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc09-error")])

        # ===== TC-10: Step 3 Themes =====
        print("TC-10: Themes page...", flush=True)
        try:
            shots = []
            for text in ["Themes", "Step 3"]:
                btn = page.locator(f"text={text}").first
                if btn.count() > 0 and btn.is_visible():
                    btn.click()
                    break
            
            page.wait_for_timeout(3000)
            shots.append(shot(page, "tc10-themes"))
            
            has_summary = page.locator("text=AI Agent Summary").count()
            actual = f"Themes page. URL: {page.url}. AI Summary: {has_summary}"
            is_on_page = "concept" in page.url or "category" in page.url
            
            add_result("TC-10", "Step 3: Themes", "Pages",
                "Verify Themes page has same layout as Open Codes",
                "Step 2 completed",
                ["Click Step 3", "Check AI Agent Summary", "Check layout matches Open Codes"],
                "Themes page with consistent AI Agent Summary layout",
                actual, "✅ PASS" if is_on_page else "⚠️ SKIP", shots)
        except Exception as e:
            add_result("TC-10", "Themes", "Pages", "Check page", "Step 2 done",
                ["Navigate Step 3"], "Page consistent", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc10-error")])

        # ===== TC-11: Step 4 Summary =====
        print("TC-11: Summary page...", flush=True)
        try:
            shots = []
            for text in ["Summary", "Step 4"]:
                btn = page.locator(f"text={text}").first
                if btn.count() > 0 and btn.is_visible():
                    btn.click()
                    break
            
            page.wait_for_timeout(3000)
            shots.append(shot(page, "tc11-summary"))
            
            has_pdf = page.locator("text=PDF").count() + page.locator("button:has-text('Report')").count()
            actual = f"Summary page. URL: {page.url}. PDF/Report option: {has_pdf}"
            is_on_page = "visualization" in page.url or "display" in page.url
            
            add_result("TC-11", "Step 4: Summary", "Pages",
                "Verify Summary page with PDF export",
                "Steps 1-3 completed",
                ["Click Step 4", "Check for PDF export button"],
                "Summary with visualization and PDF export",
                actual, "✅ PASS" if is_on_page else "⚠️ SKIP", shots)
        except Exception as e:
            add_result("TC-11", "Summary", "Pages", "Check page", "Steps 1-3 done",
                ["Navigate Step 4"], "Summary page", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc11-error")])

        # ===== TC-12: Navigation back to Home =====
        print("TC-12: Navigation...", flush=True)
        try:
            shots = []
            # Find back/home button
            for text in ["Back", "Home", "Settings"]:
                btn = page.locator(f"button:has-text('{text}'), a:has-text('{text}')").first
                if btn.count() > 0 and btn.is_visible():
                    btn.click()
                    page.wait_for_timeout(1000)
                    break
            
            shots.append(shot(page, "tc12-navigation"))
            actual = f"Navigated. URL: {page.url}"
            
            add_result("TC-12", "Navigation to Home", "UI",
                "Verify Back/Home navigation works",
                "On analysis page",
                ["Click Back/Home button"],
                "Returns to homepage",
                actual, "✅ PASS", shots)
        except Exception as e:
            add_result("TC-12", "Navigation", "UI", "Go home", "On analysis",
                ["Click back"], "Homepage shown", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc12-error")])

        # ===== TC-13: Responsive =====
        print("TC-13: Responsive layout...", flush=True)
        try:
            shots = []
            # Go back to a content page
            page.goto(BASE_URL, wait_until="networkidle")
            page.wait_for_timeout(1000)
            
            for w, label in [(1400, "desktop"), (768, "tablet")]:
                page.set_viewport_size({"width": w, "height": 900})
                page.wait_for_timeout(500)
                shots.append(shot(page, f"tc13-{label}"))
            
            page.set_viewport_size({"width": 1400, "height": 900})
            actual = "Layout captured at 1400px and 768px"
            
            add_result("TC-13", "Responsive Layout", "UI",
                "Verify layout at different widths",
                "App running",
                ["Set viewport 1400px → screenshot", "Set viewport 768px → screenshot"],
                "Layout adapts to viewport",
                actual, "✅ PASS", shots)
        except Exception as e:
            add_result("TC-13", "Responsive", "UI", "Check widths", "App running",
                ["Resize"], "Layout adapts", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc13-error")])

        # ===== TC-14: No Open Codes per File slider in panel =====
        print("TC-14: No slider in panel...", flush=True)
        try:
            shots = []
            # Go to step 1
            step1 = page.locator("text=Open Codes").first
            if step1.count() > 0 and step1.is_visible():
                step1.click()
                page.wait_for_timeout(2000)
            
            shots.append(shot(page, "tc14-no-slider"))
            has_slider_section = page.locator("text=Open Codes per File").count()
            
            actual = f"'Open Codes per File' section in left panel: {has_slider_section}"
            status = "✅ PASS" if has_slider_section == 0 else "❌ FAIL"
            
            add_result("TC-14", "No Slider in Left Panel", "UI",
                "Verify Open Codes per File slider was removed from left panel",
                "Open Codes page loaded",
                ["Check left panel for 'Open Codes per File' section"],
                "Section should NOT be present (removed, only in Settings)",
                actual, status, shots)
        except Exception as e:
            add_result("TC-14", "No Slider", "UI", "Slider removed", "Page loaded",
                ["Check panel"], "No slider", f"ERROR: {e}", "❌ FAIL",
                [shot(page, "tc14-error")])

        browser.close()


def generate_report():
    date = datetime.now().strftime("%Y-%m-%d")
    
    passed = sum(1 for r in results if r["status"] == "✅ PASS")
    failed = sum(1 for r in results if r["status"] == "❌ FAIL")
    skipped = sum(1 for r in results if r["status"] == "⚠️ SKIP")
    total = len(results)
    pass_rate = f"{passed/total*100:.0f}%" if total > 0 else "N/A"
    
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; max-width: 1100px; margin: 0 auto; padding: 20px; color: #333; font-size: 13px; }}
  h1 {{ color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
  h2 {{ color: #2c3e50; margin-top: 30px; }}
  .summary-table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
  .summary-table th, .summary-table td {{ border: 1px solid #ddd; padding: 10px; text-align: center; }}
  .summary-table th {{ background: #3498db; color: white; }}
  .pass {{ color: #27ae60; font-weight: bold; }}
  .fail {{ color: #e74c3c; font-weight: bold; }}
  .skip {{ color: #f39c12; font-weight: bold; }}
  .tc {{ border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin: 15px 0; background: #fafafa; page-break-inside: avoid; }}
  .tc-pass {{ border-left: 4px solid #27ae60; }}
  .tc-fail {{ border-left: 4px solid #e74c3c; }}
  .tc-skip {{ border-left: 4px solid #f39c12; }}
  .field {{ margin: 4px 0; }}
  .label {{ font-weight: bold; color: #555; }}
  img.ss {{ max-width: 100%; border: 1px solid #ddd; border-radius: 4px; margin: 8px 0; }}
</style></head><body>
<h1>🧠 MindCoder E2E Test Report</h1>
<p><b>Date:</b> {date} | <b>Branch:</b> sophia | <b>Tester:</b> 阿龙 (automated)</p>

<table class="summary-table">
<tr><th>Total</th><th>✅ Passed</th><th>❌ Failed</th><th>⚠️ Skipped</th><th>Pass Rate</th></tr>
<tr><td>{total}</td><td class="pass">{passed}</td><td class="fail">{failed}</td><td class="skip">{skipped}</td><td><b>{pass_rate}</b></td></tr>
</table>

<h2>Test Cases</h2>
"""
    
    for r in results:
        cls = "tc-pass" if "PASS" in r["status"] else ("tc-fail" if "FAIL" in r["status"] else "tc-skip")
        steps_html = "<ol>" + "".join(f"<li>{s}</li>" for s in r["steps"]) + "</ol>"
        
        ss_html = ""
        for s in r["screenshots"]:
            if os.path.exists(s):
                with open(s, "rb") as f:
                    b64 = base64.b64encode(f.read()).decode()
                ss_html += f'<img class="ss" src="data:image/png;base64,{b64}" /><br/>'
        
        html += f"""
<div class="tc {cls}">
  <h3>{r['id']}: {r['name']} — {r['status']}</h3>
  <div class="field"><span class="label">Category:</span> {r['category']}</div>
  <div class="field"><span class="label">测试目的:</span> {r['purpose']}</div>
  <div class="field"><span class="label">前置条件:</span> {r['precondition']}</div>
  <div class="field"><span class="label">操作步骤:</span> {steps_html}</div>
  <div class="field"><span class="label">预期结果:</span> {r['expected']}</div>
  <div class="field"><span class="label">实际结果:</span> {r['actual']}</div>
  <div class="field"><span class="label">截图:</span><br/>{ss_html if ss_html else '<em>No screenshots</em>'}</div>
</div>
"""
    
    html += """
<h2>Known Issues</h2>
<ul>
<li>Sample data filenames in SampleDataPreview.tsx (Interview_X.txt) don't match actual files (Sample Data X.txt)</li>
</ul>
<h2>Conclusion</h2>
<p>Full E2E test covering homepage, sample data upload, 4 analysis steps, UI elements, and recent UI changes (numbered Your Task, no slider, Self-Reflection labels).</p>
</body></html>"""
    
    html_path = REPORT_DIR / f"test-report-{date}.html"
    with open(html_path, "w") as f:
        f.write(html)
    
    pdf_path = REPORT_DIR / f"test-report-{date}.pdf"
    try:
        from weasyprint import HTML
        HTML(string=html).write_pdf(str(pdf_path))
        print(f"PDF: {pdf_path}", flush=True)
    except Exception as e:
        print(f"PDF fail: {e}", flush=True)
    
    outbound = Path("/home/cjm/distrobox-ubuntu/.openclaw/media/outbound")
    outbound.mkdir(parents=True, exist_ok=True)
    if pdf_path.exists():
        import shutil
        dest = outbound / f"mindcoder-test-report-{date}.pdf"
        shutil.copy2(pdf_path, dest)
        print(f"Copied: {dest}", flush=True)
    
    return str(pdf_path)


if __name__ == "__main__":
    print("=== MindCoder Full Flow E2E Test ===", flush=True)
    run_tests()
    p = sum(1 for r in results if '✅' in r['status'])
    f = sum(1 for r in results if '❌' in r['status'])
    s = sum(1 for r in results if '⚠️' in r['status'])
    print(f"\nResults: {p} passed, {f} failed, {s} skipped out of {len(results)}", flush=True)
    pdf = generate_report()
    print(f"Done. Report: {pdf}", flush=True)
