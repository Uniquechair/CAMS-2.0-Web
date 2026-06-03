import FinanceCard from "../../../../Component/FinanceCard/FinanceCard";

const Finances = () => {
  return (
    <div>
      <div className="header-container">
        <div>
          <h1 className="dashboard-page-title">Finances Details</h1>
          <p className="dashboard-page-description">
            View financial summaries and track important payment-related information for the system.
          </p>
        </div>
      </div>

      <FinanceCard />
    </div>
  );
};

export default Finances;