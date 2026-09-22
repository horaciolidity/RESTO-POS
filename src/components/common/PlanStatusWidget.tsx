import { Link } from 'react-router-dom';
import { UserProfile } from '../../store/useAuthStore';
import { Order } from '../../store/useOrdersStore';

interface Props {
  user: UserProfile;
  orders: Order[];
}

export default function PlanStatusWidget({ user, orders }: Props) {
  const planType = user.planType || 'free';

  // --- FREE PLAN ---
  if (planType === 'free') {
    const paidCount = orders.filter(o => o.paid).length;
    const remaining = Math.max(0, 50 - paidCount);
    const pct = Math.min(100, Math.round((paidCount / 50) * 100));
    const circumference = 2 * Math.PI * 11;
    const dashArray = `${Math.round(circumference * pct / 100)} ${Math.round(circumference)}`;

    return (
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs ml-4 shrink-0">
        <div className="relative w-8 h-8 shrink-0">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="11" strokeWidth="2.5" stroke="rgba(245,158,11,0.2)" fill="none" />
            <circle cx="14" cy="14" r="11" strokeWidth="2.5" stroke="#f59e0b" fill="none"
              strokeDasharray={dashArray}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-amber-400">{pct}%</span>
        </div>
        <div className="leading-tight">
          <p className="font-black text-amber-400">Prueba Gratis</p>
          <p className="text-amber-500/80">
            {remaining > 0
              ? <><b>{paidCount}</b>/50 ventas</>
              : <span className="text-red-400 font-bold">¡Límite agotado!</span>}
          </p>
        </div>
        <Link
          to="/settings#miplan"
          className="ml-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-white text-[10px] font-black rounded-lg transition-all whitespace-nowrap"
        >
          Mejorar
        </Link>
      </div>
    );
  }

  // --- PAID PLAN (standard / pro) ---
  if (planType === 'standard' || planType === 'pro') {
    const endDate = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
    const daysLeft = endDate
      ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    const isExpired  = daysLeft !== null && daysLeft <= 0;
    const isExpiring = daysLeft !== null && daysLeft <= 7 && !isExpired;

    const bgColor   = isExpired ? 'bg-red-500/10 border-red-500/30'
                    : isExpiring ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-green-500/10 border-green-500/30';
    const dotColor  = isExpired ? 'bg-red-400'
                    : isExpiring ? 'bg-amber-400 animate-pulse'
                    : 'bg-green-400 animate-pulse';
    const textColor = isExpired ? 'text-red-400'
                    : isExpiring ? 'text-amber-400'
                    : 'text-green-400';

    return (
      <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border ml-4 shrink-0 ${bgColor}`}>
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
        <div className="leading-tight">
          <p className={`font-black ${textColor}`}>
            Plan {planType === 'pro' ? 'Pro' : 'Estándar'}
          </p>
          <p className="text-muted-foreground">
            {isExpired
              ? <span className="text-red-400 font-bold">Vencido</span>
              : daysLeft !== null
                ? <><b>{daysLeft}</b> días</>
                : 'Activo ✓'}
          </p>
        </div>
        {(isExpiring || isExpired) && (
          <Link
            to="/settings#miplan"
            className="ml-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-white text-[10px] font-black rounded-lg transition-all whitespace-nowrap"
          >
            Renovar
          </Link>
        )}
      </div>
    );
  }

  return null;
}
