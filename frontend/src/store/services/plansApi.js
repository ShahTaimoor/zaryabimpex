import { api } from '../api';

export const plansApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPlans: builder.query({
      query: (params) => ({
        url: 'plans',
        method: 'get',
        params,
      }),
      providesTags: ['Plans'],
    }),
    getPlanById: builder.query({
      query: (planId) => ({
        url: `plans/${planId}`,
        method: 'get',
      }),
      providesTags: (result, error, planId) => [{ type: 'Plans', id: planId }],
    }),
    createPlan: builder.mutation({
      query: (data) => ({
        url: 'plans',
        method: 'post',
        data,
      }),
      invalidatesTags: ['Plans'],
    }),
    updatePlan: builder.mutation({
      query: ({ planId, ...data }) => ({
        url: `plans/${planId}`,
        method: 'put',
        data,
      }),
      invalidatesTags: (result, error, { planId }) => [
        { type: 'Plans', id: planId },
        'Plans',
      ],
    }),
    deletePlan: builder.mutation({
      query: (planId) => ({
        url: `plans/${planId}`,
        method: 'delete',
      }),
      invalidatesTags: ['Plans'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlansQuery,
  useGetPlanByIdQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useDeletePlanMutation,
} = plansApi;
