import { useTranslation } from "react-i18next";
import { InvoiceList } from "../../components/cashier/InvoiceList";

export function CashierInvoicesPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("cashier.invoices")}</h1>
      <InvoiceList limit={300} />
    </div>
  );
}
