import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Search, 
  Plus, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertCircle,
  Package,
  Users,
  FileText,
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import {
  useGetPurchaseReturnsQuery,
  useGetSupplierInvoicesQuery,
  useCreatePurchaseReturnMutation,
  useGetPurchaseReturnStatsQuery,
} from '../store/services/purchaseReturnsApi';
import { useGetSuppliersQuery } from '../store/services/suppliersApi';
import { handleApiError, showSuccessToast, showErrorToast } from '../utils/errorHandler';
import { LoadingSpinner, LoadingCard, LoadingTable } from '../components/LoadingSpinner';
import { useResponsive } from '../components/ResponsiveContainer';
import { SearchableDropdown } from '../components/SearchableDropdown';
import CreatePurchaseReturnModal from '../components/CreatePurchaseReturnModal';
import ReturnDetailModal from '../components/ReturnDetailModal';

// Helper function to get local date in YYYY-MM-DD format
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const PurchaseReturns = () => {
  const today = getLocalDateString();
  const [step, setStep] = useState('supplier'); // 'supplier', 'purchases', 'return'
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  
  // Date filter states (similar to Dashboard)
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [activeFromDate, setActiveFromDate] = useState(today);
  const [activeToDate, setActiveToDate] = useState(today);
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: '',
    search: '',
    startDate: today,
    endDate: today
  });

  // Handle date search (similar to Dashboard)
  const handleDateSearch = () => {
    setActiveFromDate(fromDate);
    setActiveToDate(toDate);
    setFilters(prev => ({
      ...prev,
      startDate: fromDate,
      endDate: toDate,
      page: 1 // Reset to first page when date changes
    }));
  };

  const { isMobile } = useResponsive();

  // Fetch suppliers for selection
  const { data: suppliersData, isLoading: suppliersLoading } = useGetSuppliersQuery(
    { limit: 100 },
    { skip: step !== 'supplier' }
  );

  const suppliers = suppliersData?.data?.suppliers || suppliersData?.suppliers || suppliersData?.items || [];

  // Fetch supplier's purchase invoices when supplier is selected
  const { 
    data: invoicesData, 
    isLoading: invoicesLoading,
    refetch: refetchInvoices
  } = useGetSupplierInvoicesQuery(
    selectedSupplier?._id,
    { skip: !selectedSupplier?._id || step !== 'purchases' }
  );

  const invoices = invoicesData?.data || [];

  // Fetch purchase returns (use active dates in filters)
  const { 
    data: returnsData, 
    isLoading: returnsLoading, 
    error: returnsError,
    refetch: refetchReturns
  } = useGetPurchaseReturnsQuery({
    ...filters,
    startDate: activeFromDate,
    endDate: activeToDate
  }, {
    onError: (error) => {
      handleApiError(error, 'Fetch Purchase Returns');
    }
  });

  const returns = returnsData?.data || [];
  const pagination = returnsData?.pagination || {};

  // Fetch return statistics (use active dates)
  const { 
    data: statsData, 
    isLoading: statsLoading 
  } = useGetPurchaseReturnStatsQuery(
    activeFromDate && activeToDate
      ? {
          startDate: activeFromDate,
          endDate: activeToDate
        }
      : {}
  );

  const stats = statsData?.data || {};

  // Create return mutation
  const [createPurchaseReturn, { isLoading: isCreatingReturn }] = useCreatePurchaseReturnMutation();

  // Handle supplier selection
  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier);
    setStep('purchases');
    setSelectedPurchase(null);
  };

  // Handle purchase selection
  const handlePurchaseSelect = (purchase) => {
    setSelectedPurchase(purchase);
    setShowCreateModal(true);
  };

  // Handle return creation success
  const handleReturnCreated = () => {
    setShowCreateModal(false);
    setSelectedPurchase(null);
    setSelectedSupplier(null);
    setStep('supplier');
    refetchReturns();
    refetchInvoices();
    showSuccessToast('Purchase return created successfully');
  };

  // Handle return detail view
  const handleReturnSelect = (returnItem) => {
    setSelectedReturn(returnItem);
    setShowDetailModal(true);
  };

  // Handle back to supplier selection
  const handleBackToSupplier = () => {
    setSelectedSupplier(null);
    setSelectedPurchase(null);
    setStep('supplier');
  };

  // Handle back to purchases list
  const handleBackToPurchases = () => {
    setSelectedPurchase(null);
    setStep('purchases');
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Format date (handle timezone properly - show date only, no time)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Parse the date string and extract just the date part
      const date = new Date(dateString);
      // Get local date components to avoid timezone issues
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      
      // Create a new date with local components
      const localDate = new Date(year, month, day);
      return localDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      approved: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      processing: { bg: 'bg-purple-100', text: 'text-purple-800', icon: Package },
      received: { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Package },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6 w-full max-w-full overflow-x-hidden px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Purchase Returns</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage supplier returns and refunds</p>
        </div>
        
        {/* Date Filter (similar to Dashboard) */}
        <div className="flex flex-row items-center space-x-1.5 sm:space-x-4 w-full sm:w-auto">
          <div className="flex flex-row items-center space-x-1.5 sm:space-x-3 flex-1 sm:flex-initial min-w-0">
            <Calendar className="h-4 w-4 text-gray-500 hidden sm:block flex-shrink-0" />
            <div className="flex flex-row items-center space-x-1 flex-1 sm:flex-initial min-w-0">
              <label className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap hidden sm:inline flex-shrink-0">From:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input text-xs sm:text-sm flex-1 min-w-0 sm:w-36 md:w-40 py-1.5 sm:py-2 h-[38px] sm:h-auto"
              />
            </div>
            <div className="flex flex-row items-center space-x-1 flex-1 sm:flex-initial min-w-0">
              <label className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap hidden sm:inline flex-shrink-0">To:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input text-xs sm:text-sm flex-1 min-w-0 sm:w-36 md:w-40 py-1.5 sm:py-2 h-[38px] sm:h-auto"
              />
            </div>
          </div>
          <button 
            onClick={handleDateSearch}
            className="btn btn-primary flex items-center justify-center px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-base flex-shrink-0 min-w-[40px] sm:min-w-0 h-[38px] sm:h-auto"
          >
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline ml-1 sm:ml-2">Search</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Returns</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalReturns || 0}</p>
            </div>
            <RotateCcw className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats?.pendingReturns || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Refund</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.netRefundAmount || 0)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Refund</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.averageRefundAmount || 0)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Step 1: Supplier Selection */}
      {step === 'supplier' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 1: Select Supplier</h2>
            <p className="text-sm text-gray-600">Choose a supplier to view their purchases and create a return</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Supplier
              </label>
              {suppliersLoading ? (
                <LoadingSpinner />
              ) : (
                <SearchableDropdown
                  placeholder="Search supplier by name, phone, or email..."
                  items={suppliers}
                  onSelect={handleSupplierSelect}
                  displayKey={(supplier) => {
                    const name = supplier.companyName || supplier.businessName || supplier.name || 'Unknown';
                    return (
                      <div>
                        <div className="font-medium">{name}</div>
                        {supplier.phone && (
                          <div className="text-xs text-gray-500">Phone: {supplier.phone}</div>
                        )}
                      </div>
                    );
                  }}
                  selectedItem={selectedSupplier}
                  className="w-full"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Purchases List */}
      {step === 'purchases' && selectedSupplier && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <button
                  onClick={handleBackToSupplier}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change Supplier
                </button>
                <h2 className="text-lg font-semibold text-gray-900">
                  Step 2: Select Purchase Invoice
                </h2>
                <p className="text-sm text-gray-600">
                  Supplier: <span className="font-medium">
                    {selectedSupplier.companyName || selectedSupplier.businessName || selectedSupplier.name || 'N/A'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {invoicesLoading ? (
            <LoadingTable />
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No purchase invoices found for this supplier</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice._id}
                  onClick={() => handlePurchaseSelect(invoice)}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <span className="font-semibold text-gray-900">
                          {invoice.invoiceNumber || invoice.poNumber || 'N/A'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(invoice.createdAt || invoice.invoiceDate)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 ml-8">
                        <div className="flex items-center gap-4">
                          <span>Items: {invoice.items?.length || 0}</span>
                          <span>Total: {formatCurrency(invoice.pricing?.total || invoice.total || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm">
                      Create Return
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Returns List */}
      {step === 'supplier' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Purchase Returns</h2>
          </div>

          {returnsLoading ? (
            <LoadingTable />
          ) : returns.length === 0 ? (
            <div className="text-center py-12">
              <RotateCcw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No purchase returns found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Return Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Original Purchase
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {returns.map((returnItem) => (
                    <tr key={returnItem._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {returnItem.returnNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {returnItem.supplier?.companyName || returnItem.supplier?.businessName || 
                         returnItem.supplier?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {returnItem.originalOrder?.invoiceNumber || 
                         returnItem.originalOrder?.poNumber ||
                         (returnItem.originalOrder?._id ? `Invoice ${returnItem.originalOrder._id.toString().slice(-6)}` : 'N/A')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(returnItem.netRefundAmount || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(returnItem.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(returnItem.returnDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleReturnSelect(returnItem)}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Return Modal */}
      {showCreateModal && selectedPurchase && selectedSupplier && (
        <CreatePurchaseReturnModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedPurchase(null);
          }}
          onSuccess={handleReturnCreated}
          purchaseInvoice={selectedPurchase}
          supplier={selectedSupplier}
        />
      )}

      {/* Return Detail Modal */}
      {showDetailModal && selectedReturn && (
        <ReturnDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedReturn(null);
          }}
          returnData={selectedReturn}
          onUpdate={refetchReturns}
        />
      )}
    </div>
  );
};

export default PurchaseReturns;
