#!/usr/bin/env python3
"""Mobile E2E regression for Area Alarm functional-test links.

Exercises the real UI with synthetic browser-local project records only:
create O2/medical-air tests -> link to different sensor channels -> save ->
reopen -> reload -> inspect print report -> delete a linked test.
No Supabase or production writes.
"""
from __future__ import annotations

import functools
import os
import pathlib
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
WIDTHS = (320, 390)
STORAGE_KEY = "mgs-prototype-v3"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def project_data(page):
    return page.evaluate(
        "(key) => JSON.parse(localStorage.getItem(key)).projects[0]", STORAGE_KEY
    )


def add_test(page, *, name, service, result, reading):
    page.locator("#addTestBtn").click()
    form = page.locator("#testForm")
    form.locator('[name="type"]').fill(name)
    form.locator('[name="system"]').fill(service)
    form.locator('[name="location"]').fill("Level 3 / nurse station")
    form.locator('[name="date"]').fill("2026-11-08")
    form.locator('[name="status"]').select_option(label=result)
    form.locator('[name="person"]').fill("Synthetic browser QA technician")
    form.locator('[name="reading"]').fill(reading)
    form.locator("button.primary").click()
    matches = [test for test in project_data(page)["tests"] if test["type"] == name]
    assert len(matches) == 1, f"Expected one persisted test record: {name}"
    return matches[0]["id"]


def assert_channel_links(page, oxygen_id, air_id):
    first = page.locator("#firstChannelTestLinks")
    second = page.locator(".sensor-extra-channel").first
    assert first.locator("[data-channel-test-id]").count() == 2, (
        "First channel should offer only the two alarm tests, not the pressure test"
    )
    assert second.locator("[data-channel-test-id]").count() == 2
    assert first.locator(f'[data-channel-test-id="{oxygen_id}"]').is_checked()
    assert not first.locator(f'[data-channel-test-id="{air_id}"]').is_checked()
    assert second.locator(f'[data-channel-test-id="{air_id}"]').is_checked()
    assert not second.locator(f'[data-channel-test-id="{oxygen_id}"]').is_checked()


def assert_print_channels(page, oxygen_present=True):
    channels = page.locator("#report .alarm-channel-report > div")
    assert channels.count() == 2, "Printable equipment report must show two channels"
    oxygen = channels.nth(0).inner_text()
    air = channels.nth(1).inner_text()
    assert "Oxygen" in oxygen and "Medical air" in air
    assert "Medical air alarm functional test" in air
    assert "2026-11-08" in air and "Pass" in air
    assert "Medical air alarm functional test" not in oxygen
    assert "Oxygen area alarm functional test" not in air
    if oxygen_present:
        assert "Oxygen area alarm functional test" in oxygen
        assert "Needs attention" in oxygen and "2026-11-08" in oxygen
        assert "Previously linked alarm test record missing" not in oxygen
    else:
        assert "Oxygen area alarm functional test" not in oxygen
        assert "Previously linked alarm test record missing" in oxygen
        assert "Previously linked alarm test record missing" not in air


