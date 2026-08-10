#!/usr/bin/env python3
"""Render detailed, readable route-blueprint Markdown from data/itineraries.json.

The JSON file is the source of truth for the app. This script creates a
printable/reviewable Markdown companion for each route without inventing a
live timetable, ticket price, or opening hour.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "itineraries.json"
OUT = ROOT / "itineraries"


def pretty_date(iso: str) -> str:
    year, month, day = (int(part) for part in iso.split("-"))
    return date(year, month, day).strftime("%a, %b %-d, %Y")


def bullet_lines(items: list[str]) -> list[str]:
    lines: list[str] = []
    for item in items:
        lines.append(f"- {item}")
    return lines


def render_shared_trip_context(trip: dict) -> list[str]:
    lines = [
        "## Corrected trip frame",
        "",
        f"- **Korea arrival:** {pretty_date(trip['arrival']['date'])}, {trip['arrival']['time']} at {trip['arrival']['airport']}",
        f"- **Korea departure:** {pretty_date(trip['departure']['date'])}, {trip['departure']['time']} from {trip['departure']['airport']}",
        f"- **Length:** {trip['nights']} nights / 22 calendar days",
        "",
        "### Flight-date reconciliation",
        "",
        trip["flightReconciliation"],
        "",
        "### Flight booking checklist",
        "",
        *bullet_lines(trip.get("flightBookingChecklist", [])),
        "",
        "### November conditions and packing posture",
        "",
        *bullet_lines(trip["weatherAndPacking"]),
        "",
        "### Arrival-night checklist",
        "",
        *bullet_lines(trip["arrivalChecklist"]),
        "",
        "### Departure-morning checklist",
        "",
        *bullet_lines(trip["departureChecklist"]),
        "",
        "### Value framework",
        "",
    ]
    for entry in trip["budgetFrame"]:
        lines += [f"- **{entry['label']}:** {entry['detail']}"]
    lines += ["", "### Daily spend guardrails", "", *bullet_lines(trip.get("dailySpendGuardrails", []))]
    lines += [
        "",
        "### How to read the timed schedule",
        "",
        trip["scheduleNote"],
        "",
    ]
    return lines


def render_schedule(day: dict) -> list[str]:
    lines = ["#### Target schedule windows", "", "| Window | Plan | Operational note |", "| --- | --- | --- |"]
    for item in day.get("schedule", []):
        plan = f"**{item['title']}** — {item['detail']}"
        logistics = item.get("logistics", "")
        lines.append(f"| {item['time']} | {plan} | {logistics} |")
    return lines


def render_route(route: dict, trip: dict) -> str:
    lines = [
        f"# {route['title']}",
        "",
        f"> **Route:** {route['routeLabel']}",
        f"> **Arrival:** {pretty_date(trip['arrival']['date'])}, {trip['arrival']['time']} at {trip['arrival']['airport']}",
        f"> **Departure:** {pretty_date(trip['departure']['date'])}, {trip['departure']['time']} at {trip['departure']['airport']}",
        f"> **Length:** {trip['nights']} nights / {len(route['days'])} calendar days",
        "",
        "## Route decision",
        "",
        route["decisionSummary"],
        "",
        f"**Recommendation:** {route['recommendation']}",
        "",
        f"**Best for:** {route['bestFor']}",
        "",
        f"**Tradeoff to accept:** {route['tradeoff']}",
        "",
        "## Hotel-base strategy",
        "",
        "| City | Dates / nights | Recommended base | Why it works |",
        "| --- | --- | --- | --- |",
    ]
    for base in route["bases"]:
        lines.append(
            f"| {base['city']} | {base['dates']} / {base['nights']} nights | {base['recommendedArea']} | {base['why']} |"
        )

    lines += ["", "### Source-research hotel ideas", ""]
    for base in route["bases"]:
        lines.append(f"- **{base['city']}:** " + " · ".join(base["hotelIdeas"]))

    lines += ["", "## Accommodation budget worksheet", "", trip.get("budgetMethodNote", "Use live hotel quotes before booking."), ""]
    for scenario in route.get("budgetScenarios", []):
        lines += [
            f"### {scenario['label']}",
            "",
            f"**Planning subtotal:** {scenario['subtotal']}",
            "",
            f"**Assumptions:** {scenario['assumptions']}",
            "",
            f"**Why it fits this route:** {scenario['note']}",
            "",
        ]

    lines += ["## Transfer strategy", ""]
    for transfer in route["transfers"]:
        lines += [
            f"### {pretty_date(transfer['date'])} — {transfer['leg']}",
            "",
            f"**Recommended flow:** {transfer['recommended']}",
            "",
            f"**Why this is efficient:** {transfer['why']}",
            "",
        ]

    lines += ["## Book in this order", ""]
    for priority in route["bookingPriorities"]:
        lines.append(f"1. {priority}")

    lines += [""] + render_shared_trip_context(trip)
    lines += ["## Day-by-day itinerary", ""]
    for day in route["days"]:
        lines += [
            f"### {pretty_date(day['date'])} — {day['city']} · {day['phase']}",
            "",
            f"**Stay:** {day['stay']}",
            "",
            f"**Day anchor:** {day['anchor']}",
            "",
            f"#### {day['title']}",
            "",
        ]
        lines += render_schedule(day)
        lines += [
            "",
            "#### Why this sequence works",
            "",
        ]
        for block in day["blocks"]:
            lines.append(f"- **{block['label']}:** {block['text']}")
        lines += [
            "",
            f"**Food rhythm:** {day['food']}",
            "",
            f"**Reservation / verification note:** {day.get('reservationNote', 'Verify live details.')}",
            "",
            f"**Cost posture:** {day.get('costNote', 'Use current official pricing.')}",
            "",
            f"**Watch for:** {day['watchouts']}",
            "",
            f"**Plan B:** {day['planB']}",
            "",
        ]

    lines += [
        "## Final live checks before acting",
        "",
        "- Confirm the live KTX timetable, sale/release window, departure station, seat availability, fare, and last-mile connection in Korail / the official provider.",
        "- Confirm hotel late check-in, current price, room type, address in Korean, and actual airport-transfer fit.",
        "- Confirm opening days/hours, paid tickets, event status, weather, air quality, entry rules, and all emergency information close to travel.",
        "- This is a detailed planning blueprint, not a booking confirmation, live timetable, or price quote.",
        "",
    ]
    return "\n".join(lines)


def render_index(routes: list[dict], trip: dict) -> str:
    lines = [
        "# November 2026 route blueprints",
        "",
        f"**Actual Korea trip window:** arrive ICN at **{trip['arrival']['time']} on {pretty_date(trip['arrival']['date'])}**; depart ICN at **{trip['departure']['time']} on {pretty_date(trip['departure']['date'])}**.",
        "",
        "## What was corrected from the rough draft",
        "",
        "- The working plan is now a 21-night / 22-calendar-day Korea itinerary, not the conflicting 20-day version in the original draft.",
        "- The plan respects the stated local Korea arrival at 21:00 on Nov. 1 and the 13:00 ICN departure on Nov. 22. The SFO outbound calendar date must be reconciled from the actual airline ticket because of the time-zone difference.",
        "- The previous broad Seoul/Busan-only flow is now two alternatives with a deliberate five-night Daejeon or Cheonan middle city and two final Seoul nights for low-risk departure logistics.",
        "- Every day now has target time windows, operational notes, a food rhythm, a live-verification note, and a weather/energy backup instead of stacking incompatible attractions into one day.",
        "- Old prices, specific flights, opening hours, and event claims are treated as research prompts—not booking facts. Verify them at the official provider before purchase.",
        "",
        "## Compare the two middle-city choices",
        "",
        "| Route | Choose it when | Main advantage | Tradeoff |",
        "| --- | --- | --- | --- |",
    ]
    for route in routes:
        lines.append(
            f"| [{route['shortTitle']}]({route['id']}.md) | {route['bestFor']} | {route['badge']} | {route['tradeoff']} |"
        )
    lines += [
        "",
        "## Common routing logic",
        "",
        *bullet_lines(trip["planningPrinciples"]),
        "",
        "## Important timing notes",
        "",
    ]
    for item in trip["importantDates"]:
        lines.append(f"- **{pretty_date(item['date'])} — {item['label']}:** {item['note']}")
    lines += [
        "",
        "The app’s **Route options** screen renders these same plans and can load either route into the editable **My plan** timeline. Source material and official-link reminders are available in the main Korea Compass source desk.",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    trip = payload["meta"]["trip"]
    routes = payload["itineraries"]
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "README.md").write_text(render_index(routes, trip), encoding="utf-8")
    for route in routes:
        (OUT / f"{route['id']}.md").write_text(render_route(route, trip), encoding="utf-8")
    print(f"Built {len(routes)} detailed itinerary documents in {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
