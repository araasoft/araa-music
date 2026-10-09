import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from "os";

const orig = os.networkInterfaces;

os.networkInterfaces = () => {
  try {
    return orig.call(os);
  } catch {
    return {};
  }
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
