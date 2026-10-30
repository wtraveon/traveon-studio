#!/usr/bin/env python3
"""Lightweight structural and local-reference checks for the static site."""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ERRORS = []

class SiteParser(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.tags = {}
        self.links = []
        self.styles = 0
        self.style_closes = 0
        self.scripts = 0
        self.script_closes = 0
        self.in_style = False
        self.stylesheet_inside_style = False
        self.title_count = 0
        self.canonical_count = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags[tag] = self.tags.get(tag, 0) + 1
        if tag == "style":
            self.styles += 1
            self.in_style = True
        elif tag == "script":
            self.scripts += 1
        elif tag == "link":
            if attrs.get("rel", "").lower() == "stylesheet":
                if self.in_style:
                    self.stylesheet_inside_style = True
                if attrs.get("href"):
                    self.links.append(attrs["href"])
        elif tag == "title":
            self.title_count += 1
        if tag in ("a", "img", "script", "source"):
            key = "href" if tag == "a" else "src"
            if attrs.get(key):
                self.links.append(attrs[key])
        if tag == "link" and attrs.get("rel", "").lower() == "canonical":
            self.canonical_count += 1

    def handle_endtag(self, tag):
        if tag == "style":
            self.style_closes += 1
            self.in_style = False
        elif tag == "script":
            self.script_closes += 1

def fail(path, message):
    ERRORS.append(f"{path}: {message}")

html_files = sorted(ROOT.rglob("*.html"))
if not html_files:
    fail(".", "no HTML pages found")

for path in html_files:
    rel = path.relative_to(ROOT)
    parser = SiteParser(path)
    try:
        source = path.read_text(encoding="utf-8")
        parser.feed(source)
        parser.close()
    except Exception as exc:
        fail(rel, f"HTML parsing failed: {exc}")
        continue

    for tag in ("html", "head", "body"):
        if parser.tags.get(tag, 0) != 1:
            fail(rel, f"expected exactly one <{tag}> element; found {parser.tags.get(tag, 0)}")
    if parser.title_count != 1:
        fail(rel, f"expected exactly one <title>; found {parser.title_count}")
    if parser.canonical_count > 1:
        fail(rel, f"duplicate canonical links ({parser.canonical_count})")
    if parser.styles != parser.style_closes:
        fail(rel, f"unbalanced style elements: {parser.styles} opening, {parser.style_closes} closing")
    if parser.scripts != parser.script_closes:
        fail(rel, f"unbalanced script elements: {parser.scripts} opening, {parser.script_closes} closing")
    if parser.stylesheet_inside_style:
        fail(rel, "stylesheet link is nested inside a <style> element")

    for url in parser.links:
        if url.startswith(("#", "//", "http://", "https://", "mailto:", "tel:", "data:", "javascript:")):
            continue
        target = url.split("#", 1)[0].split("?", 1)[0]
        if not target:
            continue
        candidate = (ROOT / target.lstrip("/")) if target.startswith("/") else (path.parent / target)
        if candidate.is_dir():
            candidate = candidate / "index.html"
        if not candidate.exists():
            fail(rel, f"local reference does not exist: {url}")

if ERRORS:
    print("\n".join(f"ERROR: {item}" for item in ERRORS))
    sys.exit(1)

print(f"Validated {len(html_files)} HTML pages: document structure, styles/scripts, canonical links, and local references.")
