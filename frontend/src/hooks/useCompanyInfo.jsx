import { useGetCompanySettingsQuery } from '../store/services/settingsApi';

export const useCompanyInfo = (options = {}) => {
  const queryResult = useGetCompanySettingsQuery(undefined, {
    ...options
  });

  const companyInfo = queryResult.data?.data || {};

  return {
    ...queryResult,
    companyInfo
  };
};

