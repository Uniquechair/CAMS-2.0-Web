import React, { useState } from 'react';
import { FaEye } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import Filter from '../../../../Component/Filter/Filter';
import PaginatedTable from '../../../../Component/PaginatedTable/PaginatedTable';
import Modal from '../../../../Component/Modal/Modal';
import SearchBar from '../../../../Component/SearchBar/SearchBar';
import ActionDropdown from '../../../../Component/ActionDropdown/ActionDropdown';
import Loader from '../../../../Component/Loader/Loader';
import { auditTrails } from '../../../../../Api/api';
import '../../../../Component/MainContent/MainContent.css';
import '../../../../Component/ActionDropdown/ActionDropdown.css';
import '../../../../Component/Modal/Modal.css';
import '../../../../Component/Filter/Filter.css';
import '../../../../Component/SearchBar/SearchBar.css';

const AuditTrails = () => {
  const [searchKey, setSearchKey] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('All');
  const [appliedFilters, setAppliedFilters] = useState({ actionType: 'All' });
  const [selectedLog, setSelectedLog] = useState(null);

  const userid = localStorage.getItem('userid');

const {
  data: auditTrailsLog = [],
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['auditTrails', userid],

  queryFn: () =>
    auditTrails(userid),

  enabled: !!userid,

  // Always get the newest Audit Trail
  // whenever this page is opened again.
  staleTime: 0,

  refetchOnMount: 'always',

  // Refresh when user returns to browser/tab.
  refetchOnWindowFocus: true,

  // Auto refresh while staying on this page.
  refetchInterval: 10000,
});
const handleApplyFilters = () => {
  setAppliedFilters({ actionType: selectedActionType });

  // Force latest data when clicking Apply Filters
  refetch();
};

  const filters = [
    {
      name: 'actionType',
      label: 'Action Type',
      value: selectedActionType,
      onChange: setSelectedActionType,
options: [
  { value: 'All', label: 'All Actions' },
  { value: 'Create', label: 'Create' },
  { value: 'Update', label: 'Update' },
  { value: 'Delete', label: 'Delete' },
  { value: 'Register', label: 'Register' },
  { value: 'Login', label: 'Login' },
  { value: 'Logout', label: 'Logout' },
  { value: 'Payment', label: 'Payment' },
  { value: 'Cancel', label: 'Cancel' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Submit FAQ', label: 'Submit FAQ' },
  { value: 'Upload Avatar', label: 'Upload Avatar' },
],
    },
  ];

  const displayLabels = {
    audittrailid: 'Audit Trail ID',
    entityid: 'Entity ID',
    entitytype: 'Entity Type',
    timestamp: 'Timestamp',
    action: 'Action',
    actiontype: 'Action Type',
    creatorid: 'Creator ID',
    actionedby: 'Actioned By',
  };

const filteredLogs = auditTrailsLog
  .filter((log) => {
    const searchValue = String(searchKey || '').trim().toLowerCase();
    const selectedAction = String(appliedFilters.actionType || 'All')
      .trim()
      .toLowerCase();

    const allText = [
      log.userid,
      log.entityid,
      log.entitytype,
      log.actiontype,
      log.action,
      log.username,
      log.timestamp,
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');

    const matchesSearch = !searchValue || allText.includes(searchValue);

    if (selectedAction === 'all') {
      return matchesSearch;
    }

    const actionText = `${log.action || ''} ${log.actiontype || ''}`.toLowerCase();

    const matchesAction =
      actionText.includes(selectedAction) ||
      (selectedAction === 'expired' &&
        (actionText.includes('expire') || actionText.includes('expired'))) ||
      (selectedAction === 'cancel' &&
        (actionText.includes('cancel') || actionText.includes('cancelled') || actionText.includes('canceled')));

    return matchesSearch && matchesAction;
  })
.sort((a, b) => {
  // 1. Newest action first
  const idA =
    Number(a.audittrailid || 0);

  const idB =
    Number(b.audittrailid || 0);

  if (idB !== idA) {
    return idB - idA;
  }

  // 2. Timestamp only used as backup
  const timeA =
    new Date(a.timestamp).getTime();

  const timeB =
    new Date(b.timestamp).getTime();

  if (Number.isNaN(timeA)) return 1;
  if (Number.isNaN(timeB)) return -1;

  return timeB - timeA;
});

  const handleAction = (action, log) => {
    if (action === 'view') {
      const essentialFields = {
        creatorid: log.userid || 'N/A',
        actionedby: log.username || 'N/A',
        entityid: log.entityid || 'N/A',
        entitytype: log.entitytype || 'N/A',
        timestamp: log.timestamp || 'N/A',
        action: log.action || 'N/A',
        actiontype: log.actiontype || 'N/A',
      };
      setSelectedLog(essentialFields);
    }
  };

  const logDropdownItems = [
    { label: 'View Details', icon: <FaEye />, action: 'view' },
  ];

  const columns = [
    {
      header: 'Entity[Entity ID]',
      accessor: 'entityInfo',
      render: (log) => `${log.entitytype}[${log.entityid}]`,
    },
    { header: 'Action', accessor: 'action' },
    { header: 'Actioned By', accessor: 'username' },
    { header: 'Timestamp', accessor: 'timestamp' },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (log) => (
        <ActionDropdown
          items={logDropdownItems}
          onAction={(action) => handleAction(action, log)}
          onClose={() => {}}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="header-container">
  <div>
    <h1 className="dashboard-page-title">Audit Trails</h1>
    <p className="dashboard-page-description">
      View and track system activities such as user actions, role changes, property updates, and booking-related records.
    </p>
  </div>

  <SearchBar
    value={searchKey}
    onChange={(newValue) => setSearchKey(newValue)}
    placeholder="Search audit trail..."
  />
</div>

      <Filter filters={filters} onApplyFilters={handleApplyFilters} />

      {isLoading ? (
        <div className="loader-box">
          <Loader />
        </div>
      ) : (
        <PaginatedTable
  key={`${appliedFilters.actionType}-${searchKey}-${filteredLogs.length}-${filteredLogs[0]?.audittrailid || 0}`}
  data={filteredLogs}
  columns={columns}
  rowKey={(log) => log.audittrailid || `${log.timestamp}-${log.entityid}-${log.action}`}
  enableCheckbox={false}
/>
      )}

      <Modal
        isOpen={!!selectedLog}
        title="Audit Trail Details"
        data={selectedLog || {}}
        labels={displayLabels}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
};

export default AuditTrails;
