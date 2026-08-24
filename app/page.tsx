import Link from 'next/link'
import Image from 'next/image'
import { AskLyka } from '@/components/ask-lyka'

export default function Page() {
  const isLive = process.env.MODEL_PROVIDER === 'live'
  return (
    <main className="shell">
      <header>
        <Link href="/" className="brand">
          <Image
            src="/lyka-realty-logo.png"
            alt="Lyka Realty"
            width={789}
            height={789}
            style={{ height: '56px', width: 'auto' }}
            priority
          />
        </Link>
        <nav>
          <Link href="/log">Question log</Link>
          <span className={`live-dot ${isLive ? 'live' : ''}`}>
            {isLive ? 'Live mode' : 'Offline stub mode'}
          </span>
        </nav>
      </header>
      <div className="hero-grid">
        <AskLyka />
        <aside>
          <div className="aside-label">How it works</div>
          <ol>
            <li><b>Retrieve</b><span>Match the question to listing entities.</span></li>
            <li><b>Resolve</b><span>Handle recency, duplicates, and conflicts.</span></li>
            <li><b>Verify</b><span>Reject every unsupported factual claim.</span></li>
          </ol>

        </aside>
      </div>
    </main>
  )
}
