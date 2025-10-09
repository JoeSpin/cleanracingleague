'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import styles from './dashboard.module.css'

type Series = 'arca' | 'elite' | 'trucks'

interface Sponsor {
  id: string
  name: string
  image: string
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Series>('arca')
  const [scheduleImage, setScheduleImage] = useState<string>('')
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const isAuthenticated = sessionStorage.getItem('crl-admin-auth')
    if (isAuthenticated !== 'true') {
      router.push('/admin')
      return
    }
    
    loadSeriesData(activeTab)
  }, [activeTab, router])

  const loadSeriesData = async (series: Series) => {
    setLoading(true)
    try {
      // Load current schedule image
      const scheduleResponse = await fetch(`/api/admin/schedule/${series}`)
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json()
        setScheduleImage(scheduleData.image || '')
      }

      // Load sponsors
      const sponsorsResponse = await fetch(`/api/admin/sponsors/${series}`)
      if (sponsorsResponse.ok) {
        const sponsorsData = await sponsorsResponse.json()
        setSponsors(sponsorsData.sponsors || [])
      }
    } catch (error) {
      console.error('Error loading series data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)
    formData.append('series', activeTab)

    try {
      const response = await fetch('/api/admin/schedule/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setScheduleImage(data.imagePath)
        alert('Schedule image updated successfully!')
      } else {
        alert('Failed to upload image')
      }
    } catch (error) {
      console.error('Error uploading schedule image:', error)
      alert('Error uploading image')
    }
  }

  const handleSponsorUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const sponsorName = prompt('Enter sponsor name:')
    if (!sponsorName) return

    const formData = new FormData()
    formData.append('image', file)
    formData.append('series', activeTab)
    formData.append('name', sponsorName)

    try {
      const response = await fetch('/api/admin/sponsors/add', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setSponsors(prev => [...prev, data.sponsor])
        alert('Sponsor added successfully!')
      } else {
        alert('Failed to add sponsor')
      }
    } catch (error) {
      console.error('Error adding sponsor:', error)
      alert('Error adding sponsor')
    }
  }

  const removeSponsor = async (sponsorId: string) => {
    if (!confirm('Are you sure you want to remove this sponsor?')) return

    try {
      const response = await fetch('/api/admin/sponsors/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sponsorId, series: activeTab }),
      })

      if (response.ok) {
        setSponsors(prev => prev.filter(s => s.id !== sponsorId))
        alert('Sponsor removed successfully!')
      } else {
        alert('Failed to remove sponsor')
      }
    } catch (error) {
      console.error('Error removing sponsor:', error)
      alert('Error removing sponsor')
    }
  }

  const logout = () => {
    sessionStorage.removeItem('crl-admin-auth')
    router.push('/admin')
  }

  const getSeriesDisplayName = (series: Series) => {
    switch (series) {
      case 'arca': return 'ARCA'
      case 'elite': return 'Elite'
      case 'trucks': return 'Trucks'
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>CRL Admin Dashboard</h1>
        <button onClick={logout} className={styles.logoutButton}>
          Logout
        </button>
      </div>

      <div className={styles.tabs}>
        {(['arca', 'elite', 'trucks'] as Series[]).map(series => (
          <button
            key={series}
            className={`${styles.tab} ${activeTab === series ? styles.active : ''}`}
            onClick={() => setActiveTab(series)}
          >
            {getSeriesDisplayName(series)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : (
        <div className={styles.content}>
          <div className={styles.section}>
            <h2>Schedule Image</h2>
            <div className={styles.scheduleSection}>
              {scheduleImage && (
                <div className={styles.currentImage}>
                  <h3>Current Schedule:</h3>
                  <Image
                    src={scheduleImage}
                    alt={`${getSeriesDisplayName(activeTab)} Schedule`}
                    width={400}
                    height={300}
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              )}
              <div className={styles.uploadSection}>
                <label htmlFor="schedule-upload" className={styles.uploadButton}>
                  Upload New Schedule
                </label>
                <input
                  id="schedule-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleScheduleImageUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Sponsors</h2>
            <div className={styles.sponsorSection}>
              <div className={styles.uploadSection}>
                <label htmlFor="sponsor-upload" className={styles.uploadButton}>
                  Add New Sponsor
                </label>
                <input
                  id="sponsor-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleSponsorUpload}
                  style={{ display: 'none' }}
                />
              </div>
              
              {sponsors.length > 0 ? (
                <div className={styles.sponsorGrid}>
                  {sponsors.map(sponsor => (
                    <div key={sponsor.id} className={styles.sponsorCard}>
                      <Image
                        src={sponsor.image}
                        alt={sponsor.name}
                        width={150}
                        height={100}
                        style={{ objectFit: 'contain' }}
                      />
                      <div className={styles.sponsorInfo}>
                        <h4>{sponsor.name}</h4>
                        <button
                          onClick={() => removeSponsor(sponsor.id)}
                          className={styles.removeButton}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.noSponsors}>No sponsors added yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}