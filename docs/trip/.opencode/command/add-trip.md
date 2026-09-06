---
description: Add a new trip/itinerary to itinerary.json. Usage: /add-trip <trip details or "screenshots attached">
agent: openwork
---

Add a new itinerary to this project. Load the `add-itinerary` skill first and follow its workflow exactly (schema, ID generation, validation checklist).

Trip details from the user:
$ARGUMENTS

If the user attached screenshots (flight bookings, hotel confirmations, train tickets, etc.), extract the booking details from them and incorporate them into the trip's segments. Ask for clarification only if something critical is missing or ambiguous.

When done, report: trip name, id, date range, segment count, and remind the user they can run `./update.sh` to deploy.