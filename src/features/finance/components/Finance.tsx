"use client";

import { Download } from "lucide-react";
import { PageHeader } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { fieldStyles, Label } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, Spinner } from "@/components/ui/States";
import { Table, TableCard, Td, Th, Tr } from "@/components/ui/Table";
import { formatDay, formatMoney, formatMonthRange, formatPrice } from "@/lib/format";
import { cn, plural } from "@/lib/utils";
import { csvUrl } from "../api/finance.api";
import { useFinance } from "../hooks/useFinance";
import { addMonths, MAX_PERIOD_MONTHS } from "@/lib/domain/period";
import { RevenueByMonth } from "./RevenueByMonth";

/** Admin · Finance (spec F-13). */
export function Finance() {
  const { period, summary, isSummaryLoading, transactions, pagination, isFetching, setPeriod, setPage } = useFinance();
  const shown = summary?.period;

  const onRange = (from: string, to: string) => {
    if (!from || !to) return;
    // Keep the range valid: move the other end when the user crosses or stretches it.
    if (from > to) to = from;
    if (addMonths(from, MAX_PERIOD_MONTHS - 1) < to) from = addMonths(to, -(MAX_PERIOD_MONTHS - 1));
    setPeriod(from, to);
  };

  return (
    <>
      <PageHeader
        title="Finance"
        description={shown ? `${formatMonthRange(shown.from, shown.to)} · all amounts in USD` : "All amounts in USD"}
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="fin-from" className="text-xs">
                From
              </Label>
              <input
                id="fin-from"
                type="month"
                value={shown?.from ?? period.from}
                max={shown?.to}
                onChange={(e) => onRange(e.target.value, shown?.to ?? e.target.value)}
                className={cn(fieldStyles, "h-9 w-40")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="fin-to" className="text-xs">
                To
              </Label>
              <input
                id="fin-to"
                type="month"
                value={shown?.to ?? period.to}
                min={shown?.from}
                onChange={(e) => onRange(shown?.from ?? e.target.value, e.target.value)}
                className={cn(fieldStyles, "h-9 w-40")}
              />
            </div>
            <a href={csvUrl(shown ?? period)} download className={buttonStyles({ variant: "outline", size: "md", className: "h-9" })}>
              <Download className="size-4" aria-hidden /> Export CSV
            </a>
          </div>
        }
      />

      {isSummaryLoading || !summary ? (
        <Spinner label="Loading finance" />
      ) : (
        <div className={cn("flex flex-col gap-7 transition-opacity", isFetching && "opacity-70")} aria-busy={isFetching}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <Kpi label="Confirmed revenue" value={formatPrice(summary.confirmedRevenueCents)} sub={plural(summary.approvedBookings, "approved booking")} />
            <Kpi label="Awaiting decision" value={formatPrice(summary.awaitingCents)} sub={plural(summary.pendingRequests, "pending request")} />
            <Kpi label="Refunded" value={formatPrice(summary.refundedCents)} sub={plural(summary.cancellations, "cancellation")} />
            <Kpi label="Average booking" value={formatPrice(summary.averageBookingCents)} sub="Confirmed only" />
          </div>

          <div className="flex flex-wrap items-stretch gap-5">
            <RevenueByMonth months={summary.byMonth} />
            <TableCard title="Revenue by hotel" className="flex-[2_1_320px]">
              {summary.byHotel.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-muted">No revenue in this period.</p>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th scope="col">Hotel</Th>
                      <Th scope="col" className="text-right">
                        Bookings
                      </Th>
                      <Th scope="col" className="text-right">
                        Revenue
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byHotel.map((h) => (
                      <Tr key={h.hotelId}>
                        <Td>{h.hotelName}</Td>
                        <Td className="text-right">{h.bookings}</Td>
                        <Td className="text-right">{formatPrice(h.netCents)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </TableCard>
          </div>

          <TableCard title="Recent transactions">
            {transactions.length === 0 ? (
              <div className="p-5 pt-0">
                <EmptyState className="p-8">No transactions in this period.</EmptyState>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th scope="col">Date</Th>
                    <Th scope="col">Booking</Th>
                    <Th scope="col">Guest</Th>
                    <Th scope="col">Hotel</Th>
                    <Th scope="col">Type</Th>
                    <Th scope="col">Status</Th>
                    <Th scope="col" className="text-right">
                      Amount
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <Tr key={t.id}>
                      <Td>{formatDay(t.createdAt)}</Td>
                      <Td>{t.ref}</Td>
                      <Td>{t.guestName}</Td>
                      <Td>{t.hotelName}</Td>
                      <Td>{t.type === "payment" ? "Payment" : "Refund"}</Td>
                      <Td>{t.type === "payment" ? <Badge tone="green">Paid</Badge> : <Badge tone="grey">Refunded</Badge>}</Td>
                      <Td className="text-right">{t.type === "refund" ? `−${formatMoney(t.amountCents)}` : formatMoney(t.amountCents)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </TableCard>
          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalDocs={pagination.totalDocs}
              label="transactions"
              onChange={setPage}
            />
          )}
        </div>
      )}
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[28px] font-semibold tracking-[-0.02em]">{value}</span>
      <span className="text-[13px] text-muted">{sub}</span>
    </div>
  );
}
