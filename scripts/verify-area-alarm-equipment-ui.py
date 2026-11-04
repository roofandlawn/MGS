#!/usr/bin/env python3
"""Project Area Alarm Equipment UI smoke test on phone width (localhost only)."""
import base64
import functools
import pathlib
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==")

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(
    ("127.0.0.1", 0),
    functools.partial(QuietHandler, directory=str(ROOT))
)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = "http://127.0.0.1:%s/index.html" % server.server_address[1]
errors = []

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url, wait_until="domcontentloaded")
        page.locator("#newProjectBtn").click()
        page.locator('#projectForm [name="name"]').fill("Alarm equipment test project")
        page.locator("#projectForm button.primary").click()
        page.locator('.tab[data-tab="alarms"]').click()
        page.locator("#addAlarmBtn").click()
        page.locator('#alarmForm [name="type"]').select_option("Area alarm")
        page.locator('#alarmForm [name="location"]').fill("L3 nurse station")
        page.locator("#alarmForm button.primary").click()
        button = page.locator("#alarmList [data-alarm-equipment]")
        assert button.count() == 1, "Area alarm must show equipment record action"
        button.click()
        form = page.locator("#areaAlarmEquipmentForm")
        form.locator('[name="panelManufacturer"]').fill("BeaconMedaes")
        form.locator('[name="panelModel"]').fill("Catalog model from nameplate")
        form.locator('[name="sensorManufacturer"]').fill("Sensor manufacturer from label")
        form.locator('[name="sensorPartNumber"]').fill("Exact sensor P/N")
        form.locator('[name="sensorService"]').fill("Oxygen")
        form.locator('[name="sensorRange"]').fill("Range as labeled")
        form.locator('[name="panelZoneId"]').fill("L3-AREA-01")
        form.locator('[name="factoryDoc"]').fill("Factory document ID")
        form.locator('[name="factoryDocRevision"]').fill("Document revision")
        form.locator('[name="approvedDrawing"]').fill("MG-501 rev A")
        form.locator('[name="notes"]').fill("<script>alert(1)</script>")
        form.locator('button[type="submit"]').click()
        assert "Equipment documentation:" in page.locator("#alarmList").inner_text()
        assert "<script>" not in page.locator("#alarmList").inner_html(), "User notes should not become HTML"

        # Exercise existing project-photo workflow and new photo linkage.
        page.locator('.tab[data-tab="photos"]').click()
        page.locator("#photoInput").set_input_files(
            {"name": "alarm-installation.png", "mimeType": "image/png", "buffer": PNG}
        )
        page.locator("#photoDialog").wait_for(state="visible")
        page.locator('#photoForm [name="caption"]').fill("Installed area alarm panel")
        page.locator("#photoForm button.primary").click()
        page.locator('.tab[data-tab="alarms"]').click()
        page.locator("#alarmList [data-alarm-equipment]").click()
        page.locator('#areaAlarmEquipmentForm [name="photoId"]').select_option(label="Installed area alarm panel")
        page.locator('#areaAlarmEquipmentForm button[type="submit"]').click()
        assert "Installed area alarm panel" in page.locator("#alarmList").inner_text()
        snapshot = page.evaluate("JSON.parse(localStorage.getItem('mgs-prototype-v3'))")
        assert snapshot["projects"][0]["alarms"][0]["equipment"]["photoId"] == snapshot["projects"][0]["photos"][0]["id"], "Linked photo ID must match the selected project's photo ID"

        page.reload(wait_until="domcontentloaded")
        page.locator('.tab[data-tab="alarms"]').click()
        assert "Installed area alarm panel" in page.locator("#alarmList").inner_text(), "Equipment record must persist after reload"
        report = page.locator("#report").text_content()
        assert "MG-501 rev A" in report and "Factory document ID" in report, "Printable report must include equipment evidence"

        page.locator('.tab[data-tab="photos"]').click()
        page.locator("[data-photo-delete]").first.click()
        page.locator('.tab[data-tab="alarms"]').click()
        assert "Previously linked photo no longer exists" in page.locator("#alarmList").inner_text(), "Deleted evidence should be visibly flagged"
        assert not errors, "Browser JS errors: " + "; ".join(errors)
        browser.close()
    print("Area alarm equipment end-to-end mobile workflow passed at 390px.")
finally:
    server.shutdown()
