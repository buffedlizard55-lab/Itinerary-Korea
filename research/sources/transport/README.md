# Koreatransport: 23-Day South Korea Public Transport & Budget Planner

> **Trip Dates:** October 31, 2026 – November 22, 2026 (23 Days / 22 Nights)
> **Party Size:** 2 Travelers
> **Focus:** The "Korea Transit Sweet Spot" — Lowest cost transportation without sacrificing convenience, time, or hassle
> **Background:** Tailored for travelers experienced with **San Francisco (Muni, BART, Caltrain, Uber)** and **Japan (Suica, JR Pass, Shinkansen, Tokyo Metro)**.

---

## 🌟 Welcome to Your South Korea Transit Repository!

This repository is your complete, all-in-one command center for getting around South Korea from **October 31 to November 22**. It features:

1. **Interactive Web Application (`index.html`)**: A responsive, offline-ready **Progressive Web App (PWA)** with:
   - **Intercity Route Calculator** (comparing 2-person costs in KRW and USD)
   - **🛠️ Custom Itinerary & Route Builder** (rapidly add verified destinations, calculate costs, and export to Markdown/JSON)
   - **🧭 Logistics & Sweet Spot Analyzer** (compares Cheapest vs. #1 Sweet Spot vs. Luxury options + operating hours directory + copyable AI itinerary submission template)
   - **🧰 Smart Travel Tools**:
     - **Immediate VAT Tax Refund Calculator (`즉시 환급`)**
     - **T-money & WOWPASS Balance / Top-Up Estimator**
     - **Subway vs. Taxi Break-Even Analyzer for 2 Travelers**
     - **🗣️ Visual Large-Screen Hangul Taxi Driver Flashcards**
     - **🌧️ Weather & Peak Crowd Contingency Guide (Plan B)**
   - **⏰ KTX 30-Day Booking Alarms & Luggage Guide** (with 1-click `.ics` calendar alert download for Apple & Google Calendar)
   - **Transit Card Recommender Quiz** & **3rd City Decision Helper** (Gyeongju vs. Jeju vs. Jeonju)
   - **Filterable iPhone Apps Directory** (with verified iOS App Store links)
   - **Day-by-Day Oct 31 – Nov 22 Transport Planner & Budget Table**
2. **Comprehensive Markdown Guides (`/docs`)**: 19 deep-dive documentation files covering everything from station elevator maps to KTX Dosirak (`도시락`) bento boxes, bikeshares (`Ttareungyi`), and taxi break-even formulas.
3. **Structured Datasets (`/data`)**: 13 transparent JSON datasets powering the calculators, flashcards, contingency plans, and maps—ready for custom scripting or easy editing.

---

## 🚀 Quick Start: How to Open the Interactive Dashboard

You can use this repository in three ways:

1. **Directly in Your Web Browser (No Build Step Required!):**
   - Simply open **`index.html`** in any web browser (Chrome, Safari, Firefox, Edge).
   - Click **`🧭 Logistics & Sweet Spot`** to compare modes and copy our AI Itinerary Submission Template when ready to optimize your exact schedule.
2. **Install on Your iPhone as an Offline App (PWA):**
   - Open `index.html` in Safari, tap the Share button, and select **"Add to Home Screen"**. Thanks to our Service Worker (`sw.js`) and Manifest (`manifest.json`), your planner works 100% offline!
3. **Read the Comprehensive Markdown Documentation:**
   - Navigate through the `/docs` folder for detailed guides, transit maps, and etiquette tips.

---

## 🗺️ Repository Structure & Table of Contents

```
Koreatransport/
├── README.md                                      # Master Hub & Quick Reference Directory (This File)
├── index.html                                     # Interactive Transit & Budget Planner Web Dashboard
├── manifest.json & sw.js                          # Progressive Web App (PWA) Offline Service Worker
├── css/
│   └── style.css                                  # Responsive styling for index.html
├── js/
│   ├── app.js                                     # Interactive route calculator, quiz & filter logic
│   ├── builder.js                                 # Custom itinerary & route builder logic
│   ├── tools.js                                   # Tax refund, top-up, taxi break-even, flashcards & Plan B logic
│   ├── calendar.js                                # Booking alarms, .ics downloader & luggage guide logic
│   └── logistics.js                               # Sweet-Spot mode comparison, operating hours & submission template
├── data/
│   ├── logistics_rules.json                       # Sweet Spot mode comparison rules & operating hours directory
│   ├── calendar_alarms.json                       # Booking release windows (KST vs. SF PDT) & checklist dataset
│   ├── destinations.json                          # Verified directory of 15+ Korean destinations & autumn highlights
│   ├── routes.json                                # Intercity, day-trip & airport transport routes with 2-person costs
│   ├── stations_and_exits.json                    # Station navigation & luggage storage/delivery (Zimcarry/T-Luggage)
│   ├── contingencies.json                         # Rain & peak autumn foliage crowd contingency alternatives
│   ├── tax_refund.json                            # Immediate VAT refund rules & calculation parameters
│   ├── station_exits_detail.json                  # Subway exit elevator/escalator locator for major stations
│   ├── transit_food.json                          # KTX Dosirak train bento & highway rest area food guide
│   ├── bikeshare.json                             # Ttareungyi (Seoul) & Gyeongju bikeshare instructions
│   ├── cards.json                                 # Transit cards & tourist passes (T-money, WOWPASS, Climate Card)
│   ├── apps.json                                  # Verified iOS iPhone app directory & beginner tips
│   └── itinerary.json                             # 23-day Oct 31 – Nov 22 transport schedule dataset
└── docs/
    ├── 01-sf-and-japan-to-korea-transit-bridge.md # SF (Muni/BART) & Japan (Suica/JR) vs. Korea Transit comparison
    ├── 02-essential-iphone-apps-and-esim.md       # Naver Map, Kakao T, KorailTalk, Subway Korea, Papago & eSIM guide
    ├── 03-transit-cards-and-payment-methods.md    # T-money, WOWPASS, Seoul Climate Card, NAMANE & Apple Pay rules
    ├── 04-intercity-travel-guide.md               # KTX/SRT rail, Express/Intercity buses, Domestic flights
    ├── 05-city-guides/
    │   ├── 05a-seoul-transit-guide.md             # ICN Airport routes, subway lines, bus colors, Kakao T, night transit
    │   ├── 05b-busan-transit-guide.md             # Busan Metro, Haeundae Beach Train, coastal transit & hill buses
    │   └── 05c-third-city-guide.md                # Guide for Option A: Gyeongju vs. Option B: Jeju vs. Option C: Jeonju
    ├── 06-deals-promotions-and-tourist-passes.md  # KORAIL Saver Pass, Discover Seoul Pass, Visit Busan Pass, Tax Refund
    ├── 07-itinerary-and-transport-schedule-oct31-nov22.md # Editable day-by-day schedule & budget table
    ├── 08-emergency-accessibility-and-korean-phrases.md   # 1330 Helpline, Lost & Found, taxi phrases & scam prevention
    ├── 09-destination-directory-and-custom-route-builder.md # Verified directory of destinations, day trips & builder guide
    ├── 10-booking-timeline-and-calendar-alarms-oct31-nov22.md # KORAIL 30-day booking schedule with SF PDT/PST conversions
    ├── 11-major-station-navigation-and-luggage-services.md  # Seoul/Busan station guide, Zimcarry & T-Luggage forwarding
    ├── 12-fare-tables-and-transfer-rules-deep-dive.md       # Complete 2026 subway, taxi, and bus fare tables
    ├── 13-weather-and-crowd-contingency-plans.md            # Verified Plan B indoor & alternative crowd routes
    ├── 14-tax-refund-and-customs-calculator.md              # Immediate VAT Tax Refund (`즉시 환급`) & airport kiosk rules
    ├── 15-subway-exits-and-elevator-navigation-guide.md     # Exit elevator & escalator directory for Myeongdong, Hongdae, etc.
    ├── 16-ktx-station-dosirak-and-transit-food-guide.md     # KTX train station bento (`도시락`) & highway rest area gourmet items
    ├── 17-public-bikeshare-and-micro-transit-guide.md       # Seoul Ttareungyi (`따릉이`) & Gyeongju bikeshare instructions
    ├── 18-subway-vs-taxi-breakeven-guide.md                 # Break-even formula: when taxis for 2 are the same price as subway
    └── 19-ai-itinerary-submission-template-and-logistics-engine.md # AI evaluation template & Value-vs-Hassle Logistics Engine
```

---

## 🌁 Quick-Comparison: SF vs. Japan vs. South Korea

| Transit Concept | San Francisco | Japan (Tokyo / Kyoto) | South Korea (Seoul / Busan / Gyeongju) |
| :--- | :--- | :--- | :--- |
| **Primary IC Card** | Clipper Card *(Apple Wallet OK)* | Suica / Pasmo *(Apple Wallet OK)* | **T-money / WOWPASS** *(Physical IC card mandatory for iPhone!)* |
| **High-Speed Rail** | N/A | Shinkansen (~$100–$140 Tokyo–Kyoto) | **KTX / SRT** (~$42 Seoul–Busan, 2h 30m) |
| **Small-Group Pass** | N/A | JR Pass (individual only) | **KORAIL Saver Pass** (~10–20% off for groups of 2–5 travelers) |
| **Map Navigation** | Google Maps / Apple Maps | Google Maps / NAVITIME | **Naver Map / KakaoMap** *(Google walking/transit fails in Korea!)* |
| **Taxi App** | Uber / Lyft | Uber / GO | **Kakao T (Kakao Taxi) / Uber (UT)** |
| **Transfer Rule** | 2-hour Muni window | Generally separate fares per line | **Free transfer within 30 min** *(MUST tap ON & OFF subways and buses!)* |

---

## 💰 Top Verified Deals, Passes & Promotions for 2 Travelers

* **[KORAIL Saver Pass (for 2–5 People)](https://www.letskorail.com)**: When two travelers book a **2-Day Flexible Pass (121,000 KRW / ~$86 USD per person)** or **4-Day Flexible Pass (224,000 KRW / ~$160 USD per person)**, you save 10–20% compared to standard passes AND get up to 2 free reserved seat selections per day. Ideal for the **Seoul ➔ Busan ➔ Gyeongju ➔ Seoul** loop!
* **[Seoul Climate Card (2026 Tourist Edition)](https://english.seoul.go.kr)**: Buy a **5-Day Pass for 15,000 KRW (~$10.70 USD)** at any Seoul subway station to enjoy unlimited subway and bus rides in Seoul. You break even after just 10 rides!
* **[WOWPASS All-in-One Card](https://www.wowpass.io)**: Buy at Incheon Airport kiosks (5,000 KRW card fee). Convert your USD cash to KRW debit balance at competitive exchange rates without bank foreign transaction fees, plus enjoy cashback at Olive Young and Starbucks.
* **[Discover Seoul Pass](https://www.discoverseoulpass.com)** & **[Visit Busan Pass](https://www.visitbusanpass.com)**: 24h, 48h, and 72h passes that include free entry to top attractions (Lotte World, N Seoul Tower, Haeundae Beach Train, Spa Land) plus built-in transit functions.
* **Immediate Tax Refund (`즉시 환급`)**: Bring your passport when shopping over 15,000 KRW at Olive Young, Lotte Mart, Uniqlo, or department stores to have the 7–8% VAT tax deducted instantly at the cash register!

---

## 🎒 Verified Luggage Storage & Forwarding Services

Don't drag 27-inch+ suitcases across subway stairs or on day trips! Use these official services:
* **[Zimcarry (`짐캐리`)](https://www.zimcarry.net)**: KORAIL KTX official luggage partner. Drop your suitcases at **Seoul Station** or **KTX Busan Station (2F)** when you step off the train; they deliver directly to your registered hotel by 16:00! (~15,000–20,000 KRW per suitcase).
* **[T-Luggage](https://tluggage.co.kr)**: Seoul Metro official counter located at Seoul Station (Underground Exit 1–2). Hourly/daily luggage storage + same-day airport delivery.
* **[T-Locker / LuggageQ](http://www.seoulmetro.co.kr)**: Self-service 24/7 coin lockers available in 90% of subway stations (~1,000–2,000 KRW/hr per locker).

---

## 🔗 Official Verified Trusted Websites Directory

* **KORAIL (KTX/ITX Official Booking):** [https://www.letskorail.com](https://www.letskorail.com)
* **SRT (Suseo High-Speed Train Official):** [https://etk.srail.kr](https://etk.srail.kr)
* **KOBUS (Korea Express Bus Network):** [https://www.kobus.co.kr](https://www.kobus.co.kr)
* **TxBus (Intercity Bus Booking):** [https://txbus.t-money.co.kr](https://txbus.t-money.co.kr)
* **BUSTAGO (National Intercity Bus):** [https://www.bustago.or.kr](https://www.bustago.or.kr)
* **AREX (Incheon Airport Express Train):** [https://www.arex.or.kr](https://www.arex.or.kr)
* **Incheon International Airport (ICN):** [https://www.airport.kr/ap/en/index.do](https://www.airport.kr/ap/en/index.do)
* **Gimhae International Airport (Busan):** [https://www.airport.co.kr/gimhaeeng/index.do](https://www.airport.co.kr/gimhaeeng/index.do)
* **T-money Official Tourist Portal:** [https://www.t-money.co.kr](https://www.t-money.co.kr)
* **WOWPASS Official Portal:** [https://www.wowpass.io](https://www.wowpass.io)
* **NAMANE Card Official Portal:** [https://www.namanecard.com](https://www.namanecard.com)
* **Discover Seoul Pass Official Site:** [https://www.discoverseoulpass.com](https://www.discoverseoulpass.com)
* **Visit Busan Pass Official Site:** [https://www.visitbusanpass.com](https://www.visitbusanpass.com)
* **Zimcarry Official KTX Baggage Service:** [https://www.zimcarry.net](https://www.zimcarry.net)
* **T-Luggage Official Seoul Metro Storage:** [https://tluggage.co.kr](https://tluggage.co.kr)
* **VisitKorea (Korea Tourism Organization - KTO Official):** [https://english.visitkorea.or.kr](https://english.visitkorea.or.kr)
* **1330 Korea Travel Helpline (24/7 Free English Assistance):** [https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=140632](https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=140632)

---

## 🛠️ How to Submit Your Planned Itinerary

When you are ready to show us your draft itinerary, use our **AI Itinerary Submission Template** in `docs/19-ai-itinerary-submission-template-and-logistics-engine.md` or copy it from the **`🧭 Logistics & Sweet Spot`** tab in `index.html`. We will evaluate every leg across:
1. **The Optimal Sweet-Spot Mode** (Cheapest vs. #1 Recommended vs. Luxury).
2. **Hours of Operation & Rush Hour Avoidance**.
3. **Exact 2-Person Costs in KRW & USD** & which card to tap.
4. **Zero-Hassle Station & Luggage Strategy** (which elevator exit to take and where to forward bags).

Have an amazing autumn trip to South Korea! 🍁🇰🇷
