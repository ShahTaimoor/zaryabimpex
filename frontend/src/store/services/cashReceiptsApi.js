import { api } from '../api';

export const cashReceiptsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getCashReceipts: builder.query({
      query: (params) => ({
        url: 'cash-receipts',
        method: 'get',
        params,
      }),
      providesTags: (result) =>
        result?.data?.receipts
          ? [
              ...result.data.receipts.map(({ _id, id }) => ({
                type: 'CashReceipts',
                id: _id || id,
              })),
              { type: 'CashReceipts', id: 'LIST' },
            ]
          : [{ type: 'CashReceipts', id: 'LIST' }],
    }),
    createCashReceipt: builder.mutation({
      query: (data) => ({
        url: 'cash-receipts',
        method: 'post',
        data,
      }),
      invalidatesTags: (_r, _e, data) => {
        const tags = [{ type: 'CashReceipts', id: 'LIST' }];
        // Invalidate customer cache if customer is involved
        if (data?.customer) {
          tags.push({ type: 'Customers', id: data.customer });
          tags.push({ type: 'Customers', id: 'LIST' });
        }
        // Invalidate supplier cache if supplier is involved
        if (data?.supplier) {
          tags.push({ type: 'Suppliers', id: data.supplier });
          tags.push({ type: 'Suppliers', id: 'LIST' });
        }
        return tags;
      },
    }),
    updateCashReceipt: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `cash-receipts/${id}`,
        method: 'put',
        data,
      }),
      invalidatesTags: (_r, _e, { id, ...data }) => {
        const tags = [
          { type: 'CashReceipts', id },
          { type: 'CashReceipts', id: 'LIST' },
        ];
        // Invalidate customer cache if customer is involved
        if (data?.customer) {
          tags.push({ type: 'Customers', id: data.customer });
          tags.push({ type: 'Customers', id: 'LIST' });
        }
        // Invalidate supplier cache if supplier is involved
        if (data?.supplier) {
          tags.push({ type: 'Suppliers', id: data.supplier });
          tags.push({ type: 'Suppliers', id: 'LIST' });
        }
        return tags;
      },
    }),
    deleteCashReceipt: builder.mutation({
      query: (id) => ({
        url: `cash-receipts/${id}`,
        method: 'delete',
      }),
      invalidatesTags: (_r, _e, id, originalArg) => {
        const tags = [
          { type: 'CashReceipts', id },
          { type: 'CashReceipts', id: 'LIST' },
        ];
        // Note: We can't get customer/supplier from delete mutation easily
        // So we invalidate all customers/suppliers lists
        tags.push({ type: 'Customers', id: 'LIST' });
        tags.push({ type: 'Suppliers', id: 'LIST' });
        return tags;
      },
    }),
    createBatchCashReceipts: builder.mutation({
      query: (data) => ({
        url: 'cash-receipts/batch',
        method: 'post',
        data,
      }),
      invalidatesTags: [{ type: 'CashReceipts', id: 'LIST' }, { type: 'Customers', id: 'LIST' }],
    }),
    exportExcel: builder.mutation({
      query: (filters) => ({
        url: 'cash-receipts/export/excel',
        method: 'post',
        data: { filters },
      }),
    }),
    exportCSV: builder.mutation({
      query: (filters) => ({
        url: 'cash-receipts/export/csv',
        method: 'post',
        data: { filters },
      }),
    }),
    exportPDF: builder.mutation({
      query: (filters) => ({
        url: 'cash-receipts/export/pdf',
        method: 'post',
        data: { filters },
      }),
    }),
    exportJSON: builder.mutation({
      query: (filters) => ({
        url: 'cash-receipts/export/json',
        method: 'post',
        data: { filters },
      }),
    }),
    downloadFile: builder.mutation({
      query: (filename) => ({
        url: `cash-receipts/download/${filename}`,
        method: 'get',
        responseType: 'blob',
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCashReceiptsQuery,
  useCreateCashReceiptMutation,
  useUpdateCashReceiptMutation,
  useDeleteCashReceiptMutation,
  useCreateBatchCashReceiptsMutation,
  useExportExcelMutation,
  useExportCSVMutation,
  useExportPDFMutation,
  useExportJSONMutation,
  useDownloadFileMutation,
} = cashReceiptsApi;

