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

  // Get userid from localStorage
  const userid = localStorage.getItem('userid');

  // THE ULTIMATE SMART TIMESTAMP FORMATTER
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
        // 1. ADMIN FIX: The backend sends "DD/MM/YYYY HH:mm:ss" which is accidentally 8 hours ahead
        if (typeof timestamp === 'string' && timestamp.includes('/')) {
            const [datePart, timePart] = timestamp.split(' ');
            const [day, month, year] = datePart.split('/');
            
            // Create a date object treating it as UTC
            let dateObj = new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}Z`);
            
            // Subtract 8 hours to fix the backend offset perfectly
            dateObj.setUTCHours(dateObj.getUTCHours() - 8);

            // Format it exactly like the Owner's view
            return dateObj.toLocaleString('en-GB', {
                timeZone: 'UTC',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).replace('AM', 'am').replace('PM', 'pm');
        } 
        
        // 2. OWNER FIX: The backend sends standard ISO time
        let cleanTimestamp = timestamp;
        if (typeof timestamp === 'string' && timestamp.endsWith('Z')) {
            cleanTimestamp = timestamp.slice(0, -1);
        }
        
        const dateObj = new Date(cleanTimestamp);
        if (isNaN(dateObj.getTime())) return timestamp;

        return dateObj.toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }).replace('AM', 'am').replace('PM', 'pm'); 
        
    } catch (e) {
        return timestamp; // Fallback so app never crashes
    }
  };

  // Replace useEffect with React Query
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['bookLogs', userid],
    queryFn: () => fetchBookLog(userid),
    enabled: !!userid, 
    onError: (error) => {
      console.error('Failed to fetch Book & Pay Logs:', error);
    },
    staleTime: 5 * 60 * 1000, 
  });

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
        { value: 'Create', label: 'Create' },
        { value: 'Request', label: 'Request' },
        { value: 'Payment', label: 'Payment' },
        { value: 'Update', label: 'Update' },
        { value: 'Delete', label: 'Delete' }, 
      ],
    },
  ];

  const displayLabels = {
    username: 'Actioned By',
    timestamp: 'Timestamp',
    action: 'Action',
  };

  const filteredLogs = logs.filter((log) => {
    const searchInFields = `${log.userid} ${log.action}`
      .toLowerCase()
      .includes(searchKey.toLowerCase());

    const actionFilter =
      appliedFilters.actionType === 'All' ||
      log.action.toLowerCase().includes(appliedFilters.actionType.toLowerCase());

    return searchInFields && actionFilter;
  });

  const handleAction = (action, log) => {
    if (action === 'view') {
      const essentialFields = {
        userid: log.userid || 'N/A',
        timestamp: formatTimestamp(log.timestamp), // Formatted perfectly for Modal
        action: log.action || 'N/A',
        username: log.username || 'N/A',
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
      render: (log) => formatTimestamp(log.timestamp) // Formatted perfectly for Table
    },
    { header: 'Action', accessor: 'action' },
    { header: 'Actioned By', accessor: 'username' },
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
        <h1 className="dashboard-page-title">Book & Pay Log</h1>
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
          rowKey={(log) => `${log.timestamp}-${log.userid}`}
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