def run_width(browser, url, width):
    page = browser.new_page(viewport={"width": width, "height": 844})
    errors = []
    dialogs = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    # An explicit handler prevents Playwright from hanging on a browser confirm.
    # Fail the test if an unexpected out-of-scope or storage warning appears.
    def on_dialog(dialog):
        dialogs.append(f"{dialog.type}: {dialog.message}")
        dialog.dismiss()
    page.on("dialog", on_dialog)
    try:
        page.goto(url, wait_until="domcontentloaded")
        page.locator("#newProjectBtn").click()
        page.locator('#projectForm [name="name"]').fill("Synthetic alarm test-link QA")
        # Match the two service records to declared project scope. Otherwise
        # the app correctly asks for confirmation before an out-of-scope test.
        page.locator('#newProjectSystemScope [name="systems"][value="oxygen"]').check()
        page.locator('#newProjectSystemScope [name="systems"][value="medicalAir"]').check()
        page.locator("#projectForm button.primary").click()

        page.locator('.tab[data-tab="tests"]').click()
        oxygen_id = add_test(
            page, name="Oxygen area alarm functional test",
            service="Oxygen", result="Needs attention", reading="O2-1 field observation"
        )
        air_id = add_test(
            page, name="Medical air alarm functional test",
            service="Medical air", result="Pass", reading="AIR-1 field observation"
        )
        add_test(
            page, name="Standing pressure test",
            service="Oxygen", result="Pass", reading="Synthetic pressure observation"
        )

        page.locator('.tab[data-tab="alarms"]').click()
        page.locator("#addAlarmBtn").click()
        page.locator('#alarmForm [name="type"]').select_option("Area alarm")
        page.locator('#alarmForm [name="location"]').fill("L3 nurse station")
        page.locator("#alarmForm button.primary").click()
        page.locator("#alarmList [data-alarm-equipment]").click()

        form = page.locator("#areaAlarmEquipmentForm")
        form.locator('[name="panelManufacturer"]').fill("Synthetic QA manufacturer")
        form.locator('[name="panelModel"]').fill("Test fixture — not real hardware")
        form.locator('[name="channelLabel"]').fill("L3-O2-1")
        form.locator('[name="sensorService"]').fill("Oxygen")
        form.locator('[name="sensorPartNumber"]').fill("Synthetic O2 sensor")
        page.locator("#addSensorChannelBtn").click()
        second = page.locator(".sensor-extra-channel").first
        second.locator('[data-channel-field="channelLabel"]').fill("L3-AIR-1")
        second.locator('[data-channel-field="sensorService"]').fill("Medical air")
        second.locator('[data-channel-field="sensorPartNumber"]').fill("Synthetic air sensor")

        # Classify only explicit services; a shared O2 + air functional test
        # is valid for either matching channel, while unknown services stay unclassified.
        assert page.evaluate("""() => {
            const api = MGSAreaAlarmEquipment;
            return api.gasServiceMismatch('Oxygen', 'Medical air')
                && api.gasServiceMismatch('Medical air', 'Oxygen')
                && !api.gasServiceMismatch('Oxygen', 'Oxygen / Medical air')
                && !api.gasServiceMismatch('Medical air', 'Oxygen / Medical air')
                && !api.gasServiceMismatch('Oxygen', 'unidentified service');
        }"""), "Service classification must handle combined and unknown records"

        # A mistaken link immediately warns, and clears when unchecked.
        first_options = page.locator("#firstChannelTestLinks")
        first_options.locator(f'[data-channel-test-id="{air_id}"]').check()
        assert first_options.locator(".gas-service-mismatch:visible").count() == 1
        assert "Gas-service mismatch" in first_options.inner_text()
        first_options.locator(f'[data-channel-test-id="{air_id}"]').uncheck()
        assert first_options.locator(".gas-service-mismatch:visible").count() == 0

        second.locator(f'[data-channel-test-id="{oxygen_id}"]').check()
        assert second.locator(".gas-service-mismatch:visible").count() == 1
        second.locator(f'[data-channel-test-id="{oxygen_id}"]').uncheck()
        assert second.locator(".gas-service-mismatch:visible").count() == 0

        # Each channel must receive only its own test ID.
        first_options = page.locator("#firstChannelTestLinks")
        assert first_options.locator("[data-channel-test-id]").count() == 2
        assert second.locator("[data-channel-test-id]").count() == 2
        first_options.locator(f'[data-channel-test-id="{oxygen_id}"]').check()
        second.locator(f'[data-channel-test-id="{air_id}"]').check()
        assert_channel_links(page, oxygen_id, air_id)
        form.locator('button[type="submit"]').click()

        saved = project_data(page)
        assert saved["alarms"][0]["status"] == "Not checked", (
            "Linking a passing field test must not mark the alarm itself Pass"
        )
        channels = saved["alarms"][0]["equipment"]["sensorChannels"]
        assert [ch["sensorService"] for ch in channels] == ["Oxygen", "Medical air"]
        assert [ch["testIds"] for ch in channels] == [[oxygen_id], [air_id]]
        assert "Needs attention" in page.locator("#alarmList").inner_text()
        assert "Medical air alarm functional test" in page.locator("#alarmList").inner_text()

        # Reopen immediately, then reload, and reopen again to check persistence.
        page.locator("#alarmList [data-alarm-equipment]").click()
        assert_channel_links(page, oxygen_id, air_id)
        page.locator("#areaAlarmEquipmentDialog .dialog-head [data-close]").click()
        page.reload(wait_until="domcontentloaded")
        page.locator('.tab[data-tab="alarms"]').click()
        page.locator("#alarmList [data-alarm-equipment]").click()
        assert_channel_links(page, oxygen_id, air_id)
        page.locator("#areaAlarmEquipmentDialog .dialog-head [data-close]").click()
        assert_print_channels(page)
        assert "Gas-service mismatch" not in page.locator("#report").inner_text()

        # Assert the actual Print / Save PDF control refreshes the same report.
        page.evaluate(
            "() => { window.__qaPrintInvoked = false;"
            "window.print = () => { window.__qaPrintInvoked = true; }; }"
        )
        page.locator("#printReportBtn").click()
        assert page.evaluate("window.__qaPrintInvoked") is True
        assert_print_channels(page)

        # Warnings must survive save, reload and report generation for an
        # intentionally cross-linked test, without automatically changing status.
        page.locator("#alarmList [data-alarm-equipment]").click()
        first_options = page.locator("#firstChannelTestLinks")
        first_options.locator(f'[data-channel-test-id="{oxygen_id}"]').uncheck()
        first_options.locator(f'[data-channel-test-id="{air_id}"]').check()
        assert first_options.locator(".gas-service-mismatch:visible").count() == 1
        page.locator('#areaAlarmEquipmentForm button[type="submit"]').click()
        assert "Gas-service mismatch" in page.locator("#report").inner_text()
        assert "Gas-service mismatch" in page.locator("#alarmList").inner_text()
        assert project_data(page)["alarms"][0]["status"] == "Not checked"
        page.reload(wait_until="domcontentloaded")
        page.locator('.tab[data-tab="alarms"]').click()
        page.locator("#alarmList [data-alarm-equipment]").click()
        first_options = page.locator("#firstChannelTestLinks")
        assert first_options.locator(".gas-service-mismatch:visible").count() == 1
        first_options.locator(f'[data-channel-test-id="{air_id}"]').uncheck()
        first_options.locator(f'[data-channel-test-id="{oxygen_id}"]').check()
        page.locator('#areaAlarmEquipmentForm button[type="submit"]').click()
        assert "Gas-service mismatch" not in page.locator("#report").inner_text()
        assert_print_channels(page)

        # Deleting a test must not silently reassign its channel to another test.
        page.locator('.tab[data-tab="tests"]').click()
        page.locator("#testList .record-card").filter(
            has_text="Oxygen area alarm functional test"
        ).locator("[data-test-delete]").click()
        saved = project_data(page)
        channels = saved["alarms"][0]["equipment"]["sensorChannels"]
        assert channels[0]["testIds"] == [oxygen_id], "Orphan link must remain flagged"
        assert channels[1]["testIds"] == [air_id], "Other channel's link must survive"
        assert_print_channels(page, oxygen_present=False)
        page.locator('.tab[data-tab="alarms"]').click()
        assert "Previously linked alarm test record missing" in page.locator(
            "#alarmList"
        ).inner_text()
        assert not dialogs, f"Unexpected browser dialogs at {width}px: {dialogs}"
        assert not errors, f"Browser JS errors at {width}px: {errors}"
    finally:
        page.close()


def main():
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_port}/index.html"
    try:
        with sync_playwright() as playwright:
            opts = {"headless": True, "args": ["--no-sandbox"]}
            executable = os.environ.get("CHROMIUM_PATH")
            if executable:
                opts["executable_path"] = executable
            browser = playwright.chromium.launch(**opts)
            try:
                for width in WIDTHS:
                    run_width(browser, url, width)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    print(
        "Area alarm functional-test links: end-to-end UI, reload, print, "
        "and orphan safeguards passed at 320px and 390px."
    )


if __name__ == "__main__":
    main()
