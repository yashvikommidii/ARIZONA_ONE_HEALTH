# AZ Ember — CLAUDE.md

## What This Project Is
AZ Ember is a disease outbreak early-warning dashboard for the State of Arizona.
It was built in 20 hours for the Ending Pandemics Academy hackathon at the University of Arizona.

Users submit symptom reports. The app combines those reports with external signals (CDC
advisories, travel data, seasonal context) and calls the Anthropic API to generate an
AI risk assessment for each Arizona county. Results are displayed on an interactive map.

---

## Tech Stack — Keep It Simple
- **Vanilla JS only.** No React, no Vue, no build step, no npm.
- **Leaflet.js** for the map (loaded via CDN).
- **Anthropic API** (`claude-sonnet-4-20250514`) for risk generation.
- All files are loaded via `<script>` tags in `index.html`.
- No backend. No database. No login. No accounts.

This is a hackathon demo. Simplicity beats elegance.

---

## File Structure
```
az-sentinel/
├── index.html       # Main UI — sidebar, map, detail panel
├── data.js          # Fake symptom reports (window.REPORTS)
├── api.js           # Anthropic API call + prompt logic
├── app.js           # Leaflet map init, wiring, UI logic
├── config.js        # API key (window.ANTHROPIC_API_KEY)
├── az-counties.json # Arizona county GeoJSON (do not edit)
└── CLAUDE.md        # This file
```

---

## All 15 Arizona Counties in Scope
- **Maricopa** (Phoenix) — urban, high population, primary demo county
- **Pima** (Tucson) — urban, university city, border proximity
- **Pinal** — suburban/rural, between Phoenix and Tucson
- **Yavapai** — rural, higher elevation
- **Coconino** — rural, Flagstaff, Grand Canyon region
- **Mohave** — rural, Colorado River corridor
- **Navajo** — rural, tribal lands, measles-adjacent signal
- **Apache** — rural, tribal lands, eastern border
- **Cochise** — rural, Mexico border, Tucson metro outskirts
- **Yuma** — border city, dengue-adjacent signal
- **Santa Cruz** — border county, Nogales
- **Gila** — rural, central highlands
- **Graham** — rural, Safford area
- **Greenlee** — rural, least populous county
- **La Paz** — rural, Colorado River, Parker

The demo scenario: Maricopa has a suspicious cluster of fever + respiratory symptoms
with 3 reporters who recently traveled to Southeast Asia. It should always return
Moderate or High risk.

---

## Data Shape — Symptom Report Object
```js
{
  id: "rpt_001",
  county: "Maricopa",
  timestamp: "2026-04-24T14:32:00Z",
  symptoms: ["fever", "cough", "fatigue"],
  recentTravel: true,
  travelDestination: "Thailand",
  animalContact: false,
  animalType: null,
  ageRange: "30-44"
}
```
All fake reports live in `data.js` as `window.REPORTS`. Do not move them.

---

## Risk Assessment Output Shape
The `getRiskAssessment()` function in `api.js` must always return:
```js
{
  level: "Low" | "Moderate" | "High",
  explanation: "2-3 sentence plain-English explanation for a public health officer.",
  reportCount: 12,
  county: "Maricopa"
}
```
Never return raw API response objects to the UI layer. Always parse and return this shape.

---

## The Risk Prompt — Core Logic
The prompt sent to the Anthropic API includes:
1. Symptom summary for the county (aggregated from REPORTS)
2. Any travel destinations mentioned in reports
3. Hardcoded CDC advisories (defined in api.js as CDC_ADVISORIES)
4. Current season context ("Late April in Arizona — warm, dry, monsoon approaching")

The model should respond as a public health risk analyst. Output must be parseable:
risk level on its own line, then explanation. See `api.js` for full prompt.

---

