const useLocalAPI = import.meta.env.VITE_USE_LOCAL_API === 'true';

export const API_URL = useLocalAPI
  ? import.meta.env.VITE_LOCAL_API_URL
  : import.meta.env.VITE_PROD_API_URL;