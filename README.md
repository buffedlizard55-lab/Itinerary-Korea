# Korea Compass · Master Trip Planner

A calm, beginner-friendly South Korea trip-planning workspace. **Korea Compass** consolidates the travel research supplied across six repositories into one static GitHub Pages app, while preserving a local, attributed snapshot of the original source material.

**Live Pages URL:** <https://buffedlizard55-lab.github.io/Itinerary-Korea/>

> This is a research and planning tool, not a booking engine or a live travel-data service. Verify event dates, prices, availability, entry requirements, transport operations, eligibility, health guidance, and emergency information with the relevant official provider before acting.

## ⭐ 10 sample trip itineraries (start here)

**The review-ready itineraries live in [`trip-itineraries/`](trip-itineraries/)** — five for Seoul → Daejeon → Busan → Seoul (Route A) and five for Seoul → Cheonan → Busan → Seoul (Route B), all on the fixed Nov 1–22, 2026 frame (arrive ICN 21:00, depart ICN 13:00).

- **Easiest way to read them:** the static review index at [`review/index.html`](review/index.html) — online at <https://buffedlizard55-lab.github.io/Itinerary-Korea/review/>. Every itinerary renders as a clean, document-style page with a one-click **Print / Save PDF** button.
- **Every itinerary guarantees a 24-hour check-in Seoul hotel for the arrival night** — the 9 PM landing means check-in can pass midnight, so Night 1 always uses a hotel with a 24-hour front desk near the AREX Seoul Station corridor, with alternates and late-night transit backups.
- Edit the Markdown in `trip-itineraries/`, then refresh the browser pages with `python3 scripts/build_itinerary_review.py`.

| Route A (Daejeon) | Route B (Cheonan) |
| --- | --- |
| [A1 Classic First-Timer](trip-itineraries/route-a-daejeon/a1-classic-first-timer.md) · 7·5·7·2 | [B1 Classic First-Timer](trip-itineraries/route-b-cheonan/b1-classic-first-timer.md) · 7·5·7·2 |
| [A2 Food-First](trip-itineraries/route-a-daejeon/a2-food-first.md) · 8·4·7·2 | [B2 History & Heritage](trip-itineraries/route-b-cheonan/b2-history-and-heritage.md) · 8·5·6·2 |
| [A3 Slow & Easy](trip-itineraries/route-a-daejeon/a3-slow-and-easy.md) · 7·5·6·3 | [B3 Food-First & Small-Town](trip-itineraries/route-b-cheonan/b3-food-first-small-town.md) · 7·5·7·2 |
| [A4 K-Culture & Nights](trip-itineraries/route-a-daejeon/a4-k-culture-and-nights.md) · 8·3·8·2 | [B4 Rest & Recharge](trip-itineraries/route-b-cheonan/b4-rest-and-recharge.md) · 7·6·6·2 |
| [A5 Nature & Science](trip-itineraries/route-a-daejeon/a5-nature-and-science.md) · 6·6·7·2 | [B5 Budget & Local](trip-itineraries/route-b-cheonan/b5-budget-local.md) · 6·5·8·2 |

*(Night splits read Seoul · middle city · Busan · Seoul.)*

## What is in the master planner

- **Private trip setup** — optional dates, group size, and cities; it does not force a default itinerary.
- **Trip countdown & prep progress** — once dates are set, the overview shows days-to-departure (or your current trip day) plus booking-checklist progress.
- **Two detailed route blueprints** — compare a Seoul → Daejeon → Busan → Seoul route against a Seoul → Cheonan → Busan → Seoul route for the actual Nov. 1–22, 2026 travel window; load either into the editable planner. Each route deep-links (`#/itineraries/<id>`) and prints as a clean paper itinerary.
- **Flexible timeline** — add, edit, delete, export, and import plan items when an itinerary is ready. Export as PDF via the browser print dialog, Word-compatible `.doc`, plain `.txt`, JSON, calendar (`.ics`), or CSV.
- **Searchable discovery library** — destinations, dated events, long-form activity ideas, restaurants, hotels, transit routes, and savings notes. Ranked search with highlighted matches, a `/` keyboard shortcut, and a "During my trip dates" filter that surfaces events overlapping your travel window.
- **Offline-ready PWA** — a service worker caches the shell and research data, so a visited planner keeps working without roaming data; it can be installed to a phone home screen.
- **Saved ideas** — a browser-local shortlist of possibilities.
- **Transit kit** — airport transfer, intercity, payments, station, and app research in one place.
- **Bookings & prep** — a local completion checklist with an intentionally non-automated booking workflow.
- **Safety desk** — quick-dial contacts, printable emergency material, and offline-ready reminders.
- **Source desk** — clear provenance back to every linked repository and to the locally preserved snapshot.
- **Portable data** — export/import the user’s own setup, saved ideas, checklist state, and plan items as JSON. No account or backend is used.

The current generated catalog includes **6 research sources**, **2 detailed November 2026 route blueprints**, **15 destinations**, **15 transport routes**, **34 stays**, **535 food bookmarks**, **110 dated events**, **443 activity notes**, **61 savings notes**, and **9 practical apps**.

