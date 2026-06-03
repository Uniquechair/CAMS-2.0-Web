import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  fetchCustomers,
  fetchOperators,
  assignRole,
  fetchClusters,
  updateUser,
} from '../../../../../Api/api';

import ActionDropdown from '../../../../Component/ActionDropdown/ActionDropdown';
import Modal from '../../../../Component/Modal/Modal';
import PaginatedTable from '../../../../Component/PaginatedTable/PaginatedTable';
import Toast from '../../../../Component/Toast/Toast';
import Role from '../../../../Component/Role/Role';
import RoleManager from '../../../../Component/RoleManager/RoleManager';
import UserActivityCell from '../../../../Component/UserActivityCell/UserActivityCell';
import Alert from '../../../../Component/Alert/Alert';
import Loader from '../../../../Component/Loader/Loader';

import {
  FaEye,
  FaUserTag,
  FaEdit,
  FaSearch,
  FaFilter,
  FaUsers,
  FaUser,
  FaUserShield,
  FaUserCog,
  FaLayerGroup,
  FaTimes,
} from 'react-icons/fa';

import '../../../../Component/MainContent/MainContent.css';
import '../../../../Component/ActionDropdown/ActionDropdown.css';
import '../../../../Component/Modal/Modal.css';
import './UserRoleManagement.css';

