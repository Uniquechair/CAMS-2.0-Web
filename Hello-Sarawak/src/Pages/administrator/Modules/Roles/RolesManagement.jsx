import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  fetchAdministrators,
  fetchCustomers,
  fetchModerators,
  suspendUser,
  activateUser,
  removeUser,
  fetchClusters,
  updateUser,
} from '../../../../../Api/api';
import "../../../../Component/MainContent/MainContent.css";
import ActionDropdown from '../../../../Component/ActionDropdown/ActionDropdown';
import Modal from '../../../../Component/Modal/Modal';
import PaginatedTable from '../../../../Component/PaginatedTable/PaginatedTable';
import ModeratorForm from '../../../../Component/ModeratorForm/ModeratorForm';
import Toast from '../../../../Component/Toast/Toast';
import Alert from '../../../../Component/Alert/Alert';
import Loader from '../../../../Component/Loader/Loader';
import Status from '../../../../Component/Status/Status';
import UserActivityCell from '../../../../Component/UserActivityCell/UserActivityCell';
import "../../../../Component/MainContent/MainContent.css";

import {
  FaEye,
  FaBan,
  FaUser,
  FaEdit,
  FaTrash,
  FaLayerGroup,
  FaUsers,
  FaUserShield,
  FaUserCog,
  FaPlus,
  FaSearch,
  FaFilter,
} from 'react-icons/fa';

import '../../../../Component/MainContent/MainContent.css';
import '../../../../Component/ActionDropdown/ActionDropdown.css';
import '../../../../Component/Modal/Modal.css';
import './RolesManagement.css';

