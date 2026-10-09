import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import MobileNav from './MobileNav.jsx'
import Player from '../player/Player.jsx'
import { usePlayer } from '../../hooks/usePlayer.js'

export default function MainLayout() {
  const { currentTrack } = usePlayer()

  return (
    <div className="relative z-10 flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header />
        <main
          className={`flex-1 min-w-0 ${currentTrack ? 'pb-32 md:pb-20' : 'pb-14 md:pb-0'}`}
        >
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <Player />
    </div>
  )
}
