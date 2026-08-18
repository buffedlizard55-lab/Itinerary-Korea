#!/usr/bin/env python3
"""Build the browser-friendly Korea Compass catalog from local source snapshots.

This intentionally has no network calls. Source snapshots are committed under
research/sources so the site remains reproducible and GitHub Pages can serve
it as a static site.
"""

from __future__ import annotations

import csv
import json
import re
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "research" / "sources"
INDEX_OUTPUT = ROOT / "data" / "index.json"
COLLECTION_OUTPUT = ROOT / "data" / "collections"
ITINERARY_BLUEPRINTS = ROOT / "data" / "itineraries.json"

# This date identifies the curation pass, not a promise that third-party
# opening times, prices, visas, or event dates are current.
CATALOG_DATE = "2026-08-18"

# Large collections are written to their own files so the browser can load a
# small index first and fetch each collection on demand.
COLLECTION_FILES = {
    "events": "events.json",
    "activities": "activities.json",
    "food": "food.json",
    "hotels": "hotels.json",
    "savingsGuides": "savingsGuides.json",
    "itineraryBlueprints": "blueprints.json",
}

SOURCE_META = [
    {
        "id": "transport",
        "name": "Koreatransport",
        "focus": "Transport, route choices, apps, cards, stations, and planning tools",
        "url": "https://github.com/sassnarep3-star/Koreatransport/tree/arena/019fc955-koreatransport",
        "branch": "arena/019fc955-koreatransport",
        "commit": "251cb01079fa50b63a9193a24ca2cc9cf3bb843b",
        "localPath": "research/sources/transport",
    },
    {
        "id": "hotels",
        "name": "Korea-hotels",
        "focus": "Hotel comparisons, neighborhoods, rooms, and stay-planning guides",
        "url": "https://github.com/karagemop466-tech/Korea-hotels/tree/arena/019fc93d-korea-hotels",
        "branch": "arena/019fc93d-korea-hotels",
        "commit": "59528de282b2d7ece5d4ad500e37b7504bb37efc",
        "localPath": "research/sources/hotels",
    },
    {
        "id": "fun",
        "name": "KoreaFun",
        "focus": "Events, activities, sports, culture, walking routes, and trip ideas",
        "url": "https://github.com/karagemop466-tech/KoreaFun",
        "branch": "main",
        "commit": "7b075aee8852d1d3132a30e5f146b91f3076eb51",
        "localPath": "research/sources/fun",
    },
    {
        "id": "food",
        "name": "Koreafood",
        "focus": "Restaurant bookmarks, city food guides, and food-planning notes",
        "url": "https://github.com/karagemop466-tech/Koreafood",
        "branch": "main",
        "commit": "d373e09b129d08a50508c10194b40dab7e61d909",
        "localPath": "research/sources/food",
    },
    {
        "id": "savings",
        "name": "Korea",
        "focus": "Tourist promotions, savings, delivery apps, and practical visitor actions",
        "url": "https://github.com/buffedlizard55-lab/Korea",
        "branch": "main",
        "commit": "9852a2763808f8c4a2cb2a6ab74dc85a324ff52c",
        "localPath": "research/sources/korea",
    },
    {
        "id": "emergency",
        "name": "Korea-emergency",
        "focus": "Entry prep, emergency contacts, safety scenarios, and offline checklists",
        "url": "https://github.com/buffedlizard55-lab/Korea-emergency/tree/arena/019fd2e4-korea-emergency",
        "branch": "arena/019fd2e4-korea-emergency",
        "commit": "7073740c6d287e998d6b9db8dcfa94dcdcbc7821",
        "localPath": "research/sources/emergency",
    },
]

