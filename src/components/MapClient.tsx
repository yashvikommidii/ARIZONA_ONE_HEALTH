"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "@/components/LanguageProvider";
import { MapApiResponse, RiskLevel } from "@/lib/map-data";

const levelColor: Record<RiskLevel, string> = {
  Low: "#5DCAA5",
  Moderate: "#EF9F27",
  High: "#F0997B",
};

export function MapClient({ initialData }: { initialData: MapApiResponse }) {
  const { tx } = useLanguage();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(
    initialData.assessments[0]?.county ?? null
  );

  const byCounty = useMemo(
    () => new Map(initialData.assessments.map((a) => [a.county, a])),
    [initialData.assessments]
  );
  const selectedAssessment = selectedCounty ? byCounty.get(selectedCounty) : undefined;
  const topSignal = selectedAssessment?.topDiseases?.[0];
  const explanation = selectedAssessment
    ? tx.mapExplanationTemplate
        .replace("{county}", selectedAssessment.county)
        .replace("{level}", selectedAssessment.level)
        .replace("{reports}", String(selectedAssessment.reportCount))
        .replace("{risk}", String(selectedAssessment.communityRiskPercent))
        .replace("{disease}", topSignal?.disease ?? tx.na)
        .replace("{count}", String(topSignal?.count ?? 0))
    : "";

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let disposed = false;

    const createMap = async () => {
      const L = await import("leaflet");
      if (disposed || !mapRef.current) return;

      const map = L.map(mapRef.current, { zoomControl: true }).setView([34.2, -111.8], 6.5);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const styleFeature = (feature: any) => {
        const countyName = feature?.properties?.name as string;
        const assessment = byCounty.get(countyName);
        return {
          fillColor: assessment ? levelColor[assessment.level] : "#d9d9d9",
          fillOpacity: 0.72,
          color: "#ffffff",
          weight: selectedCounty === countyName ? 2.2 : 1,
        };
      };

      const onEachFeature = (feature: any, layer: any) => {
        const countyName = feature?.properties?.name as string;
        layer.on("click", () => {
          setSelectedCounty(countyName);
        });
        layer.bindTooltip(countyName, { sticky: true });
      };

      const geoLayer = L.geoJSON(initialData.geojson as any, {
        style: styleFeature,
        onEachFeature,
      }).addTo(map);
      layerRef.current = geoLayer;
    };

    createMap();

    return () => {
      disposed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      layerRef.current = null;
    };
  }, [initialData.geojson, byCounty, selectedCounty]);

  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.setStyle((feature: any) => {
      const countyName = feature?.properties?.name as string;
      const assessment = byCounty.get(countyName);
      return {
        fillColor: assessment ? levelColor[assessment.level] : "#d9d9d9",
        fillOpacity: 0.72,
        color: "#ffffff",
        weight: selectedCounty === countyName ? 2.2 : 1,
      };
    });
  }, [selectedCounty, byCounty]);

  return (
    <main className="container map-shell">
      <section className="card">
        <h3>{tx.mapTitle}</h3>
        <p className="home-muted">{tx.mapSubtitle}</p>
      </section>

      <section className="map-layout">
        <aside className="card map-feed">
          <h4>{tx.mapLiveReports}</h4>
          <p className="home-muted map-feed-note">{tx.mapSyntheticTimeNote}</p>
          {initialData.reports.length ? (
            <div className="map-feed-list">
              {initialData.reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  className="map-feed-item"
                  onClick={() => setSelectedCounty(report.county)}
                >
                  <strong>{report.county}</strong>
                  <span>
                    {report.disease} - ZIP {report.zipCode}
                  </span>
                  <small>
                    {new Date(report.submittedAt).toLocaleDateString()}{" "}
                    {new Date(report.submittedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <p className="home-muted">{tx.mapNoRecentReports}</p>
          )}
        </aside>

        <div className="card map-canvas-wrap">
          <div ref={mapRef} className="map-canvas" />
          <div className="map-legend">
            <span>
              <i style={{ background: levelColor.Low }} /> {tx.mapLegendLow}
            </span>
            <span>
              <i style={{ background: levelColor.Moderate }} /> {tx.mapLegendModerate}
            </span>
            <span>
              <i style={{ background: levelColor.High }} /> {tx.mapLegendHigh}
            </span>
          </div>
        </div>

        <aside className="card map-detail">
          {!selectedAssessment ? (
            <>
              <h4>{tx.mapSelectCounty}</h4>
              <p className="home-muted">{tx.mapSelectCountyHint}</p>
            </>
          ) : (
            <>
              <h4>{selectedAssessment.county}</h4>
              <div className="map-explanation-box">
                <h5>{tx.mapExplanationTitle}</h5>
                <p>{explanation}</p>
              </div>
              <p>
                {tx.mapRiskLevel}: <strong>{selectedAssessment.level}</strong>
              </p>
              <p>
                {tx.mapCommunityRisk}: <strong>{selectedAssessment.communityRiskPercent}%</strong>
              </p>
              <p>
                {tx.mapWeeklyReports}: <strong>{selectedAssessment.reportCount}</strong>
              </p>
              <h5>{tx.mapTopDiseases}</h5>
              {selectedAssessment.topDiseases.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>{tx.rank}</th>
                      <th>{tx.disease}</th>
                      <th>{tx.sickReportsLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAssessment.topDiseases.map((row, idx) => (
                      <tr key={`${row.disease}-${idx}`}>
                        <td>{idx + 1}</td>
                        <td>{row.disease}</td>
                        <td>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="home-muted">{tx.mapNoDiseaseData}</p>
              )}
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
