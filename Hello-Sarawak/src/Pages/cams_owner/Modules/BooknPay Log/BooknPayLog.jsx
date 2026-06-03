import React, { useState } from 'react';
import { FaEye } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import Filter from '../../../../Component/Filter/Filter';
import PaginatedTable from '../../../../Component/PaginatedTable/PaginatedTable';
import Modal from '../../../../Component/Modal/Modal';
import SearchBar from '../../../../Component/SearchBar/SearchBar';
import ActionDropdown from '../../../../Component/ActionDropdown/ActionDropdown';
import Loader from '../../../../Component/Loader/Loader';
import { fetchBookLog } from '../../../../../Api/api';
import '../../../../Component/MainContent/MainContent.css';
import '../../../../Component/ActionDropdown/ActionDropdown.css';
import '../../../../Component/Modal/Modal.css';
import '../../../../Component/Filter/Filter.css';
import '../../../../Component/SearchBar/SearchBar.css';

const BooknPayLog = () => {
  const [searchKey, setSearchKey] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('All');
  const [appliedFilters, setAppliedFilters] = useState({ actionType: 'All' });
  const [selectedLog, setSelectedLog] = useState(null);

  const userid = localStorage.getItem('userid');

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';

    try {
      let date;

      if (typeof timestamp === 'string' && timestamp.includes('/')) {
        const [datePart, timePart] = timestamp.split(' ');
        const [day, month, year] = datePart.split('/');

        date = new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}`);
      } else {
        date = new Date(timestamp);
      }

      if (Number.isNaN(date.getTime())) return timestamp;

      return date.toLocaleString('en-MY', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return timestamp;
    }
  };

  const { data: logsResponse = [], isLoading } = useQuery({
    queryKey: ['bookLogs', userid],
    queryFn: () => fetchBookLog(userid),
    enabled: !!userid,
    onError: (error) => {
      console.error('Failed to fetch Book & Pay Logs:', error);
    },
    staleTime: 5 * 60 * 1000,
  });

  const logs = Array.isArray(logsResponse)
    ? logsResponse
    : Array.isArray(logsResponse?.bookLogs)
      ? logsResponse.bookLogs
      : Array.isArray(logsResponse?.logs)
        ? logsResponse.logs
        : [];

  const handleApplyFilters = () => {
    setAppliedFilters({ actionType: selectedActionType });
  };

  const filters = [
    {
      name: 'actionType',
      label: 'Action Type',
      value: selectedActionType,
      onChange: setSelectedActionType,
      options: [
        { value: 'All', label: 'All Actions' },
        { value: 'Deposit', label: 'Deposit' },
        { value: 'Balance', label: 'Balance' },
        { value: 'Full Payment', label: 'Full Payment' },
        { value: 'Cancel', label: 'Cancel' },
        { value: 'Expired', label: 'Expired' },
      ],
    },
  ];

  const displayLabels = {
    userid: 'User ID',
    username: 'Actioned By',
    timestamp: 'Timestamp',
    category: 'Category',
    action: 'Action',
  };

  const getLogCategory = (action = '') => {
  const text = String(action || '').toLowerCase();

  // Expired should be checked first.
  if (
    text.includes('expired') ||
    text.includes('booking expired') ||
    text.includes('payment expired') ||
    text.includes('reservation expired') ||
    text.includes('time expired') ||
    text.includes('timeout')
  ) {
    return 'Expired';
  }

  // Balance must be checked before Deposit,
  // because balance logs may also contain "Deposit Already Paid".
  if (
    text.includes('completed balance payment') ||
    text.includes('balance payment') ||
    text.includes('balance paid') ||
    text.includes('pay balance') ||
    text.includes('paid balance') ||
    text.includes('remaining balance') ||
    text.includes('balance due') ||
    text.includes('settle balance') ||
    text.includes('balance paid:')
  ) {
    return 'Balance';
  }

  // Full payment / instant pay.
  if (
    text.includes('instant full payment') ||
    text.includes('full payment') ||
    text.includes('fully paid') ||
    text.includes('paid in full') ||
    text.includes('instant pay') ||
    text.includes('payment received')
  ) {
    return 'Full Payment';
  }

  // Deposit should be checked after Balance.
  if (
    text.includes('paid deposit') ||
    text.includes('deposit paid') ||
    text.includes('deposit payment') ||
    text.includes('pay deposit') ||
    text.includes('downpayment') ||
    text.includes('down payment') ||
    text.includes('partially paid') ||
    text.includes('partial payment') ||
    text.includes('deposit')
  ) {
    return 'Deposit';
  }

  if (
    text.includes('cancel') ||
    text.includes('cancelled') ||
    text.includes('canceled') ||
    text.includes('rejected') ||
    text.includes('restock') ||
    text.includes('restocked') ||
    text.includes('removed reservation') ||
    text.includes('remove reservation')
  ) {
    return 'Cancel';
  }

  return 'Other';
};

  const getCategoryBadgeClass = (category) => {
    const value = String(category || '')
      .toLowerCase()
      .replace(/\s+/g, '-');

    return `booklog-category-badge ${value}`;
  };

  const filteredLogs = logs.filter((log = {}) => {
    const keyword = searchKey.toLowerCase();

    const searchInFields = `${log.userid || ''} ${log.username || ''} ${log.action || ''}`
      .toLowerCase()
      .includes(keyword);

    const logCategory = getLogCategory(log.action || '');

    const actionFilter =
      appliedFilters.actionType === 'All' ||
      logCategory === appliedFilters.actionType;

    return searchInFields && actionFilter;
  });

  const handleAction = (action, log) => {
    if (action === 'view') {
      const category = getLogCategory(log.action || '');

      const essentialFields = {
        userid: log.userid || 'N/A',
        username: log.username || 'N/A',
        timestamp: formatTimestamp(log.timestamp),
        category,
        action: log.action || 'N/A',
      };

      setSelectedLog(essentialFields);
    }
  };

  const logDropdownItems = [
    { label: 'View Details', icon: <FaEye />, action: 'view' },
  ];

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      render: (log) => formatTimestamp(log.timestamp),
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (log) => {
        const category = getLogCategory(log.action || '');

        return (
          <span className={getCategoryBadgeClass(category)}>
            {category}
          </span>
        );
      },
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (log) => (
        <div
          style={{
            maxWidth: '850px',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            lineHeight: '1.5',
          }}
        >
          {log.action || 'N/A'}
        </div>
      ),
    },
    {
      header: 'Actioned By',
      accessor: 'username',
      render: (log) => log.username || 'N/A',
    },
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
    <h1 className="dashboard-page-title">Book & Pay Log</h1>
    <p className="dashboard-page-description">
      View and track booking payment activities, including deposits, balance payments, full payments, cancellations, and expired bookings.
    </p>
  </div>

  <SearchBar
    value={searchKey}
    onChange={(newValue) => setSearchKey(newValue)}
    placeholder="Search logs..."
  />
</div>

      <Filter filters={filters} onApplyFilters={handleApplyFilters} />

      {isLoading ? (
        <div className="loader-box">
          <Loader />
        </div>
      ) : (
        <PaginatedTable
          data={filteredLogs}
          columns={columns}
          rowKey={(log, index) => `${log.timestamp}-${log.userid}-${index}`}
          enableCheckbox={false}
        />
      )}

      <Modal
        isOpen={!!selectedLog}
        title="Log Details"
        data={selectedLog || {}}
        labels={displayLabels}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
};

export default BooknPayLog;