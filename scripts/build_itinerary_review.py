#!/usr/bin/env python3
"""Build the itinerary review site.

Reads the 10 sample itinerary Markdown files under trip-itineraries/
and generates a clean, Word-document-style static site under review/:

  review/index.html              - list of all itineraries, grouped by route
  review/styles.css              - shared document styling (screen + print)
  review/itineraries/<slug>.html - one printable page per itinerary

No third-party dependencies. Re-run after editing any itinerary:

  python3 scripts/build_itinerary_review.py
"""

from __future__ import annotations

import datetime
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "trip-itineraries"
OUT = ROOT / "review"
OUT_ITIN = OUT / "itineraries"

# (directory, badge letter, route title, section blurb)
ROUTES = [
    (
        "route-a-daejeon",
        "A",
        "Route A · Seoul → Daejeon → Busan → Seoul",
        "The bigger middle city: science, Sungsimdang bread, parks, Yuseong hot springs.",
    ),
    (
        "route-b-cheonan",
        "B",
        "Route B · Seoul → Cheonan → Busan → Seoul",
        "The calmer middle city: Independence Hall, sundae soup, walnut pastries, Onyang/Asan hot springs.",
    ),
]

# ---------------------------------------------------------------- inline md --

_INLINE_BOLD = re.compile(r"\*\*(.+?)\*\*")
_INLINE_ITALIC = re.compile(r"(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)")
_INLINE_CODE = re.compile(r"`([^`]+)`")
_INLINE_LINK = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def inline(text: str) -> str:
    text = html.escape(text, quote=False)
    text = _INLINE_CODE.sub(r"<code>\1</code>", text)
    text = _INLINE_BOLD.sub(r"<strong>\1</strong>", text)
    text = _INLINE_ITALIC.sub(r"<em>\1</em>", text)
    text = _INLINE_LINK.sub(r'<a href="\2">\1</a>', text)
    return text


# --------------------------------------------------------------- block md ---


def is_table_sep(line: str) -> bool:
    return bool(re.match(r"^\s*\|?[\s:|-]+\|", line)) and "-" in line


def is_table_row(line: str) -> bool:
    return line.strip().startswith("|") and line.strip().endswith("|")


def split_row(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def render_markdown(md: str) -> str:
    """Dependency-free renderer covering the subset used by the itineraries:
    headings, blockquotes, tables, flat lists, links, bold/italic/code."""
    lines = md.splitlines()
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # Headings
        m = re.match(r"^(#{1,4})\s+(.*)$", line)
        if m:
            level = len(m.group(1))
            out.append(f"<h{level}>{inline(m.group(2))}</h{level}>")
            i += 1
            continue

        # Horizontal rule
        if stripped in ("---", "***"):
            out.append("<hr />")
            i += 1
            continue

        # Blockquote (collect consecutive '>' lines)
        if stripped.startswith(">"):
            block = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                block.append(lines[i].strip().lstrip(">").strip())
                i += 1
            inner = "".join(f"<p>{inline(b)}</p>" for b in block if b)
            out.append(f'<blockquote class="meta-block">{inner}</blockquote>')
            continue

        # Table
        if is_table_row(line) and i + 1 < len(lines) and is_table_sep(lines[i + 1]):
            header = split_row(line)
            i += 2
            rows = []
            while i < len(lines) and is_table_row(lines[i]):
                rows.append(split_row(lines[i]))
                i += 1
            thead = "".join(f"<th>{inline(c)}</th>" for c in header)
            tbody = "".join(
                "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in row) + "</tr>"
                for row in rows
            )
            out.append(f"<table><thead><tr>{thead}</tr></thead><tbody>{tbody}</tbody></table>")
            continue

        # Unordered list
        if re.match(r"^\s*-\s+", line):
            items = []
            while i < len(lines) and re.match(r"^\s*-\s+", lines[i]):
                items.append(re.sub(r"^\s*-\s+", "", lines[i]))
                i += 1
            lis = "".join(f"<li>{inline(item)}</li>" for item in items)
            out.append(f"<ul>{lis}</ul>")
            continue

        # Ordered list
        if re.match(r"^\s*\d+\.\s+", line):
            items = []
            while i < len(lines) and re.match(r"^\s*\d+\.\s+", lines[i]):
                items.append(re.sub(r"^\s*\d+\.\s+", "", lines[i]))
                i += 1
            lis = "".join(f"<li>{inline(item)}</li>" for item in items)
            out.append(f"<ol>{lis}</ol>")
            continue

        # Paragraph
        out.append(f"<p>{inline(stripped)}</p>")
        i += 1

    return "\n".join(out)


# --------------------------------------------------------------- metadata ---


def parse_meta(md: str) -> dict:
    """Pull the title and the blockquote key/value pairs from the file head."""
    title = md.splitlines()[0].lstrip("# ").strip() if md.strip() else "Itinerary"
    meta: dict[str, str] = {"title": title}
    for line in md.splitlines()[1:30]:
        s = line.strip()
        if not s.startswith(">"):
            if s and not s.startswith(">") and meta.get("done"):
                break
            continue
        body = s.lstrip(">").strip()
        m = re.match(r"\*\*(.+?):\*\*\s*(.*)$", body)
        if m:
            meta[m.group(1).lower()] = re.sub(r"\*\*", "", m.group(2)).strip()
    # summary = first paragraph after "## Who this suits"
    m = re.search(r"## Who this suits\s*\n\s*\n?(.+)", md)
    if m:
        meta["summary"] = re.sub(r"[*_`]", "", m.group(1)).strip()
    return meta


# ------------------------------------------------------------------ pages ---

ITIN_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title} · Korea trip itineraries</title>
<link rel="stylesheet" href="../styles.css" />
</head>
<body>
<nav class="toolbar no-print">
  <a class="tool" href="../index.html">← All itineraries</a>
  <span class="tool-spacer"></span>
  {prev_link}
  {next_link}
  <button class="tool tool-btn" type="button" onclick="window.print()">🖨 Print / Save PDF</button>
