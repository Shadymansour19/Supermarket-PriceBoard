import { useTranslation } from "react-i18next";
import { RTL_LANGUAGES } from "../i18n";

/**
 * A collapse/expand indicator that points "forward" in reading direction
 * when collapsed (right in LTR, left in RTL) and down when expanded —
 * rotating one glyph rather than swapping characters, since rotating a
 * right-pointing triangle 90° always gives "down" regardless of language.
 */
export function Chevron({ open }: { open: boolean }) {
  const { i18n } = useTranslation();
  const isRtl = RTL_LANGUAGES.has(i18n.language);
  const rotation = open ? "rotate-90" : isRtl ? "rotate-180" : "rotate-0";

  return (
    <span aria-hidden="true" className={`inline-block transition-transform ${rotation}`}>
      ▸
    </span>
  );
}
