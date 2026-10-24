import React, { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import Loader from "../../Component/Loader/Loader";
import { Line, Bar } from "react-chartjs-2";
import { useQuery } from "@tanstack/react-query";
import "./FinanceCard.css";
import { FiDollarSign } from "react-icons/fi";
import {
  FaChartBar,
  FaRegCreditCard,
  FaChartLine,
  FaStar,
  FaReceipt,
  FaMoneyBillWave,
  FaHourglassHalf,
  FaPercent,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const money = (value) => `RM${Number(value || 0).toFixed(2)}`;

const monthOptions = [
  { value: "all", label: "All Months" },
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const FinanceCard = () => {
  const [chartType, setChartType] = useState("revenue");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [selectedMonth, setSelectedMonth] = useState("all");

  const userid =
    localStorage.getItem("userid") ||
    localStorage.getItem("userId") ||
    localStorage.getItem("userID");

  const {
    data: financeLedgerData,
    isLoading: financeLoading,
    error: financeError,
  } = useQuery({
    queryKey: ["finance-ledger-card", userid],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/finance/ledger-card?userid=${userid}`, {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load finance data");
      }

      return data;
    },
    enabled: !!userid,
    staleTime: 0,
refetchOnMount: "always",
refetchOnWindowFocus: true,
  });

  const {
    data: reviewChartData,
    isLoading: reviewLoading,
    error: reviewError,
  } = useQuery({
    queryKey: ["finance-review-chart", userid],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/finance/review-chart?userid=${userid}`, {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load review chart data");
      }

      return data;
    },
    enabled: !!userid,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const summary = financeLedgerData?.summary || {
    totalRevenue: 0,
    totalOperatorEarning: 0,
    totalDepositPaid: 0,
    totalExpectedBalance: 0,
    totalCommission: 0,
    totalTransactions: 0,
    paidCount: 0,
    partiallyPaidCount: 0,
    cancelledCount: 0,
    expiredCount: 0,
  };

  const reviewSummary = reviewChartData?.summary || {
    totalReviews: 0,
    overallRating: 0,
  };

  const monthlyFinanceData = Array.isArray(financeLedgerData?.monthlyData)
    ? financeLedgerData.monthlyData
    : [];

  const monthlyReviewData = Array.isArray(reviewChartData?.monthlyData)
    ? reviewChartData.monthlyData
    : [];

  const getAvailableYears = () => {
    const years = new Set();

    [...monthlyFinanceData, ...monthlyReviewData].forEach((item) => {
      if (item?.month) {
        years.add(String(item.month).split("-")[0]);
      }
    });

    const yearList = Array.from(years).sort((a, b) => Number(b) - Number(a));

    if (yearList.length === 0) {
      return [new Date().getFullYear().toString()];
    }

    return yearList;
  };

  const isSameSelectedMonth = (monthValue) => {
    if (!monthValue) return false;

    const [year, month] = String(monthValue).split("-");

    if (String(year) !== String(selectedYear)) {
      return false;
    }

    if (selectedMonth === "all") {
      return true;
    }

    return month === selectedMonth;
  };

  const filteredFinanceData = useMemo(() => {
    return monthlyFinanceData
      .filter((item) => isSameSelectedMonth(item.month))
      .sort((a, b) => String(a.month).localeCompare(String(b.month)));
  }, [monthlyFinanceData, selectedYear, selectedMonth]);

  const filteredReviewData = useMemo(() => {
    return monthlyReviewData
      .filter((item) => isSameSelectedMonth(item.month))
      .sort((a, b) => String(a.month).localeCompare(String(b.month)));
  }, [monthlyReviewData, selectedYear, selectedMonth]);

  const selectedFinanceSummary = useMemo(() => {
    if (selectedMonth === "all") {
      return summary;
    }

    return {
      totalRevenue: filteredFinanceData.reduce(
        (total, item) => total + Number(item.monthlyrevenue || 0),
        0
      ),
      totalOperatorEarning: filteredFinanceData.reduce(
        (total, item) => total + Number(item.monthlyearning || 0),
        0
      ),
      totalDepositPaid: filteredFinanceData.reduce(
        (total, item) => total + Number(item.monthlydeposit || 0),
        0
      ),
      totalExpectedBalance: filteredFinanceData.reduce(
        (total, item) => total + Number(item.monthlyexpectedbalance || 0),
        0
      ),
      totalCommission: filteredFinanceData.reduce(
        (total, item) => total + Number(item.monthlycommission || 0),
        0
      ),
      totalTransactions: filteredFinanceData.reduce(
        (total, item) => total + Number(item.monthlytransactions || 0),
        0
      ),
      paidCount: summary.paidCount,
      partiallyPaidCount: summary.partiallyPaidCount,
      cancelledCount: summary.cancelledCount,
      expiredCount: summary.expiredCount,
    };
  }, [selectedMonth, filteredFinanceData, summary]);

  const selectedReviewSummary = useMemo(() => {
    if (selectedMonth === "all") {
      return reviewSummary;
    }

    const totalReviews = filteredReviewData.reduce(
      (total, item) => total + Number(item.totalReviews || 0),
      0
    );

    const weightedRatingTotal = filteredReviewData.reduce(
      (total, item) =>
        total + Number(item.averageRating || 0) * Number(item.totalReviews || 0),
      0
    );

    const averageRating =
      totalReviews > 0 ? weightedRatingTotal / totalReviews : 0;

    return {
      totalReviews,
      overallRating: averageRating,
    };
  }, [selectedMonth, filteredReviewData, reviewSummary]);

  const calculateGrowthRate = (currentValue, lastValue) => {
    const current = Number(currentValue || 0);
    const last = Number(lastValue || 0);

    if (!last || last === 0) return "0.0";

    return (((current - last) / last) * 100).toFixed(1);
  };

  const getFinanceGrowth = (key) => {
    if (!filteredFinanceData || filteredFinanceData.length < 2) return "0.0";

    const currentMonth = filteredFinanceData[filteredFinanceData.length - 1];
    const lastMonth = filteredFinanceData[filteredFinanceData.length - 2];

    return calculateGrowthRate(currentMonth?.[key], lastMonth?.[key]);
  };

  const getReviewGrowth = () => {
    if (!filteredReviewData || filteredReviewData.length < 2) return "0.0";

    const currentMonth = filteredReviewData[filteredReviewData.length - 1];
    const lastMonth = filteredReviewData[filteredReviewData.length - 2];

    return calculateGrowthRate(
      currentMonth?.averageRating,
      lastMonth?.averageRating
    );
  };

  const getKpiBadgeText = () => {
    if (selectedMonth === "all") {
      return "All Months";
    }

    const monthLabel =
      monthOptions.find((month) => month.value === selectedMonth)?.label ||
      "Selected Month";

    return monthLabel;
  };

  const getChartConfig = () => {
    const chartMap = {
      revenue: {
        label: "Booking Revenue",
        key: "monthlyrevenue",
        title: "Monthly Booking Revenue Trend",
        yTitle: "Booking Revenue (RM)",
        type: "line",
        source: "finance",
      },
      earning: {
        label: "Net Operator Earning",
        key: "monthlyearning",
        title: "Monthly Net Operator Earning Trend",
        yTitle: "Net Operator Earning (RM)",
        type: "line",
        source: "finance",
      },
      deposit: {
        label: "Deposit Collected",
        key: "monthlydeposit",
        title: "Monthly Deposit Collected Trend",
        yTitle: "Deposit Collected (RM)",
        type: "line",
        source: "finance",
      },
      expected: {
        label: "Pending Balance",
        key: "monthlyexpectedbalance",
        title: "Monthly Pending Balance Trend",
        yTitle: "Pending Balance (RM)",
        type: "line",
        source: "finance",
      },
      commission: {
        label: "Platform Commission",
        key: "monthlycommission",
        title: "Monthly Platform Commission Trend",
        yTitle: "Platform Commission (RM)",
        type: "line",
        source: "finance",
      },
      transactions: {
        label: "Booking Transactions",
        key: "monthlytransactions",
        title: "Monthly Booking Transaction Trend",
        yTitle: "Booking Transactions",
        type: "bar",
        source: "finance",
      },
      reviews: {
        label: "Average Rating",
        key: "averageRating",
        title: "Monthly Customer Review Trend",
        yTitle: "Average Rating",
        type: "bar",
        source: "review",
      },
    };

    return chartMap[chartType] || chartMap.revenue;
  };

  const renderChart = () => {
    const config = getChartConfig();

    const chartDataSource =
      config.source === "review" ? filteredReviewData : filteredFinanceData;

    if (!chartDataSource || chartDataSource.length === 0) {
      return (
        <div className="finance-empty-chart">
          <h3>No chart data available</h3>
          <p>There is no data for the selected year or month yet.</p>
        </div>
      );
    }

    const chartData = {
      labels: chartDataSource.map((item) => item.month),
      datasets: [
        {
          label: config.label,
          data: chartDataSource.map((item) => Number(item[config.key] || 0)),
          fill: config.type === "line",
          backgroundColor:
            config.type === "bar"
              ? "rgba(75, 192, 192, 0.45)"
              : "rgba(75, 192, 192, 0.18)",
          borderColor: "rgb(75, 192, 192)",
          borderWidth: 2,
          tension: 0.35,
          pointBackgroundColor: "rgb(75, 192, 192)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: selectedMonth !== "all" ? 7 : 4,
pointHoverRadius: selectedMonth !== "all" ? 9 : 7,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            boxWidth: 14,
            color: "#5f7290",
            font: {
              weight: "600",
            },
          },
        },
        title: {
          display: true,
          text:
            selectedMonth === "all"
              ? `${config.title} - ${selectedYear}`
              : `${config.label} - ${
                  monthOptions.find((month) => month.value === selectedMonth)?.label
                } ${selectedYear}`,
          color: "#24384d",
          font: {
            size: 16,
            weight: "700",
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              if (chartType === "transactions") {
                return `${config.label}: ${context.parsed.y}`;
              }

              if (chartType === "reviews") {
                return `${config.label}: ${Number(context.parsed.y || 0).toFixed(2)} / 5`;
              }

              return `${config.label}: RM${Number(context.parsed.y || 0).toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: chartType === "reviews" ? 5 : undefined,
          title: {
            display: true,
            text: config.yTitle,
            color: "#5f7290",
            font: {
              weight: "600",
            },
          },
          ticks: {
            color: "#5f7290",
          },
          grid: {
            color: "rgba(148, 163, 184, 0.18)",
          },
        },
        x: {
          title: {
            display: true,
            text: "Month",
            color: "#5f7290",
            font: {
              weight: "600",
            },
          },
          ticks: {
            color: "#5f7290",
          },
          grid: {
            display: false,
          },
        },
      },
    };

   const shouldUseBarChart = config.type === "bar" || selectedMonth !== "all";

if (shouldUseBarChart) {
  return <Bar data={chartData} options={chartOptions} />;
}

return <Line data={chartData} options={chartOptions} />;
  };

  if (financeLoading || reviewLoading) {
    return (
      <div className="loader-box">
        <Loader />
      </div>
    );
  }

  if (financeError || reviewError) {
    return (
      <div className="finance-dashboard-chart-panel">
        <div className="finance-error-state">
          <h3>Unable to load finance data</h3>
          <p>{financeError?.message || reviewError?.message}</p>
        </div>
      </div>
    );
  }

  const revenueGrowth = getFinanceGrowth("monthlyrevenue");
  const earningGrowth = getFinanceGrowth("monthlyearning");
  const depositGrowth = getFinanceGrowth("monthlydeposit");
  const expectedGrowth = getFinanceGrowth("monthlyexpectedbalance");
  const commissionGrowth = getFinanceGrowth("monthlycommission");
  const reviewGrowth = getReviewGrowth();

  const showGrowthBadge = selectedMonth === "all";

  const renderKpiBadge = (growthValue) => {
    if (!showGrowthBadge) {
      return <div className="kpi-percentage positive">{getKpiBadgeText()}</div>;
    }

    return (
      <div className={`kpi-percentage ${Number(growthValue || 0) >= 0 ? "positive" : "negative"}`}>
        {Number(growthValue) > 0 ? "+" : ""}
        {growthValue}%
        <span>{Number(growthValue || 0) >= 0 ? "▲" : "▼"}</span>
      </div>
    );
  };

  return (
    <div className="finance-dashboard-container">
      <div className="finance-kpi-section">
        <div className="finance-section-heading">
          <h3>Financial Overview</h3>
          <p>
            Track booking revenue, net earnings, collected deposits, pending balances,
            and platform commission from the latest booking records.
          </p>
        </div>

        <div className="finance-dashboard-stats-row">
          <div className="finance-dashboard-card kpi-card">
            <div className="kpi-content">
              <div className="finance-kpi-top">
                <div className="kpi-icon revenue-icon">
                  <FiDollarSign size={24} />
                </div>
                <span className="finance-kpi-tag">Revenue</span>
              </div>

              <div className="finance-dashboard-card-title">Booking Revenue</div>
              <div className="finance-dashboard-card-value">
                {money(selectedFinanceSummary.totalRevenue)}
              </div>

              {renderKpiBadge(revenueGrowth)}
            </div>
          </div>

          <div className="finance-dashboard-card kpi-card">
            <div className="kpi-content">
              <div className="finance-kpi-top">
                <div className="kpi-icon earning-icon">
                  <FaMoneyBillWave size={22} />
                </div>
                <span className="finance-kpi-tag">Earning</span>
              </div>

              <div className="finance-dashboard-card-title">Net Operator Earning</div>
              <div className="finance-dashboard-card-value">
                {money(selectedFinanceSummary.totalOperatorEarning)}
              </div>

              {renderKpiBadge(earningGrowth)}
            </div>
          </div>

          <div className="finance-dashboard-card kpi-card">
            <div className="kpi-content">
              <div className="finance-kpi-top">
                <div className="kpi-icon deposit-icon">
                  <FaReceipt size={22} />
                </div>
                <span className="finance-kpi-tag">Deposit</span>
              </div>

              <div className="finance-dashboard-card-title">Deposit Collected</div>
              <div className="finance-dashboard-card-value">
                {money(selectedFinanceSummary.totalDepositPaid)}
              </div>

              {renderKpiBadge(depositGrowth)}
            </div>
          </div>

          <div className="finance-dashboard-card kpi-card">
            <div className="kpi-content">
              <div className="finance-kpi-top">
                <div className="kpi-icon expected-icon">
                  <FaHourglassHalf size={22} />
                </div>
                <span className="finance-kpi-tag">Balance</span>
              </div>

              <div className="finance-dashboard-card-title">Pending Balance</div>
              <div className="finance-dashboard-card-value">
                {money(selectedFinanceSummary.totalExpectedBalance)}
              </div>

              {renderKpiBadge(expectedGrowth)}
            </div>
          </div>

          <div className="finance-dashboard-card kpi-card">
            <div className="kpi-content">
              <div className="finance-kpi-top">
                <div className="kpi-icon commission-icon">
                  <FaPercent size={22} />
                </div>
                <span className="finance-kpi-tag">Commission</span>
              </div>

              <div className="finance-dashboard-card-title">Platform Commission</div>
              <div className="finance-dashboard-card-value">
                {money(selectedFinanceSummary.totalCommission)}
              </div>

              {renderKpiBadge(commissionGrowth)}
            </div>
          </div>
        </div>
      </div>

      <div className="finance-kpi-section">
        <div className="finance-section-heading">
          <h3>Booking & Review KPI</h3>
          <p>Quickly view payment status and customer satisfaction for hotel operations.</p>
        </div>

        <div className="finance-mini-kpi-grid">
          <div className="finance-mini-kpi-card">
            <div className="finance-mini-icon paid">
              <FaCheckCircle />
            </div>
            <div>
              <span>Paid Bookings</span>
              <strong>{selectedFinanceSummary.paidCount}</strong>
            </div>
          </div>

          <div className="finance-mini-kpi-card">
            <div className="finance-mini-icon partial">
              <FaRegCreditCard />
            </div>
            <div>
              <span>Partially Paid</span>
              <strong>{selectedFinanceSummary.partiallyPaidCount}</strong>
            </div>
          </div>

          <div className="finance-mini-kpi-card">
            <div className="finance-mini-icon cancelled">
              <FaTimesCircle />
            </div>
            <div>
              <span>Cancelled / Expired</span>
              <strong>
                {selectedFinanceSummary.cancelledCount + selectedFinanceSummary.expiredCount}
              </strong>
            </div>
          </div>

          <div className="finance-mini-kpi-card">
            <div className="finance-mini-icon review">
              <FaStar />
            </div>
            <div>
              <span>Overall Rating</span>
              <strong>
                {Number(selectedReviewSummary.overallRating || 0).toFixed(2)} / 5
              </strong>
            </div>
          </div>

          <div className="finance-mini-kpi-card">
            <div className="finance-mini-icon total-review">
              <FaChartBar />
            </div>
            <div>
              <span>Total Reviews</span>
              <strong>{Number(selectedReviewSummary.totalReviews || 0)}</strong>
            </div>
          </div>

          <div className="finance-mini-kpi-card">
            <div className="finance-mini-icon growth">
              <FaChartLine />
            </div>
            <div>
              <span>Review Growth</span>
              <strong>
                {Number(reviewGrowth) > 0 ? "+" : ""}
                {reviewGrowth}%
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="finance-dashboard-chart-panel">
        <div className="finance-dashboard-controls-row">
          <div className="finance-control-group">
            <label htmlFor="chartSelector" className="finance-control-label">
              Select Chart
            </label>

            <div className="finance-select-wrapper">
              <select
                id="chartSelector"
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="finance-select"
              >
                <optgroup label="Financial Charts">
                  <option value="revenue">Booking Revenue Chart</option>
                  <option value="earning">Net Operator Earning Chart</option>
                  <option value="deposit">Deposit Collected Chart</option>
                  <option value="expected">Pending Balance Chart</option>
                  <option value="commission">Platform Commission Chart</option>
                </optgroup>

                <optgroup label="Booking Charts">
                  <option value="transactions">Booking Transactions Chart</option>
                </optgroup>

                <optgroup label="Review Charts">
                  <option value="reviews">Customer Review Chart</option>
                </optgroup>
              </select>

              <div className="finance-select-arrow">
                <svg
                  className="finance-select-icon"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="finance-control-group">
            <label htmlFor="yearSelector" className="finance-control-label">
              Select Year
            </label>

            <div className="finance-select-wrapper">
              <select
                id="yearSelector"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="finance-select"
              >
                {getAvailableYears().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <div className="finance-select-arrow">
                <svg
                  className="finance-select-icon"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="finance-control-group">
            <label htmlFor="monthSelector" className="finance-control-label">
              Select Month
            </label>

            <div className="finance-select-wrapper">
              <select
                id="monthSelector"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="finance-select"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>

              <div className="finance-select-arrow">
                <svg
                  className="finance-select-icon"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="finance-dashboard-chart-area">{renderChart()}</div>
      </div>
    </div>
  );
};

export default FinanceCard;