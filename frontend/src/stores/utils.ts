const DEFAULT_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const setWithExpiry = (key: string, value: any, expiryTime = DEFAULT_EXPIRY_TIME) => {
  const now = new Date();
  const item = {
    value: value,
    expiry: now.getTime() + expiryTime,
  };

  localStorage.setItem(key, JSON.stringify(item));
};

export const getWithExpiry = (key: string) => {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) {
    // console.log(`Key: ${key} not found in localStorage.`);  
    return null;
  }

  const item = JSON.parse(itemStr);
  const now = new Date();

  if (now.getTime() > item.expiry) {
    // console.log(`Key: ${key} has expired and will be removed.`);  
    localStorage.removeItem(key);
    return null;
  }
  return item.value;
};
