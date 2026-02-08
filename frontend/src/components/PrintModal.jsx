import React, { useRef, useEffect, useMemo } from 'react';
import { X, Printer } from 'lucide-react';
import { useCompanyInfo } from '../hooks/useCompanyInfo';
import PrintDocument from './PrintDocument';

const PrintModal = ({
  isOpen,
  onClose,
  orderData,
  companyInfo,
  documentTitle = 'Invoice',
  partyLabel = 'Customer'
}) => {
  const printRef = useRef(null);
  const { companyInfo: companySettings } = useCompanyInfo();
  const resolvedDocumentTitle = documentTitle || 'Invoice';

  // Sync with Company Settings - removed local states in favor of direct prop passing in render
  // (All print states are now handled via companySettings.printSettings)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const documentNumber =
    orderData?.invoiceNumber ||
    orderData?.orderNumber ||
    orderData?.poNumber ||
    orderData?.referenceNumber ||
    orderData?._id ||
    'N/A';

  const generatedAt = new Date();

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Create a new iframe for printing to avoid clearing the current document
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;

    // Get checkbox states at the time of printing
    // Note: We are printing the 'printContent' which is already rendered in the DOM with the correct visibility
    // based on React state. So we just need to copy the HTML.

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>${resolvedDocumentTitle} - ${documentNumber}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 0.4in;
              }
              body {
                font-family: 'Inter', Arial, sans-serif;
                font-size: 12px;
                color: #111827;
                margin: 0;
                padding: 0;
                background: #fff;
              }
              .print-preview-scale {
                transform: none !important;
                width: 100% !important;
              }
              .print-document {
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .print-document__toolbar, .no-print {
                display: none !important;
              }
            }
            .print-document {
              width: 100%;
              font-family: 'Inter', 'Segoe UI', sans-serif;
            }
            .print-document__title {
              font-size: 18px;
              font-weight: 600;
              color: #111827;
              margin-bottom: 12px;
            }
            .print-document__company {
              text-align: center;
              margin-bottom: 28px;
            }
            .print-document__company-name {
              font-size: 30px;
              font-weight: 700;
              margin-bottom: 4px;
            }
            .print-document__company-subtitle {
              font-size: 16px;
              color: #6b7280;
            }
            .print-document__logo-wrap {
              margin-bottom: 16px;
              text-align: center;
            }
            .print-document__logo-img {
              max-height: 80px;
              max-width: 250px;
              width: auto;
              height: auto;
              object-fit: contain;
              display: inline-block;
            }
            @media print {
              .print-document__logo-img {
                max-height: 72px;
                max-width: 220px;
              }
            }
            .print-document__logo-placeholder {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 72px;
              height: 72px;
              max-width: 220px;
              max-height: 80px;
              background: #e5e7eb;
              color: #6b7280;
              font-size: 28px;
              font-weight: 700;
              border-radius: 8px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-document__info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
              gap: 24px;
              margin-bottom: 28px;
            }
            .print-document__info-section {
              border-top: 2px solid #e5e7eb;
              padding-top: 12px;
            }
            .print-document__info-title {
              font-size: 12px;
              font-weight: 600;
              color: #6b7280;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              margin-bottom: 10px;
            }
            .print-document__info-row {
              font-size: 13px;
              color: #111827;
              margin-bottom: 6px;
              display: flex;
              justify-content: space-between;
            }
            .print-document__info-label {
              font-weight: 500;
              color: #374151;
            }
            .print-document__info-value {
              text-align: right;
              max-width: 65%;
            }
            .print-document__table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .print-document__table th {
              background: #f3f4f6;
              border: 1px solid #e5e7eb;
              text-align: left;
              padding: 10px;
              font-size: 13px;
              font-weight: 600;
              color: #111827;
            }
            .print-document__table td {
              border: 1px solid #e5e7eb;
              padding: 10px;
              font-size: 13px;
              color: #374151;
            }
            .print-document__summary {
              margin-top: 24px;
              display: flex;
              justify-content: flex-end;
            }
            .print-document__summary-table {
              width: 260px;
            }
            .print-document__summary-row {
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              margin-bottom: 6px;
              color: #111827;
            }
            .print-document__summary-row--total {
              border-top: 1px solid #e5e7eb;
              padding-top: 8px;
              margin-top: 6px;
              font-weight: 700;
              font-size: 16px;
            }
            .print-document__footer {
              margin-top: 24px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            .print-document__footer span {
              display: block;
            }
            /* Helper for hiding elements */
            .hidden {
              display: none !important;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      // Cleanup
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
  };

  if (!isOpen || !orderData) return null;

  const documentHeading = `${resolvedDocumentTitle} Details`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 p-4 overflow-hidden">
      <div className="w-full h-full overflow-auto flex items-center justify-center">
        <div className="bg-transparent w-full max-w-[95vw] max-h-[92vh] flex flex-col items-center">
          <div className="p-4 print-preview-wrapper w-full">
            <div ref={printRef} className="print-preview-scale">
              <PrintDocument
                companySettings={companySettings || {}}
                orderData={orderData}
                printSettings={{
                  ...companySettings?.printSettings,
                  headerText: companySettings?.printSettings?.headerText,
                  footerText: companySettings?.printSettings?.footerText
                }}
                documentTitle={resolvedDocumentTitle}
                partyLabel={partyLabel}
              >
                {/* No-print Toolbar; all print options are controlled from Settings → Print Preview */}
                <div className="print-document__toolbar no-print mb-6 border-b pb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{documentHeading}</h2>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handlePrint}
                        className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 flex items-center gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </button>
                      <button
                        onClick={onClose}
                        className="bg-white text-gray-700 px-4 py-2 rounded border border-gray-300 shadow-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Close
                      </button>
                    </div>
                  </div>

                </div>
              </PrintDocument>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;