## November 2026 route blueprints

The app's **Route options** screen contains a detailed, editable planning version of both routes. The readable documents are also committed for review or printing:

- [Compare both route blueprints](itineraries/README.md)
- [Seoul → Daejeon → Busan → Seoul](itineraries/seoul-daejeon-busan.md)
- [Seoul → Cheonan → Busan → Seoul](itineraries/seoul-cheonan-busan.md)

Both use the corrected travel window: **arrive at ICN at 21:00 on November 1, 2026; depart ICN at 13:00 on November 22, 2026**. They use a 7-night first Seoul leg, 5 nights in the middle city, 7 nights in Busan, and 2 final Seoul nights. That final Seoul buffer is intentional: it protects the international departure from a risky same-day Busan-to-ICN connection.

Each day now has explicit target schedule windows, operational/routing notes, reservation checks, food rhythm, and Plan B. The schedules are intentionally detailed without pretending that an old flight price, KTX time, attraction hour, or event listing is a current booking fact. Because Seoul is well ahead of San Francisco, the outbound SFO calendar date must be reconciled from the actual airline ticket rather than inferred from the local Nov. 1 ICN arrival.

## Research provenance

The source snapshots are retained under [`research/sources/`](research/sources/) so the planner can be refreshed without adding a live scraping dependency to GitHub Pages.

| Source | Imported focus | Source revision used |
| --- | --- | --- |
| [Koreatransport](https://github.com/sassnarep3-star/Koreatransport/tree/arena/019fc955-koreatransport) | routes, airport transfers, cards, apps, stations, logistics | `arena/019fc955-koreatransport` · `251cb01079fa` |
| [Korea-hotels](https://github.com/karagemop466-tech/Korea-hotels/tree/arena/019fc93d-korea-hotels) | hotel comparison data and city/stay guides | `arena/019fc93d-korea-hotels` · `59528de282b2` |
| [KoreaFun](https://github.com/karagemop466-tech/KoreaFun) | events, activities, walking and trip ideas | `main` · `7b075aee8852` |
| [Koreafood](https://github.com/karagemop466-tech/Koreafood) | food bookmarks, city guides, booking notes | `main` · `d373e09b129d` |
| [Korea](https://github.com/buffedlizard55-lab/Korea) | savings, promotions, visitor-action guides | `main` · `9852a2763808` |
| [Korea-emergency](https://github.com/buffedlizard55-lab/Korea-emergency/tree/arena/019fd2e4-korea-emergency) | preparation, emergency contacts, checklists, scenario guides | `arena/019fd2e4-korea-emergency` · `7073740c6d28` |

Source content is a snapshot as of the master-catalog pass on **2026-08-07**. Its inclusion does **not** represent independent re-verification of every claim.

## Run locally

There is no package manager, framework, API key, or build step required for the app.

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

Use a local server instead of opening `index.html` directly: the browser loads the generated `data/index.json` (and collection files) with `fetch()`.

## GitHub Pages deployment

This repository is configured in GitHub Pages to deploy from:

- **Branch:** `main`
- **Folder:** `/ (root)`

The application is static and its entry point is [`index.html`](index.html), so a merge to `main` publishes it without a build workflow. The [`.nojekyll`](.nojekyll) marker keeps the source vault and static assets from being altered by Jekyll processing.

After merging, allow GitHub Pages a moment to publish, then use:

<https://buffedlizard55-lab.github.io/Itinerary-Korea/> — the planner — and <https://buffedlizard55-lab.github.io/Itinerary-Korea/review/> — the itinerary review index.

## Refreshing source research

The browser reads a small generated index plus per-collection files. The generator uses the committed source snapshots and fails the build if any URL looks like a scraping artifact (odd ports, localhost hosts).

1. Refresh the relevant folder under `research/sources/` from the approved source repository.
2. Update the source revision table in this README and the metadata in [`scripts/build_catalog.py`](scripts/build_catalog.py).
3. Rebuild the catalog:

   ```bash
   python3 scripts/build_catalog.py
   ```

4. If a detailed route blueprint changed, re-render its readable Markdown companion:

   ```bash
   python3 scripts/build_itinerary_docs.py
   ```

5. If any sample itinerary under `trip-itineraries/` changed, rebuild the review site:

   ```bash
   python3 scripts/build_itinerary_review.py
   ```

6. Review the diff, especially time-sensitive records and links.
7. Validate locally with a static server before merging to `main`.

The PWA icons under `assets/icons/` are rendered reproducibly from vector math (no image tooling required):

```bash
python3 scripts/make_icons.py
```

## Planned next step

Open **Route options**, compare the Daejeon and Cheonan middle-city tradeoffs, and use **Use as my editable plan** on the preferred route. The planner will load all 22 calendar days as editable items; hotel confirmations, exact KTX trains, restaurant reservations, and any personal itinerary changes can then be layered in without rebuilding the master repository. From Route options you can export either complete blueprint as PDF (browser print), Word-compatible `.doc`, or `.txt`; from My plan you can export the edited version in those formats plus JSON, calendar, and CSV.
