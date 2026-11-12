import type { GatedReport, PremiumFeature, RatingBand } from '@cs2/core';
import { formatDecimal, formatPercent, formatRatio } from '../../lib/format';
import { LockedSection } from './LockedSection';
import { SEVERITY_LABEL, TIP_COPY } from './tipCopy';
import './report.css';

const BAND_LABEL: Record<RatingBand, string> = {
  below: 'Sous la moyenne',
  average: 'Dans la moyenne',
  above: 'Au-dessus de la moyenne',
};

const COMING_SOON: Partial<Record<PremiumFeature, { title: string; description: string }>> = {
  heatmaps: {
    title: 'Heatmaps de positionnement',
    description: 'Visualise où tu meurs et où tu gagnes tes duels sur la carte.',
  },
  utility: {
    title: 'Analyse des utilitaires',
    description: 'Flashs, fumigènes et grenades : lesquels ont réellement servi ?',
  },
};

interface ReportPanelProps {
  report: GatedReport;
  onUpgrade?: () => void;
}

export function ReportPanel({ report, onUpgrade }: ReportPanelProps) {
  const { basic, rating, kast, tips, hiddenTipCount, lockedFeatures } = report;
  const isLocked = (feature: PremiumFeature) => lockedFeatures.includes(feature);

  return (
    <article className="report" aria-label={`Rapport de ${report.player.name}`}>
      <header className="report__header">
        <h3>{report.player.name}</h3>
        <span className="report__plan">{report.plan === 'premium' ? 'Premium' : 'Gratuit'}</span>
      </header>

      <dl className="report__stats">
        <Stat label="K / D / A" value={`${basic.kills} / ${basic.deaths} / ${basic.assists}`} />
        <Stat label="Ratio K/D" value={formatDecimal(basic.kd)} />
        <Stat label="ADR" value={formatDecimal(basic.adr, 1)} />
        <Stat label="Headshots" value={formatPercent(basic.hsPercent)} />
        <Stat
          label="Note"
          value={rating.value !== null ? formatDecimal(rating.value) : BAND_LABEL[rating.band]}
          hint={rating.value !== null ? BAND_LABEL[rating.band] : 'Note exacte avec Premium'}
        />
        {kast !== null && <Stat label="KAST" value={formatRatio(kast)} />}
      </dl>

      {isLocked('kast') && (
        <LockedSection
          title="KAST et note détaillée"
          description="Régularité round par round : kills, assists, survie et trades."
          previewLines={2}
          onUpgrade={onUpgrade}
        />
      )}

      <section className="report__tips" aria-label="Conseils">
        <h4>Conseils</h4>
        {tips.length === 0 && hiddenTipCount === 0 && (
          <p className="muted">Pas assez de données pour formuler un conseil sur ce match.</p>
        )}
        <ul>
          {tips.map((tip) => (
            <li key={tip.id} className="report__tip">
              <span className="report__severity">{SEVERITY_LABEL[tip.severity]}</span>
              <strong>{TIP_COPY[tip.id].title}</strong>
              <p>{TIP_COPY[tip.id].body(tip.metrics)}</p>
            </li>
          ))}
        </ul>
        {hiddenTipCount > 0 && (
          <LockedSection
            title={`${hiddenTipCount} conseil${hiddenTipCount > 1 ? 's' : ''} de plus`}
            description="Tous les axes de progression détectés sur ce match."
            onUpgrade={onUpgrade}
          />
        )}
      </section>

      {(Object.keys(COMING_SOON) as PremiumFeature[]).filter(isLocked).map((feature) => (
        <LockedSection
          key={feature}
          title={COMING_SOON[feature]!.title}
          description={COMING_SOON[feature]!.description}
          previewLines={2}
          onUpgrade={onUpgrade}
        />
      ))}
    </article>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="report__stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {hint && <span className="muted report__hint">{hint}</span>}
    </div>
  );
}
