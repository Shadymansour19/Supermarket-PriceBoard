import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Granularity } from "../../lib/finance";
import { formatPrice } from "../../lib/localize";
import type { PaymentsBucket } from "../../types/database";

// Two categorical slots (blue, orange) from the validated reference
// palette — adjacent-pair separation holds under color-blindness, and the
// legend + table view mean identity never rests on color alone.
const COLOR_IN = "#2a78d6";
const COLOR_OUT = "#eb6834";

const W = 640;
const H = 240;
const PAD = { top: 12, right: 8, bottom: 28, left: 8 };

/** A "nice" axis maximum (1, 2, 5 × 10ⁿ) so gridlines land on round values. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

function bucketLabel(bucket: string, granularity: Granularity, lang: string): string {
  const date = new Date(`${bucket}T00:00:00`);
  const locale = lang === "ar" ? "ar" : "en";
  return granularity === "month"
    ? date.toLocaleDateString(locale, { month: "short", year: "2-digit" })
    : date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

/** Money in (sales) vs out (purchases) per period — grouped bars on one
 * shared axis, a hover/tap tooltip per period, and a plain table view. */
export function PaymentsChart({ data, granularity }: { data: PaymentsBucket[]; granularity: Granularity }) {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = niceMax(Math.max(0, ...data.flatMap((row) => [row.payments_in, row.payments_out])));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const groupW = plotW / Math.max(data.length, 1);
  const barW = Math.min(18, (groupW - 6) / 2);
  const y = (value: number) => PAD.top + plotH - (value / max) * plotH;
  // Dense views label every other period so the ticks don't collide.
  const labelEvery = data.length > 8 ? 2 : 1;
  const activeRow = active === null ? null : data[active];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="font-label flex items-center gap-4 text-xs text-neutral-600">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_IN }} />
            {t("finance.moneyIn")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_OUT }} />
            {t("finance.moneyOut")}
          </li>
        </ul>
        <button
          type="button"
          onClick={() => setShowTable((s) => !s)}
          className="text-xs font-medium text-emerald-700 hover:underline"
        >
          {t(showTable ? "finance.showChart" : "finance.showTable")}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="font-label w-full text-start text-sm">
            <thead className="border-b border-neutral-200 text-neutral-500">
              <tr>
                <th className="py-1.5 text-start font-medium">{t("finance.period")}</th>
                <th className="py-1.5 text-end font-medium">{t("finance.moneyIn")}</th>
                <th className="py-1.5 text-end font-medium">{t("finance.moneyOut")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {[...data].reverse().map((row) => (
                <tr key={row.bucket}>
                  <td className="py-1.5">{bucketLabel(row.bucket, granularity, i18n.language)}</td>
                  <td className="py-1.5 text-end">{formatPrice(row.payments_in, i18n.language)}</td>
                  <td className="py-1.5 text-end">{formatPrice(row.payments_out, i18n.language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div dir="ltr" className="relative min-w-[560px]">
            {activeRow && (
              <div className="font-label pointer-events-none absolute start-2 top-0 z-10 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
                <p className="font-semibold text-neutral-900">{bucketLabel(activeRow.bucket, granularity, i18n.language)}</p>
                <p className="text-neutral-600">
                  {t("finance.moneyIn")}: {formatPrice(activeRow.payments_in, i18n.language)}
                </p>
                <p className="text-neutral-600">
                  {t("finance.moneyOut")}: {formatPrice(activeRow.payments_out, i18n.language)}
                </p>
              </div>
            )}
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-auto w-full"
              role="img"
              aria-label={t("finance.chartLabel")}
              onMouseLeave={() => setActive(null)}
            >
              {[0, 0.5, 1].map((fraction) => (
                <line
                  key={fraction}
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(max * fraction)}
                  y2={y(max * fraction)}
                  stroke="#e5e5e5"
                  strokeWidth={1}
                />
              ))}
              <text x={PAD.left} y={PAD.top - 2} fontSize={11} fill="#737373">
                {formatPrice(max, i18n.language)}
              </text>
              {data.map((row, index) => {
                const x0 = PAD.left + index * groupW + (groupW - (barW * 2 + 2)) / 2;
                const bar = (value: number, x: number, color: string) => {
                  const top = y(value);
                  const height = Math.max(PAD.top + plotH - top, value > 0 ? 2 : 0);
                  return (
                    <rect x={x} y={PAD.top + plotH - height} width={barW} height={height} rx={3} fill={color} />
                  );
                };
                return (
                  <g key={row.bucket}>
                    {/* Full-height transparent hit area, wider than the bars. */}
                    <rect
                      x={PAD.left + index * groupW}
                      y={PAD.top}
                      width={groupW}
                      height={plotH}
                      fill={active === index ? "#0000000d" : "transparent"}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => setActive(active === index ? null : index)}
                    />
                    {bar(row.payments_in, x0, COLOR_IN)}
                    {bar(row.payments_out, x0 + barW + 2, COLOR_OUT)}
                    {index % labelEvery === (data.length - 1) % labelEvery && (
                      <text x={PAD.left + index * groupW + groupW / 2} y={H - 8} fontSize={11} fill="#737373" textAnchor="middle">
                        {bucketLabel(row.bucket, granularity, i18n.language)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
