# Generated planner catalog

The static, browser-friendly data consumed by `assets/app.js` is generated in
two tiers so the first paint stays fast:

- [`index.json`](index.json) — small, loaded immediately: trip meta, sources,
  cities, transit kit records, safety/emergency records, destinations, and
  routes.
- [`collections/`](collections/) — large research collections loaded on
  demand by the app: `events.json`, `activities.json`, `food.json`,
  `hotels.json`, `savingsGuides.json`, and `blueprints.json` (the detailed
  November 2026 route blueprints).

They are generated from the committed source vault with:

```bash
python3 scripts/build_catalog.py
```

The generator also runs a **URL audit** on every build: non-standard ports or
localhost hosts (classic scraping artifacts) fail the build, so a bad official
link can never silently ship to GitHub Pages.

The catalog intentionally contains compact searchable fields, provenance
paths, and the structured CSV/JSON source records needed by the planner. Full
long-form context remains under [`../research/sources/`](../research/sources/).

[`itineraries.json`](itineraries.json) is the source of truth for the two
detailed November 2026 route blueprints. It includes the corrected local
Korea arrival/departure window, target schedule windows, operational notes,
reservation checks, and alternatives—not a live flight, rail, price, or
opening-hours feed. It is folded into `collections/blueprints.json` by the
catalog generator. Render human-readable Markdown companions with:

```bash
python3 scripts/build_itinerary_docs.py
```

Do not hand-edit the generated files for a source refresh. Update the source
snapshot, itinerary blueprint, or generator, then rebuild so the catalog
remains reproducible.
