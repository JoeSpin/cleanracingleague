import type { Metadata } from 'next'
import Header from '@/components/Header'
import StandingsTable from '@/components/StandingsTable'
import RaceWinner from '@/components/RaceWinner'
import Sponsors from '@/components/Sponsors'
import PlayoffBanners from '@/components/PlayoffBanners'
import RulesButton from '@/components/RulesButton'
import ScheduleImage from '@/components/ScheduleImage'

export const metadata: Metadata = {
  title: 'Clean Racing League - ARCA Division',
  description: 'CRL ARCA Division standings, schedule, and race results',
}

export default function ARCAPage() {
  return (
    <main>
      <Header currentLeague="arca" />
      
      <RaceWinner league="arca" />
      
      <Sponsors />
      
      <StandingsTable league="arca" />
      
      <section id="schedule" className="container">
        <h2>Schedule</h2>
        <ScheduleImage series="arca" />
      </section>
      
      <PlayoffBanners league="arca" />
      
      <section id="rules" className="container">
        <h2>Rules & Regulations</h2>
        <RulesButton href="https://docs.google.com/document/d/1BCb6YZSNr96SLQqDDP5HWM3tkgTfWIoiYBIg6TlifoA/edit?usp=sharing" />
      </section>
    </main>
  )
}