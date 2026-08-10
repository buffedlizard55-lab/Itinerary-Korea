# B13 · Barrier-Free & Elevator Easy — Seoul → Cheonan → Busan → Seoul

> **Route:** Route B (Seoul → Cheonan → Busan → Seoul)
> **Dates:** Sun, Nov 1, 2026 → Sun, Nov 22, 2026 · **21 nights / 22 days**
> **Flights:** Arrive ICN **21:00** Sun Nov 1 · Depart ICN **13:00** Sun Nov 22
> **Night split:** Seoul 7 · Cheonan 5 · Busan 6 · Seoul 3
> **Theme:** Step-free priority — elevator exits, luggage delivery, seated rides, and the 3-night Seoul buffer at the end for unhurried baggage handling. Uses the subway-exit and station-navigation research.
> **Review notes:** *(leave decisions/comments here)*

## Who this suits

Travelers who value elevator-not-escalator routing, short transfers, and seated alternatives over stairs. This plan leans on `research/sources/transport/docs/15-subway-exits-and-elevator-navigation-guide.md`, `11-major-station-navigation-and-luggage-services.md`, and `data/stations_and_exits.json` with `station_exits_detail.json`.

## Arrival-night rule (non-negotiable)

We land at **21:00**. Expect hotel arrival **23:00–01:00+**. Elevator routing matters from the first move, so we keep the hotel near the AREX terminus.

- **Night 1 hotel (Seoul): Ibis Styles Ambassador Seoul Myeongdong** — dataset $90–130, central Myeongdong, check-in 15:00/check-out 12:00. **Confirm 24-hour front desk at booking; email flight number.**
- **Alternates (also verify 24-hour desk):** L7 Myeongdong ($150–210) · Nine Tree Myeongdong 1 ($100–145) · Hotel Skypark Myeongdong 3 ($95–135).
- **Scope of the rule:** **only Night 1 needs the 24-hour desk.** From Day 2 onward we move to a regular Seoul hotel with standard 15:00 check-in, and the final Seoul leg arrives mid-afternoon — so no other night needs any special late-arrival policy.
- **Late transit, in order of preference:** (1) AREX all-stop ICN → Seoul Station (~60 min; last ~23:30–23:50 — check night-of); (2) N6001 night bus with low floor; (3) taxi/Kakao T with trunk for luggage ~60–75 min, ₩70k–100k. In the airport, use **Transportation Center B1 AREX Express location** per `stations_and_exits.json` (both T1/T2) and follow orange “Airport Railroad Express” signs per that file. Save the hotel’s Korean address offline.
- **Late supper:** CU/GS25 or hotel lobby — no stairs tonight.

## Legs at a glance

| Leg | Dates | Nights | Base | Hotel plan |
| --- | --- | --- | --- | --- |
| Seoul — arrival night | Nov 1 | 1 | Jongno / Myeongdong | **Ibis Styles Ambassador Seoul Myeongdong** ($90–130) — 24-h desk *verify*; only night needing late check-in. |
| Seoul — all other nights | Nov 2–8 & Nov 19–22 | 6 + 3 | Myeongdong / City Hall | **Nine Tree by Parnas Seoul Myeongdong 1** ($100–145) — 2-min Myeongdong Station Exit 8 per hotels.json, airport-limo steps, standard 15:00 check-in; daytime arrivals only. |
| Cheonan | Nov 8–13 | 5 | Cheonan Station area | **ON City Hotel** ($55–80) — Cheonan Station area, elevator-friendly value |
| Busan | Nov 13–19 | 6 | Haeundae / Sajik easy | **Toyoko Inn Busan Haeundae 2** ($55–80, free breakfast) — value + seated coast access |

**How this itinerary uses the transport research:**
- **Seoul Station AREX Express location:** **B2–B7 underground concourse, orange signs** per `stations_and_exits.json` id `seoul_station`.
- **WOWPASS kiosks at Seoul Station near AREX gates B2 and Subway Line 1 concourse; T-money recharge at any subway ticket machine (cash only)** per same file.
- **Luggage:** Seoul Station `T-Luggage (Seoul Metro Official) 9,000 KRW/4 hrs weekdays, 13,000 weekends, +1,000/hr after` at passage between Exit 1–2; **Zimcarry (KORAIL) 10,000 KRW/4 hrs or ~15,000–20,000 same-day hotel/airport delivery** at main KTX concourse 2F; **T-Locker / LuggageQ 1,000 KRW/hr per locker** near Exit 15 per same file.
- **Busan Station:** Zimcarry desk 2F KTX waiting hall near Exit 1, ~15,000 per large suitcase for hotel delivery per same file.
- **Subway exits & elevators:** Use `data/station_exits_detail.json` to pick elevator exits — e.g., **Gyeongbokgung Station Exit 5, Anguk Exit 3, Myeongdong Exit 6** per `destinations.json` nearest_station fields — all verified with official sites per dataset. Avoid stairs by confirming on `seoulmetro.co.kr` elevator map night-of.
- **ICN handling:** Hanjin Express / Airport Baggage Delivery at T1 (3F near B/N) and T2 (1F/3F) ~15,000–25,000 per suitcase for same-day hotel delivery per same file — ride AREX empty-handed on Day 1 and Day 22.

