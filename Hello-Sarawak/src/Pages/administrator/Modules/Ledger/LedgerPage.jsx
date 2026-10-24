import React, { useEffect, useMemo, useRef, useState } from "react";
import "./LedgerPage.css";
import "../../../../Component/MainContent/MainContent.css";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const money = (value) => `RM ${parseFloat(value || 0).toFixed(2)}`;

const normalizeStatusText = (status) => {
  const s = String(status || "").trim().toLowerCase();

  if (s === "partial paid" || s === "partially paid") return "Partially Paid";
  if (s === "paid") return "Paid";
  if (s === "expired") return "Expired";
  if (s === "cancelled" || s === "canceled") return "Cancelled";
  if (s === "payment pending") return "Payment Pending";
  if (s === "deducted") return "Deducted";
  if (s === "restored") return "Restored";
  if (s === "reserved") return "Reserved";

  return status || "—";
};

const getStatusKey = (status) =>
  normalizeStatusText(status).toLowerCase().replace(/\s+/g, "-");

const StatusPill = ({ value }) => {
  const displayValue = normalizeStatusText(value);

  return (
    <span className={`ledger-status-pill status-${getStatusKey(displayValue)}`}>
      {displayValue}
    </span>
  );
};

const getPaymentLabel = (row) => {
  const status = normalizeStatusText(row.booking_status).toLowerCase();

  if (status === "partially paid") return "Deposit Paid";
  if (status === "paid") return "Payment Successful";
  if (status === "cancelled") return "Booking Cancelled";
  if (status === "expired") return "Booking Expired";
  if (status === "accepted") return "Booking Accepted";
  if (status === "payment pending") return "Payment Pending";

  return row.activity_type || "Ledger Record";
};

const getPaymentClass = (row) => {
  const status = normalizeStatusText(row.booking_status).toLowerCase();

  if (status === "paid") return "payment-success";
  if (status === "partially paid") return "payment-partial";
  if (status === "cancelled" || status === "expired") return "payment-danger";
  if (status === "accepted" || status === "payment pending") return "payment-pending";

  return "payment-default";
};

const getOperatorLabel = (row) => {
  const role = String(row.operator_role || "").toLowerCase();

  if (role === "administrator") return "Administrator";
  if (role === "owner") return "Owner";
  return "Moderator";
};

const getPaymentExplanation = (row) => {
  const status =
    normalizeStatusText(
      row.booking_status
    ).toLowerCase();

  const activityType =
    String(row.activity_type || "")
      .trim()
      .toLowerCase();

  // Manual Restock refund
  if (
    status === "cancelled" &&
    activityType === "manual restock"
  ) {
    return {
      title:
        "Booking was manually restocked and the refund was recorded.",

      creditLabel:
        "Operator Earning After Refund",

      debitLabel:
        "Refund Amount",

      expectedLabel:
        "Revenue Retained",
    };
  }

  if (status === "partially paid") {
    return {
      title:
        "Deposit received. Balance is still pending.",

      creditLabel:
        "Balance Remaining",

      debitLabel:
        "Deposit Paid",

      expectedLabel:
        "Total Booking Amount",
    };
  }

  if (status === "paid") {
    return {
      title:
        "Payment completed. Operator earning is ready.",

      creditLabel:
        "Operator Earning",

      debitLabel:
        "Deposit / Debit",

      expectedLabel:
        "Total Paid Amount",
    };
  }

  if (status === "cancelled") {
    return {
      title:
        "Booking was cancelled. Stock has been restored.",

      creditLabel:
        "Credit",

      debitLabel:
        "Debit",

      expectedLabel:
        "Booking Amount",
    };
  }

  if (status === "expired") {
    return {
      title:
        "Booking expired due to payment deadline. Stock has been restored.",

      creditLabel:
        "Credit",

      debitLabel:
        "Debit",

      expectedLabel:
        "Booking Amount",
    };
  }

  if (
    status === "accepted" ||
    status === "payment pending"
  ) {
    return {
      title:
        "Booking is waiting for payment confirmation.",

      creditLabel:
        "Credit",

      debitLabel:
        "Debit",

      expectedLabel:
        "Booking Amount",
    };
  }

  return {
    title:
      "Booking record.",

    creditLabel:
      "Credit",

    debitLabel:
      "Debit",

    expectedLabel:
      "Expected Amount",
  };
};