## CDC Advisories (Hardcoded — Do Not Call Live API)
```js
const CDC_ADVISORIES = [
  "H5N1 avian influenza activity elevated in Southeast Asia (Thailand, Vietnam, Cambodia)",
  "Dengue fever outbreak ongoing in Latin America and Caribbean",
  "Measles cases rising in unvaccinated communities across the US Southwest",
  "West Nile Virus season begins in Arizona — mosquito activity increasing"
];
```
These are included as static context in every risk prompt. Do not attempt to fetch
live CDC data — there is no time and it is not required for the demo.

---

## UI Layout
```
+------------------+---------------------------+--------------------+
|   Report Feed    |        Leaflet Map         |   County Detail    |
|   (200px wide)   |       (flex: 1)            |   (300px wide)     |
|                  |                            |                    |
| Live scrolling   | Counties colored by risk:  | County name        |
| list of incoming | Green = Low                | Risk badge         |
| fake reports     | Yellow = Moderate          | AI explanation     |
|                  | Red = High                 | Report count       |
|                  |                            | [Submit Report]    |
+------------------+---------------------------+--------------------+
|  Intake form modal — triggered by [Submit Report] button           |
+--------------------------------------------------------------------+
```
Color scheme: dark sidebar (#1a1a2e), light map background, clean white detail panel.

---

## Intake Form Fields
```
County:           [Dropdown — 5 counties]
Symptoms:         [Checkboxes: fever, cough, fatigue, rash, nausea/vomiting]
Recent travel:    [Yes / No toggle]
  If yes → Travel destination: [Text input]
Animal contact:   [Yes / No toggle]
  If yes → Animal type: [Text input]
Age range:        [Dropdown: 0-17, 18-29, 30-44, 45-64, 65+]
[Submit Report]
```
On submit: add to window.REPORTS, re-run getRiskAssessment for that county,
update map color, update detail panel, close modal.

---

## Rules Claude Must Follow

1. **Never use frameworks.** If you are about to write `import React` or `npm install`
   anything, stop. Use vanilla JS.

2. **Never touch az-counties.json.** It is downloaded GeoJSON. Treat it as read-only.

3. **Never hardcode the API key.** Always reference `window.ANTHROPIC_API_KEY` from config.js.

4. **Never return raw Anthropic API responses to the UI.** Always parse into the
   risk assessment shape defined above.

5. **One responsibility per file.** `data.js` = data only. `api.js` = API logic only.
   `app.js` = UI + map logic only. Do not mix concerns.

6. **Always add a loading state** when the API call is in flight. Show "Analyzing..."
   on the map panel. Without this the 2-3 second wait looks like a crash.

7. **Keep functions short.** If a function is over 50 lines, it is doing too much.
   Split it.

8. **Do not add features that are not in the plan.** We have 20 hours. Scope creep
   kills hackathon projects. If a feature is not in this file, do not build it.

---

## Demo Scenario (Know This Cold)
When demoing to judges:
1. Open the app — map loads with 5 counties, Maricopa shows red (High)
2. Click Maricopa — detail panel shows AI explanation referencing fever cluster + SE Asia travel
3. Click "Submit Report" — intake form opens
4. Fill in: Pima county, fever + cough, recent travel to Mexico
5. Submit — Pima updates to Moderate, map recolors, explanation updates
6. Point to the live report feed — "This is what public health officials would monitor in real time"

Practice this until it takes under 4 minutes.

---

## What Is Out of Scope (Do Not Build)
- User authentication or accounts
- A real database or backend server
- Live CDC API calls
- EpiCore API integration (mention in roadmap slide only)
- Mobile app or responsive design beyond basic usability
- More than 15 counties (all AZ counties are now in scope)
- Charts, graphs, or data visualizations beyond the map
- Email or SMS alerts

---

## Roadmap (For the Slides — Not For This Sprint)
1. Integrate EpiCore API for real-time pathogen surveillance data
2. ~~Expand to all 15 Arizona counties~~ (done)
3. Mobile app for public reporting
4. SMS/push alerts for high-risk county residents
5. Integration with Arizona Department of Health Services dashboard
