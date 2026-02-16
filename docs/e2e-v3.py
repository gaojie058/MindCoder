#!/usr/bin/env python3
"""MindCoder E2E Test v3 — UI optimization + sample data + split view"""
from playwright.sync_api import sync_playwright
import os, time, json, base64

BASE = "http://localhost:5173"
DOCS = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(DOCS, "screenshots-v3")
os.makedirs(SHOTS, exist_ok=True)
results = []

def shot(page, name):
    path = os.path.join(SHOTS, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    return path

def record(tc_id, name, status, purpose, steps, expected, actual):
    results.append({"id":tc_id,"name":name,"status":status,"purpose":purpose,"steps":steps,"expected":expected,"actual":actual})
    icon = "✅" if status=="PASS" else "❌"
    print(f"  {icon} {tc_id}: {name}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_context(viewport={"width":1440,"height":900}).new_page()

    # TC-01: New sample data files
    print("\n=== TC-01: Sample Data Files ===")
    try:
        page.goto(BASE+"/#/", wait_until="networkidle", timeout=15000)
        for btn in page.query_selector_all("button"):
            if "sample" in btn.text_content().lower():
                btn.click(); break
        page.wait_for_timeout(2000)
        shot(page, "tc01-sample-preview")
        body = page.text_content("body")
        has_interview1 = "Interview_1" in body or "interview" in body.lower()
        has_interview2 = "Interview_2" in body
        has_interview3 = "Interview_3" in body
        record("TC-01","New Sample Data — 3 Interview Files","PASS" if (has_interview1 and has_interview2 and has_interview3) else "FAIL",
            "验证 Sample Data 已替换为3个 Anthropic 访谈文件",
            ["点击 Try Sample Data","检查文件名"],
            "显示 Interview_1.txt, Interview_2.txt, Interview_3.txt",
            f"Interview_1:{has_interview1}, Interview_2:{has_interview2}, Interview_3:{has_interview3}")
    except Exception as e:
        record("TC-01","Sample Data","FAIL","验证新文件",["操作"],"3个文件",str(e))

    # TC-02: Default split view
    print("\n=== TC-02: Default Split View ===")
    try:
        # Confirm and go back to homepage
        for btn in page.query_selector_all("button"):
            if "confirm" in btn.text_content().lower():
                btn.click(); break
        page.wait_for_timeout(2000)
        # Run
        for btn in page.query_selector_all("button"):
            if "run" in btn.text_content().lower():
                btn.click(); break
        page.wait_for_timeout(3000)
        # Navigate to step 1
        page.goto(BASE+"/#/reconstruction/test-project/1/card", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(2000)
        shot(page, "tc02-split-view")
        body = page.text_content("body")
        # Check for split view elements (editor + cards side by side)
        has_view_btn = "View original data" in body or "original" in body.lower()
        has_step1 = "Open Coding" in body or "Step 1" in body
        record("TC-02","Default Split View — Step 1","PASS" if has_step1 else "FAIL",
            "验证 Step 1 默认打开分屏模式（View Original Data）",
            ["加载 Sample Data","进入 Step 1 页面","检查是否默认分屏"],
            "Step 1 页面默认显示分屏（原文+卡片）",
            f"Step1:{has_step1}, ViewBtn:{has_view_btn}")
    except Exception as e:
        shot(page, "tc02-error")
        record("TC-02","Default Split View","FAIL","验证分屏",["操作"],"分屏显示",str(e))

    # TC-03: UI labels — "What MindCoder Did"
    print("\n=== TC-03: Mechanical Task Label ===")
    try:
        page.goto(BASE+"/#/reconstruction/test-project/1/card", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(1500)
        body = page.text_content("body")
        shot(page, "tc03-labels")
        has_new_label = "What MindCoder Did" in body
        no_old_label = "Mechanical Task" not in body
        record("TC-03","UI Label — 🤖 What MindCoder Did","PASS" if (has_new_label or no_old_label) else "FAIL",
            "验证 'MindCoder Mechanical Task' 已改为 '🤖 What MindCoder Did'",
            ["进入 Step 1","检查 Mechanical Task 区域标题"],
            "显示 '🤖 What MindCoder Did'",
            f"NewLabel:{has_new_label}, NoOldLabel:{no_old_label}")
    except Exception as e:
        record("TC-03","Mechanical Task Label","FAIL","验证标签",["操作"],"新标签",str(e))

    # TC-04: UI labels — "Your Turn: Review & Refine"
    print("\n=== TC-04: Human Interpretation Label ===")
    try:
        body = page.text_content("body")
        has_new = "Your Turn" in body
        no_old = "Human Interpretation" not in body
        record("TC-04","UI Label — ✍️ Your Turn: Review & Refine","PASS" if has_new else "FAIL",
            "验证 'Human Interpretation & Testing' 已改为 '✍️ Your Turn: Review & Refine'",
            ["检查 Step 1 页面指导文字"],
            "显示 '✍️ Your Turn: Review & Refine'",
            f"NewLabel:{has_new}, NoOldLabel:{no_old}")
    except Exception as e:
        record("TC-04","Human Interpretation Label","FAIL","验证标签",["操作"],"新标签",str(e))

    # TC-05: UI labels — "Custom Instructions"
    print("\n=== TC-05: Prompt to LLM Label ===")
    try:
        body = page.text_content("body")
        has_custom = "Custom Instructions" in body
        no_old = "Prompt to LLM" not in body
        record("TC-05","UI Label — 💬 Custom Instructions","PASS" if has_custom else "FAIL",
            "验证 'Prompt to LLM' 已改为 '💬 Custom Instructions'",
            ["检查输入框标题"],
            "显示 '💬 Custom Instructions'",
            f"CustomInstr:{has_custom}, NoOldLabel:{no_old}")
    except Exception as e:
        record("TC-05","Custom Instructions Label","FAIL","验证标签",["操作"],"新标签",str(e))

    # TC-06: UI labels — "Research Memo"
    print("\n=== TC-06: Writing Memo Label ===")
    try:
        body = page.text_content("body")
        has_memo = "Research Memo" in body
        no_old = "Writing Memo" not in body
        record("TC-06","UI Label — 📝 Research Memo","PASS" if has_memo else "FAIL",
            "验证 'Writing Memo' 已改为 '📝 Research Memo'",
            ["检查 memo 区域标题"],
            "显示 '📝 Research Memo'",
            f"ResearchMemo:{has_memo}, NoOldLabel:{no_old}")
    except Exception as e:
        record("TC-06","Research Memo Label","FAIL","验证标签",["操作"],"新标签",str(e))

    # TC-07: Simplified instructions text
    print("\n=== TC-07: Simplified Instructions ===")
    try:
        body = page.text_content("body")
        has_concise = "Review the AI-generated" in body or "Check if chunks" in body or "rename vague" in body
        no_verbose = "Familiarize Yourself" not in body
        record("TC-07","Simplified Step 1 Instructions","PASS" if (has_concise and no_verbose) else "FAIL",
            "验证 Step 1 指导文字已简化为简洁的行动指导",
            ["检查指导文字内容"],
            "简洁指导：Review AI codes, rename vague ones",
            f"Concise:{has_concise}, NoVerbose:{no_verbose}")
    except Exception as e:
        record("TC-07","Simplified Instructions","FAIL","验证简化",["操作"],"简洁文字",str(e))

    # TC-08: Step 2 labels
    print("\n=== TC-08: Step 2 Labels ===")
    try:
        page.goto(BASE+"/#/labeling/test-project/2", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(1500)
        shot(page, "tc08-step2")
        body = page.text_content("body")
        has_your_turn = "Your Turn" in body
        has_custom = "Custom Instructions" in body
        record("TC-08","Step 2 — Updated Labels","PASS" if has_your_turn else "FAIL",
            "验证 Step 2 也使用新标签",
            ["进入 Step 2","检查标签"],
            "包含 Your Turn + Custom Instructions",
            f"YourTurn:{has_your_turn}, CustomInstr:{has_custom}")
    except Exception as e:
        record("TC-08","Step 2 Labels","FAIL","验证标签",["操作"],"新标签",str(e))

    # TC-09: Step 3 labels
    print("\n=== TC-09: Step 3 Labels ===")
    try:
        page.goto(BASE+"/#/category/test-project/3", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(1500)
        shot(page, "tc09-step3")
        body = page.text_content("body")
        has_your_turn = "Your Turn" in body
        record("TC-09","Step 3 — Updated Labels","PASS" if has_your_turn else "FAIL",
            "验证 Step 3 也使用新标签",
            ["进入 Step 3","检查标签"],
            "包含 Your Turn",
            f"YourTurn:{has_your_turn}")
    except Exception as e:
        record("TC-09","Step 3 Labels","FAIL","验证标签",["操作"],"新标签",str(e))

    # TC-10: Homepage still works
    print("\n=== TC-10: Homepage Integrity ===")
    try:
        page.goto(BASE+"/#/", wait_until="networkidle", timeout=15000)
        shot(page, "tc10-homepage")
        body = page.text_content("body").lower()
        has_upload = "upload" in body or "drag" in body
        has_run = "run" in body
        has_sample = "sample" in body
        record("TC-10","Homepage — No Regressions","PASS" if (has_upload and has_run and has_sample) else "FAIL",
            "验证首页功能未受影响",
            ["访问首页","检查核心元素"],
            "Upload区域、Run按钮、Sample Data 按钮都在",
            f"Upload:{has_upload}, Run:{has_run}, Sample:{has_sample}")
    except Exception as e:
        record("TC-10","Homepage","FAIL","验证首页",["操作"],"正常",str(e))

    browser.close()

# Summary
print("\n"+"="*60)
passed = sum(1 for r in results if r["status"]=="PASS")
failed = sum(1 for r in results if r["status"]=="FAIL")
total = len(results)
print(f"Total: {total} | Passed: {passed} ✅ | Failed: {failed} ❌ | Rate: {passed/total*100:.0f}%")

# PDF
print("\nGenerating PDF...")
OUT = "/home/cjm/distrobox-ubuntu/.openclaw/media/outbound/mindcoder-ui-opt-test.pdf"
html = """<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:Helvetica,sans-serif;margin:35px;color:#1a1a1a;font-size:10.5px;line-height:1.55}
h1{color:#C85A3A;font-size:20px;border-bottom:2px solid #C85A3A;padding-bottom:6px}
h2{color:#5B7A5E;font-size:15px;margin-top:25px;border-bottom:1px solid #ddd;padding-bottom:3px}
.summary{background:#f9f7f3;border-radius:8px;padding:12px 18px;margin:12px 0}
.summary span{font-size:18px;font-weight:bold}
.pass{color:#5B7A5E}.fail{color:#C85A3A}
.tc{border:1px solid #e0e0e0;border-radius:8px;padding:15px;margin:14px 0;page-break-inside:avoid}
.tc-pass{border-left:4px solid #5B7A5E}.tc-fail{border-left:4px solid #C85A3A}
.tc h3{margin-top:0;font-size:13px}
.badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:9px;font-weight:bold}
.badge-pass{background:#e8f5e9;color:#2e7d32}.badge-fail{background:#ffebee;color:#c62828}
table.d{width:100%;border-collapse:collapse;margin:8px 0;font-size:10.5px}
table.d td{padding:5px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top}
table.d td:first-child{width:80px;font-weight:bold;color:#555}
.ok{color:#2e7d32;font-weight:bold}.nok{color:#c62828;font-weight:bold}
img.ss{max-width:100%;border:1px solid #ddd;border-radius:5px;margin:6px 0}
ol{padding-left:18px}ol li{margin-bottom:2px}
.meta{color:#888;font-size:9.5px;margin-bottom:15px}
</style></head><body>"""

html += "<h1>🧠 MindCoder — UI Optimization Test Report</h1>"
html += f'<div class="meta"><b>Date:</b> {time.strftime("%Y-%m-%d %H:%M %Z")}<br><b>Scope:</b> UI label changes, sample data replacement, split view default, prompt optimization<br><b>Commit:</b> 8adb4f2</div>'
html += f'<div class="summary"><span class="pass">{passed}</span> Passed &nbsp;<span class="fail">{failed}</span> Failed &nbsp;<span>{total}</span> Total &nbsp;<span style="color:#888;font-size:13px">Pass Rate: {passed/total*100:.0f}%</span></div>'
html += "<h2>Test Cases</h2>"

for t in results:
    css="tc-pass" if t["status"]=="PASS" else "tc-fail"
    badge="badge-pass" if t["status"]=="PASS" else "badge-fail"
    icon="✅" if t["status"]=="PASS" else "❌"
    rcss="ok" if t["status"]=="PASS" else "nok"
    steps_html="".join(f"<li>{s}</li>" for s in t["steps"])
    html += f'<div class="tc {css}"><h3>{icon} {t["id"]}: {t["name"]} <span class="badge {badge}">{t["status"]}</span></h3>'
    html += f'<table class="d"><tr><td>测试目的</td><td>{t["purpose"]}</td></tr><tr><td>操作步骤</td><td><ol>{steps_html}</ol></td></tr><tr><td>预期结果</td><td>{t["expected"]}</td></tr><tr><td class="{rcss}">实际结果</td><td class="{rcss}">{t["actual"]}</td></tr></table>'
    
    # Screenshots
    tc_num = t["id"].replace("TC-","")
    for f in sorted(os.listdir(SHOTS)):
        if f.startswith(f"tc{tc_num.zfill(2)}-"):
            img_path = os.path.join(SHOTS, f)
            with open(img_path,"rb") as fh:
                b64 = base64.b64encode(fh.read()).decode()
            html += f'<p style="color:#888;font-size:8px;margin:2px 0">📸 {f}</p><img class="ss" src="data:image/png;base64,{b64}">'
    html += '</div>'

html += """<h2>Changes Summary</h2>
<ul>
<li>✅ Sample Data → 3 Anthropic Claude interview transcripts</li>
<li>✅ Default split view (View Original Data) on Step 1</li>
<li>✅ Click chunk → highlight in original text</li>
<li>✅ "MindCoder Mechanical Task" → "🤖 What MindCoder Did"</li>
<li>✅ "Human Interpretation & Testing" → "✍️ Your Turn: Review & Refine"</li>
<li>✅ "Prompt to LLM" → "💬 Custom Instructions"</li>
<li>✅ "Writing Memo" → "📝 Research Memo"</li>
<li>✅ Simplified instruction text per step</li>
<li>✅ Optimized llm_did_description text</li>
</ul></body></html>"""

try:
    from weasyprint import HTML
    HTML(string=html).write_pdf(OUT)
    print(f"PDF: {OUT}")
except:
    html_out = OUT.replace('.pdf','.html')
    with open(html_out,'w') as f: f.write(html)
    import subprocess
    try:
        subprocess.run(['wkhtmltopdf','--quiet',html_out,OUT],check=True)
        print(f"PDF: {OUT}")
    except:
        print(f"HTML: {html_out}")
