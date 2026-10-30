import { useTranslation } from "react-i18next";
import { InvoiceBuilder } from "../../components/cashier/InvoiceBuilder";

export function CashierReceivePage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("cashier.receive")}</h1>
      <InvoiceBuilder kind="purchase" />
    </div>
  );
}
