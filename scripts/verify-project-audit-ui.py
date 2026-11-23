#!/usr/bin/env python3
"""Project-level Area Alarm audit history: mobile UI, deletion, reload and print."""
from __future__ import annotations
import functools
import pathlib
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def persisted_project(page):
    return page.evaluate(
        "() => JSON.parse(localStorage.getItem('mgs-prototype-v3')).projects[0]"
    )


def run_width(browser, url, width):
    page = browser.new_page(viewport={"width": width, "height": 844})
    errors = []
    dialogs = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("dialog", lambda d: (dialogs.append(d.message), d.dismiss()))
    try:
        page.goto(url, wait_until="domcontentloaded")
        page.evaluate("""() => {
          const initial = {
            selectedProjectId: 'audit-qa',
            projects: [{
              id: 'audit-qa', name: 'Synthetic Area Alarm Audit QA',
              facility: 'Test site', location: 'L4', tasks: [],
              systemScope: ['oxygen', 'medicalAir'],
              alarms: [{
                id: 'panel-1', type: 'Area alarm', location: 'OR 1',
                status: 'Not checked',
                equipment: {
                  panelZoneId: 'ZVB-4',
                  sensorChannels: [{
                    id: 'channel-1', channelLabel: 'O2',
                    sensorService: 'Oxygen', testIds: ['air-test']
                  }]
                }
              }],
              tests: [{
                id: 'air-test', type: 'Area alarm functional test',
                system: 'Medical air', status: 'Not checked'
              }],
              outlets: [], photos: []
            }]
          };
          localStorage.setItem('mgs-prototype-v3', JSON.stringify(initial));
        }""")
        page.reload(wait_until="domcontentloaded")
        page.locator('.tab[data-tab="alarms"]').click()
        assert "Needs Review: 1 of 1" in page.locator("#alarmReviewSummary").inner_text()
        page.locator('[data-review-panel][data-review-key]').first.click()
        form = page.locator("#areaAlarmCorrectionForm")
        form.locator('[name="foreman"]').fill('Synthetic foreman')
        form.locator('[name="note"]').fill('Checked sensor link; awaiting corrected test record.')
        form.locator('[name="status"]').select_option('awaiting-recheck')
        form.locator('button[type="submit"]').click()
        stored = persisted_project(page)
        assert len(stored["auditLog"]) == 1
        assert stored["auditLog"][0]["foreman"] == "Synthetic foreman"
        assert "gas-mismatch" in stored["auditLog"][0]["issueKey"]
        assert len(stored["alarms"][0]["reviewCorrections"]) == 1
        assert "Project Audit History (1 entries)" in page.locator("#alarmReviewSummary").inner_text()

        page.locator('[data-alarm-delete="panel-1"]').click()
        stored = persisted_project(page)
        assert stored["alarms"] == []
        assert len(stored["auditLog"]) == 2
        assert stored["auditLog"][0]["kind"] == "area-alarm-correction"
        assert stored["auditLog"][1]["kind"] == "alarm-record-deleted"
        assert stored["auditLog"][1]["activeIssuesAtDeletion"]
        page.locator(".project-audit-history summary").click()
        assert "Synthetic foreman" in page.locator(".project-audit-history").inner_text()
        assert "Alarm record deleted" in page.locator(".project-audit-history").inner_text()
        report = page.locator("#report .report-project-audit").text_content()
        assert "Synthetic foreman" in report
        assert "Alarm record deleted" in report
        assert "independent ASSE 6030 verification" in report

        page.reload(wait_until="domcontentloaded")
        page.locator('.tab[data-tab="alarms"]').click()
        assert len(persisted_project(page)["auditLog"]) == 2
        assert page.locator(".project-audit-history").count() == 1
        assert "Synthetic foreman" in page.locator("#report .report-project-audit").text_content()
        assert not dialogs, f"Unexpected browser dialog at {width}px: {dialogs}"
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
            browser = playwright.chromium.launch(
                headless=True, args=["--no-sandbox"]
            )
            try:
                for width in (320, 390):
                    run_width(browser, url, width)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    print("Area Alarm project audit persistence and print smoke tests passed at 320px and 390px.")


if __name__ == "__main__":
    main()
