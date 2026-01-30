import { api } from '../api';

export const categoriesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query({
      query: (params) => ({
        url: 'categories',
        method: 'get',
        params,
      }),
      providesTags: [{ type: 'Categories', id: 'LIST' }],
    }),
    getCategoryTree: builder.query({
      query: () => ({
        url: 'categories/tree',
        method: 'get',
      }),
      providesTags: [{ type: 'Categories', id: 'TREE' }],
    }),
    createCategory: builder.mutation({
      query: (data) => ({
        url: 'categories',
        method: 'post',
        data,
      }),
      invalidatesTags: [
        { type: 'Categories', id: 'LIST' },
        { type: 'Categories', id: 'TREE' },
      ],
    }),
    updateCategory: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `categories/${id}`,
        method: 'put',
        data,
      }),
      invalidatesTags: [
        { type: 'Categories', id: 'LIST' },
        { type: 'Categories', id: 'TREE' },
      ],
    }),
    deleteCategory: builder.mutation({
      query: (id) => ({
        url: `categories/${id}`,
        method: 'delete',
      }),
      invalidatesTags: [
        { type: 'Categories', id: 'LIST' },
        { type: 'Categories', id: 'TREE' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCategoriesQuery,
  useGetCategoryTreeQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;