const UserRoleManagement = () => {
  const queryClient = useQueryClient();

  const [searchKey, setSearchKey] = useState('');
  const [selectedUserType, setSelectedUserType] = useState('All');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');

  const [selectedUser, setSelectedUser] = useState(null);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleUser, setRoleUser] = useState(null);
  const [selectedAssignRole, setSelectedAssignRole] = useState('');

  const [showClusterModal, setShowClusterModal] = useState(false);
  const [clusterUser, setClusterUser] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState('');
  const [availableClusters, setAvailableClusters] = useState([]);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('');

  const roles = ['Customer', 'Moderator', 'Administrator'];

  const displayToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const {
    data: customers = [],
    isLoading: customersLoading,
    isError: customersError,
    error: customerError,
  } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const data = await fetchCustomers();
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    onError: (error) => {
      console.error('Failed to fetch customer details', error);
      displayToast('error', 'Failed to fetch customer details.');
    },
  });

  const {
    data: clusters = [],
    isLoading: clustersLoading,
  } = useQuery({
    queryKey: ['clusters'],
    queryFn: async () => {
      const data = await fetchClusters();
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: 30 * 60 * 1000,
    onError: (error) => {
      console.error('Error fetching clusters:', error);
      displayToast('error', 'Failed to load clusters.');
    },
  });

  const {
    data: operators = [],
    isLoading: operatorsLoading,
    isError: operatorsError,
    error: operatorError,
  } = useQuery({
    queryKey: ['operators', clusters],
    queryFn: async () => {
      const rawOperators = await fetchOperators();
      const operatorsData = Array.isArray(rawOperators)
        ? rawOperators
        : rawOperators?.data || [];

      const clustersData = Array.isArray(clusters) ? clusters : [];

      return operatorsData.map((operator) => {
        const operatorClusterId =
          operator.clusterid ||
          operator.cluster_id ||
          operator.cluster ||
          '';

        const matchingCluster = clustersData.find((cluster) => {
          const clusterId = cluster.clusterid || cluster.cluster_id || cluster.id;
          return (
            clusterId &&
            operatorClusterId &&
            clusterId.toString() === operatorClusterId.toString()
          );
        });

        return {
          ...operator,
          clusterid: operatorClusterId || '',
          clustername:
            matchingCluster?.clustername ||
            matchingCluster?.cluster_name ||
            matchingCluster?.name ||
            '',
        };
      });
    },
    enabled: !clustersLoading,
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
      console.error('Failed to fetch operator details', error);
      displayToast('error', 'Failed to fetch operator details.');
    },
  });

  useEffect(() => {
    setAvailableClusters(Array.isArray(clusters) ? clusters : []);
  }, [clusters]);

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => assignRole(userId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['operators']);

      setShowRoleModal(false);
      setRoleUser(null);
      setSelectedAssignRole('');

      displayToast(
        'success',
        `Successfully assigned ${variables.role} role to ${roleUser?.username || 'user'}.`
      );
    },
    onError: (error) => {
      displayToast('error', `Error assigning role: ${error.message}`);
    },
  });

  const updateClusterMutation = useMutation({
    mutationFn: ({ userData, userid }) => updateUser(userData, userid),
    onSuccess: () => {
      queryClient.invalidateQueries(['operators']);
      queryClient.invalidateQueries(['clusters']);

      setShowClusterModal(false);
      setClusterUser(null);
      setSelectedCluster('');

      displayToast(
        'success',
        `Successfully updated cluster for ${clusterUser?.username || 'user'}.`
      );
    },
    onError: (error) => {
      displayToast('error', `Error updating cluster: ${error.message}`);
    },
  });

  const normalizeCustomer = (customer) => ({
    ...customer,
    sourceType: 'customer',
    sourceLabel: 'Customer',
    usergroup: customer.usergroup || 'Customer',
    clusterid: '',
    clustername: '',
  });

  const normalizeOperator = (operator) => ({
    ...operator,
    sourceType: 'operator',
    sourceLabel: 'Operator',
    usergroup: operator.usergroup || 'Moderator',
    clusterid: operator.clusterid || '',
    clustername: operator.clustername || '',
  });

  const allUsers = useMemo(() => {
    const customerList = Array.isArray(customers)
      ? customers.map(normalizeCustomer)
      : [];

    const operatorList = Array.isArray(operators)
      ? operators.map(normalizeOperator)
      : [];

    const uniqueMap = new Map();

    [...customerList, ...operatorList].forEach((user) => {
      const key = `${user.sourceType}-${user.userid}`;
      uniqueMap.set(key, user);
    });

    return Array.from(uniqueMap.values());
  }, [customers, operators]);

  const summary = useMemo(() => {
    return {
      all: allUsers.length,
      customers: allUsers.filter((user) => user.sourceType === 'customer').length,
      operators: allUsers.filter((user) => user.sourceType === 'operator').length,
      admins: allUsers.filter((user) => user.usergroup === 'Administrator').length,
      moderators: allUsers.filter((user) => user.usergroup === 'Moderator').length,
    };
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = searchKey.trim().toLowerCase();

    return allUsers.filter((user) => {
      const typeMatch =
        selectedUserType === 'All' || user.sourceType === selectedUserType;

      const roleMatch =
        selectedRoleFilter === 'All' || user.usergroup === selectedRoleFilter;

      const searchableText = `
        ${user.userid || ''}
        ${user.username || ''}
        ${user.ufirstname || ''}
        ${user.ulastname || ''}
        ${user.uemail || ''}
        ${user.uphoneno || ''}
        ${user.usergroup || ''}
        ${user.sourceLabel || ''}
        ${user.clusterid || ''}
        ${user.clustername || ''}
      `
        .toLowerCase()
        .trim();

      const searchMatch = !keyword || searchableText.includes(keyword);

      return typeMatch && roleMatch && searchMatch;
    });
  }, [allUsers, searchKey, selectedUserType, selectedRoleFilter]);

  const getFullName = (user) => {
    const firstName = user?.ufirstname?.trim() || '';
    const lastName = user?.ulastname?.trim() || '';
    return `${firstName} ${lastName}`.trim() || 'N/A';
  };

  const displayLabels = {
    userid: 'UID',
    username: 'Username',
    sourceLabel: 'User Type',
    ufirstname: 'First Name',
    ulastname: 'Last Name',
    uemail: 'Email',
    uphoneno: 'Phone Number',
    usergroup: 'Role',
    ugender: 'Gender',
    ucountry: 'Country',
    clusterid: 'Cluster ID',
    clustername: 'Cluster Name',
  };

  const handleAction = (action, user) => {
    if (action === 'view') {
      const details = {
        userid: user.userid || 'N/A',
        username: user.username || 'N/A',
        sourceLabel: user.sourceLabel || 'N/A',
        ufirstname: user.ufirstname || 'N/A',
        ulastname: user.ulastname || 'N/A',
        uemail: user.uemail || 'N/A',
        uphoneno: user.uphoneno || 'N/A',
        usergroup: user.usergroup || 'N/A',
        ugender: user.ugender || 'N/A',
        ucountry: user.ucountry || 'N/A',
      };

      if (user.sourceType === 'operator') {
        details.clusterid = user.clusterid || 'N/A';
        details.clustername = user.clustername || 'N/A';
      }

      setSelectedUser(details);
      return;
    }

    if (action === 'assignRole') {
      setRoleUser(user);
      setSelectedAssignRole(user.usergroup || 'Customer');
      setShowRoleModal(true);
      return;
    }

    if (action === 'editCluster') {
      setClusterUser(user);
      setSelectedCluster(user.clusterid || '');
      setShowClusterModal(true);
    }
  };

  const handleRoleChange = (event) => {
    setSelectedAssignRole(event.target.value);
  };

  const handleRoleSubmit = () => {
    if (!roleUser || !selectedAssignRole) {
      displayToast('error', 'Please select a role first.');
      return;
    }

    assignRoleMutation.mutate({
      userId: roleUser.userid,
      role: selectedAssignRole,
    });
  };

  const handleClusterSubmit = () => {
    if (!clusterUser) return;

    if (!clusterUser.userid) {
      displayToast('error', 'Invalid operator ID.');
      return;
    }

    const userData = {
      clusterid: selectedCluster || null,
      username: clusterUser.username || `user_${clusterUser.userid}`,
      firstName: clusterUser.ufirstname,
      lastName: clusterUser.ulastname,
      email: clusterUser.uemail,
      phoneNo: clusterUser.uphoneno,
      country: clusterUser.ucountry,
      zipCode: clusterUser.uzipcode,
      creatorid: localStorage.getItem('userid'),
      creatorUsername: localStorage.getItem('username'),
    };

    updateClusterMutation.mutate({
      userData,
      userid: clusterUser.userid,
    });
  };

  const getDropdownItems = (user) => {
    const items = [
      { label: 'View Details', icon: <FaEye />, action: 'view' },
      { label: 'Assign Role', icon: <FaUserTag />, action: 'assignRole' },
    ];

    if (user.sourceType === 'operator') {
      items.push({
        label: 'Edit Cluster',
        icon: <FaEdit />,
        action: 'editCluster',
      });
    }

    return items;
  };

  const columns = [
    { header: 'UID', accessor: 'userid' },
    {
      header: 'User',
      accessor: 'user',
      render: (user) => <UserActivityCell user={user} />,
    },
    {
      header: 'Name',
      accessor: 'name',
      render: (user) => getFullName(user),
    },
    {
      header: 'Type',
      accessor: 'sourceType',
      render: (user) => (
        <span className={`urm-type-badge ${user.sourceType}`}>
          {user.sourceLabel}
        </span>
      ),
    },
    { header: 'Email', accessor: 'uemail' },
    {
      header: 'Role',
      accessor: 'usergroup',
      render: (user) => <Role role={user.usergroup || 'Customer'} />,
    },
    {
      header: 'Cluster',
      accessor: 'clustername',
      render: (user) =>
        user.sourceType === 'operator' ? (
          <span className="urm-cluster-pill">
            {user.clustername || (user.clusterid ? `ID: ${user.clusterid}` : 'No Cluster')}
          </span>
        ) : (
          <span className="urm-muted-text">—</span>
        ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (user) => (
        <ActionDropdown
          items={getDropdownItems(user)}
          onAction={(action) => handleAction(action, user)}
          onClose={() => {}}
        />
      ),
    },
  ];

  const isLoading = customersLoading || operatorsLoading || clustersLoading;
  const isError = customersError || operatorsError;
  const errorMessage = customerError?.message || operatorError?.message || 'Failed to load users.';

  const hasActiveFilters =
    searchKey || selectedUserType !== 'All' || selectedRoleFilter !== 'All';

  return (
    <div className="user-role-management-page">
      {showToast && <Toast type={toastType} message={toastMessage} />}

      <section className="urm-hero">
        <div>
          <span className="urm-kicker">Role Control</span>
          <h1 className="dashboard-page-title">User Role Management</h1>
          <p>
            Manage customers and operators in one place. Assign roles, update operator clusters,
            and search user information quickly.
          </p>
        </div>
      </section>

      <section className="urm-stats-grid">
        <div className="urm-stat-card all">
          <FaUsers />
          <div>
            <span>Total Users</span>
            <strong>{summary.all}</strong>
          </div>
        </div>

        <div className="urm-stat-card customers">
          <FaUser />
          <div>
            <span>Customers</span>
            <strong>{summary.customers}</strong>
          </div>
        </div>

        <div className="urm-stat-card operators">
          <FaLayerGroup />
          <div>
            <span>Operators</span>
            <strong>{summary.operators}</strong>
          </div>
        </div>

        <div className="urm-stat-card moderators">
          <FaUserCog />
          <div>
            <span>Moderators</span>
            <strong>{summary.moderators}</strong>
          </div>
        </div>

        <div className="urm-stat-card admins">
          <FaUserShield />
          <div>
            <span>Administrators</span>
            <strong>{summary.admins}</strong>
          </div>
        </div>
      </section>

      <section className="urm-toolbar-card">
        <div className="urm-search-wrap">
          <FaSearch />
          <input
            type="text"
            value={searchKey}
            onChange={(event) => setSearchKey(event.target.value)}
            placeholder="Search by username, name, email, phone, role, or cluster..."
          />
        </div>

        <div className="urm-filter-row">
          <div className="urm-filter-group">
            <label>
              <FaFilter />
              User Type
            </label>
            <select
              value={selectedUserType}
              onChange={(event) => setSelectedUserType(event.target.value)}
            >
              <option value="All">All Users</option>
              <option value="customer">Customers</option>
              <option value="operator">Operators</option>
            </select>
          </div>

          <div className="urm-filter-group">
            <label>Role</label>
            <select
              value={selectedRoleFilter}
              onChange={(event) => setSelectedRoleFilter(event.target.value)}
            >
              <option value="All">All Roles</option>
              <option value="Customer">Customer</option>
              <option value="Moderator">Moderator</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="urm-clear-btn"
              onClick={() => {
                setSearchKey('');
                setSelectedUserType('All');
                setSelectedRoleFilter('All');
              }}
            >
              <FaTimes />
              Clear
            </button>
          )}
        </div>
      </section>

      <div className="urm-results-row">
        <span>
          Showing <strong>{filteredUsers.length}</strong> of <strong>{allUsers.length}</strong> users
        </span>
      </div>

      {isLoading ? (
        <div className="loader-box">
          <Loader />
        </div>
      ) : isError ? (
        <Alert type="error" message={`Error: ${errorMessage}`} />
      ) : (
        <PaginatedTable
          data={filteredUsers}
          columns={columns}
          rowKey={(user) => `${user.sourceType}-${user.userid}`}
          enableCheckbox={false}
        />
      )}

      <Modal
        isOpen={!!selectedUser}
        title={
          selectedUser
            ? `${selectedUser.ufirstname || ''} ${selectedUser.ulastname || ''}`.trim() || 'User Details'
            : 'User Details'
        }
        data={selectedUser || {}}
        labels={displayLabels}
        onClose={() => setSelectedUser(null)}
      />

      <RoleManager
        isOpen={showRoleModal}
        user={roleUser}
        roles={roles}
        selectedRole={selectedAssignRole}
        onRoleChange={handleRoleChange}
        onSubmit={handleRoleSubmit}
        onClose={() => setShowRoleModal(false)}
        isLoading={assignRoleMutation.isPending}
      />

      {showClusterModal && (
        <div className="urm-modal-overlay">
          <div className="urm-modal-container">
            <div className="urm-modal-header">
              <h2>Edit Cluster Assignment</h2>
              <button
                type="button"
                className="urm-modal-close"
                onClick={() => setShowClusterModal(false)}
              >
                ×
              </button>
            </div>

            <div className="urm-modal-body">
              <p>
                Assign cluster for{' '}
                <strong>
                  {clusterUser?.ufirstname || ''} {clusterUser?.ulastname || ''}
                </strong>
              </p>

              <div className="urm-form-group">
                <label htmlFor="cluster-select">Select Cluster</label>
                <select
                  id="cluster-select"
                  value={selectedCluster}
                  onChange={(event) => setSelectedCluster(event.target.value)}
                >
                  <option value="">No Cluster</option>
                  {availableClusters.map((cluster) => {
                    const clusterId = cluster.clusterid
                      ? cluster.clusterid.toString()
                      : '';

                    const clusterName =
                      cluster.clustername || `Cluster ${clusterId}`;

                    return (
                      <option key={clusterId} value={clusterId}>
                        {clusterName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="urm-modal-footer">
              <button
                type="button"
                className="urm-submit-btn"
                onClick={handleClusterSubmit}
                disabled={updateClusterMutation.isPending}
              >
                {updateClusterMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                className="urm-cancel-btn"
                onClick={() => setShowClusterModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRoleManagement;