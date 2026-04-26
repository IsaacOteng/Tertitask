import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, Clock, Wallet, ChevronDown, ChevronUp, ArrowDownToLine } from 'lucide-react'
import { useEarnings, usePayouts, useBankAccounts, useWithdraw } from '../hooks/useEarnings'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const MIN_WITHDRAWAL = 5000 // pesewas = GHS 50

function ghsCedi(p) {
  if (p == null) return 'GHS 0.00'
  return `GHS ${(p / 100).toFixed(2)}`
}

function entryTypeLabel(type) {
  return {
    earning_pending: 'Earning (pending)',
    earning_cleared: 'Earning cleared',
    withdrawal: 'Withdrawal',
    withdrawal_reversal: 'Withdrawal reversed',
  }[type] ?? type
}

function fmt(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PAYOUT_STATUS_STYLES = {
  pending:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  success:    'bg-green-50 text-green-700 border-green-200',
  failed:     'bg-red-50 text-danger border-red-200',
}

function EarningsSkeleton() {
  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="h-8 shimmer rounded w-32" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-bg rounded-card border border-line p-5 space-y-2">
              <div className="h-3 shimmer rounded w-16" />
              <div className="h-7 shimmer rounded w-24" />
              <div className="h-3 shimmer rounded w-20" />
            </div>
          ))}
        </div>
        <div className="h-12 shimmer rounded-card" />
      </div>
    </div>
  )
}

