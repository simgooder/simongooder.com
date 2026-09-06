---
name: add-itinerary
description: Use when adding a new trip or itinerary to this project's itinerary.json. Triggers on requests like "add a trip", "new itinerary", "add itinerary", "plan a trip", "add a new trip to the itinerary". Covers the trip + segment JSON schema, ID generation, and validation.
---

# Add an Itinerary

This project is a static PWA that renders trips from `itinerary.json` (in the repo root). Adding a new itinerary means adding one trip object to the `trips` array in that file. The app sorts trips itself (current → future → past), so array order does not matter, but keep it roughly chronological for readability.

## Data file

- **File:** `itinerary.json` (repo root)
- Do **not** touch `profile` when adding a trip.
- Preserve the existing formatting: 2-space indent, keys in the same order as existing trips.

### File structure

The file has two top-level keys: `profile` (read-only) and `trips` (where you add). Here's how a trip fits in:

```json
{
  "profile": {
    "timezone": "America/Toronto",
    "currency": "CAD"
  },
  "trips": [
    {
      "id": "porto-retreat-2026",
      "name": "Porto Retreat 2026",
      "description": "A work retreat to Porto.",
      "currency": "EUR",
      "timeline": ["2026-02-07", "2026-02-14"],
      "timezone": "Europe/Lisbon",
      "segments": [
        {
          "name": "Flight to Munich",
          "type": "Flight",
          "vendor_name": "Air Canada",
          "flight_number": "AC 9098",
          "origin": "Montreal",
          "destination": "Munich",
          "departure_date": "2026-02-07",
          "departure_time": "08:10 PM",
          "arrival_date": "2026-02-08",
          "arrival_time": "09:30 AM",
          "note": "1:25 layover in MUC"
        },
        {
          "name": "Flight to Porto",
          "type": "Flight",
          "vendor_name": "Lufthansa",
          "flight_number": "LH 1782",
          "origin": "Munich",
          "destination": "Porto",
          "departure_date": "2026-02-08",
          "departure_time": "10:55 AM",
          "arrival_date": "2026-02-08",
          "arrival_time": "12:50 PM",
          "note": ""
        }
      ]
    },
    {
      "id": "spanish-vacation-2025",
      "name": "Spanish vacation 2025",
      "...": "..."
    }
  ]
}
```

Note: segments and notes are omitted from subsequent trips for brevity. New trips get appended to the `trips` array.

## Trip object schema

