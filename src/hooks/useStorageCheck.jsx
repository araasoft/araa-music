// hooks/useStorageCheck.js (WEB VERSION)
import { useState, useEffect } from 'react';

export const useStorageCheck = () => {
  const [storageInfo, setStorageInfo] = useState({
    quota: 0,
    usage: 0,
    available: 0,
    percentUsed: 0,
    canDownload: false,
  });

  useEffect(() => {
    checkStorage();
  }, []);

  const checkStorage = async () => {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota;
        const usage = estimate.usage;
        const available = quota - usage;
        const percentUsed = (usage / quota) * 100;

        setStorageInfo({
          quota,
          usage,
          available,
          percentUsed,
          canDownload: available > 100 * 1024 * 1024, // 100MB
        });
      }
    } catch (error) {
      console.error('Storage check error:', error);
    }
  };

  const canDownloadFile = (fileSizeInBytes) => {
    const minBuffer = 50 * 1024 * 1024; // 50MB buffer
    return storageInfo.available > (fileSizeInBytes + minBuffer);
  };

  return { storageInfo, checkStorage, canDownloadFile };
};