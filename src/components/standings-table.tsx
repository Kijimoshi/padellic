import type { StandingRow } from "@/lib/padel";
import { cn } from "@/lib/utils";

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Add players to see the leaderboard.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-strong/60 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">#</th>
            <th className="px-3 py-2 text-left font-medium">Player</th>
            <th className="px-3 py-2 text-right font-medium">P</th>
            <th className="px-3 py-2 text-right font-medium">W</th>
            <th className="px-3 py-2 text-right font-medium">+/-</th>
            <th className="px-3 py-2 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.playerId} className="border-t border-border/70">
              <td
                className={cn(
                  "px-3 py-2 tabular text-muted-foreground",
                  i === 0 && "font-bold text-primary",
                )}
              >
                {i + 1}
              </td>
              <td className="px-3 py-2 font-medium">{row.name}</td>
              <td className="px-3 py-2 text-right tabular text-muted-foreground">{row.played}</td>
              <td className="px-3 py-2 text-right tabular text-muted-foreground">{row.wins}</td>
              <td className="px-3 py-2 text-right tabular text-muted-foreground">
                {row.diff > 0 ? `+${row.diff}` : row.diff}
              </td>
              <td className="px-3 py-2 text-right font-display text-base font-bold tabular">
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