</nav>
<div class="page">
{content}
<footer class="doc-foot">Generated {generated} from <code>trip-itineraries/{src_rel}</code> — edit the Markdown, run <code>python3 scripts/build_itinerary_review.py</code>.</footer>
</div>
</body>
</html>
"""

INDEX_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Korea trip itineraries · review index</title>
<link rel="stylesheet" href="styles.css" />
</head>
<body>
<div class="page index-page">
  <header class="index-head">
    <p class="kicker">Sample plans for review · 10 itineraries</p>
    <h1>Korea Trip — Itinerary Review</h1>
    <p class="frame"><strong>Trip frame, fixed across all ten:</strong> arrive <strong>Sun, Nov 1, 2026, 21:00 at ICN</strong> · depart <strong>Sun, Nov 22, 2026, 13:00 from ICN</strong> · 21 nights / 22 days. Every itinerary uses a <strong>24-hour check-in Seoul hotel for the arrival night</strong> (the 9 PM landing + delays mean check-in can pass midnight).</p>
    <p class="hint no-print">Click any card to read the itinerary as a printable document. Source Markdown lives in <code>trip-itineraries/</code>; regenerate this page with <code>python3 scripts/build_itinerary_review.py</code>.</p>
  </header>
  {sections}
  <footer class="doc-foot">Planning documents, not bookings — verify dates, prices, hours, ticket availability, and hotel 24-hour front-desk policies with providers before booking.</footer>
</div>
</body>
</html>
"""

SECTION = """
<section class="route-section">
  <h2>{route_title}</h2>
  <p class="route-blurb">{route_blurb}</p>
  <div class="cards">
  {cards}
  </div>
</section>
"""

CARD = """
    <a class="card" href="itineraries/{slug}.html">
      <span class="badge">{badge}</span>
      <span class="card-title">{title}</span>
      <span class="card-nights">{nights}</span>
      <span class="card-summary">{summary}</span>
      <span class="card-links">Read → &nbsp;·&nbsp; <span class="card-src">src: trip-itineraries/{src_rel}</span></span>
    </a>
"""


def short_title(full: str) -> str:
    # "A1 · Classic First-Timer — Seoul → ..." -> "Classic First-Timer"
    core = full.split("—")[0].strip()
    core = re.sub(r"^[AB]\d\s*·\s*", "", core)
    return core


