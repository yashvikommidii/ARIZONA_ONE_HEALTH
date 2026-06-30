https://devpost.com/software/arizona-one-health


Live demo: arizona-one-health.vercel.app

View our presentation

View full technical documentation

Use these example credentials to log in:

FIRST NAME	LAST NAME	USERNAME	DATE OF BIRTH

Lucas	Vega	lucas.vega621	    07-09-2009

Chloe	Garcia	chloe.garcia5228	   10-21-1986

Natalie	Mendoza	natalie.mendoza9211	   08-16-1974

Inspiration

Arizona is one of the most medically underserved states in the country, and it's also one of the most linguistically diverse. When a flu outbreak hits a rural Maricopa ZIP code, or Valley Fever quietly spreads through Pima County, the people most affected are often the last to know. Public health dashboards exist, but they're built for epidemiologists, not for the single mom in Tucson who just wants to know if the fever going around her kid's school is something to worry about, and who speaks Spanish at home.

We built Arizona One Health because we believe community health intelligence should be accessible: not locked behind jargon, institutional logins, or a language barrier.

What it does

Arizona One Health is a bilingual public health monitoring platform that gives everyday Arizonans, and the health workers who serve them, a real-time window into disease trends across Arizona's counties and ZIP codes. Users can:

Check community risk at the county and ZIP level, with a plain-language breakdown of what's circulating locally
Explore a live dashboard filtered by disease, time window, and geography, with county comparisons, weekly trends, and CSV exports
Visualize disease spread on an interactive Arizona map showing risk levels and recent reports by county
Chat with an AI health assistant in English or Spanish that explains local signals, walks you through the platform, and answers questions about what the data means, without ever pretending to be a doctor
How we built it

The stack is a Next.js application with App Router, deployed on Vercel via GitHub. The frontend handles map visualization, dashboard analytics, and the bilingual chat UI. The backend consists of API routes that read from a structured CSV data layer and perform server-side risk calculations: community risk by ZIP, county-level disease trends, weekly report counts, and travel hotspot analysis.

The Live Chat assistant uses a hybrid intelligence model: deterministic local logic handles core dataset questions (disease counts, ZIP risk, county summaries) with precision, while OpenAI's gpt-4o-mini handles open-ended natural language navigation and explanation. If the OpenAI API is unavailable, the local fallback logic keeps the assistant functional for the queries that matter most.

All data in this prototype is synthetic, designed to mirror how real community health reports would flow through the system while keeping the build privacy-safe and demo-ready.

Data

Because Arizona One Health deals with sensitive public health information, we built the entire prototype on synthetic data, allowing us to demonstrate every feature, from login flows to county risk analytics to AI chat responses, without touching real patient or community health records.

The synthetic dataset simulates realistic Arizona health reporting activity. It includes user accounts with county and ZIP profile fields, symptom and disease reports tied to those users, report dates for weekly and multi-week trend analysis, and severity metadata. Suspected diseases span conditions relevant to Arizona: Influenza, COVID-19, RSV, Norovirus, Salmonella, Valley Fever, E. coli, Dengue, West Nile Virus, Rabies Exposure, and Unknown Febrile Illness.

All of this is stored in local CSV files. API routes read and compute from them dynamically, calculating community risk by ZIP and county, weekly sick report counts, top diseases per region, travel risk hotspots, and the disease trend data powering the dashboard and map.

The synthetic layer isn't just a workaround; it's a design choice. It lets us prove out the full product behavior in a privacy-safe environment. In a production deployment, this CSV layer would be replaced with validated public health data pipelines, access controls, audit logs, and data quality checks. The architecture is already built to support that transition.

User Engagement

Public health tools only work if people actually use them. Consistent community reporting is what makes the risk data meaningful, so we built a layer of engagement features designed to reward participation and keep users coming back.

Submission Streaks track how often a user reports their health status, showing 7-day and 30-day submission counts alongside their longest consecutive streak. It's a small thing, but seeing "5-day streak" creates real motivation to not break the chain.

Badges reward milestones like the 7-Day Health Hero (submit every day for a week) and the Half the Way Badge (15 submissions in 30 days). Each badge shows progress toward unlocking, so users always know how close they are.

Scratch Cards add a moment of fun to consistent reporting. The 2-Week Streak Scratch Card and 30-Day Champion Scratch Card unlock after sustained participation, giving users something to look forward to beyond the data itself.