```json
{
  "id": "unique-kebab-case-id",
  "name": "Display Name",
  "description": "One-line description.",
  "currency": "EUR",
  "timeline": ["2026-10-02", "2026-10-13"],
  "timezone": "Europe/Paris",
  "travel_groups": [{"1": ["Sim", "Kel"]}, {"2": ["Steve", "Brenda"]}],
  "notes": [
    { "title": "Things to do", "body": "• <a href='...'>Place</a>" }
  ],
  "segments": []
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Lowercase letters, numbers, hyphens only. Generated from the name (see below). Must be unique across all trips. |
| `name` | yes | Display name, e.g. "Spanish Vacation 2025". |
| `description` | yes | Short description shown under the trip title. |
| `currency` | yes | One of: `USD`, `EUR`, `GBP`, `CAD`, `JPY`, `AUD`, `CHF`. |
| `timeline` | yes | Exactly 2 ISO dates `["YYYY-MM-DD", "YYYY-MM-DD"]`, start ≤ end. Should match the first/last segment dates. |
| `timezone` | yes | IANA name, e.g. `Europe/Madrid`, `Asia/Tokyo`, `America/Vancouver`. |
| `travel_groups` | no | Array of single-key objects mapping group id → traveller names. Used with `travellers` on segments. |
| `notes` | no | Array of `{ "title", "body" }`. `body` may contain HTML (links, `•` bullets, `\n`). |
| `segments` | yes | Array of segment objects, in chronological order. |

### Generating the trip `id`

Mirror `generateTripId()` in `app.js`:

1. Lowercase and trim the name.
2. Replace every run of non-alphanumeric characters with a single hyphen.
3. Strip leading/trailing hyphens.

Examples: `"Porto Retreat 2026"` → `porto-retreat-2026`, `"Birthday in Japan 2025"` → `birthday-in-japan-2025`.

## Segment schema

Segment `type` is one of: `Flight`, `Train`, `Bus`, `Drive`, `Hotel`.

### Common fields (all types)

| Field | Notes |
|---|---|
| `type` | Required. `Flight` \| `Train` \| `Bus` \| `Drive` \| `Hotel`. |
| `name` | Optional display name. If empty, the app derives one from type + destination. |
| `vendor_name` | e.g. "Air Canada", "Renfe", "Marriott". |
| `destination` | Required. City/place name. |
| `note` | Optional free text (seat numbers, booking refs, contact info, etc.). |
| `travellers` | Optional array of travel-group ids, e.g. `["1", "2"]`. Only meaningful if the trip has `travel_groups`. |
| `places_id` | Optional; leave `""` unless a real value exists. |

### Flight / Train / Bus / Drive fields

```json
{
  "type": "Flight",
  "name": "Flight to Porto",
  "vendor_name": "Lufthansa",
  "flight_number": "LH 1782",
  "origin": "Munich",
  "destination": "Porto",
  "departure_date": "2026-02-08",
  "departure_time": "10:55 AM",
  "arrival_date": "2026-02-08",
  "arrival_time": "12:50 PM",
  "note": ""
}
```

- `flight_number` — Flight only.
- `origin` — required for all non-Hotel types.
- `departure_date` / `arrival_date` — ISO `YYYY-MM-DD`. Arrival can be a later date (overnight flights).
- `departure_time` / `arrival_time` — either 24h `"14:00"` or 12h `"2:05 PM"`; both appear in the data. Match the style of the rest of the file where possible.
- `address` — optional for Train (station address).

### Hotel fields

```json
{
  "type": "Hotel",
  "name": "Hotel Molina Lario Malaga",
  "vendor_name": "Hotel Molina Lario",
  "address": "Molina Lario 22 29015 - Málaga",
  "destination": "Malaga",
  "check_in_date": "2025-09-21",
  "check_in_time": "3:00 PM",
  "check_out_date": "2025-09-26",
  "check_out_time": "11:00 AM",
  "note": "Telephone: +34 952 06 20 02"
}
```

- Hotels use `check_in_date`/`check_in_time`/`check_out_date`/`check_out_time` instead of departure/arrival.
- No `origin` for hotels.

## Screenshot input

The user may attach screenshots of bookings (flight confirmations, hotel reservations, train tickets, boarding passes). Extract the details from them and build the segments from what you read:

- **Flights:** airline, flight number, origin/destination airports, departure/arrival dates + times, booking reference, seat numbers.
- **Hotels:** hotel name, address, check-in/check-out dates + times, confirmation number, contact info.
- **Trains/buses:** operator, origin/destination stations, departure/arrival times, coach/seat numbers.

Put extracted details into the segment `note` field (e.g. `"Booking ref: A5N3RX"`, `"Seats: 02A, 02B"`) and the structured fields. If a screenshot is unclear or a critical field is missing, ask the user rather than guessing.

## Workflow

1. **Gather details.** Ask the user for: trip name, dates, currency, timezone, and the segments (flights, trains, buses, drives, hotels) with their times. Also ask about travel groups and notes if relevant. If the user attached screenshots, extract the details from them instead of asking.
2. **Build the trip object.** Generate the `id` from the name, set `timeline` from the first/last segment dates, and list segments in chronological order.
3. **Insert into `itinerary.json`.** Add the object to the `trips` array. Keep the file's existing key order and 2-space indentation.
4. **Validate** (see checklist below).
5. **Deploy.** Run `./update.sh` from the repo root to copy files to the production directory, bump the service worker cache version, and push to GitHub:
   ```sh
   ./update.sh
   ```
6. **Report.** Summarize what was added: trip name, id, date range, segment count. Confirm the deploy succeeded.

## Validation checklist

Run these checks before finishing:

1. **JSON is valid:**
   ```sh
   python3 -m json.tool itinerary.json > /dev/null && echo OK
   ```
2. **Trip id** is lowercase alphanumeric + hyphens only, and unique across all trips:
   ```sh
   python3 -c "import json; d=json.load(open('itinerary.json')); ids=[t['id'] for t in d['trips']]; assert len(ids)==len(set(ids)), 'duplicate ids'; print('ids OK')"
   ```
3. **Timeline** has exactly 2 dates, start ≤ end, and matches the first/last segment dates.
4. **Every segment** has the required fields for its type (see schema above). No `undefined`/missing keys.
5. **Dates** are `YYYY-MM-DD`; times are consistent 24h or 12h format.
6. **`travellers`** ids on segments reference keys that exist in the trip's `travel_groups`.
7. **No stray commas / trailing commas** in the edited JSON (the app's `fetch().json()` will fail on them).

## Example

A minimal complete trip:

```json
{
  "id": "lisbon-weekend-2026",
  "name": "Lisbon Weekend 2026",
  "description": "A long weekend in Lisbon.",
  "currency": "EUR",
  "timeline": ["2026-05-01", "2026-05-04"],
  "timezone": "Europe/Lisbon",
  "notes": [],
  "segments": [
    {
      "type": "Flight",
      "name": "Flight to Lisbon",
      "vendor_name": "Air Canada",
      "flight_number": "AC 810",
      "origin": "Montreal",
      "destination": "Lisbon",
      "departure_date": "2026-05-01",
      "departure_time": "08:00",
      "arrival_date": "2026-05-01",
      "arrival_time": "19:30",
      "note": ""
    },
    {
      "type": "Hotel",
      "name": "Hotel in Lisbon",
      "vendor_name": "Hotel",
      "address": "Lisbon, Portugal",
      "destination": "Lisbon",
      "check_in_date": "2026-05-01",
      "check_in_time": "15:00",
      "check_out_date": "2026-05-04",
      "check_out_time": "11:00",
      "note": ""
    },
    {
      "type": "Flight",
      "name": "Return Flight",
      "vendor_name": "Air Canada",
      "flight_number": "AC 811",
      "origin": "Lisbon",
      "destination": "Montreal",
      "departure_date": "2026-05-04",
      "departure_time": "12:00",
      "arrival_date": "2026-05-04",
      "arrival_time": "14:30",
      "note": ""
    }
  ]
}
```