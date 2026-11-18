#!/usr/bin/env python3
"""Print-to-PDF regression for the actual Area Alarm Needs Review report.

Uses synthetic browser-only records, the application's real report renderer,
its production print CSS, and Chromium's PDF output. No project data or
Supabase records are written. Run from the repository root:
    python scripts/verify-area-alarm-print-layout.py
Requires Playwright Chromium and pypdf.
"""
from __future__ import annotations

import functools
import io
import pathlib
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
WIDTHS = (320, 390)
PANEL_COUNT = 42


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def inspect_pdf(pdf_bytes: bytes, width: int) -> int:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    assert len(reader.pages) >= 2, (
        f"{width}px: a 42-panel report should span multiple PDF pages"
    )
    texts = []
    for page_number, pdf_page in enumerate(reader.pages, 1):
        page_width = float(pdf_page.mediabox.width)
        page_height = float(pdf_page.mediabox.height)
        assert abs(page_width - 612) <= 1 and abs(page_height - 792) <= 1, (
            f"{width}px: page {page_number} is not US Letter"
        )
        text = pdf_page.extract_text() or ""
        assert len(text.strip()) >= 30, (
            f"{width}px: unexpectedly empty PDF page {page_number}"
        )
        texts.append(text)
    # PDF text extraction can insert line breaks at print-wrap boundaries.
    whole = " ".join(" ".join(texts).split())
    assert "Area alarm documentation" in whole and "Needs Review" in whole
    assert "42 of 42 area alarm panels need review" in whole, (
        f"{width}px: total flagged-panel count missing from exported PDF"
    )
    assert "Gas-service mismatches" in whole
    assert "Missing or unlinked tests" in whole
    assert "Unidentified sensor channels" in whole
    assert "Open items by panel" in whole
    assert "independent ASSE 6030 verification" in whole, (
        f"{width}px: independent-verification disclaimer missing"
    )

    # Both the panel identifier and its one-point issue description must stay
    # together on a single physical page. This catches cut-off / split entries
    # even when all records exist in the underlying HTML.
    for number in range(1, PANEL_COUNT + 1):
        panel_id = f"PANEL-{number:02d}"
        point_id = f"POINT-{number:02d}"
        panel_pages = [i for i, text in enumerate(texts) if panel_id in text]
        point_pages = [i for i, text in enumerate(texts) if point_id in text]
        assert len(panel_pages) == 1, (
            f"{width}px: {panel_id} missing or repeated in PDF"
        )
        assert len(point_pages) == 1, (
            f"{width}px: {point_id} missing or repeated in PDF"
        )
        assert panel_pages == point_pages, (
            f"{width}px: panel {panel_id} split from its issue description"
        )
    return len(reader.pages)


def check_width(browser, url: str, width: int) -> None:
    page = browser.new_page(viewport={"width": width, "height": 844})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        page.goto(url, wait_until="domcontentloaded")
        # This section is intentionally display:none on screens and only visible
        # in print media. Wait for its DOM attachment, not screen visibility.
        page.locator("#report").wait_for(state="attached")
        info = page.evaluate("""() => {
            if (!window.MGSAreaAlarmReview) {
                throw new Error('Real area alarm report module did not load');
            }
            const tests = [{
                id: 'air-functional', type: 'Area alarm functional test',
                system: 'Medical air'
            }];
            const alarms = Array.from({length: 42}, (_, index) => {
                const number = String(index + 1).padStart(2, '0');
                return {
                    id: 'synthetic-' + number,
                    type: 'Area alarm',
                    location: 'Synthetic Level 4 Room ' + number,
                    status: 'Not checked',
                    equipment: {
                        panelZoneId: 'PANEL-' + number,
                        sensorChannels: [{
                            channelLabel: 'POINT-' + number,
                            sensorService: index < 36 ? 'Oxygen' : 'Unidentified',
                            testIds: index >= 30 && index < 36
                                ? [] : ['air-functional']
                        }]
                    }
                };
            });
            const report = MGSAreaAlarmReview.reportMarkup(alarms, tests);
            const rollup = MGSAreaAlarmReview.summarize(alarms, tests);
            if (rollup.areaPanels !== 42 || rollup.reviewPanels !== 42 ||
                rollup.reviewFlags !== 42) {
                throw new Error('Synthetic fixture has incorrect review counts');
            }
            const reportElement = document.querySelector('#report');
            reportElement.innerHTML =
                '<div class="report-head"><h1>Synthetic project turnover QA</h1></div>' +
                report + '<p class="report-disclaimer">Synthetic testing data only.</p>';
            return {
                panels: reportElement.querySelectorAll('.report-alarm-review-panel').length,
                categoryRows: reportElement.querySelectorAll(
                    '.report-alarm-review-categories tbody tr').length
            };
        }""")
        assert info == {"panels": PANEL_COUNT, "categoryRows": 5}, (
            f"{width}px: incomplete DOM report: {info}"
        )
        page.emulate_media(media="print")
        pdf_bytes = page.pdf(
            format="Letter",
            prefer_css_page_size=False,
            print_background=True,
            display_header_footer=False,
        )
        ARTIFACTS.mkdir(exist_ok=True)
        pdf_path = ARTIFACTS / f"area-alarm-turnover-{width}px.pdf"
        pdf_path.write_bytes(pdf_bytes)
        pdf_pages = inspect_pdf(pdf_bytes, width)
        assert not errors, f"{width}px: browser JS errors: {errors}"
        print(
            f"{width}px: {PANEL_COUNT} flagged panels on {pdf_pages} "
            f"US Letter PDF pages, all issue details preserved"
        )
    finally:
        page.close()


def main() -> None:
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_port}/index.html"
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                for width in WIDTHS:
                    check_width(browser, url, width)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print("Area alarm multi-page PDF print layout checks passed.")


if __name__ == "__main__":
    main()