Discounts and Sponsored Perks are surfaced on the home page as rewards for active users, creating a tangible real-world incentive to contribute health data to the community.

Live Chat makes the platform approachable for users who are not data-literate. Instead of trying to interpret a dashboard, a user can just ask "what's going around in Pima County?" and get a plain-language answer pulled directly from the local dataset, including top diseases, risk percentages, and the highest-report ZIP codes.

Bilingual Support ensures that Spanish-speaking Arizonans are not left behind. The entire Live Chat interface works in English and Spanish, with voice input and voice reply both supported, so users can interact in the language they are most comfortable with.

The result is a platform that does not just display data. It invites participation, rewards consistency, and speaks to every user in a way they can understand.

Challenges we ran into

Building a responsible AI health tool meant constantly asking ourselves: what should this system NOT do? Constraining the assistant to stay within the local dataset, and never cross into diagnosis, treatment, or emergency triage territory, required deliberate prompt design and deterministic fallback logic that bypasses the LLM entirely for sensitive data queries.

Bilingual support added another layer: it's not just translation, it's making sure the assistant feels natural and trustworthy in Spanish, not robotic. Getting that tone right took iteration.

We also had to think carefully about the human-in-the-loop workflow. Public health data without human validation is dangerous. We designed the system so that AI surfaces signals and explains them, but humans remain the decision-makers for any real-world action.

Accomplishments that we're proud of

We built something that could realistically be handed to an Arizona county health department tomorrow and immediately help their community liaisons do their jobs better. The bilingual chat interface works. The risk analytics are dynamic and county/ZIP-aware. The map tells a story at a glance. And we did it while keeping the AI firmly in a supporting role, not a replacement for public health judgment.

We're also proud of the architecture: clean separation between the data layer, analytics, and AI, with environment variables properly secured and a deployment pipeline that's production-ready on day one.

What we learned

Public health tech fails communities when it's designed only for experts. The hardest design decisions weren't technical; they were about who is this actually for? Answering that question shaped every feature, from the plain-language risk summaries to the Spanish voice interface to the human review workflow we built into the platform's intended use.

We also learned that "responsible AI" isn't a feature you bolt on at the end. It has to be in the architecture from the start.

Model Card

Model: gpt-4o-mini via OpenAI, accessed server-side through a Next.js API route. The model name is controlled by the OPENAI_MODEL environment variable.

Purpose: The assistant helps users understand and navigate the Arizona One Health platform. It answers questions about website pages, dashboard data, disease report counts, county and ZIP risk levels, and local trends, in plain language, in English or Spanish.

Inputs: User chat messages, optional logged-in username, selected county and ZIP from browser state, and local CSV-derived risk context including disease report totals and county/ZIP summaries.

Outputs: Plain-language responses, local dataset summaries, navigation guidance, and fallback warning messages if the AI service is unavailable.

Intended use:

Explain how to use the website
Summarize local risk and dashboard information
Answer disease count questions from the local dataset
Provide plain-language explanations of county and ZIP health signals
Support English and Spanish user interaction
Not intended for:

Medical diagnosis or treatment recommendations
Emergency triage
Official public health decisions without human review
Claims beyond the local dataset
Limitations: The data is synthetic and prototype-only. AI responses can be incomplete or incorrect and should not be treated as an authoritative health source. Network or API failures can prevent OpenAI responses, though local fallback logic still handles core queries.

Risk mitigations: The assistant is instructed to stay within the website and local dataset. Core disease count questions are answered directly from CSV logic rather than relying on the model. API keys are stored as environment variables. Browser chat memory is local to the user's session. Human review is expected before any public use or operational deployment.

What's next for Arizona One Health

The prototype runs on synthetic data, but the architecture is built to swap in real validated public health pipelines. Next steps include partnering with Arizona county health departments to pilot with real (anonymized) community report data, adding push alerts for elevated risk signals, expanding disease categories to include conditions endemic to the Southwest like Valley Fever and West Nile Virus, and formalizing the human reviewer workflow with role-based access for public health staff.

Arizona One Health is a prototype today. With the right data partnerships, it could be infrastructure.

Built With

ai
data-visualization
geminiapi
html
javascript
node.js
openapi
Try it out

 arizona-one-health.vercel.app
