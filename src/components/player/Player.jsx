import React from 'react'
import { usePlayer } from '../../hooks/usePlayer.js'
import MiniPlayer from './MiniPlayer.jsx'
import FullPlayer from './FullPlayer.jsx'
import Queue from './Queue.jsx'

export default function Player() {
  const { isQueueOpen, setIsQueueOpen } = usePlayer()

  return (
    <>
      <MiniPlayer />
      <FullPlayer />
      {isQueueOpen && <Queue onClose={() => setIsQueueOpen(false)} />}
    </>
  )
}
