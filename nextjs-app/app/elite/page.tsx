import type { Metadata } from 'next'
import Header from '@/components/Header'
import StandingsTable from '@/components/StandingsTable'
import RaceWinner from '@/components/RaceWinner'
import Sponsors from '@/components/Sponsors'
import PlayoffBanners from '@/components/PlayoffBanners'
import RulesButton from '@/components/RulesButton'

export const metadata: Metadata = {
  title: 'Clean Racing League - Elite Division',
  description: 'CRL Elite Division standings, schedule, and race results',
}

export default function ElitePage() {
  return (
    <main>
      <Header currentLeague="elite" />
      
      <RaceWinner league="elite" />
      
      <Sponsors />
      
      <StandingsTable league="elite" />
      
      <section id="schedule" className="container">
        <h2>Schedule</h2>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <img 
            src="/img/eliteschedule.jpg" 
            alt="Elite Schedule" 
            style={{ 
              maxWidth: '100%', 
              height: 'auto',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow)'
            }}
          />
        </div>
      </section>
      
      <PlayoffBanners league="elite" />
      
      <section id="rules" className="container">
        <h2>Rules & Regulations</h2>
        <RulesButton href="https://docs.google.com/document/d/1JC9taRJeHcxIcg33WuiUwys7il93DhoHF7vNU2StGn4/edit?usp=sharing" />
      </section>
    </main>
  )
}