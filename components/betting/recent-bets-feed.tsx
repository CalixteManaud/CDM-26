import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Activity, CheckCircle2, X, Clock, AlertTriangle } from 'lucide-react';

type Bet = {
  id: string;
  outcome: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN';
  pointsWagered: number;
  oddsAtPlacement: { toString(): string } | number;
  status: string;
  createdAt: string | Date;
  user: { twitchUsername: string | null; username: string | null };
  match: {
    id: string;
    matchDate: string | Date;
    homeTeam: { shortName: string };
    awayTeam: { shortName: string };
  };
};

const outcomeLabel: Record<Bet['outcome'], { text: string; cls: string }> = {
  HOME_WIN: { text: 'Domicile', cls: 'text-emerald-400 border-emerald-500/30' },
  DRAW: { text: 'Nul', cls: 'text-yellow-400 border-yellow-500/30' },
  AWAY_WIN: { text: 'Extérieur', cls: 'text-red-400 border-red-500/30' },
};

const statusMeta: Record<string, { icon: typeof Clock; cls: string; label: string }> = {
  PENDING: { icon: Clock, cls: 'text-white/50', label: 'PEND' },
  WON: { icon: CheckCircle2, cls: 'text-emerald-400', label: 'WON' },
  LOST: { icon: X, cls: 'text-red-400/70', label: 'LOST' },
  VOID: { icon: AlertTriangle, cls: 'text-white/40', label: 'VOID' },
  CREDIT_FAILED: { icon: AlertTriangle, cls: 'text-orange-400', label: 'FAIL' },
  CANCELED: { icon: X, cls: 'text-white/40', label: 'CXL' },
};

function anonymize(u: Bet['user']): string {
  if (u.twitchUsername) return `@${u.twitchUsername}`;
  if (u.username) return u.username;
  return 'anonyme';
}

export function RecentBetsFeed({ bets, variant = 'page' }: { bets: Bet[]; variant?: 'page' | 'widget' }) {
  if (bets.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <Activity className="h-8 w-8 text-white/20 mx-auto mb-3" />
        <div className="text-sm font-mono uppercase tracking-[0.24em] text-white/40">
          / pas encore de paris
        </div>
        <div className="text-xs text-white/30 mt-2 font-mono">
          tape <span className="text-yellow-400">!parier</span> dans le chat Twitch
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] font-bold text-purple-400">
          <Activity className="h-3.5 w-3.5" />
          / flux temps réel
        </div>
      </div>

      <ul className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
        {bets.map((bet) => {
          const oc = outcomeLabel[bet.outcome];
          const status = statusMeta[bet.status] ?? statusMeta.PENDING;
          const StatusIcon = status.icon;
          const odds = Number(bet.oddsAtPlacement);

          return (
            <li key={bet.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03]">
              <StatusIcon className={`h-3.5 w-3.5 flex-shrink-0 ${status.cls}`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-white font-mono text-[11px] truncate max-w-[100px]">
                    {anonymize(bet.user)}
                  </span>
                  <span className="text-white/30 text-[10px]">·</span>
                  <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${oc.cls}`}>
                    {oc.text}
                  </span>
                </div>
                {variant === 'page' && (
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mt-0.5 truncate">
                    {bet.match.homeTeam.shortName} <span className="text-white/20">vs</span> {bet.match.awayTeam.shortName}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end flex-shrink-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-yellow-400 tabular-nums">
                    {bet.pointsWagered.toLocaleString('fr-FR')}
                  </span>
                  <span className="text-[10px] font-mono text-white/40 uppercase">pts</span>
                </div>
                <div className="text-[10px] font-mono text-white/45 tabular-nums">
                  ×{odds.toFixed(2)} · {formatDistanceToNow(new Date(bet.createdAt), { locale: fr, addSuffix: false })}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
