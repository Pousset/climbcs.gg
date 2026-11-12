import './report.css';

interface LockedSectionProps {
  title: string;
  description: string;
  /** Hidden from assistive tech: only decorative placeholder shapes are rendered. */
  previewLines?: number;
  onUpgrade?: () => void;
  upgradeLabel?: string;
}

/**
 * Teaser for a premium feature. The blurred preview is made of placeholder shapes only:
 * the real (locked) values are never sent by the API nor rendered here.
 */
export function LockedSection({
  title,
  description,
  previewLines = 3,
  onUpgrade,
  upgradeLabel = 'Débloquer avec Premium',
}: LockedSectionProps) {
  return (
    <section className="locked" aria-label={`${title} (verrouillé)`}>
      <div className="locked__preview" aria-hidden="true">
        {Array.from({ length: previewLines }, (_, index) => (
          <span key={index} className="locked__bar" style={{ width: `${88 - index * 17}%` }} />
        ))}
      </div>
      <div className="locked__body">
        <h4 className="locked__title">{title}</h4>
        <p className="locked__description">{description}</p>
        {onUpgrade && (
          <button type="button" className="btn btn--primary" onClick={onUpgrade}>
            {upgradeLabel}
          </button>
        )}
      </div>
    </section>
  );
}
