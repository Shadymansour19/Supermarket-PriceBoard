import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);

  // Keep the input in sync if the value is reset from outside (e.g. nav change).
  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (draft !== value) onChange(draft);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <input
      type="search"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      placeholder={placeholder ?? t("search.placeholder")}
      className="font-label w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    />
  );
}
