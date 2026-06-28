import { useState } from 'react'
import { Mail, ArrowRight, Inbox } from 'lucide-react'

interface Props {
  onSendLink: (email: string) => Promise<{ success: boolean; error?: string }>
  denied: string | null
  onRetry: () => void
}

type Stage = 'input' | 'sent'

export default function LoginPage({ onSendLink, denied, onRetry }: Props) {
  const [email, setEmail]  = useState('')
  const [stage, setStage]  = useState<Stage>('input')
  const [error, setError]  = useState('')
  const [loading, setLoad] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoad(true); setError('')
    const result = await onSendLink(email.trim())
    setLoad(false)
    if (result.success) setStage('sent')
    else setError(result.error ?? 'Something went wrong.')
  }

  return (
    <div className="min-h-screen bg-carbon flex flex-col items-center justify-center p-6">

      {/* Wordmark */}
      <div className="mb-10 text-center">
        <p className="text-white/25 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase mb-2">
          RCCG Region 59
        </p>
        <h1 className="font-display text-white tracking-widest leading-none" style={{ fontSize: '56px' }}>
          GOC 2026
        </h1>
        <p className="text-white/30 text-xs font-sans tracking-[0.18em] uppercase mt-1">
          Check-In Portal
        </p>
      </div>

      <div className="w-full max-w-sm">

        {/* Access denied */}
        {denied && (
          <div className="border border-red-500/25 bg-red-500/8 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm font-semibold mb-1">Access denied</p>
            <p className="text-red-400/70 text-xs leading-relaxed mb-3">
              <span className="font-mono bg-red-500/10 px-1.5 py-0.5 rounded text-red-400">{denied}</span>{' '}
              is not registered. Contact your coordinator.
            </p>
            <button onClick={onRetry} className="text-xs text-red-400 font-semibold underline underline-offset-2">
              Try a different email
            </button>
          </div>
        )}

        {stage === 'input' && !denied && (
          <>
            <p className="text-white/40 text-sm text-center mb-7 leading-relaxed font-sans">
              Enter your registered email to receive a sign-in link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-white/6 border border-white/12 focus:border-magenta focus:bg-white/8 rounded-xl text-sm text-white outline-none transition-all font-mono placeholder:text-white/20 placeholder:font-sans"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs font-medium px-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-magenta hover:bg-magenta-dark text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Send sign-in link <ArrowRight size={15} /></>
                )}
              </button>
            </form>
          </>
        )}

        {stage === 'sent' && (
          <div className="text-center">
            <div className="w-14 h-14 bg-white/6 border border-white/12 rounded-xl flex items-center justify-center mx-auto mb-5">
              <Inbox size={24} className="text-lime" />
            </div>
            <h2 className="font-semibold text-white mb-2">Check your inbox</h2>
            <p className="text-sm text-white/40 leading-relaxed mb-6 font-sans">
              Sent a sign-in link to{' '}
              <span className="font-mono text-white/70">{email}</span>.
            </p>
            <p className="text-xs text-white/25 mb-5">Not there? Check your spam folder.</p>
            <button
              onClick={() => { setStage('input'); setError('') }}
              className="text-sm text-magenta font-semibold underline underline-offset-2"
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