def main() -> None:
    OUT_ITIN.mkdir(parents=True, exist_ok=True)
    generated = datetime.date.today().isoformat()

    # Shared stylesheet
    (OUT / "styles.css").write_text(STYLES, encoding="utf-8")

    entries: list[dict] = []
    for dirname, badge, route_title, route_blurb in ROUTES:
        for path in sorted((SRC / dirname).glob("*.md")):
            if path.name.lower() == "readme.md":
                continue
            md = path.read_text(encoding="utf-8")
            meta = parse_meta(md)
            slug = path.stem
            entries.append(
                {
                    "slug": slug,
                    "badge": f"{badge}{len([e for e in entries if e['dir'] == dirname]) + 1}",
                    "dir": dirname,
                    "route_title": route_title,
                    "route_blurb": route_blurb,
                    "title": short_title(meta.get("title", slug)),
                    "nights": meta.get("night split", ""),
                    "summary": meta.get("summary", ""),
                    "body": render_markdown(md),
                    "src_rel": f"{dirname}/{path.name}",
                }
            )

    # Per-itinerary pages with prev/next
    for idx, e in enumerate(entries):
        prev_link = (
            f'<a class="tool" href="{entries[idx - 1]["slug"]}.html">← {entries[idx - 1]["badge"]} {html.escape(entries[idx - 1]["title"])}</a>'
            if idx > 0
            else ""
        )
        next_link = (
            f'<a class="tool" href="{entries[idx + 1]["slug"]}.html">{entries[idx + 1]["badge"]} {html.escape(entries[idx + 1]["title"])} →</a>'
            if idx < len(entries) - 1
            else ""
        )
        (OUT_ITIN / f"{e['slug']}.html").write_text(
            ITIN_PAGE.format(
                title=html.escape(f"{e['badge']} {e['title']}"),
                content=e["body"],
                generated=generated,
                src_rel=e["src_rel"],
                prev_link=prev_link,
                next_link=next_link,
            ),
            encoding="utf-8",
        )

    # Index grouped by route
    sections = []
    for dirname, _badge, route_title, route_blurb in ROUTES:
        cards = "".join(
            CARD.format(
                slug=e["slug"],
                badge=e["badge"],
                title=html.escape(e["title"]),
                nights=html.escape(e["nights"]),
                summary=html.escape(e["summary"]),
                src_rel=e["src_rel"],
            )
            for e in entries
            if e["dir"] == dirname
        )
        sections.append(
            SECTION.format(route_title=route_title, route_blurb=route_blurb, cards=cards)
        )
    (OUT / "index.html").write_text(
        INDEX_PAGE.format(sections="".join(sections)), encoding="utf-8"
    )

    print(f"Built review site: {len(entries)} itineraries -> {OUT.relative_to(ROOT)}/")
    for e in entries:
        print(f"  {e['badge']:>3}  {e['title']}")


# ------------------------------------------------------------------ styles --

