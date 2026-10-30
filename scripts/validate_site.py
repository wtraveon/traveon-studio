#!/usr/bin/env python3
"""Static-site integrity checks for Traveon Studio."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import re
import sys
ROOT = Path(__file__).resolve().parents[1]
PAGES = sorted(p for p in ROOT.rglob("*.html") if ".git" not in p.parts)
errors = []
class Inspector(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path=path; self.ids=set(); self.links=[]; self.images=[]; self.titles=0; self.descriptions=0; self.canonicals=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if "id" in a:
            if a["id"] in self.ids: errors.append(f"{self.path}: duplicate id #{a['id']}")
            self.ids.add(a["id"])
        if tag in ("a","link") and a.get("href"): self.links.append(a["href"])
        if tag in ("img","source") and a.get("src") and tag=="img":
            if "alt" not in a: errors.append(f"{self.path}: image missing alt text ({a['src']})")
        if tag=="title": self.titles+=1
        if tag=="meta" and a.get("name","").lower()=="description":
            if not a.get("content","").strip(): errors.append(f"{self.path}: empty meta description")
            self.descriptions+=1
        if tag=="link" and a.get("rel","").lower()=="canonical": self.canonicals+=1
for page in PAGES:
    text=page.read_text(encoding="utf-8")
    parser=Inspector(page); parser.feed(text)
    rel=page.relative_to(ROOT)
    if parser.titles != 1: errors.append(f"{rel}: expected exactly one title tag")
    if parser.descriptions != 1: errors.append(f"{rel}: expected exactly one meta description")
    if rel.as_posix()!="404.html" and parser.canonicals != 1: errors.append(f"{rel}: expected exactly one canonical URL")
    for href in parser.links:
        u=urlsplit(href)
        if u.scheme or u.netloc or not u.path.startswith("/"): continue
        target=u.path
        if target=="/": candidate=ROOT/"index.html"
        elif target=="/api/consultation": candidate=ROOT/"functions/api/consultation.js"
        else:
            candidate=ROOT/target.lstrip("/")
            if target.endswith("/"): candidate=candidate/"index.html"
            elif not candidate.suffix: candidate=candidate/"index.html"
        if not candidate.is_file(): errors.append(f"{rel}: broken local path {href}")
        elif u.fragment and candidate.suffix==".html":
            target_text=candidate.read_text(encoding="utf-8")
            if not re.search(r"""\\bid=["']"""+re.escape(u.fragment)+r"""["']""",target_text):
                errors.append(f"{rel}: missing anchor {href}")
sitemap=ROOT/"sitemap.xml"
if not sitemap.is_file(): errors.append("sitemap.xml is missing")
else:
    xml=sitemap.read_text(encoding="utf-8")
    for page in PAGES:
        rel=page.relative_to(ROOT).as_posix()
        if rel=="404.html": continue
        route="/" if rel=="index.html" else "/"+rel.removesuffix("index.html")
        if "https://traveonstudio.com"+route not in xml: errors.append(f"sitemap.xml: missing {route}")
if errors:
    print("\\n".join("ERROR: "+e for e in errors)); sys.exit(1)
print(f"Site integrity passed: {len(PAGES)} HTML pages, local links, anchors, metadata, image alt attributes, and sitemap routes.")
