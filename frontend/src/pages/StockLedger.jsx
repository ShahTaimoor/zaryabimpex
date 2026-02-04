import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  Search,
  Printer,
  Download,
  Calendar,
  X,
  ChevronDown,
  Eye
} from 'lucide-react';
import { useGetStockLedgerQuery } from '../store/services/inventoryApi';
import { useGetProductsQuery } from '../store/services/productsApi';
import { useGetCustomersQuery } from '../store/services/customersApi';
import { useGetSuppliersQuery } from '../store/services/suppliersApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { handleApiError } from '../utils/errorHandler';
import DateFilter from '../components/DateFilter';
import { getCurrentDatePakistan, getDateDaysAgo, formatDateForInput } from '../utils/dateUtils';
import toast from 'react-hot-toast';

export const StockLedger = () => {
  const defaultDateTo = getCurrentDatePakistan();
  const defaultDateFrom = getDateDaysAgo(365); // Default to 1 year

  // State
  const [filters, setFilters] = useState({
    invoiceType: '--All--',
    customer: '',
    supplier: '',
    product: '',
    invoiceNo: '',
    dateFrom: defaultDateFrom,
    dateTo: defaultDateTo
  });

  const [showReport, setShowReport] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const customerDropdownRef = useRef(null);
  const supplierDropdownRef = useRef(null);
  const productDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
        setShowSupplierDropdown(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data
  const { data: ledgerData, isLoading, isFetching } = useGetStockLedgerQuery(
    {
      invoiceType: filters.invoiceType === '--All--' ? undefined : filters.invoiceType,
      customer: filters.customer || undefined,
      supplier: filters.supplier || undefined,
      product: filters.product || undefined,
      invoiceNo: filters.invoiceNo || undefined,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      page: currentPage,
      limit: 1000
    },
    {
      skip: !showReport,
      onError: (error) => handleApiError(error, 'Stock Ledger')
    }
  );

  // Fetch customers
  const { data: customersData } = useGetCustomersQuery(
    { search: customerSearchQuery, limit: 100 },
    { skip: !showCustomerDropdown }
  );

  const allCustomers = useMemo(() => {
    return customersData?.data?.customers || customersData?.customers || customersData?.data || [];
  }, [customersData]);

  // Fetch suppliers
  const { data: suppliersData } = useGetSuppliersQuery(
    { search: supplierSearchQuery, limit: 100 },
    { skip: !showSupplierDropdown }
  );

  const allSuppliers = useMemo(() => {
    return suppliersData?.data?.suppliers || suppliersData?.suppliers || suppliersData?.data || [];
  }, [suppliersData]);

  // Fetch products
  const { data: productsData } = useGetProductsQuery(
    { search: productSearchQuery, limit: 100 },
    { skip: !showProductDropdown }
  );

  const allProducts = useMemo(() => {
    return productsData?.data?.products || productsData?.products || productsData?.data || [];
  }, [productsData]);

  // Filter customers for dropdown
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return allCustomers.slice(0, 50);
    const query = customerSearchQuery.toLowerCase();
    return allCustomers.filter(customer => {
      const name = (customer.businessName || customer.name || '').toLowerCase();
      const email = (customer.email || '').toLowerCase();
      const phone = (customer.phone || '').toLowerCase();
      return name.includes(query) || email.includes(query) || phone.includes(query);
    }).slice(0, 50);
  }, [allCustomers, customerSearchQuery]);

  // Filter suppliers for dropdown
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchQuery.trim()) return allSuppliers.slice(0, 50);
    const query = supplierSearchQuery.toLowerCase();
    return allSuppliers.filter(supplier => {
      const name = (supplier.companyName || supplier.name || '').toLowerCase();
      const email = (supplier.email || '').toLowerCase();
      const phone = (supplier.phone || '').toLowerCase();
      return name.includes(query) || email.includes(query) || phone.includes(query);
    }).slice(0, 50);
  }, [allSuppliers, supplierSearchQuery]);

  // Filter products for dropdown
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return allProducts.slice(0, 50);
    const query = productSearchQuery.toLowerCase();
    return allProducts.filter(product => {
      const name = (product.name || '').toLowerCase();
      const sku = (product.sku || '').toLowerCase();
      return name.includes(query) || sku.includes(query);
    }).slice(0, 50);
  }, [allProducts, productSearchQuery]);

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    if (field === 'customer') {
      setCustomerSearchQuery(value ? (allCustomers.find(c => c._id === value)?.businessName || allCustomers.find(c => c._id === value)?.name || '') : '');
    }
    if (field === 'supplier') {
      setSupplierSearchQuery(value ? (allSuppliers.find(s => s._id === value)?.companyName || allSuppliers.find(s => s._id === value)?.name || '') : '');
    }
    if (field === 'product') {
      setProductSearchQuery(value ? (allProducts.find(p => p._id === value)?.name || '') : '');
    }
  };

  const handleCustomerSelect = (customer) => {
    setFilters({ ...filters, customer: customer._id, supplier: '' });
    setCustomerSearchQuery(customer.businessName || customer.name || '');
    setShowCustomerDropdown(false);
    setSupplierSearchQuery('');
  };

  const handleSupplierSelect = (supplier) => {
    setFilters({ ...filters, supplier: supplier._id, customer: '' });
    setSupplierSearchQuery(supplier.companyName || supplier.name || '');
    setShowSupplierDropdown(false);
    setCustomerSearchQuery('');
  };

  const handleProductSelect = (product) => {
    setFilters({ ...filters, product: product._id });
    setProductSearchQuery(product.name || '');
    setShowProductDropdown(false);
  };

  const handleView = () => {
    // Check if at least one filter is selected
    const hasFilters = filters.invoiceType !== '--All--' || 
                      filters.customer || 
                      filters.supplier || 
                      filters.product || 
                      filters.invoiceNo ||
                      filters.dateFrom ||
                      filters.dateTo;
    
    if (!hasFilters) {
      toast.error('Please select at least one filter to view the report');
      return;
    }

    setShowReport(true);
    setCurrentPage(1);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateForReport = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const ledger = ledgerData?.data?.ledger || [];
  const grandTotal = ledgerData?.data?.grandTotal || { totalQuantity: 0, totalAmount: 0 };
  const pagination = ledgerData?.data?.pagination || { current: 1, pages: 1, total: 0 };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Stock Ledger</h1>
          <p className="mt-1 text-sm text-gray-500">View stock movement history with detailed filters</p>
        </div>

        {/* Filter Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Invoice Type */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Invoice Type
              </label>
              <select
                value={filters.invoiceType}
                onChange={(e) => handleFilterChange('invoiceType', e.target.value)}
                className="input w-full"
              >
                <option value="--All--">--All--</option>
                <option value="SALE">SALE</option>
                <option value="PURCHASE">PURCHASE</option>
                <option value="PURCHASE RETURN">PURCHASE RETURN</option>
                <option value="SALE RETURN">SALE RETURN</option>
                <option value="DEMAGE">DEMAGE</option>
              </select>
            </div>

            {/* Customer / Supplier */}
            <div className="relative" ref={customerDropdownRef}>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Customer / Supplier
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select customer or supplier..."
                  value={customerSearchQuery || supplierSearchQuery}
                  onChange={(e) => {
                    if (filters.customer) {
                      setCustomerSearchQuery(e.target.value);
                    } else if (filters.supplier) {
                      setSupplierSearchQuery(e.target.value);
                    } else {
                      setCustomerSearchQuery(e.target.value);
                    }
                    setShowCustomerDropdown(true);
                    setShowSupplierDropdown(true);
                  }}
                  onFocus={() => {
                    if (filters.customer) {
                      setShowCustomerDropdown(true);
                    } else if (filters.supplier) {
                      setShowSupplierDropdown(true);
                    } else {
                      setShowCustomerDropdown(true);
                    }
                  }}
                  className="input w-full"
                />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                {showCustomerDropdown && !filters.supplier && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer._id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {customer.businessName || customer.name}
                        </div>
                        {customer.email && (
                          <div className="text-xs text-gray-500">{customer.email}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {showSupplierDropdown && !filters.customer && filteredSuppliers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredSuppliers.map((supplier) => (
                      <button
                        key={supplier._id}
                        onClick={() => handleSupplierSelect(supplier)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {supplier.companyName || supplier.name}
                        </div>
                        {supplier.email && (
                          <div className="text-xs text-gray-500">{supplier.email}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {(filters.customer || filters.supplier) && (
                <button
                  onClick={() => {
                    handleFilterChange('customer', '');
                    handleFilterChange('supplier', '');
                    setCustomerSearchQuery('');
                    setSupplierSearchQuery('');
                  }}
                  className="absolute right-2 top-8 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Invoice No */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Invoice No
              </label>
              <input
                type="text"
                placeholder="0"
                value={filters.invoiceNo}
                onChange={(e) => handleFilterChange('invoiceNo', e.target.value)}
                className="input w-full"
              />
            </div>

            {/* Product */}
            <div className="relative" ref={productDropdownRef}>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Product
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select product..."
                  value={productSearchQuery}
                  onChange={(e) => {
                    setProductSearchQuery(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  className="input w-full"
                />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                {showProductDropdown && filteredProducts.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <button
                        key={product._id}
                        onClick={() => handleProductSelect(product)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50"
                      >
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        {product.sku && (
                          <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {filters.product && (
                <button
                  onClick={() => {
                    handleFilterChange('product', '');
                    setProductSearchQuery('');
                  }}
                  className="absolute right-2 top-8 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Date Range */}
            <div className="lg:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <DateFilter
                startDate={filters.dateFrom}
                endDate={filters.dateTo}
                onDateChange={(startDate, endDate) => {
                  setFilters({ ...filters, dateFrom: startDate, dateTo: endDate });
                }}
                compact={false}
                showPresets={true}
              />
            </div>

            {/* View Button */}
            <div className="flex items-end">
              <button
                onClick={handleView}
                disabled={isLoading || isFetching}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md border border-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View
              </button>
            </div>
          </div>
        </div>

        {/* Report Section */}
        {showReport && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-none">
            {/* Report Header */}
            <div className="p-6 border-b border-gray-200 print:border-b-2">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Stock Ledger</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    From: {formatDateForReport(filters.dateFrom)} To: {formatDateForReport(filters.dateTo)}
                  </p>
                </div>
                <div className="flex gap-2 print:hidden">
                  <button
                    onClick={handlePrint}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    title="Print"
                  >
                    <Printer className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Report Content */}
            {isLoading || isFetching ? (
              <div className="p-12 text-center">
                <LoadingSpinner />
              </div>
            ) : ledger.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No data found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        S.No
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice No
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer / Supplier
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        QTY
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ledger.map((productGroup, groupIndex) => (
                      <React.Fragment key={productGroup.productId || groupIndex}>
                        {/* Product Header */}
                        <tr className="bg-gray-100 font-semibold">
                          <td colSpan="8" className="px-4 py-2 text-sm text-gray-900">
                            {productGroup.productName}
                          </td>
                        </tr>
                        {/* Product Entries */}
                        {productGroup.entries.map((entry, entryIndex) => (
                          <tr key={`${entry.referenceId}-${entryIndex}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {entryIndex + 1}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(entry.invoiceDate)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {entry.invoiceNo}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {entry.invoiceType}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {entry.customerSupplier}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                              {formatCurrency(entry.price)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                              {entry.quantity < 0 ? `(${Math.abs(entry.quantity)})` : entry.quantity}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                              {entry.amount < 0 ? `(${formatCurrency(Math.abs(entry.amount))})` : formatCurrency(entry.amount)}
                            </td>
                          </tr>
                        ))}
                        {/* Product Total */}
                        <tr className="bg-blue-50 font-semibold">
                          <td colSpan="5" className="px-4 py-2 text-sm text-gray-900">
                            Total of {productGroup.productName}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900"></td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">
                            {productGroup.totalQuantity < 0 ? `(${Math.abs(productGroup.totalQuantity)})` : productGroup.totalQuantity}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">
                            {productGroup.totalAmount < 0 ? `(${formatCurrency(Math.abs(productGroup.totalAmount))})` : formatCurrency(productGroup.totalAmount)}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                    {/* Grand Total */}
                    <tr className="bg-gray-200 font-bold">
                      <td colSpan="5" className="px-4 py-3 text-sm text-gray-900">
                        Grand Total
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900"></td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {grandTotal.totalQuantity < 0 ? `(${Math.abs(grandTotal.totalQuantity)})` : grandTotal.totalQuantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {grandTotal.totalAmount < 0 ? `(${formatCurrency(Math.abs(grandTotal.totalAmount))})` : formatCurrency(grandTotal.totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Report Footer */}
            {ledger.length > 0 && (
              <div className="p-4 border-t border-gray-200 text-sm text-gray-600 print:border-t-2">
                <div className="flex justify-between items-center">
                  <div>
                    Print Date: {new Date().toLocaleString('en-GB', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </div>
                  <div>
                    Page: {pagination.current} of {pagination.pages}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockLedger;
