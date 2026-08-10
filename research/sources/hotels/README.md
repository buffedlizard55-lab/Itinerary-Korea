# 🇰🇷 South Korea Trip — Hotel Planner

**A clean, easy-to-use static website** for comparing hotels across Seoul, Busan, Cheonan, and Daejeon.

**Live Site**: Open `index.html` in your browser, or enable GitHub Pages on this repo.

---

## ✨ What This Is

This is a **static information website** (no login, no backend) designed to help you:

- Browse 34 carefully selected 3–5 star hotels
- Compare prices, room types, and amenities
- Filter by budget, bed type, laundry, and "fits my needs"
- See official booking links and clear rules
- Understand realistic pricing with disclaimers

**Best used as**: A research and planning tool while booking your trip.

---

## ✅ Our Hotel Requirements (Must-Haves)

We **only** consider hotels that meet **all three** of the following non-negotiable requirements:

| Requirement | Details |
|-------------|---------|
| **One Single Bed** | **Queen size or larger** (minimum ~150cm wide). Must be **one single bed unit** — **not** two beds pushed together or two doubles. |
| **Private Bathroom** | En-suite bathroom inside the room |
| **Near Public Transport** | Walking distance to subway station or KTX high-speed rail |

### How We Use These Requirements

- The **"✓ Matches Our Must-Haves"** filter shows only hotels that meet all three criteria
- Every room card shows a **"Perfect Match"** or **"Missing Requirements"** badge
- The **bedNote** field explicitly confirms the bed configuration

This ensures we never compromise on our core needs while still being able to compare price and other amenities.

## 🚀 Quick Start (Use the Website)

### 5-Minute Guide

1. **Open the site** — Go to `index.html` (or the GitHub Pages URL)
2. **Pick a city** — Use the tabs at the top (Seoul, Busan, Cheonan, Daejeon)
3. **Filter your results**:
   - Price tier buttons (Budget / Mid / Premium)
   - Feature filters (🧺 Laundry, 🛏 Queen/King, 1️⃣ One Bed Only)
   - Use the search bar to find hotels by name or area
4. **Click "Fits my needs"** — Shows only hotels with:
   - Room for 2 people
   - One Queen or King bed (not two pushed together)
   - Private bathroom
5. **Review & Book**:
   - Check room details, prices, and rules
   - Click **"Get live price"** to see current rates on the official site

**Tip**: All prices are estimates. Always verify live rates before booking.

---

## 📍 Current Hotel Coverage

| City       | Hotels | Best For |
|------------|--------|----------|
| **Seoul**  | 8      | Central locations (Myeongdong, Insadong) |
| **Busan**  | 7      | Haeundae beach + Station area |
| **Cheonan**| 7      | Excellent KTX access, great value |
| **Daejeon**| 7      | Good transport hub + hot springs area |

All hotels include:
- Realistic price ranges (2026 estimates)
- Bed type details (Queen/King vs two beds)
- On-site laundry flag
- Official or OTA booking links

---

## 🛠 How to Enable GitHub Pages (Recommended)

This site works great when hosted on GitHub Pages:

### Steps:

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select:
   - **Deploy from a branch**
   - **Branch**: `arena/019fc93d-korea-hotels`
   - **Folder**: `/ (root)`
4. Click **Save**

Your live site will be available at:
`https://karagemop466-tech.github.io/Korea-hotels/`

> **Note**: It may take 1–2 minutes for the site to appear after enabling.

---

## 📁 Project Structure

```
Korea-hotels/
├── index.html              ← The interactive planner (open this)
├── data/
│   ├── hotels.json         ← All hotel data (34 hotels)
│   └── itinerary.json      ← Trip dates and cities
├── guide/                  ← Detailed markdown guides
├── build.py                ← Regenerates index.html from data
├── validate.py             ← Checks data quality
└── README.md
```

**Single source of truth**: Edit the JSON files → run `python3 build.py` → `index.html` updates.

---

## 📝 Data Notes

- **Prices** are typical 2026 autumn season estimates
- All data was researched in August 2026
- Always verify live rates on official sites before booking
- Room details emphasize **one bed only** (not two pushed together)

---

## 🤝 Contributing

Want to add a hotel or update information?

1. Edit `data/hotels.json`
2. Run `python3 validate.py` to check for issues
3. Run `python3 build.py` to update the site
4. Submit a pull request

---

**Last Updated**: August 2026

This project is maintained as a helpful static resource for trip planning.
