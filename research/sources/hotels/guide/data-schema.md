# Data Schema — Korea-hotels

This document describes the structure of `data/hotels.json` and `data/itinerary.json`.

## hotels.json

### Top-level structure

```json
{
  "trip": { ... },
  "split": { ... },
  "hotels": [ ... ],
  "meta": { ... }
}
```

### `trip` object
- `title`: Trip title
- `checkIn`, `checkOut`, `nights`: Overall dates
- `note`: Season / context note

### `split` object
- `recommended`: Default night split
- `rationale`: Why this split
- `alternatives`: Other possible splits

### `hotels` array (each hotel object)

**Core fields (required)**
- `id`: Unique slug (e.g. `cheonan-shilla-stay`)
- `city`: "Seoul", "Busan", "Cheonan", or "Daejeon"
- `name`: Full hotel name
- `tier`: "budget", "mid", or "premium"
- `stars`: 3, 4, or 5
- `area`, `neighborhood`: Location description

**Pricing**
- `priceFrom`, `priceTo`: Typical nightly USD range
- `currency`: Usually "USD"
- `priceNote`: Disclaimer about estimates

**Policies**
- `checkIn`, `checkOut`
- `policies`: Array of policy strings

**Rooms** (array)
Each room must have:
- `name`, `price`, `note`
- `bed`, `bedType`, `bedSize`
- `oneBed`, `oneBedOnly`, `privateBathroom`
- `bedNote`: Must clearly state "Single [bed] bed (not two beds pushed together)"

**Amenities & Features**
- `amenities`: Array of strings
- `hasOnSiteLaundry`: Boolean (true/false)

**Links**
- `officialUrl`: Official hotel website (can be null)
- `officialLabel`
- `compareUrl`: Usually Kayak link
- `compareLabel`

**Content**
- `why`, `highlights`, `promos`
- `fits`, `fitReason`: Used by "Fits my needs" filter
- `lat`, `lng`: Coordinates for map links

### `meta` object
- `pricingLastChecked`: Date string
- `pricingSource`: Note about where prices come from

---

## itinerary.json

### `trip` object
- `name`, `checkIn`, `checkOut`, `note`

### `legs` array
Each leg:
- `city`, `nights`, `dates`
- `locations`: Array of neighborhoods
- `hotelChoice`: null or hotel ID
- `note`: Any special notes

### `alternatives` array (optional)
Same structure as `legs` — used for Cheonan and Daejeon options.

---

## Validation Rules

The `validate.py` script checks:
- All required fields exist
- Room objects have `bedType`, `oneBedOnly`, `privateBathroom`
- `hasOnSiteLaundry` is present on every hotel
- `officialUrl` is either a valid URL or clearly marked as "Book via OTA"

Run the validator with:
```bash
python3 validate.py
```
