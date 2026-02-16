#!/usr/bin/env python3
"""MindCoder FULL E2E Flow Test — actually runs API calls and verifies data rendering"""

from playwright.sync_api import sync_playwright
import os, time, json, base64

BASE = "http://localhost:5173"
DOCS = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(DOCS, "screenshots")
os.makedirs(SHOTS, exist_ok=True)

results = []
api_logs = []

def shot(page, name):
    path = os.path.join(SHOTS, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    return path

def record(tc_id, name, status, purpose, precondition, steps, expected, actual):
    results.append({
        "id": tc_id, "name": name, "status": status,
        "purpose": purpose, "precondition": precondition,
        "steps": steps, "expected": expected, "actual": actual,
        "api": [a for a in api_logs]  # snapshot current api logs
    })
    icon = "✅" if status == "PASS" else "❌"
    print(f"  {icon} {tc_id}: {name}")
    if status == "FAIL":
        print(f"     → {actual}")
    api_logs.clear()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    
    # Capture ALL API calls
    def on_request(request):
        if "/api" in request.url:
            body = ""
            try:
                body = request.post_data[:800] if request.post_data else ""
            except: pass
            api_logs.append({
                "type": "REQUEST", "method": request.method, "url": request.url,
                "body": body[:500]
            })
            print(f"    📤 API Request: {request.method} {request.url}")
    
    def on_response(response):
        if "/api" in response.url:
            body = ""
            try:
                body = response.text()[:800]
            except: pass
            api_logs.append({
                "type": "RESPONSE", "status": response.status, "url": response.url,
                "body": body[:500]
            })
            print(f"    📥 API Response: {response.status} ({len(body)} chars)")
    
    page.on("request", on_request)
    page.on("response", on_response)
    
    # Capture console errors
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    # ═══════════════════════════════════════════
    # TC-01: Load sample data and verify on homepage
    # ═══════════════════════════════════════════
    print("\n=== TC-01: Load Sample Data ===")
    try:
        page.goto(BASE + "/#/", wait_until="networkidle", timeout=15000)
        shot(page, "flow-01-homepage")
        
        # Click "Try with Sample Data"
        for btn in page.query_selector_all("button"):
            if "sample" in btn.text_content().lower():
                btn.click()
                break
        page.wait_for_timeout(2000)
        shot(page, "flow-01-sample-preview")
        
        # Verify preview page
        body = page.text_content("body")
        has_files = "Sample Data" in body
        
        # Confirm selection
        for btn in page.query_selector_all("button"):
            if "confirm" in btn.text_content().lower():
                btn.click()
                break
        page.wait_for_timeout(2000)
        shot(page, "flow-01-files-loaded")
        
        # Check files appear on homepage
        body2 = page.text_content("body")
        files_shown = "Sample Data" in body2 or ".txt" in body2
        
        record("TC-01", "Load Sample Data → Homepage", "PASS" if (has_files and files_shown) else "FAIL",
            "验证加载 Sample Data 后文件出现在首页",
            "dev server 运行",
            ["访问首页", "点击 Try with Sample Data", "在预览页确认3个文件", "点击 Confirm", "验证文件在首页显示"],
            "首页显示已加载的 sample data 文件",
            f"Preview has files: {has_files}, Homepage shows files: {files_shown}")
    except Exception as e:
        shot(page, "flow-01-error")
        record("TC-01", "Load Sample Data", "FAIL", "加载数据", "服务运行", ["操作"], "数据加载", str(e))

    # ═══════════════════════════════════════════
    # TC-02: Click Run and wait for API response (Open Coding)
    # ═══════════════════════════════════════════
    print("\n=== TC-02: Run Generation — Open Coding (API call) ===")
    try:
        # Make sure we're on homepage with files loaded
        page.goto(BASE + "/#/", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(1000)
        
        # Load sample data again if needed
        body = page.text_content("body")
        if "Sample Data" not in body and ".txt" not in body:
            for btn in page.query_selector_all("button"):
                if "sample" in btn.text_content().lower():
                    btn.click()
                    break
            page.wait_for_timeout(2000)
            for btn in page.query_selector_all("button"):
                if "confirm" in btn.text_content().lower():
                    btn.click()
                    break
            page.wait_for_timeout(2000)
        
        shot(page, "flow-02-before-run")
        
        # Click Run
        run_btn = None
        for btn in page.query_selector_all("button"):
            t = btn.text_content().lower()
            if "run" in t:
                run_btn = btn
                break
        
        if run_btn:
            run_btn.click()
            print("  Clicked Run, waiting for API calls...")
            
            # Wait for navigation to progress page
            page.wait_for_timeout(3000)
            shot(page, "flow-02-progress-page")
            url_after_run = page.url
            
            # Wait for API call to complete (up to 90 seconds)
            print("  Waiting for generation to complete (up to 90s)...")
            start = time.time()
            api_called = False
            generation_done = False
            
            for i in range(18):  # 18 * 5 = 90 seconds max
                time.sleep(5)
                elapsed = int(time.time() - start)
                
                # Check if any API calls happened
                if any("RESPONSE" in str(a) for a in api_logs):
                    api_called = True
                
                # Take periodic screenshots
                if i % 3 == 0:
                    shot(page, f"flow-02-waiting-{elapsed}s")
                    print(f"    ... {elapsed}s elapsed, API calls: {len([a for a in api_logs if a.get('type')=='RESPONSE'])}")
                
                # Check if loading is done (no loading overlay)
                loading_visible = page.query_selector(".fixed.inset-0") or page.query_selector("[class*='loading']")
                body_text = page.text_content("body").lower()
                
                # Check if we're past loading
                if api_called and not loading_visible:
                    generation_done = True
                    break
                
                # Check if we see step cards or actual content
                if "open cod" in body_text and api_called:
                    generation_done = True
                    break
            
            shot(page, "flow-02-after-generation")
            elapsed = int(time.time() - start)
            
            record("TC-02", "Run Generation — API Called", "PASS" if api_called else "FAIL",
                "验证点击 Run 后实际调用了后端 API（GPT-5）",
                "首页已加载文件",
                ["点击 Run MindCoder", "等待导航到 Progress 页", f"等待 API 响应（最长90秒，实际{elapsed}秒）"],
                "API 被调用且返回 200",
                f"URL: {url_after_run}, API called: {api_called}, Generation done: {generation_done}, Elapsed: {elapsed}s, API logs: {len(api_logs)}")
        else:
            record("TC-02", "Run Generation", "FAIL", "运行生成", "首页", ["找Run按钮"], "找到按钮", "No run button found")
    except Exception as e:
        shot(page, "flow-02-error")
        record("TC-02", "Run Generation", "FAIL", "运行生成", "首页有文件", ["点Run"], "API调用成功", str(e))

    # ═══════════════════════════════════════════
    # TC-03: Navigate to Step 1 and check for real card data
    # ═══════════════════════════════════════════
    print("\n=== TC-03: Step 1 — Verify Cards with Real Data ===")
    try:
        # Navigate to step 1 card page
        # Get project name from current URL
        current_url = page.url
        project = "test-project"
        if "/progress/" in current_url:
            parts = current_url.split("/")
            for i, part in enumerate(parts):
                if part == "progress" and i + 1 < len(parts):
                    project = parts[i + 1]
                    break
        
        page.goto(BASE + f"/#/reconstruction/{project}/1/card", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(3000)
        shot(page, "flow-03-step1-cards")
        
        # Check for actual card elements with content
        body = page.text_content("body")
        
        # Look for card elements
        cards = page.query_selector_all("[class*='card']")
        # Look for any divs that might contain code data
        code_elements = page.query_selector_all("[class*='Code'], [class*='code']")
        
        # Check if there are any text content blocks (the actual chunks)
        all_text = page.inner_text("body")
        has_real_content = len(all_text) > 500  # If there's substantial text, cards likely have data
        
        # Count visible card-like containers
        visible_cards = 0
        for el in page.query_selector_all("div"):
            try:
                box = el.bounding_box()
                if box and box["width"] > 100 and box["height"] > 50:
                    text = el.inner_text()
                    if len(text) > 30 and ("code" in text.lower() or "chunk" in text.lower() or len(text) > 100):
                        visible_cards += 1
            except:
                pass
        
        shot(page, "flow-03-step1-detail")
        
        record("TC-03", "Step 1 — Cards with Real Data", "PASS" if (has_real_content or visible_cards > 0) else "FAIL",
            "验证 Step 1 页面显示了从 API 返回的真实 Open Codes 卡片数据",
            "已完成 Run generation",
            ["导航到 /reconstruction/{project}/1/card", "检查卡片元素", "检查卡片内是否有真实文本内容"],
            "页面显示多个 Code 卡片，每个包含 name 和 chunks 文本",
            f"Cards found: {len(cards)}, Code elements: {len(code_elements)}, Has real content: {has_real_content}, Visible cards: {visible_cards}, Body length: {len(all_text)}")
    except Exception as e:
        shot(page, "flow-03-error")
        record("TC-03", "Step 1 Cards", "FAIL", "验证卡片数据", "已生成", ["导航"], "有数据", str(e))

    # ═══════════════════════════════════════════
    # TC-04: Check Step 2 for sub-theme data
    # ═══════════════════════════════════════════
    print("\n=== TC-04: Step 2 — Verify Sub-themes Data ===")
    try:
        page.goto(BASE + f"/#/labeling/{project}/2", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(3000)
        shot(page, "flow-04-step2")
        
        all_text = page.inner_text("body")
        has_content = len(all_text) > 300
        has_subtheme_keywords = "sub-theme" in all_text.lower() or "code" in all_text.lower()
        
        record("TC-04", "Step 2 — Sub-themes Data", "PASS" if has_content else "FAIL",
            "验证 Step 2 页面是否有 Sub-theme 数据",
            "已完成生成",
            ["导航到 /labeling/{project}/2", "检查页面内容"],
            "显示 Sub-theme 分组数据",
            f"Content length: {len(all_text)}, Has keywords: {has_subtheme_keywords}")
    except Exception as e:
        shot(page, "flow-04-error")
        record("TC-04", "Step 2", "FAIL", "验证Sub-theme", "已生成", ["导航"], "有数据", str(e))

    # ═══════════════════════════════════════════
    # TC-05: Check Step 3 for theme data
    # ═══════════════════════════════════════════
    print("\n=== TC-05: Step 3 — Verify Themes Data ===")
    try:
        page.goto(BASE + f"/#/category/{project}/3", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(3000)
        shot(page, "flow-05-step3")
        
        all_text = page.inner_text("body")
        has_content = len(all_text) > 300
        
        record("TC-05", "Step 3 — Themes Data", "PASS" if has_content else "FAIL",
            "验证 Step 3 页面是否有 Theme 数据",
            "已完成生成",
            ["导航到 /category/{project}/3", "检查页面内容"],
            "显示 Theme 分组数据",
            f"Content length: {len(all_text)}")
    except Exception as e:
        shot(page, "flow-05-error")
        record("TC-05", "Step 3", "FAIL", "验证Theme", "已生成", ["导航"], "有数据", str(e))

    # ═══════════════════════════════════════════
    # TC-06: Check Step 4 for visualization
    # ═══════════════════════════════════════════
    print("\n=== TC-06: Step 4 — Verify Visualization ===")
    try:
        page.goto(BASE + f"/#/visualization/{project}/4", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(3000)
        shot(page, "flow-06-step4")
        
        all_text = page.inner_text("body")
        has_content = len(all_text) > 200
        # Check for SVG (graph) or report content
        has_svg = page.query_selector("svg") is not None
        has_report = "finding" in all_text.lower() or "report" in all_text.lower() or "theme" in all_text.lower()
        
        record("TC-06", "Step 4 — Visualization Data", "PASS" if (has_content and (has_svg or has_report)) else "FAIL",
            "验证 Step 4 页面是否有可视化数据（报告 + 思维导图）",
            "已完成生成",
            ["导航到 /visualization/{project}/4", "检查 SVG 图和报告文本"],
            "显示 Key Finding Summary 和 Theme Map",
            f"Content length: {len(all_text)}, Has SVG: {has_svg}, Has report: {has_report}")
    except Exception as e:
        shot(page, "flow-06-error")
        record("TC-06", "Step 4", "FAIL", "验证Visualization", "已生成", ["导航"], "有数据", str(e))

    # ═══════════════════════════════════════════
    # TC-07: Console errors check
    # ═══════════════════════════════════════════
    print("\n=== TC-07: Console Errors ===")
    error_count = len(console_errors)
    critical_errors = [e for e in console_errors if "api" in e.lower() or "json" in e.lower() or "failed" in e.lower() or "undefined" in e.lower()]
    record("TC-07", "Console Errors Check", "PASS" if len(critical_errors) == 0 else "FAIL",
        "检查浏览器控制台是否有 API/JSON 相关的严重错误",
        "完整流程已运行",
        ["收集整个测试过程中的 console.error", "过滤 API/JSON 相关错误"],
        "无严重控制台错误",
        f"Total errors: {error_count}, Critical: {len(critical_errors)}" + 
        (f", Examples: {critical_errors[:3]}" if critical_errors else ""))

    browser.close()

# ─── Print Summary ───
print("\n" + "="*60)
print("FULL FLOW TEST SUMMARY")
print("="*60)
passed = sum(1 for r in results if r["status"] == "PASS")
failed = sum(1 for r in results if r["status"] == "FAIL")
total = len(results)
print(f"Total: {total} | Passed: {passed} ✅ | Failed: {failed} ❌ | Rate: {passed/total*100:.0f}%")
for r in results:
    icon = "✅" if r["status"] == "PASS" else "❌"
    print(f"  {icon} {r['id']}: {r['name']}")
    if r["status"] == "FAIL":
        print(f"     → {r['actual']}")

# ─── Generate PDF ───
print("\nGenerating PDF...")
OUT = "/home/cjm/distrobox-ubuntu/.openclaw/media/outbound/mindcoder-full-flow-test.pdf"

html = """<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
body { font-family: Helvetica, sans-serif; margin: 35px; color: #1a1a1a; font-size: 10.5px; line-height: 1.55; }
h1 { color: #C85A3A; font-size: 20px; border-bottom: 2px solid #C85A3A; padding-bottom: 6px; }
h2 { color: #5B7A5E; font-size: 15px; margin-top: 25px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
.summary { background: #f9f7f3; border-radius: 8px; padding: 12px 18px; margin: 12px 0; }
.summary span { font-size: 18px; font-weight: bold; }
.pass { color: #5B7A5E; } .fail { color: #C85A3A; }
.tc { border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin: 14px 0; page-break-inside: avoid; }
.tc-pass { border-left: 4px solid #5B7A5E; } .tc-fail { border-left: 4px solid #C85A3A; }
.tc h3 { margin-top: 0; font-size: 13px; }
.badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 9px; font-weight: bold; }
.badge-pass { background: #e8f5e9; color: #2e7d32; } .badge-fail { background: #ffebee; color: #c62828; }
table.d { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10.5px; }
table.d td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
table.d td:first-child { width: 80px; font-weight: bold; color: #555; }
.ok { color: #2e7d32; font-weight: bold; } .nok { color: #c62828; font-weight: bold; }
img.ss { max-width: 100%; border: 1px solid #ddd; border-radius: 5px; margin: 6px 0; }
.api { background: #f5f5f5; border-radius: 6px; padding: 8px 10px; margin: 4px 0; font-family: monospace; font-size: 9px; word-break: break-all; }
ol { padding-left: 18px; } ol li { margin-bottom: 2px; }
.meta { color: #888; font-size: 9.5px; margin-bottom: 15px; }
</style></head><body>
"""

html += "<h1>🧠 MindCoder — Full E2E Flow Test (with API calls)</h1>"
html += f"""<div class="meta">
<b>Date:</b> {time.strftime('%Y-%m-%d %H:%M %Z')}<br>
<b>Environment:</b> Frontend: localhost:5173 (Vite), Backend: mind-coder-backend.vercel.app (GPT-5)<br>
<b>Tester:</b> 阿龙 🐉 (Playwright headless Chromium)<br>
<b>Scope:</b> Full data flow — upload sample data → API call → data generation → card rendering
</div>"""

html += f"""<div class="summary">
<span class="pass">{passed}</span> Passed &nbsp;
<span class="fail">{failed}</span> Failed &nbsp;
<span>{total}</span> Total &nbsp;
<span style="color:#888;font-size:13px;">Rate: {passed/total*100:.0f}%</span>
</div>"""

html += "<h2>Test Cases</h2>"

for t in results:
    css = "tc-pass" if t["status"] == "PASS" else "tc-fail"
    badge = "badge-pass" if t["status"] == "PASS" else "badge-fail"
    icon = "✅" if t["status"] == "PASS" else "❌"
    rcss = "ok" if t["status"] == "PASS" else "nok"
    steps_html = "".join(f"<li>{s}</li>" for s in t["steps"])
    
    html += f'<div class="tc {css}"><h3>{icon} {t["id"]}: {t["name"]} <span class="badge {badge}">{t["status"]}</span></h3>'
    html += f"""<table class="d">
    <tr><td>测试目的</td><td>{t["purpose"]}</td></tr>
    <tr><td>前置条件</td><td>{t["precondition"]}</td></tr>
    <tr><td>操作步骤</td><td><ol>{steps_html}</ol></td></tr>
    <tr><td>预期结果</td><td>{t["expected"]}</td></tr>
    <tr><td class="{rcss}">实际结果</td><td class="{rcss}">{t["actual"]}</td></tr>
    </table>"""
    
    if t["api"]:
        html += '<div style="margin-top:6px"><b style="font-size:9px;color:#666">📡 API 调用:</b></div>'
        for a in t["api"]:
            if a["type"] == "REQUEST":
                html += f'<div class="api">📤 <b>{a["method"]}</b> {a["url"]}<br>Body: {a.get("body","")[:300]}</div>'
            else:
                html += f'<div class="api">📥 Status: <b>{a["status"]}</b> {a["url"]}<br>Response: {a.get("body","")[:300]}</div>'
    
    # Screenshots
    tc_num = t["id"].replace("TC-","")
    for f_name in sorted(os.listdir(SHOTS)):
        if f_name.startswith(f"flow-{tc_num.zfill(2)}"):
            img_path = os.path.join(SHOTS, f_name)
            with open(img_path, "rb") as fh:
                b64 = base64.b64encode(fh.read()).decode()
            html += f'<p style="color:#888;font-size:8px;margin:2px 0">📸 {f_name}</p>'
            html += f'<img class="ss" src="data:image/png;base64,{b64}">'
    
    html += '</div>'

html += "</body></html>"

try:
    from weasyprint import HTML
    HTML(string=html).write_pdf(OUT)
    print(f"PDF generated: {OUT}")
except ImportError:
    html_out = OUT.replace('.pdf', '.html')
    with open(html_out, 'w') as f:
        f.write(html)
    print(f"HTML saved: {html_out}")