export default function Earnings() {
  useDocumentTitle('Earnings')
  const { data: earnings, isLoading } = useEarnings()
  const { data: payouts } = usePayouts()
  const { data: bankAccounts = [] } = useBankAccounts()
  const withdrawMut = useWithdraw()
  const navigate = useNavigate()

  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [withdrawError, setWithdrawError] = useState(null)
  const [showPayouts, setShowPayouts] = useState(false)

  const available = earnings?.available ?? 0
  const canWithdraw = available >= MIN_WITHDRAWAL

  const handleWithdrawOpen = () => {
    if (!bankAccounts.length) { navigate('/earnings/bank'); return }
    setWithdrawAmount(String(Math.floor(available / 100) * 100))
    setSelectedAccountId(bankAccounts[0].id)
    setWithdrawError(null)
    setShowWithdrawModal(true)
  }

  const handleWithdrawSubmit = async () => {
    const amt = parseInt(withdrawAmount, 10)
    if (!amt || amt < MIN_WITHDRAWAL) { setWithdrawError(`Minimum withdrawal is ${ghsCedi(MIN_WITHDRAWAL)}`); return }
    if (amt > available) { setWithdrawError('Amount exceeds available balance.'); return }
    if (!selectedAccountId) { setWithdrawError('Select an account to withdraw to.'); return }
    try {
      await withdrawMut.mutateAsync({ amount: amt, bank_account_id: selectedAccountId })
      setShowWithdrawModal(false)
    } catch (err) {
      setWithdrawError(err.body?.detail || 'Payout failed. Try again.')
    }
  }

  if (isLoading) return <EarningsSkeleton />

  const STAT_CARDS = [
    { label: 'Pending', value: earnings?.pending ?? 0, hint: 'Approving, clearing soon', icon: Clock, iconBg: 'bg-amber-50 text-amber-600' },
    { label: 'Available', value: available, hint: 'Ready to withdraw', icon: Wallet, iconBg: 'bg-brand/10 text-brand' },
    { label: 'Lifetime', value: earnings?.lifetime ?? 0, hint: 'Total ever earned', icon: TrendingUp, iconBg: 'bg-blue-50 text-blue-600' },
  ]

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        <h1 className="font-display text-fs-h2 font-semibold text-ink">Earnings</h1>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STAT_CARDS.map(({ label, value, hint, icon: Icon, iconBg }) => (
            <div key={label} className="bg-bg rounded-card border border-line p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-fs-small font-medium text-ink-muted">{label}</span>
                <div className={`w-8 h-8 rounded-input flex items-center justify-center ${iconBg}`}>
                  <Icon size={15} />
                </div>
              </div>
              <p className="text-fs-h2 font-bold text-ink leading-none mb-1">{ghsCedi(value)}</p>
              <p className="text-fs-tiny text-ink-muted">{hint}</p>
            </div>
          ))}
        </div>

        {/* Withdraw section */}
        <div className="bg-bg rounded-card border border-line p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-fs-body font-semibold text-ink mb-0.5">Withdraw funds</p>
              <p className="text-fs-small text-ink-muted">
                {bankAccounts.length === 0
                  ? 'No bank account linked yet.'
                  : bankAccounts.length === 1
                  ? `To ${bankAccounts[0].bank_name} ****${bankAccounts[0].account_number.slice(-4)}`
                  : `${bankAccounts.length} accounts saved — select on withdrawal`}
              </p>
              {!canWithdraw && (
                <p className="text-fs-tiny text-ink-muted mt-1">
                  Minimum withdrawal: {ghsCedi(MIN_WITHDRAWAL)} · Available: {ghsCedi(available)}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <button
                onClick={handleWithdrawOpen}
                disabled={!canWithdraw}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <ArrowDownToLine size={15} />
                Withdraw
              </button>
              <Link to="/earnings/bank" className="text-fs-tiny text-brand hover:underline text-right">
                {bankAccounts.length === 0 ? 'Add bank account →' : 'Add another account →'}
              </Link>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {!earnings?.recent_entries?.length && (earnings?.lifetime ?? 0) === 0 && (
          <div className="text-center py-16 border border-dashed border-line rounded-card bg-bg">
            <div className="w-14 h-14 rounded-full bg-bg-subtle border border-line flex items-center justify-center mx-auto mb-4">
              <TrendingUp size={22} className="text-ink-muted" />
            </div>
            <p className="font-display text-fs-h3 text-ink mb-2">No earnings yet</p>
            <p className="text-fs-body text-ink-muted mb-6">
              Complete an order to start earning. Your ledger will appear here.
            </p>
            <Link
              to="/me/gigs/new"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors"
            >
              Post a gig
            </Link>
          </div>
        )}

        {/* Ledger */}
        {earnings?.recent_entries?.length > 0 && (
          <div className="bg-bg rounded-card border border-line overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line bg-bg-subtle">
              <h2 className="text-fs-small font-semibold text-ink">Recent activity</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-5 py-3 text-fs-tiny font-semibold text-ink-muted uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3 text-fs-tiny font-semibold text-ink-muted uppercase tracking-wide">Type</th>
                  <th className="text-right px-5 py-3 text-fs-tiny font-semibold text-ink-muted uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {earnings.recent_entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-bg-subtle/60 transition-colors">
                    <td className="px-5 py-3.5 text-fs-small text-ink-muted">{fmt(entry.created_at)}</td>
                    <td className="px-5 py-3.5 text-fs-small">
                      {entry.order ? (
                        <Link to={`/orders/${entry.order}`} className="text-brand hover:underline">
                          {entryTypeLabel(entry.entry_type)}
                        </Link>
                      ) : (
                        <span className="text-ink">{entryTypeLabel(entry.entry_type)}</span>
                      )}
                    </td>
                    <td className={`px-5 py-3.5 text-right text-fs-small font-semibold tabular-nums ${
                      entry.amount >= 0 ? 'text-brand-ink' : 'text-danger'
                    }`}>
                      {entry.amount >= 0 ? '+' : ''}{ghsCedi(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payout history */}
        {payouts?.length > 0 && (
          <div className="bg-bg rounded-card border border-line overflow-hidden">
            <button
              onClick={() => setShowPayouts((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-bg-subtle transition-colors"
            >
              <span className="text-fs-small font-semibold text-ink">Payout history</span>
              {showPayouts ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
            </button>
            {showPayouts && (
              <div className="border-t border-line">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line bg-bg-subtle">
                      <th className="text-left px-5 py-3 text-fs-tiny font-semibold text-ink-muted uppercase tracking-wide">Date</th>
                      <th className="text-right px-5 py-3 text-fs-tiny font-semibold text-ink-muted uppercase tracking-wide">Amount</th>
                      <th className="text-left px-5 py-3 text-fs-tiny font-semibold text-ink-muted uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-bg-subtle/60 transition-colors">
                        <td className="px-5 py-3.5 text-fs-small text-ink-muted">{fmt(p.created_at)}</td>
                        <td className="px-5 py-3.5 text-right text-fs-small font-semibold text-ink">{ghsCedi(p.amount)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-fs-tiny font-semibold border ${PAYOUT_STATUS_STYLES[p.status] ?? 'bg-line text-ink-muted border-line'}`}>
                            {p.status}
                          </span>
                          {p.failure_reason && (
                            <span className="ml-2 text-fs-tiny text-ink-muted">{p.failure_reason}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Withdraw modal */}
      {showWithdrawModal && bankAccounts.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg rounded-card border border-line max-w-sm w-full p-6 shadow-card space-y-5">
            <div>
              <h3 className="text-fs-h3 font-display font-semibold text-ink">Withdraw funds</h3>
              <p className="text-fs-small text-ink-muted mt-1">Funds go to your selected account.</p>
            </div>

            {bankAccounts.length > 1 ? (
              <div>
                <label className="block text-fs-small font-medium text-ink-muted mb-1.5">Send to</label>
                <div className="space-y-2">
                  {bankAccounts.map((acct) => (
                    <label
                      key={acct.id}
                      className={`flex items-center gap-3 p-3 rounded-input border cursor-pointer transition-colors ${
                        selectedAccountId === acct.id ? 'border-brand bg-brand/5' : 'border-line hover:border-ink-soft'
                      }`}
                    >
                      <input
                        type="radio"
                        name="withdraw-account"
                        value={acct.id}
                        checked={selectedAccountId === acct.id}
                        onChange={() => setSelectedAccountId(acct.id)}
                        className="accent-brand"
                      />
                      <div>
                        <p className="text-fs-small font-medium text-ink">{acct.bank_name}</p>
                        <p className="text-fs-tiny text-ink-muted">****{acct.account_number.slice(-4)} · {acct.account_name}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-fs-small text-ink-muted -mt-2">
                To <span className="font-medium text-ink">{bankAccounts[0].bank_name}</span>{' '}
                ****{bankAccounts[0].account_number.slice(-4)}
              </p>
            )}

            <div>
              <label className="block text-fs-small font-medium text-ink-muted mb-1.5">Amount (GHS)</label>
              <input
                type="number"
                min={MIN_WITHDRAWAL / 100}
                max={available / 100}
                step="0.01"
                value={(parseInt(withdrawAmount, 10) / 100).toFixed(2)}
                onChange={(e) => setWithdrawAmount(String(Math.round(parseFloat(e.target.value || '0') * 100)))}
                className="w-full border border-line rounded-input px-3 py-2.5 text-fs-body focus:outline-none focus:border-brand transition-colors"
              />
              <p className="text-fs-tiny text-ink-muted mt-1.5">Available: {ghsCedi(available)}</p>
            </div>

            {withdrawError && (
              <p className="text-fs-small text-danger bg-red-50 rounded px-3 py-2">{withdrawError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 h-11 border border-line text-ink-soft rounded-input text-fs-small font-medium hover:bg-bg-subtle transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawSubmit}
                disabled={withdrawMut.isPending}
                className="flex-1 h-11 bg-brand text-white rounded-input text-fs-small font-semibold hover:bg-brand-ink transition-colors disabled:opacity-40"
              >
                {withdrawMut.isPending ? 'Requesting…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {withdrawMut.isSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white text-fs-small rounded-card px-5 py-3 shadow-card z-50">
          Payout requested. We'll email you when it completes.
        </div>
      )}
    </div>
  )
}