CITIES = [
    {
        "id": "seoul",
        "name": "Seoul",
        "short": "Palaces, neighborhoods, museums, nightlife, and a major rail hub.",
        "label": "Capital & rail hub",
        "accent": "violet",
    },
    {
        "id": "busan",
        "name": "Busan",
        "short": "Beaches, markets, hillside neighborhoods, and coastal culture.",
        "label": "Coast & city energy",
        "accent": "coral",
    },
    {
        "id": "gyeongju",
        "name": "Gyeongju",
        "short": "Silla-era heritage, hanok stays, and a slower historic pace.",
        "label": "Heritage stop",
        "accent": "gold",
    },
    {
        "id": "daejeon",
        "name": "Daejeon",
        "short": "Science, parks, bakeries, hot springs, and central rail access.",
        "label": "Central-city option",
        "accent": "mint",
    },
    {
        "id": "cheonan",
        "name": "Cheonan",
        "short": "A flexible KTX-corridor stop with culture and nearby sports.",
        "label": "Flexible rail stop",
        "accent": "sky",
    },
    {
        "id": "jeonju",
        "name": "Jeonju",
        "short": "Hanok heritage and a food-focused detour.",
        "label": "Food & hanok option",
        "accent": "rose",
    },
    {
        "id": "jeju",
        "name": "Jeju",
        "short": "Island landscapes and a flight-based change of pace.",
        "label": "Island option",
        "accent": "ocean",
    },
]


def read_json(relative: str) -> Any:
    return json.loads((SOURCE / relative).read_text(encoding="utf-8"))


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "item"