## Day-by-day

### Day 1 · Sun, Nov 1 — ICN → Seoul (arrival night)

- **Late:** Land 21:00 → follow **B1 Transportation Center** to AREX per stations_and_exits.json → Seoul Station **B2–B7 AREX gates** → 24-hour check-in (target ~23:30). If bags are heavy, use **Hanjin Express at ICN T1 3F / T2 1F/3F** for same-day hotel delivery before boarding AREX (per file).
- **Stay:** Seoul — Ibis Styles Myeongdong (night 1/7 — arrival night; only 24-hour-desk night).
- **Tomorrow:** check out ~10:00 and hop to **Nine Tree Myeongdong** — store bags via **T-Luggage at Seoul Station Exit1–2 passage** if hopping via Seoul Station (9,000/4 hrs weekdays) — or taxi 5 min direct and keep bags at left-luggage.
- **Plan B:** Missed last AREX → N6001 low-floor night bus; heavy delay → taxi with trunk.

### Day 2 · Mon, Nov 2 — Seoul · Seated palace
- **First move:** check out arrival hotel (~10:00); Nine Tree Myeongdong continuation — bags stored.

- **Late morning:** **Gyeongbokgung Palace & Bukchon Hanok Village** — use **Gyeongbokgung Station Line 3 Exit 5** or **Anguk Station Line 3 Exit 3** per destinations.json (both have elevator per `station_exits_detail.json` — verify on Seoul Metro elevator page night-before). Royal Guard Changing Ceremony 10:00/14:00 (closed Tuesdays) per `royal.cha.go.kr` via destinations.json.
- **Afternoon:** Gyeongbokgung with frequent bench stops; National Palace Museum (indoor, benches) if stairs fatigue.
- **Evening:** Early night.
- **Stay:** Seoul — Nine Tree Myeongdong (night 2/7).

### Day 3 · Tue, Nov 3 — Seoul · Namsan without stairs

- **Morning:** **Myeongdong Shopping Street & N Seoul Tower** — use **Myeongdong Station Line 4 Exit 6** per destinations.json, then **Namsan Suncheon Green Bus #01** up to tower (seated shuttle per walking-maps Seoul Route C) rather than cable-car queue; or **Namsan Orumi** inclined glass elevator + cable car (₩15,000 round-trip per `cablecar.co.kr` in walking-maps C) for step-free ascent. Plaza sitting, rooftop views.
- **Afternoon:** Myeongdong market rest; Cheonggyecheon flat boardwalk.
- **Evening:** DDP Dream in Light 18:00–22:00 free seated hourly ~25 min per `ddp.or.kr` (events.csv).
- **Stay:** Seoul — night 3/7.

### Day 4 · Wed, Nov 4 — Seoul · Museum seated

- **All day:** **National Museum of Korea** (free, museum.go.kr, Yongsan) — elevator between floors, generous seating — half day is enough. Pair with Ichon Hangang riverside flat stroll.
- **Evening:** Culture Flowing Through Seoul Plaza free concert **Wed Nov 4 18:30** at Seoul Plaza per `festival.seoul.go.kr` — free, seated plaza.
- **Stay:** Seoul — night 4/7.

### Day 5 · Thu, Nov 5 — Seoul · Seongsu flat

- **Morning:** **Seongsu-dong & DDP** — DDP is **Seongsu Station Line 2 / Dongdaemun History & Culture Park Station Lines 2/4/5** per destinations.json (`ddp.or.kr?Menunum=131`). DDP has ramped exterior with elevator inside.
- **Afternoon:** Seongsu cafe street flat + Seoul Forest deer corral (gated, seated benches).
- **Stay:** Seoul — night 5/7.

### Day 6 · Fri, Nov 6 — Seoul · Han River seated

- **Morning:** **Hongdae Youth Culture & Gyeongui Line Forest Park** — **Hongik University Station Line 2 / AREX / Gyeongui-Jungang Line** per destinations.json — park is flat, seated.
- **Afternoon:** **Eland Han River Cruise** (~₩20k–30k via `elandcruise.com` per walking-maps Seoul Route B) — fully seated, no climbing. Alternatively Han River Bus (`hgbus.co.kr`) commuter boat.
- **Stay:** Seoul — night 6/7.

