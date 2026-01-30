import { api } from '../api';

export const journalVouchersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getJournalVouchers: builder.query({
      query: (params) => ({
        url: 'journal-vouchers',
        method: 'get',
        params,
      }),
      providesTags: (result) =>
        result?.data?.vouchers || result?.vouchers
          ? [
              ...(result.data?.vouchers || result.vouchers).map(({ _id, id }) => ({
                type: 'JournalVouchers',
                id: _id || id,
              })),
              { type: 'JournalVouchers', id: 'LIST' },
            ]
          : [{ type: 'JournalVouchers', id: 'LIST' }],
    }),
    getJournalVoucher: builder.query({
      query: (id) => ({
        url: `journal-vouchers/${id}`,
        method: 'get',
      }),
      providesTags: (_r, _e, id) => [{ type: 'JournalVouchers', id }],
    }),
    createJournalVoucher: builder.mutation({
      query: (data) => ({
        url: 'journal-vouchers',
        method: 'post',
        data,
      }),
      invalidatesTags: [{ type: 'JournalVouchers', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetJournalVouchersQuery,
  useGetJournalVoucherQuery,
  useCreateJournalVoucherMutation,
} = journalVouchersApi;

