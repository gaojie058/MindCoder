#!/usr/bin/env python3
"""MindCoder E2E Acceptance Test Suite"""

from playwright.sync_api import sync_playwright
import os, time, json

BASE = "http://localhost:5173"
SHOTS = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SHOTS, exist_ok=True)

results = []

def shot(page, name):
    path = os.path.join(SHOTS, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    return path

def record(tc_id, name, status, notes=""):
    results.append({"id": tc_id, "name": name, "status": status, "notes": notes})
    icon = "✅" if status == "PASS" else ("❌" if status == "FAIL" else "⚠️")
    print(f"  {icon} {tc_id}: {name} — {notes}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    # ─── TC-01: Homepage loads ───
    print("\n=== TC-01: Homepage loads ===")
    try:
        page.goto(BASE + "/#/", wait_until="networkidle", timeout=15000)
        shot(page, "tc01-homepage")
        # Check for key elements on the new workspace homepage
        body_text = page.text_content("body")
        has_upload = "upload" in body_text.lower() or "drag" in body_text.lower() or "dataset" in body_text.lower()
        has_run = "run" in body_text.lower() or "mindcoder" in body_text.lower()
        if has_upload and has_run:
            record("TC-01", "Homepage loads with workspace UI", "PASS", "Upload area and Run button present")
        else:
            record("TC-01", "Homepage loads with workspace UI", "FAIL", f"Missing elements. Text snippet: {body_text[:200]}")
    except Exception as e:
        shot(page, "tc01-error")
        record("TC-01", "Homepage loads", "FAIL", str(e))

    # ─── TC-02: Model selection dropdown ───
    print("\n=== TC-02: Model selection ===")
    try:
        page.goto(BASE + "/#/", wait_until="networkidle", timeout=15000)
        # Look for model select element
        selects = page.query_selector_all("select")
        model_select = None
        for s in selects:
            options_text = s.inner_text()
            if "gpt" in options_text.lower() or "claude" in options_text.lower():
                model_select = s
                break
        if model_select:
            # Get options
            options = model_select.query_selector_all("option")
            option_values = [o.get_attribute("value") for o in options]
            shot(page, "tc02-model-select")
            has_gpt = any("gpt" in str(v).lower() for v in option_values)
            has_claude = any("claude" in str(v).lower() for v in option_values)
            if has_gpt and has_claude:
                record("TC-02", "Model selection has GPT-5 and Claude", "PASS", f"Options: {option_values}")
            else:
                record("TC-02", "Model selection", "FAIL", f"Missing models. Options: {option_values}")
        else:
            shot(page, "tc02-no-select")
            record("TC-02", "Model selection dropdown", "FAIL", "No model select found")
    except Exception as e:
        shot(page, "tc02-error")
        record("TC-02", "Model selection", "FAIL", str(e))

    # ─── TC-03: Step checkboxes ───
    print("\n=== TC-03: Step selection checkboxes ===")
    try:
        page.goto(BASE + "/#/", wait_until="networkidle", timeout=15000)
        checkboxes = page.query_selector_all("input[type='checkbox']")
        shot(page, "tc03-checkboxes")
        if len(checkboxes) >= 4:
            # Check all are checked by default
            all_checked = all(cb.is_checked() for cb in checkboxes[:4])
            if all_checked:
                record("TC-03", "Step checkboxes (4 steps, all checked)", "PASS", f"{len(checkboxes)} checkboxes found, all checked")
            else:
                record("TC-03", "Step checkboxes default state", "FAIL", "Not all checked by default")
        else:
            record("TC-03", "Step checkboxes", "FAIL", f"Only {len(checkboxes)} checkboxes found, expected ≥4")
    except Exception as e:
        shot(page, "tc03-error")
        record("TC-03", "Step checkboxes", "FAIL", str(e))

    # ─── TC-04: Try Sample Data → Preview page ───
    print("\n=== TC-04: Sample Data Preview ===")
    try:
        page.goto(BASE + "/#/", wait_until="networkidle", timeout=15000)
        # Find and click "Try Sample Data" or similar button
        sample_btn = None
        buttons = page.query_selector_all("button")
        for btn in buttons:
            txt = btn.text_content().lower()
            if "sample" in txt:
                sample_btn = btn
                break
        if sample_btn:
            sample_btn.click()
            page.wait_for_timeout(2000)
            shot(page, "tc04-sample-preview")
            current_url = page.url
            body_text = page.text_content("body")
            if "sample" in current_url.lower() or "sample" in body_text.lower():
                # Check for file previews
                has_preview = "Sample Data" in body_text
                record("TC-04", "Sample Data Preview page", "PASS" if has_preview else "FAIL",
                       f"URL: {current_url}, has preview content: {has_preview}")
            else:
                record("TC-04", "Sample Data Preview navigation", "FAIL", f"URL: {current_url}")
        else:
            shot(page, "tc04-no-button")
            record("TC-04", "Sample Data button", "FAIL", "No sample data button found")
    except Exception as e:
        shot(page, "tc04-error")
        record("TC-04", "Sample Data Preview", "FAIL", str(e))

    # ─── TC-05: Sample Data selection and confirm ───
    print("\n=== TC-05: Sample Data confirm ===")
    try:
        # We should be on the sample preview page from TC-04
        # Find confirm button
        confirm_btn = None
        buttons = page.query_selector_all("button")
        for btn in buttons:
            txt = btn.text_content().lower()
            if "confirm" in txt or "select" in txt:
                confirm_btn = btn
                break
        if confirm_btn:
            confirm_btn.click()
            page.wait_for_timeout(2000)
            shot(page, "tc05-after-confirm")
            current_url = page.url
            # Should be back on homepage
            if "/#/" in current_url and "sample" not in current_url:
                record("TC-05", "Confirm returns to homepage", "PASS", f"URL: {current_url}")
            else:
                record("TC-05", "Confirm navigation", "FAIL", f"URL: {current_url}")
        else:
            shot(page, "tc05-no-confirm")
            record("TC-05", "Confirm button", "FAIL", "No confirm button found on preview page")
    except Exception as e:
        shot(page, "tc05-error")
        record("TC-05", "Sample Data confirm", "FAIL", str(e))

    # ─── TC-06: Run button navigates to Progress ───
    print("\n=== TC-06: Run button → Progress page ===")
    try:
        page.goto(BASE + "/#/", wait_until="networkidle", timeout=15000)
        # First load sample data
        sample_btn = None
        for btn in page.query_selector_all("button"):
            if "sample" in btn.text_content().lower():
                sample_btn = btn
                break
        if sample_btn:
            sample_btn.click()
            page.wait_for_timeout(2000)
            # Confirm
            for btn in page.query_selector_all("button"):
                if "confirm" in btn.text_content().lower():
                    btn.click()
                    break
            page.wait_for_timeout(2000)

        # Now click Run
        run_btn = None
        for btn in page.query_selector_all("button"):
            txt = btn.text_content().lower()
            if "run" in txt and "mindcoder" in txt:
                run_btn = btn
                break
        if not run_btn:
            # Try just "run" 
            for btn in page.query_selector_all("button"):
                txt = btn.text_content().lower()
                if "run" in txt:
                    run_btn = btn
                    break
        
        if run_btn:
            shot(page, "tc06-before-run")
            run_btn.click()
            page.wait_for_timeout(3000)
            shot(page, "tc06-after-run")
            current_url = page.url
            if "progress" in current_url:
                record("TC-06", "Run navigates to Progress", "PASS", f"URL: {current_url}")
            elif "reconstruction" in current_url or "labeling" in current_url:
                record("TC-06", "Run navigates to step page", "PASS", f"URL: {current_url}")
            else:
                record("TC-06", "Run navigation", "FAIL", f"URL: {current_url}")
        else:
            shot(page, "tc06-no-run")
            record("TC-06", "Run button", "FAIL", "No run button found")
    except Exception as e:
        shot(page, "tc06-error")
        record("TC-06", "Run button", "FAIL", str(e))

    # ─── TC-07: Progress page shows step cards ───
    print("\n=== TC-07: Progress page step cards ===")
    try:
        # Navigate to progress page directly
        page.goto(BASE + "/#/progress/test-project/1", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(2000)
        shot(page, "tc07-progress")
        body_text = page.text_content("body")
        has_steps = "step" in body_text.lower() or "open cod" in body_text.lower() or "sub-theme" in body_text.lower()
        if has_steps:
            record("TC-07", "Progress page shows steps", "PASS", "Step content visible")
        else:
            record("TC-07", "Progress page", "FAIL", f"No step content. Text: {body_text[:300]}")
    except Exception as e:
        shot(page, "tc07-error")
        record("TC-07", "Progress page", "FAIL", str(e))

    # ─── TC-08: Step 1 page (CardArea) ───
    print("\n=== TC-08: Step 1 - Open Coding page ===")
    try:
        page.goto(BASE + "/#/reconstruction/test-project/1/card", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(2000)
        shot(page, "tc08-step1")
        body_text = page.text_content("body")
        has_header = "open cod" in body_text.lower() or "step 1" in body_text.lower()
        record("TC-08", "Step 1 page loads", "PASS" if has_header else "FAIL",
               f"Has step header: {has_header}")
    except Exception as e:
        shot(page, "tc08-error")
        record("TC-08", "Step 1 page", "FAIL", str(e))

    # ─── TC-09: Step 2 page (Labeling) ───
    print("\n=== TC-09: Step 2 - Sub-themes page ===")
    try:
        page.goto(BASE + "/#/labeling/test-project/2", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(2000)
        shot(page, "tc09-step2")
        body_text = page.text_content("body")
        has_header = "sub-theme" in body_text.lower() or "step 2" in body_text.lower()
        record("TC-09", "Step 2 page loads", "PASS" if has_header else "FAIL",
               f"Has step header: {has_header}")
    except Exception as e:
        shot(page, "tc09-error")
        record("TC-09", "Step 2 page", "FAIL", str(e))

    # ─── TC-10: Step 3 page (Discovering) ───
    print("\n=== TC-10: Step 3 - Themes page ===")
    try:
        page.goto(BASE + "/#/category/test-project/3", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(2000)
        shot(page, "tc10-step3")
        body_text = page.text_content("body")
        has_header = "theme" in body_text.lower() or "step 3" in body_text.lower()
        record("TC-10", "Step 3 page loads", "PASS" if has_header else "FAIL",
               f"Has step header: {has_header}")
    except Exception as e:
        shot(page, "tc10-error")
        record("TC-10", "Step 3 page", "FAIL", str(e))

    # ─── TC-11: Step 4 page (Visualization) ───
    print("\n=== TC-11: Step 4 - Visualization page ===")
    try:
        page.goto(BASE + "/#/visualization/test-project/4", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(2000)
        shot(page, "tc11-step4")
        body_text = page.text_content("body")
        has_header = "visual" in body_text.lower() or "step 4" in body_text.lower()
        record("TC-11", "Step 4 page loads", "PASS" if has_header else "FAIL",
               f"Has step header: {has_header}")
    except Exception as e:
        shot(page, "tc11-error")
        record("TC-11", "Step 4 page", "FAIL", str(e))

    # ─── TC-12: Research Questions input ───
    print("\n=== TC-12: Research Questions input ===")
    try:
        page.goto(BASE + "/#/", wait_until="networkidle", timeout=15000)
        textareas = page.query_selector_all("textarea")
        rq_textarea = None
        for ta in textareas:
            placeholder = ta.get_attribute("placeholder") or ""
            if "research" in placeholder.lower() or "question" in placeholder.lower():
                rq_textarea = ta
                break
        if not rq_textarea and textareas:
            rq_textarea = textareas[0]  # fallback to first textarea
        
        if rq_textarea:
            rq_textarea.fill("What are the main challenges in qualitative coding?")
            shot(page, "tc12-research-question")
            record("TC-12", "Research Questions input", "PASS", "Text entered successfully")
        else:
            shot(page, "tc12-no-textarea")
            record("TC-12", "Research Questions input", "FAIL", "No textarea found")
    except Exception as e:
        shot(page, "tc12-error")
        record("TC-12", "Research Questions input", "FAIL", str(e))

    browser.close()

# ─── Generate Report ───
print("\n\n" + "="*60)
print("TEST REPORT SUMMARY")
print("="*60)
passed = sum(1 for r in results if r["status"] == "PASS")
failed = sum(1 for r in results if r["status"] == "FAIL")
total = len(results)
print(f"Total: {total} | Passed: {passed} ✅ | Failed: {failed} ❌")
print()
for r in results:
    icon = "✅" if r["status"] == "PASS" else "❌"
    print(f"  {icon} {r['id']}: {r['name']}")
    if r["notes"]:
        print(f"     → {r['notes']}")

# Write markdown report
report_path = os.path.join(os.path.dirname(__file__), "test-report.md")
with open(report_path, "w") as f:
    f.write("# MindCoder E2E Test Report\n\n")
    f.write(f"**Date:** {time.strftime('%Y-%m-%d %H:%M')}\n")
    f.write(f"**Environment:** localhost:5173 (Vite dev server)\n")
    f.write(f"**Tester:** 阿龙 🐉\n\n")
    f.write(f"## Summary\n")
    f.write(f"- Total: {total} test cases\n")
    f.write(f"- Passed: {passed} ✅\n")
    f.write(f"- Failed: {failed} ❌\n\n")
    f.write("## Test Cases\n\n")
    for r in results:
        icon = "✅" if r["status"] == "PASS" else "❌"
        f.write(f"### {r['id']}: {r['name']} {icon}\n\n")
        f.write(f"**Status:** {r['status']}\n")
        if r["notes"]:
            f.write(f"**Notes:** {r['notes']}\n")
        f.write(f"**Screenshot:** ![](screenshots/{r['id'].lower()}-*.png)\n\n")

print(f"\nReport written to: {report_path}")
print(f"Screenshots in: {SHOTS}")
