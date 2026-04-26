# Synthetic Arizona One Health Dataset

- 15 official Arizona counties
- 200 residents per county (3,000 total)
- Sick reports generated over last 30 days
- One person can have 1-3 reports
- Person identifiers are hashed (no names/contact data)

## Files
- `synthetic_people.csv`: resident base population
- `synthetic_reports.csv`: sick report events
- `synthetic_symptoms.csv`: symptom-level rows per report
- `synthetic_weekly_summary.csv`: last-7-day aggregate cases by county+disease
