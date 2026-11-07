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
        dialogs = []
        def handle_dialog(dialog):
            dialogs.append(dialog.message)
            dialog.dismiss()
        page.on("dialog", handle_dialog)
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
        form.locator('[name="channelLabel"]').fill("OR 1 oxygen")
        form.locator('[name="sensorLocation"]').fill("Downstream of zone valve")
        form.locator('[name="pointScheduleRef"]').fill("MG-301 / O2-1")
        form.locator('[name="pointScheduleRevision"]').fill("C")
        page.locator("#addSensorChannelBtn").click()
        second = page.locator(".sensor-extra-channel").first
        second.locator('[data-channel-field="channelLabel"]').fill("OR 1 medical air")
        second.locator('[data-channel-field="sensorService"]').fill("Medical air")
        second.locator('[data-channel-field="sensorManufacturer"]').fill("Second sensor manufacturer")
        second.locator('[data-channel-field="sensorPartNumber"]').fill("Air sensor P/N")
        second.locator('[data-channel-field="sensorRange"]').fill("Air sensor range")
        second.locator('[data-channel-field="sensorLocation"]').fill("Pipe branch to OR 1")
        second.locator('[data-channel-field="pointScheduleRef"]').fill("MG-301 / AIR-1")
        second.locator('[data-channel-field="pointScheduleRevision"]').fill("B")
        form.locator('[name="panelZoneId"]').fill("L3-AREA-01")
        form.locator('[name="factoryDoc"]').fill("Factory document ID")
        form.locator('[name="factoryDocRevision"]').fill("Document revision")
        form.locator('[name="approvedDrawing"]').fill("MG-501 rev A")
        form.locator('[name="notes"]').fill("<script>alert(1)</script>")
        form.locator('button[type="submit"]').click()
        assert "Equipment documentation:" in page.locator("#alarmList").inner_text()
        assert "2 sensor channel(s)" in page.locator("#alarmList").inner_text()
        assert "Medical air" in page.locator("#alarmList").inner_text()
        assert "<script>" not in page.locator("#alarmList").inner_html(), "User notes should not become HTML"
        snapshot = page.evaluate("JSON.parse(localStorage.getItem('mgs-prototype-v3'))")
        channels = snapshot["projects"][0]["alarms"][0]["equipment"]["sensorChannels"]
        assert len(channels) == 2 and channels[1]["sensorService"] == "Medical air", "Two channels should be saved under one panel"


        # Create two independent alarm functional-test records before linking them to channels.
        page.locator('.tab[data-tab="tests"]').click()
        for test_type, system, result in [
            ("Area alarm functional test O2", "Oxygen", "Needs attention"),
            ("Area alarm functional test AIR", "Medical air", "Pass"),
        ]:
            page.locator("#addTestBtn").click()
            page.locator('#testForm [name="type"]').fill(test_type)
            page.locator('#testForm [name="system"]').fill(system)
            page.locator('#testForm [name="status"]').select_option(result)
            page.locator("#testForm button.primary").click()
        snapshot = page.evaluate("JSON.parse(localStorage.getItem('mgs-prototype-v3'))")
        test_ids = {test["system"]: test["id"] for test in snapshot["projects"][0]["tests"]}
        page.locator('.tab[data-tab="alarms"]').click()
        page.locator("#alarmList [data-alarm-equipment]").click()
        page.locator(f'#firstChannelTestLinks [data-channel-test-id="{test_ids["Oxygen"]}"]').check()
        page.locator(f'.sensor-extra-channel [data-channel-test-id="{test_ids["Medical air"]}"]').check()
        assert page.locator('#firstChannelTestLinks input[type="checkbox"]').first.evaluate(
            "(el) => el.getBoundingClientRect().width") <= 24, "Alarm test checkboxes must remain compact on phone widths"
        page.locator('#areaAlarmEquipmentForm button[type="submit"]').click()
        snapshot = page.evaluate("JSON.parse(localStorage.getItem('mgs-prototype-v3'))")
        channel_links = snapshot["projects"][0]["alarms"][0]["equipment"]["sensorChannels"]
        assert channel_links[0]["testIds"] == [test_ids["Oxygen"]]
        assert channel_links[1]["testIds"] == [test_ids["Medical air"]]
        assert "Needs attention" in page.locator("#alarmList").inner_text()
        assert "Area alarm functional test AIR" in page.locator("#report").inner_text()

        # Exercise existing project-photo workflow and new photo linkage.
        page.locator('.tab[data-tab="photos"]').click()
        page.locator("#photoInput").set_input_files(
            {"name": "alarm-installation.png", "mimeType": "image/png", "buffer": PNG}
        )
        page.locator("#photoDialog").wait_for(state="visible")
        page.locator('#photoForm [name="caption"]').fill("Installed area alarm panel")
        page.locator("#photoForm button.primary").click()
        page.locator("#photoInput").set_input_files(
            {"name": "air-sensor.png", "mimeType": "image/png", "buffer": PNG}
        )
        page.locator("#photoDialog").wait_for(state="visible")
        page.locator('#photoForm [name="caption"]').fill("Medical air sensor photo")
        page.locator("#photoForm button.primary").click()
        page.locator('.tab[data-tab="alarms"]').click()
        page.locator("#alarmList [data-alarm-equipment]").click()
        page.locator('#areaAlarmEquipmentForm [name="photoId"]').select_option(label="Installed area alarm panel")
        page.locator('#areaAlarmEquipmentForm [name="channelPhotoId"]').select_option(label="Installed area alarm panel")
        page.locator('.sensor-extra-channel [data-channel-field="photoId"]').select_option(label="Medical air sensor photo")
        page.locator('#areaAlarmEquipmentForm button[type="submit"]').click()
        assert "Installed area alarm panel" in page.locator("#alarmList").inner_text()
        snapshot = page.evaluate("JSON.parse(localStorage.getItem('mgs-prototype-v3'))")
        ids_by_caption = {photo["caption"]: photo["id"] for photo in snapshot["projects"][0]["photos"]}
        assert snapshot["projects"][0]["alarms"][0]["equipment"]["photoId"] == ids_by_caption["Installed area alarm panel"], "Panel photo must link by chosen identity, independent of photo ordering"
        saved = snapshot["projects"][0]["alarms"][0]["equipment"]["sensorChannels"]
        assert saved[0]["photoId"] == ids_by_caption["Installed area alarm panel"]
        assert saved[1]["photoId"] == ids_by_caption["Medical air sensor photo"], "Each channel photo should link independently"
        assert saved[0]["pointScheduleRef"] == "MG-301 / O2-1"
        assert saved[1]["pointScheduleRevision"] == "B"

        page.reload(wait_until="domcontentloaded")
        page.locator('.tab[data-tab="alarms"]').click()
        assert "Installed area alarm panel" in page.locator("#alarmList").inner_text(), "Equipment record must persist after reload"
        assert "2 sensor channel(s)" in page.locator("#alarmList").inner_text(), "Both sensor channels must persist after reload"
        report = page.locator("#report").text_content()
        assert "MG-501 rev A" in report and "Factory document ID" in report, "Printable report must include equipment evidence"
        assert "Oxygen" in report and "Medical air" in report and "Air sensor P/N" in report, "Each channel must print separately"
        assert "MG-301 / O2-1" in report and "MG-301 / AIR-1" in report, "Individual point schedule references must print"
        assert "Medical air sensor photo" in report, "Channel-specific photo labels must print"
        assert "Area alarm functional test O2" in report and "Area alarm functional test AIR" in report, "Linked functional tests must print by channel"
        page.locator("#alarmList [data-alarm-equipment]").click()
        assert page.locator(".sensor-extra-channel").count() == 1, "Second channel must reopen for editing"
        page.locator(".sensor-extra-channel [data-remove-sensor-channel]").click()
        page.locator('#areaAlarmEquipmentForm button[type="submit"]').click()
        snapshot = page.evaluate("JSON.parse(localStorage.getItem('mgs-prototype-v3'))")
        assert len(snapshot["projects"][0]["alarms"][0]["equipment"]["sensorChannels"]) == 1, "Removing a channel must persist"
        assert "MG-301 / AIR-1" not in page.locator("#report").inner_text(), "Removed channel's schedule must not appear in report"
        assert "Air sensor P/N" not in page.locator("#report").inner_text(), "Removed channel's hardware must not appear in report"

        page.locator('.tab[data-tab="photos"]').click()
        page.locator(".photo-card").filter(has_text="Installed area alarm panel").locator("[data-photo-delete]").click()
        page.locator('.tab[data-tab="alarms"]').click()
        assert "Previously linked photo no longer exists" in page.locator("#alarmList").inner_text(), "Deleted evidence should be visibly flagged"
        assert "Previously linked channel photo missing" in page.locator("#alarmList").inner_text(), "Deleted sensor photo must be flagged without hiding the record"
        page.locator('.tab[data-tab="tests"]').click()
        page.locator(f'[data-test-delete="{test_ids["Oxygen"]}"]').click()
        page.locator('.tab[data-tab="alarms"]').click()
        assert "Previously linked alarm test record missing" in page.locator("#alarmList").inner_text(), "Deleted test remains visibly flagged"
        assert "Previously linked alarm test record missing" in page.locator("#report").inner_text(), "Deleted test remains flagged in report"
        assert not errors, "Browser JS errors: " + "; ".join(errors)
        browser.close()
    print("Area alarm equipment end-to-end mobile workflow passed at 390px.")
finally:
    server.shutdown()