const isHiddenRemark = (remark) => {
  const text = String(remark || "").toLowerCase().trim();

  return (
    text.includes("imported from past reservations") ||
    text.includes("imported") ||
    text.includes("customer paid deposit fee") ||
    text.includes("customer completed balance payment") ||
    text.includes("customer made instant full payment") ||
    text.includes("customer completed payment") ||
    text.includes("payment completed") ||
    text.includes("synced from reservation payment status")
  );
};

const SummaryCard = ({ title, value, type, isRaw = false, helper }) => (
  <div className={`ledger-summary-card ${type}`}>
    <div className="ledger-summary-title">{title}</div>
    <div className="ledger-summary-value">
      {isRaw ? value || 0 : money(value)}
    </div>
    {helper && <div className="ledger-summary-helper">{helper}</div>}
  </div>
);

const AmountBox = ({ label, value, type, emptyText = "—" }) => {
  const amount = parseFloat(value || 0);

  return (
    <div className={`ledger-amount-box ${type}`}>
      <span className="ledger-amount-label">{label}</span>
      <strong className="ledger-amount-value">
        {amount > 0 ? money(amount) : emptyText}
      </strong>
    </div>
  );
};

const LedgerGuide = () => (
  <div className="ledger-status-guide">
    <div className="ledger-status-guide-card partial">
      <div className="ledger-status-guide-top">
        <div>
          <span className="ledger-status-guide-badge partial">Partially Paid</span>
          <h4>Deposit booking</h4>
        </div>
        <span className="ledger-status-guide-icon">💳</span>
      </div>

      <div className="ledger-status-guide-body">
        <div className="ledger-status-guide-item">
          <span className="guide-label">Deposit Paid</span>
          <span className="guide-text">The first payment already paid by customer.</span>
        </div>

        <div className="ledger-status-guide-item">
          <span className="guide-label">Balance Remaining</span>
          <span className="guide-text">The amount customer still needs to pay later.</span>
        </div>

        <div className="ledger-status-guide-item">
          <span className="guide-label">Total Booking Amount</span>
          <span className="guide-text">The full price for the booking.</span>
        </div>
      </div>
    </div>

    <div className="ledger-status-guide-card paid">
      <div className="ledger-status-guide-top">
        <div>
          <span className="ledger-status-guide-badge paid">Paid</span>
          <h4>Full payment completed</h4>
        </div>
        <span className="ledger-status-guide-icon">✅</span>
      </div>

      <div className="ledger-status-guide-body">
        <div className="ledger-status-guide-item">
          <span className="guide-label">Operator Earning</span>
          <span className="guide-text">The amount operator earns after commission.</span>
        </div>

        <div className="ledger-status-guide-item">
          <span className="guide-label">Total Paid Amount</span>
          <span className="guide-text">The final amount paid by customer.</span>
        </div>

        <div className="ledger-status-guide-item">
          <span className="guide-label">Commission</span>
          <span className="guide-text">The platform fee deducted from the booking.</span>
        </div>
      </div>
    </div>
  </div>
);

