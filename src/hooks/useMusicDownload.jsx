import { useState } from "react";

export const useMusicDownload = () => {
  const [downloading, setDownloading] = useState(false);

  const downloadMusic = async (audioUrl, fileName) => {
    try {
      setDownloading(true);

      const response = await fetch(audioUrl);

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      return {
        success: true,
        fileName,
      };
    } catch (error) {
      console.error("Download failed:", error);

      return {
        success: false,
        error: error.message,
      };
    } finally {
      setDownloading(false);
    }
  };

  return {
    downloadMusic,
    downloading,
  };
};