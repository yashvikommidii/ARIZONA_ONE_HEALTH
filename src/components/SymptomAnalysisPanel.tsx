import { useLanguage } from "@/components/LanguageProvider";

export type SymptomAnalysis = {
  likelyConcern: string;
  symptomMatches: string[];
  area: {
    county: string;
    zipCode: string;
    communityRiskPercent: number;
    communityRiskBand: "Low" | "Moderate" | "High";
    topDiseaseSignals: { disease: string; count: number; rank: number }[];
    localMatch: boolean;
  };
  personalRiskBand: "Low" | "Moderate" | "High";
  nextSteps: string[];
  confidenceNote: string;
};

type Props = {
  analysis: SymptomAnalysis;
  compact?: boolean;
  onAskFollowUp?: () => void;
};

export function SymptomAnalysisPanel({ analysis, compact = false, onAskFollowUp }: Props) {
  const { tx } = useLanguage();
  const topSignal = analysis.area.topDiseaseSignals[0];
  const riskClass = analysis.personalRiskBand.toLowerCase();

  return (
    <section className={`symptom-panel ${compact ? "compact" : ""}`}>
      <div className="symptom-panel-head">
        <span>{tx.aiRiskInterpretation}</span>
        <strong className={`symptom-risk-pill ${riskClass}`}>{analysis.personalRiskBand}</strong>
      </div>

      <div className="symptom-panel-block">
        <h4>{tx.likelyConcern}</h4>
        <p>{analysis.likelyConcern}</p>
        <span>{tx.symptomsMatch}: {analysis.symptomMatches.join(" + ")}</span>
      </div>

      <div className="symptom-panel-block">
        <h4>{tx.yourArea} ({analysis.area.county} {tx.county})</h4>
        <ul>
          <li>
            {topSignal
              ? `${topSignal.disease} ${tx.currentlyRankedSignal} #${topSignal.rank} ${tx.signal} (${topSignal.count} ${tx.reportsThisWeek})`
              : tx.noStrongDiseaseSignal}
          </li>
          <li>
            {tx.communityRisk}: {analysis.area.communityRiskBand} ({analysis.area.communityRiskPercent}%)
          </li>
          <li>
            {analysis.area.localMatch ? tx.localMatchYes : tx.localMatchNo}
          </li>
        </ul>
      </div>

      <div className="symptom-panel-block">
        <h4>{tx.recommendedNextSteps}</h4>
        <ul>
          {analysis.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>

      <p className="symptom-confidence">{analysis.confidenceNote}</p>
      {onAskFollowUp ? (
        <button type="button" className="symptom-followup-btn" onClick={onAskFollowUp}>
          {tx.askChatbotFollowUp}
        </button>
      ) : null}
    </section>
  );
}