def strip_markdown(value: str) -> str:
    """Make a compact, readable card excerpt from markdown."""
    value = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", value)
    value = re.sub(r"[`*_#>]", "", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def first_url(value: str) -> str | None:
    match = re.search(r"https?://[^\s)>,]+", value)
    return match.group(0).rstrip(".,;") if match else None


URL_FINDER = re.compile(r"https?://[^\s\"'<>;,)}\]]+")
PORT_FINDER = re.compile(r"https?://[^/\s]+:(\d+)")


def iter_strings(value: Any):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for entry in value:
            yield from iter_strings(entry)
    elif isinstance(value, dict):
        for entry in value.values():
            yield from iter_strings(entry)


def audit_urls(catalog: dict[str, Any]) -> list[str]:
    """Flag URL shapes that usually indicate a broken or scraped artifact.

    The catalog is a static planning reference, so links should be ordinary
    http(s) destinations. Non-standard ports (a past scraping proxy leaked
    ':8501' into an official site) and localhost hosts fail the build.
    """
    issues: list[str] = []
    seen: set[str] = set()
    for text in iter_strings(catalog):
        for url in URL_FINDER.findall(text):
            if url in seen:
                continue
            seen.add(url)
            port_match = PORT_FINDER.match(url)
            if port_match and port_match.group(1) not in {"80", "443"}:
                issues.append(f"non-standard port: {url}")
            host = re.sub(r"^https?://", "", url).split("/", 1)[0].lower()
            if host.startswith(("localhost", "127.0.0.1", "0.0.0.0", "[::1]")):
                issues.append(f"localhost host: {url}")
    return issues


def normalize_status(value: str) -> str:
    low = value.lower()
    if "✅" in value or "confirmed" in low:
        return "Confirmed"
    if "⏳" in value or "tba" in low:
        return "TBA"
    if "👀" in value or "watch" in low:
        return "Watch"
    if "🔁" in value or "always" in low or "recurring" in low:
        return "Always on"
    return "Idea"


def clean_activity_title(value: str) -> str:
    # Keep useful punctuation/Korean text but remove leading decorative emoji.
    value = re.sub(r"^\s*[^\w가-힣]+", "", value, flags=re.UNICODE)
    value = re.split(r"\s+[—–-]\s+(?:✅|⏳|👀|🔁)", value, maxsplit=1)[0]
    return value.strip()


def short_excerpt(value: str, limit: int = 310) -> str:
    lines = [
        strip_markdown(line.lstrip("- ").strip())
        for line in value.splitlines()
        if line.strip()
        and not line.lstrip().startswith("|")
        and not line.lstrip().startswith("---")
        and "Official source" not in line
        and "Official sources" not in line
    ]
    candidate = ""
    for line in lines:
        if "Beginner notes:" in line:
            candidate = line.split("Beginner notes:", 1)[-1].strip()
            break
    if not candidate:
        candidate = next((line for line in lines if len(line) > 28), "")
    if len(candidate) > limit:
        return candidate[: limit - 1].rstrip() + "…"
    return candidate


def parse_numbered_activities(relative: str, city: str) -> list[dict[str, Any]]:
    """Extract every numbered recommendation from the long KoreaFun guides."""
    path = SOURCE / relative
    lines = path.read_text(encoding="utf-8").splitlines()
    headers: list[tuple[int, str, str, str]] = []
    category = "Ideas"
    # KoreaFun uses both ## and ### for numbered recommendations in different
    # parts of its guides. Keep only headings that begin with an item number.
    item_pattern = re.compile(r"^#{2,3}\s+(\d+)\)\s*(.+?)\s*$")

    for index, line in enumerate(lines):
        match = item_pattern.match(line)
        if match:
            headers.append((index, match.group(1), match.group(2), category))
        elif line.startswith("## "):
            category = clean_activity_title(line[3:]) or "Ideas"

    entries: list[dict[str, Any]] = []
    for sequence, (start, number, raw_title, category) in enumerate(headers):
        end = headers[sequence + 1][0] if sequence + 1 < len(headers) else len(lines)
        body = "\n".join(lines[start + 1 : end])
        title = clean_activity_title(raw_title)
        entries.append(
            {
                "id": f"idea-{slugify(city)}-{number}",
                "title": title,
                "city": city,
                "category": category,
                "status": normalize_status(raw_title + " " + body[:500]),
                "snippet": short_excerpt(body),
                "officialUrl": first_url(body),
                "source": "fun",
                "sourcePath": f"research/sources/{relative}",
                "sourceLabel": f"KoreaFun guide #{number}",
            }
        )
    return entries


def parse_food() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    source_path = SOURCE / "food/restaurants-bookmarks.csv"
    with source_path.open(encoding="utf-8-sig", newline="") as file:
        for index, row in enumerate(csv.DictReader(file), start=1):
            city = row.get("City", "").strip()
            name = row.get("Spot Name (English)", "").strip()
            records.append(
                {
                    "id": f"food-{slugify(city)}-{index}",
                    "name": name,
                    "koreanName": row.get("Spot Name (Korean)", "").strip(),
                    "city": city,
                    "category": row.get("Category", "").strip(),
                    "neighborhood": row.get("Neighborhood", "").strip(),
                    "priceTier": row.get("Price Tier", "").strip(),
                    "mapUrl": row.get("Naver Map Link", "").strip(),
                    "source": "food",
                    "sourcePath": "research/sources/food/restaurants-bookmarks.csv",
                }
            )
    return records


def parse_events() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    source_path = SOURCE / "fun/events.csv"
    with source_path.open(encoding="utf-8-sig", newline="") as file:
        for index, row in enumerate(csv.DictReader(file), start=1):
            raw_status = row.get("status", "")
            records.append(
                {
                    "id": f"event-{index}",
                    "title": row.get("event", "").strip(),
                    "city": row.get("city", "").strip(),
                    "startDate": row.get("date_start", "").strip(),
                    "endDate": row.get("date_end", "").strip(),
                    "category": row.get("category", "").strip(),
                    "status": normalize_status(raw_status),
                    "statusDetail": raw_status.strip(),
                    "venue": row.get("venue", "").strip(),
                    "price": row.get("price_krw", "").strip(),
                    "hours": row.get("hours", "").strip(),
                    "officialSources": row.get("official_sources", "").strip(),
                    "notes": row.get("notes", "").strip(),
                    "source": "fun",
                    "sourcePath": "research/sources/fun/events.csv",
                }
            )
    return records


def parse_checklist(relative: str) -> list[dict[str, str]]:
    lines = (SOURCE / relative).read_text(encoding="utf-8").splitlines()
    section = "General"
    tasks: list[dict[str, str]] = []
    for line in lines:
        if line.startswith("## "):
            section = strip_markdown(line[3:])
        match = re.match(r"^\s*-\s*\[\s*\]\s*(.+)$", line)
        if match:
            tasks.append({"section": section, "label": strip_markdown(match.group(1))})
    return tasks


def parse_savings_sections() -> list[dict[str, Any]]:
    """Surface the savings repo's section headings as searchable short guides."""
    files = [
        "docs/everyday-savings.md",
        "docs/birthday-freebies.md",
        "docs/signup-welcome-deals.md",
        "docs/tourist-promotions.md",
        "docs/delivery-apps.md",
        "docs/us-tourist-action-plan.md",
    ]
    entries: list[dict[str, Any]] = []
    for relative in files:
        lines = (SOURCE / "korea" / relative).read_text(encoding="utf-8").splitlines()
        section_lines: list[tuple[int, str]] = [
            (index, line)
            for index, line in enumerate(lines)
            if re.match(r"^##(?:#)?\s+", line)
        ]
        for index, (start, heading) in enumerate(section_lines):
            end = section_lines[index + 1][0] if index + 1 < len(section_lines) else len(lines)
            title = strip_markdown(re.sub(r"^##(?:#)?\s+", "", heading))
            body = "\n".join(lines[start + 1 : end])
            if not title:
                continue
            entries.append(
                {
                    "id": f"saving-{slugify(relative)}-{index + 1}",
                    "title": title,
                    "category": Path(relative).stem.replace("-", " ").title(),
                    "snippet": short_excerpt(body),
                    "officialUrl": first_url(body),
                    "source": "savings",
                    "sourcePath": f"research/sources/korea/{relative}",
                }
            )
    return entries


def build_catalog() -> dict[str, Any]:
    transport_destinations = read_json("transport/data/destinations.json")["destinations"]
    transport_routes_data = read_json("transport/data/routes.json")
    transport_cards = read_json("transport/data/cards.json")["cards"]
    transport_apps = read_json("transport/data/apps.json")["iphone_apps"]
    transport_stations = read_json("transport/data/stations_and_exits.json")["stations"]
    transport_exit_details = read_json("transport/data/station_exits_detail.json")["stations"]
    transport_contingencies = read_json("transport/data/contingencies.json")["contingency_plans"]
    transport_bikes = read_json("transport/data/bikeshare.json")["bikeshare_systems"]
    transport_tax = read_json("transport/data/tax_refund.json")
    transport_food = read_json("transport/data/transit_food.json")["transit_food_spots"]
    transport_logistics = read_json("transport/data/logistics_rules.json")
    hotel_data = read_json("hotels/data/hotels.json")
    itinerary_blueprint_data = json.loads(ITINERARY_BLUEPRINTS.read_text(encoding="utf-8"))

    routes = []
    for route in transport_routes_data["airport_to_city_routes"]:
        routes.append({**route, "segment": "Airport transfer", "source": "transport"})
    for route in transport_routes_data["intercity_routes"]:
        routes.append({**route, "segment": "Intercity", "source": "transport"})

    places = [
        {
            **place,
            "source": "transport",
            "sourcePath": "research/sources/transport/data/destinations.json",
        }
        for place in transport_destinations
    ]
    hotels = [
        {
            **hotel,
            "source": "hotels",
            "sourcePath": "research/sources/hotels/data/hotels.json",
        }
        for hotel in hotel_data["hotels"]
    ]
    apps = [
        {
            **app,
            "source": "transport",
            "sourcePath": "research/sources/transport/data/apps.json",
        }
        for app in transport_apps
    ]
    cards = [
        {
            **card,
            "source": "transport",
            "sourcePath": "research/sources/transport/data/cards.json",
        }
        for card in transport_cards
    ]

    activities = (
        parse_numbered_activities("fun/seoul.md", "Seoul")
        + parse_numbered_activities("fun/busan.md", "Busan")
        + parse_numbered_activities("fun/daejeon-cheonan.md", "Daejeon / Cheonan")
    )
    events = parse_events()
    food = parse_food()
    savings_guides = parse_savings_sections()
    pre_departure = parse_checklist("emergency/checklists/pre-departure.md")
    during_trip = parse_checklist("emergency/checklists/during-trip.md")

    emergency = {
        "contacts": [
            {"number": "112", "label": "Police", "note": "Dial from any phone in Korea."},
            {"number": "119", "label": "Ambulance · fire · rescue", "note": "Dial from any phone in Korea."},
            {"number": "1330", "label": "Korea Travel Helpline", "note": "English availability is listed as 24/7 in the source; confirm close to travel."},
            {"number": "1366", "label": "Domestic-violence hotline", "note": "Toll-free domestic hotline."},
            {"number": "+82-2-3210-0404", "label": "Korea Emergency Call Center", "note": "For international callers; request an English-speaking operator."},
            {"number": "+82-2-397-4114", "label": "U.S. Embassy Seoul (24/7 emergency)", "note": "For U.S. citizens; use your own embassy/consulate if applicable."},
        ],
        "preDeparture": pre_departure,
        "duringTrip": during_trip,
        "sourcePath": "research/sources/emergency/docs/03-emergency-contacts.md",
        "printCard": "research/sources/emergency/print/emergency-card.html",
        "scenariosPath": "research/sources/emergency/docs/11-emergency-scenarios.md",
    }

    count_summary = {
        "sources": len(SOURCE_META),
        "hotels": len(hotels),
        "food": len(food),
        "events": len(events),
        "activities": len(activities),
        "places": len(places),
        "routes": len(routes),
        "apps": len(apps),
        "savingsGuides": len(savings_guides),
        "routeBlueprints": len(itinerary_blueprint_data.get("itineraries", [])),
    }

    return {
        "meta": {
            "name": "Korea Compass",
            "generatedOn": CATALOG_DATE,
            "disclaimer": "This is a planning workspace assembled from the linked repositories. Prices, availability, eligibility, opening hours, visa/entry rules, transport operations, and event dates can change. Open the official link and verify critical details before booking or travel.",
            "counts": count_summary,
        },
        "sources": SOURCE_META,
        "cities": CITIES,
        "places": places,
        "events": events,
        "activities": activities,
        "food": food,
        "hotels": hotels,
        "routes": routes,
        "apps": apps,
        "cards": cards,
        "stations": transport_stations,
        "stationExits": transport_exit_details,
        "contingencies": transport_contingencies,
        "bikeShare": transport_bikes,
        "taxRefund": transport_tax,
        "transitFood": transport_food,
        "logistics": transport_logistics,
        "savingsGuides": savings_guides,
        "emergency": emergency,
        "hotelTripTemplate": hotel_data.get("trip", {}),
        "hotelSplitTemplate": hotel_data.get("split", {}),
        "itineraryBlueprintMeta": itinerary_blueprint_data.get("meta", {}),
        "itineraryBlueprints": itinerary_blueprint_data.get("itineraries", []),
    }


def main() -> None:
    catalog = build_catalog()

    issues = audit_urls(catalog)
    if issues:
        print("URL audit found problems (fix the source snapshots first):")
        for issue in issues:
            print(f"  - {issue}")
        raise SystemExit(1)

    INDEX_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    COLLECTION_OUTPUT.mkdir(parents=True, exist_ok=True)

    index = {key: value for key, value in catalog.items() if key not in COLLECTION_FILES}
    INDEX_OUTPUT.write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    for key, filename in COLLECTION_FILES.items():
        (COLLECTION_OUTPUT / filename).write_text(
            json.dumps(catalog[key], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    counts = catalog["meta"]["counts"]
    print(
        "Built data/index.json + data/collections/ — "
        + ", ".join(f"{key}: {value}" for key, value in counts.items())
    )


if __name__ == "__main__":
    main()
