import { useTranslation } from "react-i18next";
import { InvoiceBuilder } from "../../components/cashier/InvoiceBuilder";

export function CashierSellPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("cashier.sell")}</h1>
      <InvoiceBuilder kind="sale" />
    </div>
  );
}
