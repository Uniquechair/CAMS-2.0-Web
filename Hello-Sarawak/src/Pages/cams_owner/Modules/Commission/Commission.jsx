import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiPercent, FiSave, FiRefreshCw, FiInfo, FiDollarSign, FiCreditCard } from "react-icons/fi";
import { fetchCommissionRate, updateCommissionRate } from "../../../../../Api/api";
import Toast from "../../../../Component/Toast/Toast";
import Loader from "../../../../Component/Loader/Loader";
import "../../../../Component/MainContent/MainContent.css";
import "./Commission.css";

const Commission = () => {
  const queryClient = useQueryClient();
  const [commissionInput, setCommissionInput] = useState("");
  const [sstInput, setSstInput] = useState("");
  const [depositInput, setDepositInput] = useState("");
  
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const displayToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  // --- FETCH COMMISSION ---
  const { data: commissionData, isLoading: isCommLoading } = useQuery({
    queryKey: ["commissionRate"],
    queryFn: fetchCommissionRate,
  });

  // --- FETCH SST & DEPOSIT (From Pricing Settings API & LocalStorage) ---
  const fetchOtherSettings = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    try {
      const res = await fetch(`${apiUrl}/pricing-settings`);
      if (res.ok) {
          return await res.json();
      }
    } catch(e) {}
    return null;
  };

  const { data: settingsData, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["pricingSettings"],
    queryFn: fetchOtherSettings,
  });

  // --- INITIALIZE STATE ---
  useEffect(() => {
    if (commissionData !== undefined) {
      const actualRate = typeof commissionData === 'number' ? commissionData : commissionData?.commission_rate;
      setCommissionInput((parseFloat(actualRate || 0.07) * 100).toFixed(2));
    }
    
    if (settingsData !== undefined) {
      // Prioritize API, fallback to localStorage, then default to 8% and 10%
      const sst = settingsData?.sstRate || localStorage.getItem('global_sst_rate') || 0.08;
      const dep = settingsData?.depositRate || localStorage.getItem('global_deposit_rate') || 0.10;
      
      setSstInput((parseFloat(sst) * 100).toFixed(2));
      setDepositInput((parseFloat(dep) * 100).toFixed(2));
    }
  }, [commissionData, settingsData]);

  // --- LIVE PREVIEW MATH ---
  const parsedComm = parseFloat(commissionInput) || 0;
  const parsedSst = parseFloat(sstInput) || 0;
  const parsedDeposit = parseFloat(depositInput) || 0;

  const previewBase = 100; // Example RM 100 Room
  const previewCommission = previewBase * (parsedComm / 100);
  const previewSst = previewBase * (parsedSst / 100);
  const previewFinal = previewBase + previewCommission + previewSst;
  const previewDepositAmount = previewFinal * (parsedDeposit / 100);

  const currentCommRate = parseFloat(typeof commissionData === 'number' ? commissionData : commissionData?.commission_rate || 0.07) * 100;
  const currentSstRate = parseFloat(settingsData?.sstRate || localStorage.getItem('global_sst_rate') || 0.08) * 100;
  const currentDepRate = parseFloat(settingsData?.depositRate || localStorage.getItem('global_deposit_rate') || 0.10) * 100;

  const hasUnsavedChanges = 
    Math.abs(parsedComm - currentCommRate) > 0.001 ||
    Math.abs(parsedSst - currentSstRate) > 0.001 ||
    Math.abs(parsedDeposit - currentDepRate) > 0.001;

  // --- UNIFIED SAVE ACTION ---
  const handleSaveAll = async () => {
    if (isNaN(parsedComm) || isNaN(parsedSst) || isNaN(parsedDeposit)) {
      displayToast("error", "Please ensure all fields have valid numbers.");
      return;
    }

    if (parsedComm < 0 || parsedComm > 100 || parsedSst < 0 || parsedSst > 100 || parsedDeposit < 0 || parsedDeposit > 100) {
      displayToast("error", "All percentages must be between 0 and 100.");
      return;
    }

    setIsSaving(true);
    const userid = localStorage.getItem('userid');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    try {
      // 1. Save Commission Rate
      await updateCommissionRate(parsedComm / 100, userid);

      // 2. Fetch existing settings to prevent overwriting other dynamic pricing rules
      let currentSettings = {};
      try {
          const res = await fetch(`${apiUrl}/pricing-settings`);
          if (res.ok) currentSettings = await res.json();
      } catch(e) {}

      // 3. Save SST and Deposit Rate to API
      const payload = {
          ...currentSettings,
          sstRate: parsedSst / 100,
          depositRate: parsedDeposit / 100
      };

      await fetch(`${apiUrl}/pricing-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      // 4. Save to LocalStorage as a fast fallback for the frontend customer view
      localStorage.setItem('global_sst_rate', (parsedSst / 100).toString());
      localStorage.setItem('global_deposit_rate', (parsedDeposit / 100).toString());

      displayToast("success", "All rates and fees updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["commissionRate"] });
      queryClient.invalidateQueries({ queryKey: ["pricingSettings"] });
    } catch (err) {
      displayToast("error", err.message || "Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setCommissionInput(currentCommRate.toFixed(2));
    setSstInput(currentSstRate.toFixed(2));
    setDepositInput(currentDepRate.toFixed(2));
  };

  if (isCommLoading || isSettingsLoading) {
    return (
      <div>
       <div className="header-container">
  <div>
    <h1 className="dashboard-page-title">Global Rates & Fees</h1>
    <p className="dashboard-page-description">
      Manage global commission, SST, and deposit rates that affect booking prices across the platform.
    </p>
  </div>
</div>
      </div>
    );
  }

  return (
    <div className="commission-page">
      <div className="header-container">
  <div>
    <h1 className="dashboard-page-title">Global Rates & Fees</h1>
    <p className="dashboard-page-description">
      Manage global commission, SST, and deposit rates that affect booking prices across the platform.
    </p>
  </div>
</div>

      <div className="commission-layout" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Settings Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. COMMISSION CARD */}
            <div className="commission-main-card" style={{ padding: '25px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #edf2f7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                  <div style={{ backgroundColor: '#ebf8ff', padding: '10px', borderRadius: '8px', color: '#3182ce' }}>
                      <FiPercent size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', color: '#2d3748' }}>Platform Commission</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#718096' }}>The platform cut applied to all properties.</p>
                  </div>
              </div>
              <div className="commission-input-wrapper" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <input
                    type="number"
                    step="0.1" min="0" max="100"
                    value={commissionInput}
                    onChange={(e) => setCommissionInput(e.target.value)}
                    style={{ flex: 1, border: 'none', padding: '12px 15px', fontSize: '16px', outline: 'none', background: 'transparent' }}
                    placeholder="e.g. 7.00"
                  />
                  <span style={{ padding: '0 15px', color: '#4a5568', fontWeight: 'bold', borderLeft: '1px solid #e2e8f0', backgroundColor: '#edf2f7' }}>%</span>
              </div>
            </div>

            {/* 2. SST CARD */}
            <div className="commission-main-card" style={{ padding: '25px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #edf2f7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                  <div style={{ backgroundColor: '#f0fff4', padding: '10px', borderRadius: '8px', color: '#38a169' }}>
                      <FiDollarSign size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', color: '#2d3748' }}>Sales & Service Tax (SST)</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#718096' }}>The government tax applied to bookings.</p>
                  </div>
              </div>
              <div className="commission-input-wrapper" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <input
                    type="number"
                    step="0.1" min="0" max="100"
                    value={sstInput}
                    onChange={(e) => setSstInput(e.target.value)}
                    style={{ flex: 1, border: 'none', padding: '12px 15px', fontSize: '16px', outline: 'none', background: 'transparent' }}
                    placeholder="e.g. 8.00"
                  />
                  <span style={{ padding: '0 15px', color: '#4a5568', fontWeight: 'bold', borderLeft: '1px solid #e2e8f0', backgroundColor: '#edf2f7' }}>%</span>
              </div>
            </div>

            {/* 3. DEPOSIT CARD */}
            <div className="commission-main-card" style={{ padding: '25px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #edf2f7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                  <div style={{ backgroundColor: '#faf5ff', padding: '10px', borderRadius: '8px', color: '#805ad5' }}>
                      <FiCreditCard size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', color: '#2d3748' }}>Default Deposit Fee</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#718096' }}>The required upfront payment to secure a booking.</p>
                  </div>
              </div>
              <div className="commission-input-wrapper" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <input
                    type="number"
                    step="0.1" min="0" max="100"
                    value={depositInput}
                    onChange={(e) => setDepositInput(e.target.value)}
                    style={{ flex: 1, border: 'none', padding: '12px 15px', fontSize: '16px', outline: 'none', background: 'transparent' }}
                    placeholder="e.g. 10.00"
                  />
                  <span style={{ padding: '0 15px', color: '#4a5568', fontWeight: 'bold', borderLeft: '1px solid #e2e8f0', backgroundColor: '#edf2f7' }}>%</span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving || !hasUnsavedChanges}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: hasUnsavedChanges ? '#3182ce' : '#cbd5e0', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: hasUnsavedChanges && !isSaving ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
                >
                  <FiSave /> {isSaving ? "Saving Settings..." : "Save All Changes"}
                </button>

                {hasUnsavedChanges && (
                    <button
                      type="button"
                      onClick={handleReset}
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '14px 20px', borderRadius: '8px', border: '1px solid #cbd5e0', backgroundColor: '#fff', color: '#4a5568', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      <FiRefreshCw /> Revert
                    </button>
                )}
            </div>

        </div>

        {/* RIGHT COLUMN: Stats & Preview */}
        <div className="commission-side-panel" style={{ position: 'sticky', top: '20px' }}>
          
          <div className="commission-preview-card" style={{ padding: '25px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #edf2f7' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#2d3748', fontSize: '20px' }}>Live Guest Preview</h3>
            <p style={{ margin: '0 0 25px 0', color: '#718096', fontSize: '13px' }}>Simulated math for a <strong>RM 100</strong> room:</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a5568', fontSize: '15px' }}>
                    <span>Base Room Price</span>
                    <strong>RM {previewBase.toFixed(2)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3182ce', fontSize: '15px', backgroundColor: '#ebf8ff', padding: '10px', borderRadius: '6px' }}>
                    <span>Platform Commission ({parsedComm.toFixed(1)}%)</span>
                    <strong>+ RM {previewCommission.toFixed(2)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38a169', fontSize: '15px', backgroundColor: '#f0fff4', padding: '10px', borderRadius: '6px' }}>
                    <span>SST ({parsedSst.toFixed(1)}%)</span>
                    <strong>+ RM {previewSst.toFixed(2)}</strong>
                </div>

                <div style={{ borderTop: '2px dashed #cbd5e0', margin: '5px 0' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1a202c', fontSize: '18px', fontWeight: 'bold' }}>
                    <span>Final Price <span style={{fontSize:'12px', fontWeight:'normal', color:'#718096'}}>(Charged to Guest)</span></span>
                    <span style={{ color: '#2b6cb0' }}>RM {previewFinal.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#805ad5', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#faf5ff', padding: '15px', borderRadius: '8px', border: '1px solid #d6bcfa', marginTop: '10px' }}>
                    <span>Deposit Due Now ({parsedDeposit.toFixed(0)}%)</span>
                    <span>RM {previewDepositAmount.toFixed(2)}</span>
                </div>
            </div>
            
            <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#fffaf0', border: '1px solid #f6e05e', borderRadius: '8px', fontSize: '12px', color: '#975a16', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <FiInfo size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Modifying these settings will immediately affect the booking calculators for all customers globally across the platform.</span>
            </div>

          </div>
        </div>
      </div>

      {showToast && <Toast type={toastType} message={toastMessage} />}
    </div>
  );
};

export default Commission;