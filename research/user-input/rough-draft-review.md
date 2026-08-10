# November 2026 rough-draft review

The user supplied a detailed rough South Korea itinerary as the desired **format and level of specificity** for the master planner. It included useful categories—trip overview, flight/arrival planning, weather/packing, day-by-day timing, accommodation considerations, transportation, budget posture, safety, and booking order—but its dates, flight assumptions, repetition, and several price/hour claims were explicitly not final.

## Design requirements carried into the rebuilt routes

- A clear trip overview and corrected local Korea arrival/departure frame.
- Explicit, readable daily time windows instead of broad one-line attraction lists.
- A realistic flow for meals, local transfers, rest, luggage, and check-in—not only attractions.
- Neighborhood-based routing so a day does not cross Seoul or Busan repeatedly.
- A reservation/verification note, cost posture, and weather/energy Plan B for every day.
- Hotel-base, KTX, airport, packing, safety, and booking-order guidance alongside sightseeing.
- Enough detail to be actionable while clearly separating planning windows from live schedules, prices, flight availability, and opening hours.

## Corrections applied

- The working Korea itinerary is **Nov. 1–22, 2026**, with a **21:00 local ICN arrival** and **13:00 local ICN departure**; it is 21 nights / 22 calendar days.
- A local Nov. 1 ICN arrival is not automatically compatible with a Nov. 1 departure from SFO because of the time-zone difference. The airline ticket is the source of truth for the outbound calendar date.
- The plan now has two five-night middle-city alternatives: **Daejeon** for broader city/experience depth and **Cheonan** for rail efficiency/value.
- Final two Seoul nights are retained to avoid a high-risk same-day Busan-to-ICN departure.
- Specific historical prices, attraction hours, event schedules, flight frequencies, and carrier information are not carried forward as booking facts; each itinerary marks those as live verification tasks.

The resulting plans live in [`../../itineraries/`](../../itineraries/) and the structured source is [`../../data/itineraries.json`](../../data/itineraries.json).
