'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface ScheduleImageProps {
  series: 'arca' | 'elite' | 'trucks'
}

export default function ScheduleImage({ series }: ScheduleImageProps) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Default fallback images
  const defaultImages = {
    arca: '/img/arcaschedule.jpg',
    elite: '/img/eliteschedule.jpg', 
    trucks: '/img/crltrucksschedule.png'
  }

  useEffect(() => {
    const fetchScheduleImage = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/admin/schedule/${series}`, {
          // Add cache busting to ensure we get the latest image
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })

        if (response.ok) {
          const data = await response.json()
          // Use the dynamic image if available, otherwise use default
          setImageUrl(data.image || defaultImages[series])
        } else {
          // Fallback to default image on error
          setImageUrl(defaultImages[series])
        }
      } catch (err) {
        console.error('Error fetching schedule image:', err)
        setError('Failed to load schedule image')
        // Fallback to default image
        setImageUrl(defaultImages[series])
      } finally {
        setLoading(false)
      }
    }

    fetchScheduleImage()
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
        padding: '60px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 'var(--radius)',
        color: 'var(--muted)'
      }}>
        Loading schedule...
      </div>
    )
  }

  if (error && !imageUrl) {
    return (
      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px',
        padding: '60px',
        background: 'rgba(255, 42, 16, 0.1)',
        borderRadius: 'var(--radius)',
        color: 'var(--crl-red)'
      }}>
        Failed to load schedule image
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <div style={{ position: 'relative', width: '100%', height: 'auto' }}>
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
          // Add key to force re-render when imageUrl changes
          key={imageUrl}
        />
      </div>
    </div>
  )
}