export default function LedgerPage() {
    const ledgerTopRef = useRef(null);
  const userid =
    localStorage.getItem("userid") ||
    localStorage.getItem("userId") ||
    localStorage.getItem("userID");

  const [ledgerRows, setLedgerRows] = useState([]);
  const [summary, setSummary] = useState({
    total_credit: 0,
    total_debit: 0,
    total_expected: 0,
    total_commission: 0,
    total_transactions: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
const [sortOrder, setSortOrder] = useState("reservation_latest");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const limit = 10;
useEffect(() => {
  setPage(1);
}, [searchText, statusFilter, selectedDate, sortOrder]);

  useEffect(() => {
    if (!userid) return;
    fetchLedger();
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [userid, page, searchText, statusFilter, selectedDate, sortOrder]);

  const fetchLedger = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const params = new URLSearchParams({
        userid,
        page: String(page),
        limit: String(limit),
        search: searchText || "",
        status: statusFilter || "",
        selectedDate: selectedDate || "",
        sortOrder: sortOrder || "latest",
      });

      const res = await fetch(
  `${BASE_URL}/ledger?${params.toString()}`,
  {
    method: "GET",
    cache: "no-store",
  }
);
      const data = await res.json();

      if (!res.ok) {
        console.error("Ledger API error:", data);
        setLedgerRows([]);
        setErrorMsg(data.message || "Failed to load ledger records.");
        return;
      }

      setLedgerRows(data.ledger || []);

      setPagination(
        data.pagination || {
          total: 0,
          page: 1,
          limit,
          totalPages: 1,
        }
      );

      if (
        (data.pagination?.total || 0) > 0 &&
        (data.ledger || []).length === 0 &&
        page > 1
      ) {
        setPage(1);
      }
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
      setLedgerRows([]);
      setErrorMsg("Unable to connect to ledger service.");
    } finally {
      setLoading(false);
    }
  };

const fetchSummary = async () => {
  try {
    const params = new URLSearchParams({
      userid,
      selectedDate: selectedDate || "",
      status: statusFilter || "",
      search: searchText || "",
    });

    const res = await fetch(
  `${BASE_URL}/ledger/summary?${params.toString()}`,
  {
    method: "GET",
    cache: "no-store",
  }
);
    const data = await res.json();

    setSummary(
      data.summary || {
        total_credit: 0,
        total_debit: 0,
        total_expected: 0,
        total_commission: 0,
        total_transactions: 0,
      }
    );
  } catch (err) {
    console.error("Failed to fetch summary:", err);
  }
};

const resetFilters = () => {
  setSearchText("");
  setStatusFilter("");
  setSelectedDate("");
setSortOrder("reservation_latest");
  setPage(1);
};

  const activeFilterText = useMemo(() => {
    const filters = [];
    if (selectedDate) filters.push(`Date: ${selectedDate}`);
    if (statusFilter) filters.push(`Status: ${statusFilter}`);
    if (searchText) filters.push(`Search: ${searchText}`);
if (sortOrder === "reservation_latest") {
  filters.push("Sort: Latest Reservation");
}

if (sortOrder === "reservation_oldest") {
  filters.push("Sort: Oldest Reservation");
}
    return filters.join(" • ");
}, [selectedDate, statusFilter, searchText, sortOrder]);

const handlePageChange = (nextPage) => {
  setPage(nextPage);

  setTimeout(() => {
    ledgerTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 100);
};

  return (
    <div className="ledger-container" ref={ledgerTopRef}>
     <div className="ledger-header">
  <div>
    <h1 className="dashboard-page-title">Credit / Debit Ledger</h1>
    <p className="dashboard-page-description">
      View deposit payments, balance amounts, operator earnings, stock status, and commission for each booking.
    </p>
  </div>
</div>

      <LedgerGuide />

      <div className="ledger-summary-container">
        <SummaryCard
          title="Total Credit"
          value={summary.total_credit}
          type="credit"
          helper="Balance / earning"
        />
       <SummaryCard
  title="Total Debit"
  value={summary.total_debit}
  type="debit"
  helper="Deposits / Refunds"
/>
        <SummaryCard
          title="Total Expected"
          value={summary.total_expected}
          type="expected"
          helper="Booking / retained amount"
        />
        <SummaryCard
          title="Total Commission"
          value={summary.total_commission}
          type="commission"
          helper="Platform share"
        />
        <SummaryCard
          title="Transactions"
          value={summary.total_transactions}
          type="transactions"
          isRaw
          helper="Records"
        />
      </div>

      <div className="ledger-filter-card">
        <div className="ledger-filter-grid">
          <div className="ledger-filter-group">
            <label>Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPage(1);
              }}
              className="ledger-filter-input"
            />
          </div>

          <div className="ledger-filter-group">
            <label>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="ledger-filter-input"
            >
              <option value="">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Accepted">Accepted</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="ledger-filter-group">
            <label>Sort By</label>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
              className="ledger-filter-input"
            >
            <option value="reservation_latest">Latest Reservation </option>
            <option value="reservation_oldest">Oldest Reservation </option>

            </select>
          </div>

          <div className="ledger-filter-group ledger-search-group">
            <label>Search</label>
           <input
  type="text"
  placeholder="Search reservation ID, property, customer, operator, room..."
  value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              className="ledger-filter-input"
            />
          </div>

          <div className="ledger-filter-actions">
            <button type="button" onClick={resetFilters} className="ledger-clear-btn">
              Clear
            </button>
          </div>
        </div>

        {activeFilterText && (
          <div className="ledger-active-filter">
            Showing results for: <strong>{activeFilterText}</strong>
          </div>
        )}
      </div>

      {loading ? (
        <div className="ledger-empty-state">
          <div className="ledger-loader" />
          <p>Loading ledger records...</p>
        </div>
      ) : errorMsg ? (
        <div className="ledger-empty-state error">
          <h3>Unable to load ledger</h3>
          <p>{errorMsg}</p>
        </div>
      ) : ledgerRows.length === 0 ? (
        <div className="ledger-empty-state">
          <h3>No ledger entries found</h3>
          <p>Try clearing the filters or choosing another date/status.</p>
        </div>
      ) : (
        <div className="ledger-list">
          {ledgerRows.map((row, idx) => {
            const paymentInfo = getPaymentExplanation(row);
            const paymentLabel = getPaymentLabel(row);
            const operatorLabel = getOperatorLabel(row);

            return (
              <div key={row.ledgerid || idx} className="ledger-record-card">
                <div className="ledger-record-main">
                  <div className="ledger-record-left">
                    <div className="ledger-record-top">
                      <span className={`ledger-payment-badge ${getPaymentClass(row)}`}>
                        {paymentLabel}
                      </span>

                      {row.reservationid && (
                        <span className="ledger-reservation-badge">
                          Reservation #{row.reservationid}
                        </span>
                      )}
                    </div>

                    <div className="ledger-property-title">
                      <span>{row.propertyname || "Unknown Property"}</span>
                      {row.roomtype && <small>— {row.roomtype}</small>}
                    </div>

                    <div className="ledger-person-grid">
                      <div>
                        <span>Customer</span>
                        <strong>{row.customer_name || "—"}</strong>
                      </div>

                      <div>
                        <span>{operatorLabel}</span>
                        <strong>{row.moderator_username || "—"}</strong>
                      </div>
                    </div>

                    <div className="ledger-status-row">
                      <div>
                        <span>Booking</span>
                        <StatusPill value={row.booking_status} />
                      </div>

                      <div>
                        <span>Stock</span>
                        <StatusPill value={row.stock_status} />
                      </div>
                    </div>

                    <div className="ledger-payment-note">
                      {paymentInfo.title}
                    </div>

                    <div className="ledger-breakdown-grid">
                      <div>
                        <span>Gross Booking</span>
                        <strong>{money(row.gross_amount)}</strong>
                      </div>

                      <div>
                        <span>Commission</span>
                        <strong>
                          {money(row.commission_amount)}
                          <small>
                            {" "}
                            ({(parseFloat(row.commission_rate || 0) * 100).toFixed(1)}%)
                          </small>
                        </strong>
                      </div>

                      <div>
                        <span>Operator Earns</span>
                        <strong>{money(row.moderator_earning)}</strong>
                      </div>
                    </div>

                    {row.remarks && !isHiddenRemark(row.remarks) && (
  <div className="ledger-remarks">
    {row.remarks}
  </div>
)}
                  </div>

                  <div className="ledger-record-right">
                    <AmountBox
                      label={paymentInfo.creditLabel}
                      value={row.credit}
                      type="credit"
                    />

                    <AmountBox
                      label={paymentInfo.debitLabel}
                      value={row.debit}
                      type="debit"
                    />

                    <AmountBox
                      label={paymentInfo.expectedLabel}
                      value={row.expected_amount}
                      type="expected"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && pagination.totalPages > 1 && (
        <div className="ledger-pagination-container">
          <div className="ledger-pagination-text">
            Page {pagination.page} of {pagination.totalPages} • {pagination.total} records
          </div>

          <div className="ledger-pagination-buttons">
            <button
  onClick={() => handlePageChange(Math.max(page - 1, 1))}
  disabled={pagination.page === 1}
  className="ledger-pagination-btn"
>
  ← Previous
</button>

<button
  onClick={() => handlePageChange(Math.min(page + 1, pagination.totalPages || 1))}
  disabled={pagination.page === pagination.totalPages}
  className="ledger-pagination-btn primary"
>
  Next →
</button>
          </div>
        </div>
      )}
    </div>
  );
}