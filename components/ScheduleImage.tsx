'use client'

import { useState, useEffect } from 'react'

interface ScheduleImageProps {
  series: 'arca' | 'elite' | 'trucks'
}

export default function ScheduleImage({ series }: ScheduleImageProps) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Schedule image paths - Elite now uses PNG
  const scheduleImages = {
    arca: '/img/arcaschedule.jpg',
    elite: '/img/eliteschedule.png', 
    trucks: '/img/crltrucksschedule.png'
  }

  useEffect(() => {
    // Set the image URL based on series
    setImageUrl(scheduleImages[series])
    setLoading(false)
  }, [series])

  const getSeriesDisplayName = (series: string) => {
    switch (series) {
      case 'arca': return 'ARCA'
      case 'elite': return 'Elite' 
      case 'trucks': return 'Trucks'
      default: return series
    }
  }

  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px',
        padding: '20px',
        color: 'var(--muted)'
      }}>
        Loading schedule...
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <img 
        src={imageUrl}
        alt={`${getSeriesDisplayName(series)} Schedule`}
        style={{ 
          maxWidth: '100%', 
          height: 'auto',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          display: 'block'
        }}
      />
    </div>
  )
}