import React, { useState, useEffect } from "react";
import { FiSave, FiCalendar, FiSun, FiClock, FiInfo } from "react-icons/fi";
import Toast from "../../../../Component/Toast/Toast"; 
import "../../../../Component/MainContent/MainContent.css";
import { fetchPricingSettings, savePricingSettings } from "../../../../../Api/api"; 
import "./DynamicPricing.css";

const DynamicPricing = () => {
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Removed the obsolete Special Event states to keep it clean
  const [pricingSettings, setPricingSettings] = useState(() => {
    const savedSettings = localStorage.getItem('cams_dynamic_pricing');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
    return {
      weekendMultiplier: "100", 
      earlyBirdMultiplier: "100",
      lastMinuteMultiplier: "100"
    };
  });

  // SMART HELPER: Converts database "1.00" to UI "100", "0.90" to "90", etc.
  const formatPercentage = (val) => {
      if (!val) return "";
      const num = parseFloat(val);
      if (num > 0 && num <= 5) {
          return Math.round(num * 100).toString();
      }
      return num.toString();
  };

  useEffect(() => {
    const loadSettingsFromDb = async () => {
      try {
        const dbSettings = await fetchPricingSettings();
        if (dbSettings) {
          const formattedSettings = {
            weekendMultiplier: formatPercentage(dbSettings.weekendMultiplier) || "100",
            earlyBirdMultiplier: formatPercentage(dbSettings.earlyBirdMultiplier) || "100",
            lastMinuteMultiplier: formatPercentage(dbSettings.lastMinuteMultiplier) || "100"
          };
          
          setPricingSettings(formattedSettings);
          localStorage.setItem('cams_dynamic_pricing', JSON.stringify(formattedSettings));
        }
      } catch (error) {
        console.error("Could not load from DB, falling back to LocalStorage", error);
      }
    };
    
    loadSettingsFromDb();
  }, []);

  const displayToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPricingSettings(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('cams_dynamic_pricing', JSON.stringify(pricingSettings));
      
      // We send the data, backend will use defaults for the removed special event variables safely
      await savePricingSettings(pricingSettings);

      displayToast("success", "Dynamic pricing rules updated! Customers will now see these rates.");
    } catch (error) {
      console.error(error);
      displayToast("error", "Failed to save pricing settings to the database.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dynamic-pricing-page">
     <div className="dp-header">
  <div>
    <h1 className="dashboard-page-title">Dynamic Pricing</h1>
    <p className="dashboard-page-description">
      Set automated rate adjustments and discounts for weekends, early bird bookings, and last-minute bookings.
    </p>
  </div>

  <button 
    className="dp-save-btn" 
    onClick={handleSave}
    disabled={isSaving}
  >
    <FiSave size={18} /> {isSaving ? "Saving..." : "Save Changes"}
  </button>
</div>

      {/* --- USER FRIENDLY INSTRUCTION BANNER --- */}
      <div style={{ backgroundColor: '#e8f4fd', borderLeft: '4px solid #007bff', padding: '15px', borderRadius: '4px', marginBottom: '25px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <FiInfo size={20} color="#007bff" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
              <strong style={{ display: 'block', marginBottom: '5px', color: '#0056b3' }}>How the Percentage (%) works:</strong>
              <p style={{ margin: 0, fontSize: '14px', color: '#333', lineHeight: '1.5' }}>
                  <strong>100%</strong> means the normal base rate. <br/>
                  • To <strong>INCREASE</strong> the price, enter a number higher than 100 (e.g., entering <strong>120%</strong> adds a 20% extra charge).<br/>
                  • To give a <strong>DISCOUNT</strong>, enter a number lower than 100 (e.g., entering <strong>90%</strong> gives a 10% discount).<br/>
                  <br/>
                  <em>💡 Note: To set specific custom rates for Public Holidays or custom date ranges (like School Holidays), please use the <strong>Holiday Manager</strong> page!</em>
              </p>
          </div>
      </div>

      <div className="dp-grid">
        {/* Card 1: Weekend Rate */}
        <div className="dp-card">
          <div className="dp-card-header">
              <div className="dp-icon-wrapper blue-icon"><FiCalendar /></div>
              <label className="dp-label">Weekend Rate</label>
          </div>
          <div className="dp-input-wrapper">
              <input
                type="number"
                step="1"
                min="1"
                name="weekendMultiplier"
                className="dp-input"
                placeholder="100"
                value={pricingSettings.weekendMultiplier}
                onChange={handleChange}
              />
              <span className="dp-input-suffix">%</span>
          </div>
          <p className="dp-help-text grey-text">
            <strong>Example:</strong> Type <code>100</code> for normal price, or type <code>120</code> to charge 20% extra on Saturdays & Sundays.
          </p>
        </div>

        {/* Card 2: Early Bird */}
        <div className="dp-card">
          <div className="dp-card-header">
              <div className="dp-icon-wrapper green-icon"><FiSun /></div>
              <label className="dp-label">Early Bird Discount</label>
          </div>
          <div className="dp-input-wrapper outline-green">
              <input
                type="number"
                step="1"
                min="1"
                name="earlyBirdMultiplier"
                className="dp-input"
                placeholder="90"
                value={pricingSettings.earlyBirdMultiplier}
                onChange={handleChange}
              />
              <span className="dp-input-suffix">%</span>
          </div>
          <p className="dp-help-text green-text">
             <strong>Example:</strong> Type <code>90</code> to automatically give a 10% discount for bookings made 30+ days in advance.
          </p>
        </div>

        {/* Card 3: Last Minute */}
        <div className="dp-card">
          <div className="dp-card-header">
              <div className="dp-icon-wrapper orange-icon"><FiClock /></div>
              <label className="dp-label">Last Minute Discount</label>
          </div>
          <div className="dp-input-wrapper outline-green">
              <input
                type="number"
                step="1"
                min="1"
                name="lastMinuteMultiplier"
                className="dp-input"
                placeholder="85"
                value={pricingSettings.lastMinuteMultiplier}
                onChange={handleChange}
              />
              <span className="dp-input-suffix">%</span>
          </div>
          <p className="dp-help-text green-text">
             <strong>Example:</strong> Type <code>85</code> to automatically give a 15% discount for bookings made within 7 days of check-in.
          </p>
        </div>
      </div>

      {showToast && <Toast type={toastType} message={toastMessage} />}
    </div>
  );
};

export default DynamicPricing;