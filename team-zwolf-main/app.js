const COUNTIES = [
  "Maricopa", "Pima", "Pinal", "Yavapai", "Coconino",
  "Mohave", "Navajo", "Apache", "Cochise", "Yuma",
  "Santa Cruz", "Gila", "Graham", "Greenlee", "La Paz"
];

const RISK_COLORS = {
  Low: "#4caf50",
  Moderate: "#ffb300",
  High: "#e53935"
};

let map;
let geojsonLayer;
let assessments = {};

function initMap() {
  map = L.map("map", { zoomControl: true }).setView([34.0, -111.8], 7);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);
}

function countyColor(name) {
  const a = assessments[name];
  if (!a) return "#888";
  return RISK_COLORS[a.level] || "#888";
}

function styleFeature(feature) {
  return {
    fillColor: countyColor(feature.properties.name),
    fillOpacity: 0.65,
    color: "#fff",
    weight: 1.5
  };
}

function onEachFeature(feature, layer) {
  const name = feature.properties.name;

  layer.bindTooltip(name, {
    permanent: false,
    direction: "center",
    className: "county-label"
  });

  layer.on("mouseover", function () {
    this.setStyle({ fillOpacity: 0.92, weight: 3, color: "#ffffff" });
    this.bringToFront();
  });

  layer.on("mouseout", function () {
    geojsonLayer.resetStyle(this);
  });

  layer.on("click", () => showDetail(name));
}

function loadGeoJSON() {
  fetch("az-counties.json")
    .then(r => r.json())
    .then(geojson => {
      geojsonLayer = L.geoJSON(geojson, {
        style: styleFeature,
        onEachFeature
      }).addTo(map);
    });
}

function refreshMapColors() {
  if (!geojsonLayer) return;
  geojsonLayer.setStyle(styleFeature);
}

function showDetail(county) {
  const panel = document.getElementById("detail-panel");
  const a = assessments[county];

  if (!a) {
    panel.innerHTML = `<h2>${county}</h2><p class="analyzing">No data yet.</p>`;
    return;
  }

  const badgeClass = a.level.toLowerCase();
  panel.innerHTML = `
    <h2>${county} County</h2>
    <span class="risk-badge ${badgeClass}">${a.level} Risk</span>
    <p class="explanation">${a.explanation}</p>
    <p class="report-count">${a.reportCount} report(s) on file</p>
    <button class="submit-btn" onclick="openModal('${county}')">Submit Report</button>
  `;
}

function renderReportFeed() {
  const feed = document.getElementById("report-feed");
  const sorted = [...window["REPORTS"]].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  feed.innerHTML = sorted.map(r => {
    const time = new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `
      <div class="feed-item">
        <span class="feed-county">${r.county}</span>
        <span class="feed-time">${time}</span>
        <span class="feed-symptoms">${r.symptoms.join(", ")}</span>
        ${r.recentTravel ? `<span class="feed-travel">✈ ${r.travelDestination}</span>` : ""}
      </div>
    `;
  }).join("");
}

async function analyzeCounty(county) {
  showAnalyzing(county);
  try {
    const result = await getRiskAssessment(county);
    assessments[county] = result;
    refreshMapColors();
    // If this county is currently shown in the detail panel, refresh it
    const panel = document.getElementById("detail-panel");
    if (panel.querySelector("h2") && panel.querySelector("h2").textContent.startsWith(county)) {
      showDetail(county);
    }
  } catch (err) {
    console.error(`Assessment failed for ${county}:`, err);
    if (!assessments[county]) {
      assessments[county] = {
        level: "Low",
        explanation: "Assessment unavailable — check API key.",
        reportCount: window["REPORTS"].filter(r => r.county === county).length,
        county
      };
    }
    refreshMapColors();
  }
}

function showAnalyzing(county) {
  const panel = document.getElementById("detail-panel");
  if (!panel.querySelector("h2") || panel.querySelector("h2").textContent.startsWith(county)) {
    panel.innerHTML = `<h2>${county} County</h2><p class="analyzing">Analyzing...</p>`;
  }
}

function analyzeAll() {
  assessments = { ...window.ASSESSMENTS };
  refreshMapColors();
}

// Modal logic
function openModal(defaultCounty) {
  document.getElementById("modal").style.display = "flex";
  if (defaultCounty) {
    document.getElementById("form-county").value = defaultCounty;
  }
  toggleTravelInput();
  toggleAnimalInput();
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("report-form").reset();
}

function toggleTravelInput() {
  const show = document.getElementById("travel-yes").checked;
  document.getElementById("travel-dest-row").style.display = show ? "block" : "none";
}

function toggleAnimalInput() {
  const show = document.getElementById("animal-yes").checked;
  document.getElementById("animal-type-row").style.display = show ? "block" : "none";
}

function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const county = form.querySelector("#form-county").value;
  const symptoms = [...form.querySelectorAll(".symptom-check:checked")].map(c => c.value);
  const travelYes = form.querySelector("#travel-yes").checked;
  const travelDest = form.querySelector("#travel-dest").value.trim() || null;
  const animalYes = form.querySelector("#animal-yes").checked;
  const animalType = form.querySelector("#animal-type").value.trim() || null;
  const ageRange = form.querySelector("#form-age").value;

  const newReport = {
    id: "rpt_" + Date.now(),
    county,
    timestamp: new Date().toISOString(),
    symptoms: symptoms.length ? symptoms : ["unspecified"],
    recentTravel: travelYes,
    travelDestination: travelYes ? travelDest : null,
    animalContact: animalYes,
    animalType: animalYes ? animalType : null,
    ageRange
  };

  window.REPORTS.push(newReport);
  renderReportFeed();
  closeModal();
  showDetail(county);
  analyzeCounty(county);
}

// Boot
window.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadGeoJSON();
  renderReportFeed();
  analyzeAll();
  showDetail("Maricopa");

  document.getElementById("report-form").addEventListener("submit", handleFormSubmit);
  document.getElementById("travel-yes").addEventListener("change", toggleTravelInput);
  document.getElementById("travel-no").addEventListener("change", toggleTravelInput);
  document.getElementById("animal-yes").addEventListener("change", toggleAnimalInput);
  document.getElementById("animal-no").addEventListener("change", toggleAnimalInput);
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", e => {
    if (e.target === document.getElementById("modal")) closeModal();
  });
});