### Day 7 · Sat, Nov 7 — Seoul · Buffer + market

- **Morning:** Tongin Market dosirak — brass tray microw?Actually 20 brass coins ₩10,000 Tue–Sun 11:00–16:00 per `ivisitkorea.com` verified — seated market-hall tables.
- **Afternoon:** Pack for Cheonan — use **Zimcarry** or **T-Luggage** at Seoul Station to send heavy bag to Cheonan/Busan hotel if you want to travel light tomorrow.
- **Stay:** Seoul — night 7/7.

### Day 8 · Sun, Nov 8 — Seoul → Cheonan (transfer) — easiest rail

- **Late morning:** **Mugunghwa Seoul Station → Cheonan (~55–60 min, no reservation) or Subway Line 1 (~1 hr 20, T-money, cash for T-money machines)** per guide docs 04-intercity. Both are flat, roll-luggage friendly. Or **KTX to Cheonan-Asan (~35–40 min)** with elevator at both KTX concourses per file.
- **Afternoon:** Hakwha Hodugwaja original walnut pastry (07:00–21:00 daily per #72,  Cheonan Station) — flat terminal-crossroads shop.
- **Evening:** Independence Hall free 09:30–17:00 Tue–Sun per #67 is **closed Monday** — today is Sunday, so if you want to front-load it, take Bus 380/400 early (~20 min per walking-maps Cheonan Route) — otherwise push to Mon.
- **Stay:** Cheonan — ON City Hotel (night 1/5).

### Day 9 · Mon, Nov 9 — Cheonan · Hall at pace

- **Full morning:** **Independence Hall of Korea** free per `i815.or.kr` (#67) — Tue–Sun 09:30–17:00, **closed Mondays** so Tuesday–Sunday is correct window — you landed Sunday, so Monday is your clean hall day (no school groups early). Use campus shuttle if steps fatigue; 3.2 km maple avenue walk *or* campus lawn sit per #67.
- **Stay:** Cheonan — night 2/5.

### Day 10 · Tue, Nov 10 — Cheonan · Buddha hill elevator? Actually stairs

- **Morning:** Gakwonsa 15m bronze Buddha 60-ton (24/7 free per #70) — **taxi up Mt. Taejosan** rather than trail — saves stairs; courtyard is flat.
- **Afternoon:** Arario Small City Sculpture Plaza 24/7 free outdoor Keith Haring/Damien Hirst per #71 — flat plaza, no stairs.
- **Evening:** Taejosan Country Park flat road walk (#75) or rest.
- **Stay:** Cheonan — night 3/5.

### Day 11 · Wed, Nov 11 — Cheonan · Onyang soak flat

- **Morning:** Onyang Hot Spring district (Line 1) free foot baths per #62-style — flat, seated; Onyang Folk Museum seated.
- **Evening:** Pack for Busan.
- **Stay:** Cheonan — night 4/5.

### Day 12 · Thu, Nov 12 — Cheonan · Buffer

- **All day:** Buffer — revisit pastry or rest; verify Busan Station elevator exits via `station_exits_detail.json` before KTX.
- **Stay:** Cheonan — night 5/5.

### Day 13 · Fri, Nov 13 — Cheonan → Busan (transfer) — luggage-forward day

- **Morning:** KTX Cheonan-Asan → Busan (~2 hr). Before boarding, drop heavy case at **Zimcarry Cheonan-Asan? Actually Cheonan-Asan has no Zimcarry; use Busan Station Zimcarry desk 2F waiting hall near Exit 1 upon arrival (~15,000 per suitcase per stations_and_exits.json)** to send bag to Haeundae hotel while you walk Dongbaek free.
- **Afternoon:** Haeundae Beach + Dongbaek Island coastal wooden boardwalk (flat, per walking-maps Busan Route A) — seated harborside.
- **Stay:** Busan — Toyoko Inn Haeundae 2 (night 1/6).

### Day 14 · Sat, Nov 14 — Busan · Blueline seated

- **Morning:** Blueline Sky Capsule Mipo → Cheongsapo (book capsule) — seated slow pastel car, no pedaling; Daritdol skywalk is flat, wind check.
- **Afternoon:** Cheongsapo cafe balcony seated.
- **Evening:** **Gwangalli M Drone Light Show** every Saturday free per `gwangallimdrone.co.kr` (events.csv) — 19:00 & 21:00 winter — seated beach viewing.
- **Stay:** Busan — night 2/6.

### Day 15 · Sun, Nov 15 — Busan · Spa Land fully seated

- **All day:** **Spa Land Centum City** — natural hot-spring baths + 13 themed saunas + footbaths per walking-maps Busan Route A (~₩20k–25k via `department.shinsegae.com`) — fully seated 3-hour circuit, plus Shinsegae Food Hall indoor.
- **Stay:** Busan — night 3/6.

### Day 16 · Mon, Nov 16 — Busan · Gamcheon view without steps

- **Morning:** Gamcheon Village — take **Bus Saha 1-1 from Toseong Station Line 1 Exit 6** per walking-maps Busan Route B — arrives at village top (Minimal hill walking top-down).
- **Afternoon:** Songdo Marine Cable Car (₩17k/₩22k Crystal per `busanaircruise.co.kr`) — fully seated ocean crossing + Sky Park flat.
- **Evening:** Jagalchi elevator? Actually market is flat ground floor.
- **Stay:** Busan — night 4/6.

### Day 17 · Tue, Nov 17 — Busan · Taejongdae train

- **Morning:** Taejongdae → Danubi train to lighthouse cliffs (seated train, no hike) per walking-maps.
- **Afternoon:** Huinnyeoul Culture Village cliff hamlet — hanok cafes with sea windows, seated.
- **Stay:** Busan — night 5/6.

### Day 18 · Wed, Nov 18 — Busan · Flex seated

- **All day:** Oryukdo Skywalk flat glass platform *or* UN Memorial Cemetery spare pine rows (free, quiet, flat) — both seated/blind-friendly.
- **Stay:** Busan — night 6/6.
- **Note:** Fireworks/G-STAR mid-Nov windows — swap evenings if official 2026 dates land here per research.

### Day 19 · Thu, Nov 19 — Busan → Seoul (transfer) — 3-night buffer starts

- **Morning:** KTX Busan → Seoul (~2 hr 30–2 hr 50). Check in Nine Tree Myeongdong — daytime arrival, standard 15:00 — **three nights to sort baggage**. Use **Busan Station Zimcarry desk** again to forward bag to Seoul hotel by 16:00 if you want empty-handed train.
- **Afternoon:** Namdaemun Market flat aisles + receipt stack.
- **Evening:** Cheonggyecheon flat lantern walk; Kimjang Grand Festival at aT Center if in window (Nov20–22) — free per `kimjang-festa.com`.
- **Stay:** Seoul — Nine Tree Myeongdong (night 8 of 10 total).

### Day 20 · Fri, Nov 20 — Seoul · Exchange day

- **All day:** Exchange/return window — do today, not Day 22. Keep tax-refund sealed-bag seals intact per `14-tax-refund-and-customs-calculator.md`.
- **Stay:** Seoul — night 9 of 10.

### Day 21 · Sat, Nov 21 — Seoul · Wrap

- **Morning:** Haneul Park silver-grass boardwalk flat (World Cup Park) — boardwalk, no climb — early light.
- **Afternoon:** Final pack/weight; keep one elevator-checked exit plan for AREX.
- **Evening:** Farewell near Seoul Station; two alarms.
- **Stay:** Seoul — night 10 of 10.

### Day 22 · Sun, Nov 22 — Seoul → ICN (departure) — elevator-checked

- **Morning:** Check out ~08:15; taxi to Seoul Station → underground **B2 AREX gates** via elevator per file → **AREX Express → ICN** (~43 min, depart ~09:00, arrive ~09:45) — 3h+ before 13:00 flight. Luggage-forward via **Seoul Station Zimcarry** if heavy.
- **Afternoon:** Fly home 13:00.

## Booking checklist (in order)

1. Flights (ICN round trip).
2. **Night 1 hotel — verify 24-hour front desk + late check-in; email flight number.**
3. Remaining hotels in leg order.
4. KTX: Cheonan-Asan→Busan, Busan→Seoul (Seoul→Cheonan needs no advance — Mugunghwa/Line 1 per guide).
5. Blueline capsule; Huwon Garden slot if you keep it (6 days ahead); Spa Land ticket.
6. AREX Day 22 via Seoul Station B2–B7 — recheck week before via `stations_and_exits.json`.

## If plans slip

- **Delayed flight:** 24-hour desk absorbs it; forward bag still works — use Hanjin at ICN or taxi if AREX is gone.
- **Rain swap bank:** All indoor flat: National Museum free, MMCA elevator, War Memorial, Shinsegae Centum indoor, F1963 indoor, Daejeon museums — all elevator-checked via 15-guide.
- **Energy swap bank:** Buffers Day 7 / Day 12 / Day 19 — raid these first; the 3-night Seoul buffer is intentional for luggage.

> Sample plan for review — verify every date, price, hour, and policy with the official provider before booking. Elevator/luggage details per research/sources/transport/data/stations_and_exits.json & transport/docs/11- & 15- guides (2026-08-03 snapshot).
