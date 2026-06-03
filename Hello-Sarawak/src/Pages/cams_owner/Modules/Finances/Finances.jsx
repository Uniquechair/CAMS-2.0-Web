import FinanceCard from "../../../../Component/FinanceCard/FinanceCard";

const Finances = () => {
  return (
    <div>
      <div className="header-container">
        <div>
          <h1 className="dashboard-page-title">Finances Details</h1>
          <p className="dashboard-page-description">
            View financial summaries, payment records, and important revenue information for easier monitoring.
          </p>
        </div>
      </div>

      <FinanceCard />
    </div>
  );
};

export default Finances;