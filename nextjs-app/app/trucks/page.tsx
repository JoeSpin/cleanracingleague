import type { Metadata } from 'next'
import Header from '@/components/Header'
import StandingsTable from '@/components/StandingsTable'
import RaceWinner from '@/components/RaceWinner'
import Sponsors from '@/components/Sponsors'
import PlayoffBanners from '@/components/PlayoffBanners'
import RulesButton from '@/components/RulesButton'
import ScheduleImage from '@/components/ScheduleImage'

export const metadata: Metadata = {
  title: 'Clean Racing League - Trucks Division',
  description: 'CRL Trucks Division standings, schedule, and race results',
}

export default function TrucksPage() {
  return (
    <main>
      <Header currentLeague="trucks" />
      
      <RaceWinner league="trucks" />
      
      <Sponsors />
      
      <StandingsTable league="trucks" />
      
      <section id="schedule" className="container">
        <h2>Schedule</h2>
        <ScheduleImage series="trucks" />
      </section>
      
      <PlayoffBanners league="trucks" />
      
      <section id="rules" className="container">
        <h2>Rules & Regulations</h2>
        <RulesButton href="https://docs.google.com/document/d/1Qc2co7QAcW9KrpFd4KSZvkVuBZp6mbd7UmoM_YBOaOg/edit?usp=sharing" />
      </section>
    </main>
  )
}