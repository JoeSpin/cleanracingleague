'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './admin.module.css'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if already authenticated
    const isAuthenticated = sessionStorage.getItem('crl-admin-auth')
    if (isAuthenticated === 'true') {
      router.push('/admin/dashboard')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          sessionStorage.setItem('crl-admin-auth', 'true')
          router.push('/admin/dashboard')
        } else {
          setError('Invalid password')
        }
      } else {
        setError('Authentication failed')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <h1>CRL Admin Panel</h1>
          <p>Enter admin password to continue</p>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          
          <div className={styles.inputGroup}>
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
              placeholder="Enter admin password"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={loading || !password.trim()}
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}