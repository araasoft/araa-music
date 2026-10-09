import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout.jsx";
import LockScreen from "./components/common/LockScreen.jsx";
import ToastHost from "./components/common/ToastHost.jsx";
import { useSettings, WALLPAPERS } from "./context/SettingsContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import Loader from "./components/common/Loader";
import Home from "./pages/Home.jsx";
import Search from "./pages/Search.jsx";
import Library from "./pages/Library.jsx";
import History from "./pages/History.jsx";
import Likes from "./pages/Likes.jsx";
import Playlist from "./pages/Playlist.jsx";
import Album from "./pages/Album.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";

function Wallpaper() {
  const { settings } = useSettings();
  if (settings.wallpaper === "none") return null;

  const preset = WALLPAPERS.find((w) => w.id === settings.wallpaper);
  const background =
    settings.wallpaper === "custom" && settings.customWallpaper
      ? `url(${settings.customWallpaper})`
      : preset?.style;

  if (!background) return null;

  return (
    <div
      className="app-wallpaper"
      style={{
        backgroundImage: background.startsWith("url") ? background : undefined,
        background: background.startsWith("url") ? undefined : background,
      }}
    />
  );
}

function SecureRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader height={100} />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GlobalRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader height={100} />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { settings } = useSettings();
  const [locked, setLocked] = useState(settings.biometricLock);

  useEffect(() => {
    if (settings.biometricLock) setLocked(true);
  }, [settings.biometricLock]);

  return (
    <>
      <Wallpaper />
      <ToastHost />
      <Routes>
        <Route
          path="/login"
          element={
            <GlobalRoute>
              <Login />
            </GlobalRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GlobalRoute>
              <Register />
            </GlobalRoute>
          }
        />
        <Route
          element={
            <SecureRoute>
              <MainLayout />
            </SecureRoute>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/library" element={<Library />} />
          <Route path="/history" element={<History />} />
          <Route path="/likes" element={<Likes />} />
          <Route path="/playlist/:id" element={<Playlist />} />
          <Route path="/album/:id" element={<Album />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </>
  );
}