const RolesManagement = () => {
  const queryClient = useQueryClient();

  const [searchKey, setSearchKey] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const [selectedUser, setSelectedUser] = useState(null);
  const [editModerator, setEditModerator] = useState(null);
  const [isModeratorFormOpen, setIsModeratorFormOpen] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [moderatorToDelete, setModeratorToDelete] = useState(null);

  const [showClusterModal, setShowClusterModal] = useState(false);
  const [clusterModerator, setClusterModerator] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState('');
  const [availableClusters, setAvailableClusters] = useState([]);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('');

  const displayToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const {
    data: administrators = [],
    isLoading: adminsLoading,
    error: adminsError,
  } = useQuery({
    queryKey: ['administrators'],
    queryFn: async () => {
      const data = await fetchAdministrators();
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: 30 * 60 * 1000,
    refetchInterval: 1000,
  });

  const {
    data: customers = [],
    isLoading: customersLoading,
    error: customersError,
  } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const data = await fetchCustomers();
      return Array.isArray(data) ? data : data?.data || [];
    },
    onError: () => {
      displayToast('error', 'Failed to load customers. Please try again.');
    },
    staleTime: 5 * 60 * 1000,
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
  });

  const {
    data: moderators = [],
    isLoading: moderatorsLoading,
    error: moderatorsError,
  } = useQuery({
    queryKey: ['moderators', clusters],
    queryFn: async () => {
      const rawModerators = await fetchModerators();
      const moderatorsData = Array.isArray(rawModerators)
        ? rawModerators
        : rawModerators?.data || [];

      const clustersData = Array.isArray(clusters) ? clusters : [];

      return moderatorsData.map((moderator) => {
        const moderatorClusterId =
          moderator.clusterid ||
          moderator.cluster_id ||
          moderator.cluster ||
          '';

        const matchingCluster = clustersData.find((cluster) => {
          const clusterId = cluster.clusterid || cluster.cluster_id || cluster.id;
          return (
            clusterId &&
            moderatorClusterId &&
            clusterId.toString() === moderatorClusterId.toString()
          );
        });

        return {
          ...moderator,
          clusterid: moderatorClusterId || '',
          clustername:
            matchingCluster?.clustername ||
            matchingCluster?.cluster_name ||
            matchingCluster?.name ||
            '',
        };
      });
    },
    enabled: !clustersLoading,
    staleTime: 30 * 60 * 1000,
    refetchInterval: 1000,
  });

  useEffect(() => {
    setAvailableClusters(Array.isArray(clusters) ? clusters : []);
  }, [clusters]);

  const suspendMutation = useMutation({
    mutationFn: (userId) => suspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['moderators']);
      displayToast('success', 'User has been suspended.');
    },
    onError: () => {
      displayToast('error', 'Error suspending user.');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (userId) => activateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['moderators']);
      displayToast('success', 'User has been activated.');
    },
    onError: () => {
      displayToast('error', 'Error activating user.');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (moderatorId) => removeUser(moderatorId),
    onSuccess: () => {
      queryClient.invalidateQueries(['moderators']);
      displayToast('success', 'Moderator removed successfully.');
      setIsDialogOpen(false);
      setModeratorToDelete(null);
    },
    onError: () => {
      displayToast('error', 'Failed to remove moderator.');
      setIsDialogOpen(false);
      setModeratorToDelete(null);
    },
  });

  const updateClusterMutation = useMutation({
    mutationFn: ({ userData, userid }) => updateUser(userData, userid),
    onSuccess: () => {
      queryClient.invalidateQueries(['moderators']);
      queryClient.invalidateQueries(['clusters']);
      setShowClusterModal(false);
      setClusterModerator(null);
      setSelectedCluster('');
      displayToast('success', 'Cluster assignment updated successfully.');
    },
    onError: (error) => {
      displayToast('error', `Error updating cluster: ${error.message}`);
    },
  });

  const getFullName = (user) => {
    const firstName = user?.ufirstname?.trim() || '';
    const lastName = user?.ulastname?.trim() || '';
    return `${firstName} ${lastName}`.trim() || 'N/A';
  };

  const normalizeUser = (user, role) => {
    return {
      ...user,
      role,
      roleLabel:
        role === 'admin'
          ? 'Administrator'
          : role === 'customer'
            ? 'Customer'
            : 'Moderator',
      uactivation: user.uactivation || 'Active',
      clustername: role === 'moderator' ? user.clustername || '' : '',
      clusterid: role === 'moderator' ? user.clusterid || '' : '',
    };
  };

  const allUsers = useMemo(() => {
    const adminList = Array.isArray(administrators)
      ? administrators.map((user) => normalizeUser(user, 'admin'))
      : [];

    const customerList = Array.isArray(customers)
      ? customers.map((user) => normalizeUser(user, 'customer'))
      : [];

    const moderatorList = Array.isArray(moderators)
      ? moderators.map((user) => normalizeUser(user, 'moderator'))
      : [];

    return [...adminList, ...customerList, ...moderatorList];
  }, [administrators, customers, moderators]);

  const roleCounts = useMemo(() => {
    return {
      all: allUsers.length,
      admin: allUsers.filter((user) => user.role === 'admin').length,
      customer: allUsers.filter((user) => user.role === 'customer').length,
      moderator: allUsers.filter((user) => user.role === 'moderator').length,
      active: allUsers.filter((user) => user.uactivation === 'Active').length,
      inactive: allUsers.filter((user) => user.uactivation === 'Inactive').length,
    };
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = searchKey.trim().toLowerCase();

    return allUsers.filter((user) => {
      const roleMatch = selectedRole === 'All' || user.role === selectedRole;

      const statusMatch =
        selectedStatus === 'All' ||
        String(user.uactivation || 'Active').toLowerCase() === selectedStatus.toLowerCase();

      const searchableText = `
        ${user.userid || ''}
        ${user.username || ''}
        ${user.ufirstname || ''}
        ${user.ulastname || ''}
        ${user.uemail || ''}
        ${user.uphoneno || ''}
        ${user.uactivation || ''}
        ${user.roleLabel || ''}
        ${user.clustername || ''}
      `
        .toLowerCase()
        .trim();

      const searchMatch = !keyword || searchableText.includes(keyword);

      return roleMatch && statusMatch && searchMatch;
    });
  }, [allUsers, selectedRole, selectedStatus, searchKey]);

  const displayLabels = {
    userid: 'UID',
    username: 'Username',
    roleLabel: 'Role',
    ufirstname: 'First Name',
    ulastname: 'Last Name',
    uemail: 'Email',
    uphoneno: 'Phone Number',
    uactivation: 'Status',
    ugender: 'Gender',
    ucountry: 'Country',
    ustatus: 'Login Status',
    clustername: 'Cluster',
  };

  const openDetails = (user) => {
    const details = {
      userid: user.userid || 'N/A',
      username: user.username || 'N/A',
      roleLabel: user.roleLabel || 'N/A',
      ufirstname: user.ufirstname || 'N/A',
      ulastname: user.ulastname || 'N/A',
      uemail: user.uemail || 'N/A',
      uphoneno: user.uphoneno || 'N/A',
      uactivation: user.uactivation || 'N/A',
      ugender: user.ugender || 'N/A',
      ucountry: user.ucountry || 'N/A',
      ustatus: user.ustatus || 'N/A',
    };

    if (user.role === 'moderator') {
      details.clustername = user.clustername || 'N/A';
    }

    setSelectedUser(details);
  };

  const handleCreateModerator = () => {
    setEditModerator(null);
    setIsModeratorFormOpen(true);
  };

  const handleClusterSubmit = () => {
    if (!clusterModerator) return;

    const userData = {
      clusterid: selectedCluster || null,
      username: clusterModerator.username || `user_${clusterModerator.userid}`,
      firstName: clusterModerator.ufirstname,
      lastName: clusterModerator.ulastname,
      email: clusterModerator.uemail,
      phoneNo: clusterModerator.uphoneno,
      country: clusterModerator.ucountry,
      zipCode: clusterModerator.uzipcode,
      creatorid: localStorage.getItem('userid'),
      creatorUsername: localStorage.getItem('username'),
    };

    if (!clusterModerator.userid) {
      displayToast('error', 'Invalid moderator ID.');
      return;
    }

    updateClusterMutation.mutate({
      userData,
      userid: clusterModerator.userid,
    });
  };

  const handleAction = (action, user) => {
    if (action === 'view') {
      openDetails(user);
      return;
    }

    if (action === 'suspend') {
      suspendMutation.mutate(user.userid);
      return;
    }

    if (action === 'activate') {
      activateMutation.mutate(user.userid);
      return;
    }

    if (action === 'edit') {
      setEditModerator(user);
      setIsModeratorFormOpen(true);
      return;
    }

    if (action === 'remove') {
      setModeratorToDelete(user);
      setIsDialogOpen(true);
      return;
    }

    if (action === 'editCluster') {
      setClusterModerator(user);
      setSelectedCluster(user.clusterid || '');
      setShowClusterModal(true);
    }
  };

  const getDropdownItems = (user) => {
    const status = user.uactivation || 'Active';

    if (user.role === 'admin') {
      return [
        { label: 'View Details', icon: <FaEye />, action: 'view' },
      ];
    }

    if (user.role === 'customer') {
      if (status === 'Inactive') {
        return [
          { label: 'View Details', icon: <FaEye />, action: 'view' },
          { label: 'Activate', icon: <FaUser />, action: 'activate' },
        ];
      }

      return [
        { label: 'View Details', icon: <FaEye />, action: 'view' },
        { label: 'Suspend', icon: <FaBan />, action: 'suspend' },
      ];
    }

    if (user.role === 'moderator') {
      if (status === 'Inactive') {
        return [
          { label: 'View Details', icon: <FaEye />, action: 'view' },
          { label: 'Edit', icon: <FaEdit />, action: 'edit' },
          { label: 'Edit Cluster', icon: <FaLayerGroup />, action: 'editCluster' },
          { label: 'Activate', icon: <FaUser />, action: 'activate' },
          { label: 'Remove', icon: <FaTrash />, action: 'remove' },
        ];
      }

      return [
        { label: 'View Details', icon: <FaEye />, action: 'view' },
        { label: 'Edit', icon: <FaEdit />, action: 'edit' },
        { label: 'Edit Cluster', icon: <FaLayerGroup />, action: 'editCluster' },
        { label: 'Suspend', icon: <FaBan />, action: 'suspend' },
      ];
    }

    return [
      { label: 'View Details', icon: <FaEye />, action: 'view' },
    ];
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
      header: 'Role',
      accessor: 'role',
      render: (user) => (
        <span className={`role-badge ${user.role}`}>
          {user.roleLabel}
        </span>
      ),
    },
    { header: 'Email', accessor: 'uemail' },
    {
      header: 'Status',
      accessor: 'uactivation',
      render: (user) => <Status value={user.uactivation || 'Active'} />,
    },
    {
      header: 'Cluster',
      accessor: 'clustername',
      render: (user) =>
        user.role === 'moderator' ? (
          <span className="cluster-pill">
            {user.clustername || 'No Cluster'}
          </span>
        ) : (
          <span className="muted-text">—</span>
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

  const isLoading = adminsLoading || customersLoading || moderatorsLoading || clustersLoading;
  const hasError = adminsError || customersError || moderatorsError;

  return (
    <div className="roles-management-page">
   <section className="roles-hero">
  <div>
    <h1 className="dashboard-page-title">Role Management</h1>
    <p className="dashboard-page-description">
      View administrators, customers, and moderators in one page. Filter by role,
      status, and search user details quickly.
    </p>
  </div>

        <button
          type="button"
          className="roles-create-btn"
          onClick={handleCreateModerator}
        >
          <FaPlus />
          <span>Create Moderator</span>
        </button>
      </section>

      <section className="roles-stats-grid">
        <div className="roles-stat-card all">
          <FaUsers />
          <div>
            <span>All Users</span>
            <strong>{roleCounts.all}</strong>
          </div>
        </div>

        <div className="roles-stat-card admin">
          <FaUserShield />
          <div>
            <span>Administrators</span>
            <strong>{roleCounts.admin}</strong>
          </div>
        </div>

        <div className="roles-stat-card customer">
          <FaUser />
          <div>
            <span>Customers</span>
            <strong>{roleCounts.customer}</strong>
          </div>
        </div>

        <div className="roles-stat-card moderator">
          <FaUserCog />
          <div>
            <span>Moderators</span>
            <strong>{roleCounts.moderator}</strong>
          </div>
        </div>
      </section>

      <section className="roles-toolbar-card">
        <div className="roles-search-wrap">
          <FaSearch className="roles-search-icon" />
          <input
            type="text"
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            placeholder="Search by username, name, email, phone, role, or cluster..."
          />
        </div>

        <div className="roles-filter-grid">
          <div className="roles-filter-group">
            <label>
              <FaFilter />
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
            >
              <option value="All">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="customer">Customer</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>

          <div className="roles-filter-group">
            <label>Status</label>
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {(selectedRole !== 'All' || selectedStatus !== 'All' || searchKey) && (
            <button
              type="button"
              className="roles-clear-btn"
              onClick={() => {
                setSelectedRole('All');
                setSelectedStatus('All');
                setSearchKey('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </section>

      <div className="roles-results-row">
        <span>
          Showing <strong>{filteredUsers.length}</strong> of <strong>{allUsers.length}</strong> users
        </span>

        <span>
          Active: <strong>{roleCounts.active}</strong> · Inactive: <strong>{roleCounts.inactive}</strong>
        </span>
      </div>

      {isLoading ? (
        <div className="loader-box">
          <Loader />
        </div>
      ) : hasError ? (
        <div className="roles-error-box">
          Failed to load user roles. Please refresh and try again.
        </div>
      ) : (
        <PaginatedTable
          data={filteredUsers}
          columns={columns}
          rowKey={(user) => `${user.role}-${user.userid}`}
          enableCheckbox={false}
        />
      )}

      <Modal
        isOpen={!!selectedUser}
        title="User Details"
        data={selectedUser || {}}
        labels={displayLabels}
        onClose={() => setSelectedUser(null)}
      />

      {isModeratorFormOpen && (
        <ModeratorForm
          initialData={editModerator}
          onSubmit={() => {
            setIsModeratorFormOpen(false);
            queryClient.invalidateQueries(['moderators']);
            displayToast(
              'success',
              editModerator
                ? 'Moderator updated successfully!'
                : 'Moderator created successfully!'
            );
          }}
          onClose={() => setIsModeratorFormOpen(false)}
        />
      )}

      <Alert
        isOpen={isDialogOpen}
        title="Confirm Remove"
        message={`Are you sure you want to remove Moderator ${moderatorToDelete?.username}?`}
        onConfirm={() => {
          if (moderatorToDelete) {
            removeMutation.mutate(moderatorToDelete.userid);
          }
        }}
        onCancel={() => {
          setIsDialogOpen(false);
          setModeratorToDelete(null);
        }}
      />

      {showClusterModal && (
        <div className="roles-modal-overlay">
          <div className="roles-modal-container">
            <div className="roles-modal-header">
              <h2>Edit Cluster Assignment</h2>
              <button
                type="button"
                className="roles-modal-close"
                onClick={() => setShowClusterModal(false)}
              >
                ×
              </button>
            </div>

            <div className="roles-modal-body">
              <p>
                Assign cluster for{' '}
                <strong>
                  {clusterModerator?.ufirstname} {clusterModerator?.ulastname}
                </strong>
              </p>

              <div className="roles-form-group">
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

            <div className="roles-modal-footer">
              <button
                type="button"
                className="roles-submit-btn"
                onClick={handleClusterSubmit}
                disabled={updateClusterMutation.isPending}
              >
                {updateClusterMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                className="roles-cancel-btn"
                onClick={() => setShowClusterModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showToast && <Toast type={toastType} message={toastMessage} />}
    </div>
  );
};

export default RolesManagement;