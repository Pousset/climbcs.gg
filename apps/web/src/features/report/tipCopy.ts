import type { Tip, TipId, TipSeverity } from '@cs2/core';
import { formatDecimal, formatPercent, formatRatio } from '../../lib/format';

interface TipCopy {
  title: string;
  body: (metrics: Tip['metrics']) => string;
}

/** French wording of each coaching tip. The core only emits ids and measured values. */
export const TIP_COPY: Record<TipId, TipCopy> = {
  LOW_KAST: {
    title: 'Tu joues trop isolé',
    body: (m) =>
      `Tu contribues à ${formatRatio(m['kast'] ?? 0)} des rounds (kill, assist, survie ou trade). Reste plus proche de tes coéquipiers pour être vengé et reprendre les duels à plusieurs.`,
  },
  UNTRADED_DEATHS: {
    title: 'Tes morts ne sont pas vengées',
    body: (m) =>
      `${formatRatio(m['untradedRatio'] ?? 0)} de tes ${m['deaths'] ?? 0} morts n’ont pas été tradées. Avance à deux : un coéquipier doit pouvoir te venger dans les 5 secondes.`,
  },
  LOW_HEADSHOT: {
    title: 'Vise plus haut',
    body: (m) =>
      `Seulement ${formatPercent(m['hsPercent'] ?? 0)} de tes kills sont des headshots. Garde le viseur à hauteur de tête avant d’ouvrir un angle.`,
  },
  LOW_DAMAGE: {
    title: 'Pas assez d’impact',
    body: (m) =>
      `${formatDecimal(m['adr'] ?? 0, 0)} dégâts par round, c’est sous la moyenne. Cherche les premiers duels, utilise tes flashs et inflige des dégâts avant de mourir.`,
  },
  HIGH_DAMAGE: {
    title: 'Gros impact',
    body: (m) =>
      `${formatDecimal(m['adr'] ?? 0, 0)} dégâts par round : excellent. Continue à prendre ces duels et à entraîner l’équipe avec toi.`,
  },
};

/** Severity is always shown as text, never by color alone. */
export const SEVERITY_LABEL: Record<TipSeverity, string> = {
  high: 'Priorité haute',
  medium: 'À améliorer',
  low: 'Détail',
  info: 'Point fort',
};
