import { Tv, MousePointerClick, Trophy } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';

export function HowToBetCard() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <BorderBeam size={100} duration={12} colorFrom="#9146ff" colorTo="#10b981" />

      <div className="text-[11px] font-mono uppercase tracking-[0.3em] font-bold text-purple-400 mb-4">
        / comment parier
      </div>

      <ol className="space-y-4">
        <li className="flex gap-3">
          <div className="flex-shrink-0 h-7 w-7 rounded-full border border-purple-500/40 bg-purple-500/10 grid place-items-center">
            <Tv className="h-3.5 w-3.5 text-purple-300" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">étape 01</div>
            <div className="text-sm font-bold text-white mt-0.5">Lie ton compte Twitch</div>
            <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
              Depuis ton profil. Les mises sont débitées sur tes points de chaîne Wizebot — pas de carte
              bleue, pas d&apos;argent réel.
            </p>
          </div>
        </li>

        <li className="flex gap-3">
          <div className="flex-shrink-0 h-7 w-7 rounded-full border border-yellow-500/40 bg-yellow-500/10 grid place-items-center">
            <MousePointerClick className="h-3.5 w-3.5 text-yellow-300" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">étape 02</div>
            <div className="text-sm font-bold text-white mt-0.5">Choisis ton match et ta mise</div>
            <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
              Tout se passe ici, sur le site. Pari mutuel : la cote affichée est figée à l&apos;instant T mais
              le payout dépend du pool final.
            </p>
          </div>
        </li>

        <li className="flex gap-3">
          <div className="flex-shrink-0 h-7 w-7 rounded-full border border-emerald-500/40 bg-emerald-500/10 grid place-items-center">
            <Trophy className="h-3.5 w-3.5 text-emerald-300" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">étape 03</div>
            <div className="text-sm font-bold text-white mt-0.5">Crédit auto à la fin du match</div>
            <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
              Tes gains arrivent direct sur tes points Twitch via Wizebot. Match annulé = remboursement
              intégral.
            </p>
          </div>
        </li>
      </ol>
    </div>
  );
}