STYLES = """/* Itinerary review site — calm, document-like, printable. */
:root {
  --ink: #1f2a27;
  --accent: #14332d;
  --accent-2: #2e6f5e;
  --paper: #ffffff;
  --desk: #f2efe8;
  --line: #d8d2c6;
}
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  margin: 0;
  background: var(--desk);
  color: var(--ink);
  font-family: Georgia, 'Iowan Old Style', 'Times New Roman', serif;
  font-size: 16px;
  line-height: 1.55;
}
.page {
  max-width: 7.6in;
  margin: 24px auto 64px;
  background: var(--paper);
  padding: 0.85in 0.9in;
  box-shadow: 0 2px 18px rgba(20, 51, 45, 0.12);
  border-radius: 6px;
}
h1 { font-size: 1.75rem; color: var(--accent); margin: 0 0 0.5rem; line-height: 1.25; }
h2 {
  font-size: 1.3rem; color: var(--accent);
  border-bottom: 2px solid var(--accent-2);
  padding-bottom: 0.25rem; margin: 2rem 0 0.9rem;
}
h3 {
  font-size: 1.08rem; color: var(--accent);
  background: #f4f7f3; border-left: 4px solid var(--accent-2);
  padding: 0.45rem 0.7rem; margin: 1.6rem 0 0.6rem;
  page-break-after: avoid;
}
h4 { font-size: 1rem; color: var(--accent); margin: 1.2rem 0 0.4rem; }
p { margin: 0.45rem 0; }
ul, ol { margin: 0.4rem 0 0.9rem; padding-left: 1.5rem; }
li { margin: 0.3rem 0; }
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85em; background: #f1efe9; padding: 0.08em 0.35em; border-radius: 4px;
}
a { color: var(--accent-2); }
table { width: 100%; border-collapse: collapse; margin: 0.9rem 0; font-size: 0.95rem; }
th, td { border: 1px solid var(--line); padding: 0.45rem 0.6rem; text-align: left; vertical-align: top; }
th { background: #eef3ee; color: var(--accent); }
tbody tr:nth-child(even) { background: #faf9f5; }
blockquote.meta-block {
  margin: 0.9rem 0 1.2rem; padding: 0.7rem 1rem;
  background: #fbf7ec; border-left: 4px solid #c9a227; color: #4a4130;
}
blockquote.meta-block p { margin: 0.25rem 0; }
hr { border: none; border-top: 1px solid var(--line); margin: 1.6rem 0; }
.doc-foot {
  margin-top: 2.4rem; padding-top: 0.8rem; border-top: 1px solid var(--line);
  font-size: 0.82rem; color: #7a7466;
}

/* Toolbar */
.toolbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; gap: 0.5rem; align-items: center;
  background: var(--accent); color: #fff; padding: 0.55rem 1rem;
  font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 0.9rem;
}
.tool { color: #eaf3ef; text-decoration: none; padding: 0.3rem 0.7rem; border-radius: 6px; }
.tool:hover { background: rgba(255, 255, 255, 0.14); }
.tool-btn { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.35); cursor: pointer; margin-left: auto; }
.tool-spacer { flex: 0 0 auto; }

/* Index */
.index-page h1 { font-size: 2rem; }
.kicker { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.78rem; color: var(--accent-2); font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; }
.frame { background: #fbf7ec; border-left: 4px solid #c9a227; padding: 0.7rem 1rem; }
.hint { font-size: 0.9rem; color: #6b665a; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; }
.route-section h2 { margin-top: 2.2rem; }
.route-blurb { color: #57534a; font-style: italic; margin-top: -0.4rem; }
.cards { display: grid; grid-template-columns: 1fr; gap: 0.8rem; margin-top: 0.8rem; }
.card {
  display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto auto auto;
  column-gap: 0.9rem; row-gap: 0.15rem;
  border: 1px solid var(--line); border-radius: 10px; padding: 0.85rem 1rem;
  text-decoration: none; color: inherit; background: #fffdf8;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.card:hover { box-shadow: 0 3px 14px rgba(20, 51, 45, 0.15); transform: translateY(-1px); }
.badge {
  grid-row: 1 / span 3; align-self: start;
  background: var(--accent); color: #fff; font-weight: 700;
  border-radius: 8px; padding: 0.35rem 0.55rem; font-size: 0.95rem;
  font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
}
.card-title { font-size: 1.15rem; color: var(--accent); font-weight: 700; }
.card-nights { font-size: 0.85rem; color: #6b665a; font-family: ui-monospace, Menlo, monospace; }
.card-summary { font-size: 0.95rem; color: #3d3a33; }
.card-links { font-size: 0.8rem; color: var(--accent-2); font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; }
.card-src { color: #8b8577; }

@media (max-width: 640px) {
  .page { margin: 0; padding: 1.1rem 1rem; border-radius: 0; }
  body { background: var(--paper); }
}
@media print {
  body { background: #fff; font-size: 11.5pt; }
  .page { box-shadow: none; margin: 0; max-width: none; padding: 0.3in 0; }
  .no-print { display: none !important; }
  h2 { page-break-after: avoid; }
  li, tr { page-break-inside: avoid; }
  a { color: inherit; text-decoration: none; }
}
"""


if __name__ == "__main__":
    main()
