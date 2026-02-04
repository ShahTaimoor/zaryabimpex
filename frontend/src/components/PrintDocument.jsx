import React, { useMemo } from 'react';

const PrintDocument = ({
    companySettings,
    orderData,
    printSettings,
    documentTitle = 'Invoice',
    partyLabel = 'Customer',
    children
}) => {
    const {
        showLogo = true,
        showCompanyDetails = true,
        showTax = true,
        showDiscount = true,
        showFooter = true,
        showDate = true,
        showEmail = true,
        showCameraTime = false,
        showDescription = true,
        headerText = '',
        footerText = ''
    } = printSettings || {};

    const formatDate = (date) =>
        new Date(date || new Date()).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

    const formatDateTime = (date) =>
        new Date(date || new Date()).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

    const formatCurrency = (value) => {
        if (value === undefined || value === null || isNaN(value)) return '-';
        return Number(value).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    };

    const toNumber = (value, fallback = 0) => {
        if (value === undefined || value === null) return fallback;
        const num = typeof value === 'number' ? value : parseFloat(value);
        return Number.isFinite(num) ? num : fallback;
    };

    const formatText = (value, fallback = 'N/A') =>
        value && String(value).trim() !== '' ? value : fallback;

    const partyHeaderLabel =
        partyLabel?.toLowerCase() === 'supplier' ? 'Supplier' : 'Bill To';

    // Fallback for companySettings if null
    const safeCompanySettings = companySettings || {};

    const resolvedCompanyName =
        safeCompanySettings.companyName || 'Your Company Name';
    const resolvedDocumentTitle = documentTitle || 'Invoice';
    const resolvedCompanySubtitle = resolvedDocumentTitle;
    const resolvedCompanyAddress = safeCompanySettings.address || '';
    const resolvedCompanyPhone = safeCompanySettings.contactNumber || '';

    const partyInfo = useMemo(() => {
        if (!orderData) {
            return {
                name: 'Walk-in Customer',
                email: 'N/A',
                phone: 'N/A',
                extra: '',
                address: ''
            };
        }

        const customer =
            orderData.customerInfo || orderData.customer || orderData.supplier || {};
        const composedName =
            customer.displayName ||
            customer.businessName ||
            customer.name ||
            (customer.firstName || customer.lastName
                ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                : '') ||
            'Walk-in Customer';
        
        // Get customer address from addresses array
        let customerAddress = '';
        if (customer.addresses && Array.isArray(customer.addresses) && customer.addresses.length > 0) {
            // Try to find default address first, then billing address, then first address
            const defaultAddress = customer.addresses.find(addr => addr.isDefault) ||
                                   customer.addresses.find(addr => addr.type === 'billing' || addr.type === 'both') ||
                                   customer.addresses[0];
            
            if (defaultAddress) {
                const addressParts = [];
                if (defaultAddress.street) addressParts.push(defaultAddress.street);
                if (defaultAddress.city) addressParts.push(defaultAddress.city);
                if (defaultAddress.state) addressParts.push(defaultAddress.state);
                customerAddress = addressParts.join(', ');
            }
        }
        
        return {
            name: composedName,
            email: customer.email || 'N/A',
            phone: customer.phone || 'N/A',
            extra:
                customer.companyName ||
                orderData.customerInfo?.businessName ||
                orderData.customer?.businessName ||
                '',
            address: customerAddress || orderData.customerInfo?.address || ''
        };
    }, [orderData]);

    const items = Array.isArray(orderData?.items) ? orderData.items : [];

    const computedSubtotal =
        orderData?.pricing?.subtotal ??
        orderData?.subtotal ??
        items.reduce((sum, item) => {
            const qty = toNumber(item.quantity ?? item.qty, 0);
            const price = toNumber(
                item.unitPrice ?? item.price ?? item.unitCost ?? item.rate,
                0
            );
            return sum + qty * price;
        }, 0);

    const discountValue =
        orderData?.pricing?.discountAmount ??
        orderData?.discount ??
        orderData?.pricing?.discount ??
        0;
    const taxValue =
        orderData?.pricing?.taxAmount ??
        orderData?.tax ??
        (orderData?.pricing?.isTaxExempt ? 0 : 0);
    const totalValue =
        orderData?.pricing?.total ??
        orderData?.total ??
        computedSubtotal - toNumber(discountValue) + toNumber(taxValue);

    const documentNumber =
        orderData?.invoiceNumber ||
        orderData?.orderNumber ||
        orderData?.poNumber ||
        orderData?.referenceNumber ||
        orderData?._id ||
        'N/A';

    const documentStatus =
        orderData?.status ||
        orderData?.orderStatus ||
        orderData?.invoiceStatus ||
        orderData?.payment?.status ||
        'Pending';

    const documentType =
        orderData?.orderType ||
        orderData?.type ||
        resolvedDocumentTitle ||
        'Invoice';

    const paymentStatus =
        orderData?.payment?.status ||
        (orderData?.payment?.isPartialPayment
            ? 'Partial'
            : orderData?.payment?.remainingBalance > 0
                ? 'Pending'
                : orderData?.payment?.amountPaid
                    ? 'Paid'
                    : orderData?.payment?.method
                        ? 'Pending'
                        : 'N/A');

    const paymentMethod = orderData?.payment?.method || 'N/A';
    const paymentAmount =
        orderData?.payment?.amountPaid ??
        orderData?.pricing?.total ??
        orderData?.total ??
        0;

    const generatedAt = new Date();

    const billToLines = [
        partyInfo.name,
        partyInfo.extra || null,
        partyInfo.email !== 'N/A' && showEmail ? partyInfo.email : null,
        partyInfo.phone !== 'N/A' ? partyInfo.phone : null,
        partyInfo.address || null
    ].filter(Boolean);

    const invoiceDetailLines = [
        { label: 'Invoice #:', value: formatText(documentNumber) },
        showDate ? {
            label: 'Date:',
            value: formatDate(orderData?.createdAt || orderData?.invoiceDate)
        } : null,
        { label: 'Status:', value: formatText(documentStatus) },
        { label: 'Type:', value: formatText(documentType) }
    ].filter(Boolean);

    const paymentDetailLines = [
        { label: 'Status:', value: formatText(paymentStatus) },
        { label: 'Method:', value: formatText(paymentMethod) },
        { label: 'Amount:', value: formatCurrency(paymentAmount) }
    ];

    const hasCameraTime = orderData?.billStartTime || orderData?.billEndTime;

    return (
        <div className="print-document">
            {/* Option to inject content (like toolbar) at the top that is hidden in print via CSS if needed */}
            {children}

            {/* Header Text */}
            {headerText && (
                <div className="text-center text-sm text-gray-600 mb-4 pb-2 border-b border-gray-100">
                    {headerText}
                </div>
            )}

            {/* Company Header */}
            <div className="print-document__company">
                {showLogo && safeCompanySettings.logo ? (
                    <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                        <img
                            src={safeCompanySettings.logo}
                            alt="Company Logo"
                            style={{ maxHeight: '80px', maxWidth: '250px', display: 'inline-block' }}
                        />
                    </div>
                ) : showLogo && (
                    // Placeholder if logo is enabled but missing (useful for preview)
                    // or just render nothing if we strictly follow PrintModal logic?
                    // PrintModal rendered empty div or nothing?
                    // PrintModal checked `showLogo && companySettings.logo`.
                    // So if no logo, nothing is shown. 
                    null
                )}

                <div className="print-document__company-name">{resolvedCompanyName}</div>
                {showCompanyDetails && (
                    <div className="print-document__company-subtitle">{resolvedCompanySubtitle}</div>
                )}
            </div>

            <div className="print-document__info-grid">
                <div className="print-document__info-block">
                    <div className="print-document__section-label">{partyHeaderLabel}:</div>
                    {billToLines.map((line, idx) => (
                        <div
                            key={`bill-${idx}`}
                            className="print-document__info-line print-document__info-line--stack"
                        >
                            {line}
                        </div>
                    ))}
                </div>
                <div className="print-document__info-block">
                    <div className="print-document__section-label">Invoice Details:</div>
                    {invoiceDetailLines.map((line, idx) => (
                        <div key={`inv-${idx}`} className="print-document__info-line">
                            <span className="print-document__info-label">{line.label}</span>
                            <span className="print-document__info-value">{line.value}</span>
                        </div>
                    ))}
                </div>
                <div className="print-document__info-block">
                    <div className="print-document__section-label">Payment:</div>
                    {paymentDetailLines.map((line, idx) => (
                        <div key={`pay-${idx}`} className="print-document__info-line">
                            <span className="print-document__info-label">{line.label}</span>
                            <span className="print-document__info-value">{line.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* CCTV Camera Time Section */}
            {/* We only show if hasCameraTime AND showCameraTime are true. 
          In Preview mode (Settings), we might want to force showing it if the toggle is ON, 
          using fake data if orderData doesn't have it. 
          But for now let's respect the props. Settings.jsx will pass an orderData with camera time if it wants to demo it.
      */}
            {hasCameraTime && showCameraTime && (
                <div className="print-document__info-grid mt-4">
                    <div className="print-document__info-block" style={{ gridColumn: '1 / -1' }}>
                        <div className="print-document__section-label" style={{ color: '#2563eb', borderTop: '2px solid #93c5fd', paddingTop: '12px' }}>
                            Camera Time
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                            {orderData.billStartTime && (
                                <div className="print-document__info-line">
                                    <span className="print-document__info-label">From:</span>
                                    <span className="print-document__info-value">
                                        {formatDateTime(orderData.billStartTime)}
                                    </span>
                                </div>
                            )}
                            {orderData.billEndTime && (
                                <div className="print-document__info-line">
                                    <span className="print-document__info-label">To:</span>
                                    <span className="print-document__info-value">
                                        {formatDateTime(orderData.billEndTime)}
                                    </span>
                                </div>
                            )}
                            {orderData.billStartTime && orderData.billEndTime && (
                                <div className="print-document__info-line" style={{ fontSize: '11px', color: '#6b7280' }}>
                                    <span className="print-document__info-label">Duration:</span>
                                    <span className="print-document__info-value">
                                        {Math.round((new Date(orderData.billEndTime) - new Date(orderData.billStartTime)) / 1000)} seconds
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="print-document__section-label mt-6">Items:</div>

            <table className="print-document__table mt-3">
                <thead>
                    <tr>
                        <th>Item</th>
                        {showDescription && <th>Description</th>}
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={showDescription ? "5" : "4"} style={{ textAlign: 'center' }}>
                                No items available
                            </td>
                        </tr>
                    )}
                    {items.map((item, index) => {
                        const qty = toNumber(item.quantity ?? item.qty, 0);
                        const price = toNumber(
                            item.unitPrice ?? item.price ?? item.unitCost ?? item.rate,
                            0
                        );
                        const lineTotal = toNumber(item.total ?? item.lineTotal, qty * price);
                        return (
                            <tr key={index}>
                                <td>{item.product?.name || item.name || `Item ${index + 1}`}</td>
                                {showDescription && (
                                    <td>
                                        {item.product?.description ||
                                            item.description ||
                                            item.notes ||
                                            '—'}
                                    </td>
                                )}
                                <td>{formatCurrency(qty)}</td>
                                <td>{formatCurrency(price)}</td>
                                <td>{formatCurrency(lineTotal)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="print-document__summary">
                <div className="print-document__summary-table">
                    <div className="print-document__summary-row">
                        <span>Subtotal</span>
                        <span>{formatCurrency(computedSubtotal)}</span>
                    </div>
                    {showTax && (
                        <div className="print-document__summary-row">
                            <span>Tax</span>
                            <span>{formatCurrency(taxValue)}</span>
                        </div>
                    )}
                    {showDiscount && (
                        <div className="print-document__summary-row">
                            <span>Discount</span>
                            <span>{formatCurrency(discountValue)}</span>
                        </div>
                    )}
                    <div className="print-document__summary-row print-document__summary-row--total">
                        <span>Total</span>
                        <span>{formatCurrency(totalValue)}</span>
                    </div>
                </div>
            </div>

            {showFooter && (
                <div className="print-document__footer">
                    <div className="print-document__generated">
                        Generated on {formatDateTime(generatedAt)} &nbsp;•&nbsp; Printed by{' '}
                        {orderData?.createdBy?.name || 'Current User'}
                    </div>
                    {showCompanyDetails && resolvedCompanyAddress && <span>{resolvedCompanyAddress}</span>}
                    {showCompanyDetails && resolvedCompanyPhone && <span>Phone: {resolvedCompanyPhone}</span>}
                    {footerText && (
                        <div className="mt-2 text-gray-500">
                            {footerText}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PrintDocument;
