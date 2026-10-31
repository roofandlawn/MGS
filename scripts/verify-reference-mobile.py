#!/usr/bin/env python3
"""Browser regression check for the MGS NFPA 99 reference page.

Run from a repository checkout:
    python -m pip install playwright
    python -m playwright install chromium
    python scripts/verify-reference-mobile.py

Optional: CHROMIUM_PATH=/usr/bin/chromium python scripts/verify-reference-mobile.py
This uses synthetic browser-local projects; no Supabase calls or production writes.
"""
from __future__ import annotations

import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WIDTHS = (320, 390, 768, 1280)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}/reference.html"
    checks = 0
    try:
        with sync_playwright() as playwright:
            opts = {"headless": True, "args": ["--no-sandbox"]}
            executable = os.environ.get("CHROMIUM_PATH")
            if executable:
                opts["executable_path"] = executable
            browser = playwright.chromium.launch(**opts)
            try:
                for width in WIDTHS:
                    page = browser.new_page(viewport={"width": width, "height": 740})
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.goto(base, wait_until="load")
                    page.locator("#referenceList .reference-row").first.wait_for()
                    page.evaluate("localStorage.clear()")
                    page.reload(wait_until="load")

                    check("No active project" in page.locator("#projectEditionHeading").inner_text(),
                          f"{width}: missing no-project warning")
                    checks += 1
                    check('§' in page.locator('#referenceList').inner_text(),
                          f'{width}: general 2024 index should be visible without an active project')
                    checks += 1

                    for edition, state_class in (
                        ("2018", "is-mismatch"),
                        ("2024", "is-match"),
                        ("other", "is-other"),
                        ("unconfirmed", "is-unconfirmed"),
                    ):
                        payload = {
                            "selectedProjectId": "active",
                            "projects": [{
                                "id": "active",
                                "name": "Browser QA project",
                                "codeBasis": {"edition": edition},
                            }],
                        }
                        page.evaluate(
                            "(data) => localStorage.setItem('mgs-prototype-v3', JSON.stringify(data))",
                            payload,
                        )
                        page.reload(wait_until="load")
                        check(page.locator("#projectEditionStatus").evaluate(
                            "(el, name) => el.classList.contains(name)", state_class
                        ), f"{width}: incorrect banner for {edition}")
                        checks += 1
                        if edition == '2018':
                            list_text = page.locator('#referenceList').inner_text()
                            check('NFPA 99-2018 §5.1.4.6' in list_text,
                                  f'{width}: 2018 zone valve locator missing')
                            check('NFPA 99-2018 §5.1.9.4' in list_text,
                                  f'{width}: 2018 area alarm locator missing')
                            check('NFPA 99-2024' not in list_text,
                                  f'{width}: 2024 section leaked into 2018 list')
                            checks += 3
                            page.locator('[data-reference-id="zone-valve"]').click()
                            check('2018 heading locator' in page.locator('.verified-badge').inner_text(),
                                  f'{width}: 2018 locator detail badge missing')
                            check('§ 5.1.4.6' in page.locator('.code-links').inner_text(),
                                  f'{width}: 2018 zone section detail missing')
                            checks += 2
                            page.locator('[data-reference-id="source-valve"]').click()
                            check('§' not in page.locator('.code-links').inner_text(),
                                  f'{width}: unmapped 2018 source valve showed a section')
                            checks += 1
                            page.locator('#referenceSearch').fill('5.1.4.2')
                            check('No reference records' in page.locator('#referenceList').inner_text(),
                                  f'{width}: 2024-only source number is searchable in 2018')
                            page.locator('#referenceSearch').fill('5.1.4.6')
                            check('Zone Valve' in page.locator('#referenceList').inner_text(),
                                  f'{width}: 2018 zone locator is not searchable')
                            page.locator('#referenceSearch').fill('')
                            checks += 2
                        else:
                            should_show = edition == '2024'
                            check(('§' in page.locator('#referenceList').inner_text()) == should_show,
                                  f'{width}: section numbers shown incorrectly in list for {edition}')
                            check(('§' in page.locator('.code-links').inner_text()) == should_show,
                                  f'{width}: section numbers shown incorrectly in detail for {edition}')
                            checks += 2
                            if not should_show:
                                page.locator('#referenceSearch').fill('5.1.4.2')
                                check('No reference records' in page.locator('#referenceList').inner_text(),
                                      f'{width}: hidden section number is still searchable for {edition}')
                                page.locator('#referenceSearch').fill('')
                                checks += 1

                    for label in ("System Path", "Projects"):
                        link = page.get_by_role("link", name=label, exact=True).first
                        check(link.is_visible(), f"{width}: {label} link hidden on mobile")
                        bbox = link.bounding_box()
                        check(bbox and bbox["height"] >= 40,
                              f"{width}: {label} touch target too small")
                        checks += 2

                    size = page.evaluate(
                        "() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth })"
                    )
                    check(size["page"] <= size["viewport"] + 1,
                          f"{width}: horizontal page overflow ({size})")
                    checks += 1

                    page.locator("#referenceSearch").fill("zone valve")
                    page.locator('[data-reference-id="zone-valve"]').click()
                    check("Zone Valve" in page.locator("#referenceDetail h2").inner_text(),
                          f"{width}: selected detail not rendered")
                    check("Section mapping for this component and project edition is still pending" in
                          page.locator(".reference-edition-warning").inner_text(),
                          f"{width}: missing edition caution in detail")
                    checks += 2

                    if width <= 760:
                        y = page.locator("#referenceDetail").evaluate(
                            "(el) => el.getBoundingClientRect().top"
                        )
                        header = page.locator(".topbar").evaluate(
                            "(el) => el.getBoundingClientRect().height"
                        )
                        check(y >= header - 5,
                              f"{width}: detail scrolled underneath sticky header")
                        checks += 1

                    # :focus-visible depends on keyboard-versus-pointer modality.
                    # Use actual Tab navigation, not script focus after a click.
                    page.reload(wait_until="load")
                    for label in ("System Path", "Projects"):
                        page.keyboard.press("Tab")
                        nav = page.get_by_role("link", name=label, exact=True).first
                        check(nav.evaluate(
                            "(el) => el === document.activeElement"
                            " && el.matches(':focus-visible')"
                            " && getComputedStyle(el).outlineStyle !== 'none'"
                            " && parseFloat(getComputedStyle(el).outlineWidth) >= 2"
                        ), f"{width}: {label} lacks visible keyboard focus")
                        checks += 1
                    check(not errors, f"{width}: browser JS errors: {errors}")
                    checks += 1
                    page.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    print(f"Reference browser QA: {checks} checks passed at widths {', '.join(map(str, WIDTHS))}.")


if __name__ == "__main__":
    main()
