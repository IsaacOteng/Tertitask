import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, Building2, Smartphone, Plus, Trash2 } from 'lucide-react'
import { useBankAccounts, useBanks, useSaveBankAccount } from '../hooks/useEarnings'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function BankDetails() {
  useDocumentTitle('Payout Accounts')
  const navigate = useNavigate()
  const { data: banks = [], isLoading: banksLoading } = useBanks()
  const { data: savedAccounts = [], isLoading: accountsLoading } = useBankAccounts()
  const saveMut = useSaveBankAccount()

  const [showForm, setShowForm] = useState(false)
  const [bankQuery, setBankQuery] = useState('')
  const [selectedBank, setSelectedBank] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [accountNumber, setAccountNumber] = useState('')
  const [momoName, setMomoName] = useState('')
  const [verifiedName, setVerifiedName] = useState(null)
  const [verifyError, setVerifyError] = useState(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const isMoMo = selectedBank?.type === 'mobile_money'

  const sortedBanks = useMemo(() => {
    const momo = banks.filter((b) => b.type === 'mobile_money')
    const traditional = banks.filter((b) => b.type !== 'mobile_money')
    return [...momo, ...traditional]
  }, [banks])

  const filtered = useMemo(() => {
    if (!bankQuery) return sortedBanks.slice(0, 25)
    const q = bankQuery.toLowerCase()
    return sortedBanks.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 25)
  }, [sortedBanks, bankQuery])

  function handleSelectBank(bank) {
    setSelectedBank(bank)
    setBankQuery(bank.name)
    setShowDropdown(false)
    setVerifiedName(null)
    setVerifyError(null)
    setAccountNumber('')
  }

  function resetForm() {
    setBankQuery('')
    setSelectedBank(null)
    setAccountNumber('')
    setMomoName('')
    setVerifiedName(null)
    setVerifyError(null)
  }

  async function triggerSave({ number = accountNumber, name = momoName } = {}) {
    if (!selectedBank || number.length < 10) return
    setVerifiedName(null)
    setVerifyError(null)
    setIsVerifying(true)
    try {
      const payload = {
        bank_code: selectedBank.code,
        bank_name: selectedBank.name,
        account_number: number,
        account_type: selectedBank.type || 'ghipss',
      }
      if (selectedBank.type === 'mobile_money') {
        if (!name.trim()) { setIsVerifying(false); return }
        payload.account_name = name.trim()
      }
      const data = await saveMut.mutateAsync(payload)
      setVerifiedName(data.account_name)
    } catch (err) {
      setVerifyError(err.body?.detail || 'Could not verify. Check the details and try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleAccountBlur() {
    if (isMoMo) return  // MoMo waits for name field blur
    await triggerSave()
  }

  async function handleMomoNameBlur() {
    if (!momoName.trim() || accountNumber.length < 10) return
    await triggerSave({ number: accountNumber, name: momoName })
  }

  function handleSave() {
    if (!verifiedName) return
    resetForm()
    setShowForm(false)
  }

  const hasAccounts = savedAccounts.length > 0

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">

        <div>
          <h1 className="font-display text-fs-h2 font-semibold text-ink">Payout accounts</h1>
          <p className="text-fs-small text-ink-muted mt-1">
            Add your Ghana bank account or mobile money number to receive withdrawals.
          </p>
        </div>

        {/* ── Payout coming-soon notice ────────────────────────────────────────
            Remove this block once PAYOUTS_ENABLED = true in Earnings.jsx and
            Paystack transfers are live on your registered business account.     */}
        <div className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-fs-small text-amber-700">
          <span className="font-semibold text-amber-800">Withdrawals coming soon.</span>{' '}
          Save your account now so it is ready the moment payouts go live.
          Once enabled, funds arrive within <span className="font-semibold">24 hours</span>.
        </div>
        {/* ── End coming-soon notice ─────────────────────────────────────────── */}

        {/* Saved accounts list */}
        {!accountsLoading && hasAccounts && (
          <div className="space-y-2">
            <p className="text-fs-small font-semibold text-ink">Saved accounts</p>
            {savedAccounts.map((acct) => {
              const isMoMoAcct = acct.account_type === 'mobile_money'
              return (
                <div
                  key={acct.id}
                  className="bg-bg rounded-card border border-line p-4 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                    {isMoMoAcct ? <Smartphone size={14} /> : <Building2 size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-fs-small font-semibold text-ink truncate">{acct.bank_name}</p>
                    <p className="text-fs-tiny text-ink-muted">
                      ****{acct.account_number.slice(-4)} · {acct.account_name}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isMoMoAcct ? 'bg-brand/10 text-brand border-brand/20' : 'bg-bg-subtle text-ink-muted border-line'
                  }`}>
                    {isMoMoAcct ? 'MoMo' : 'Bank'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Add account form or trigger */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full h-11 rounded-input border-2 border-dashed border-line text-fs-small font-medium text-ink-muted hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={15} />
            {hasAccounts ? 'Add another account' : 'Add bank / mobile money'}
          </button>
        )}

        {showForm && (
          <div className="bg-bg rounded-card border border-line p-5 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-fs-small font-semibold text-ink">New account</p>
              <button
                onClick={() => { resetForm(); setShowForm(false) }}
                className="text-fs-tiny text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>

            {/* Type indicators */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'mobile_money', label: 'Mobile Money', sub: 'MTN, Telecel, AirtelTigo', icon: Smartphone },
                { type: 'ghipss', label: 'Bank Account', sub: 'GCB, Ecobank, Absa…', icon: Building2 },
              ].map(({ type, label, sub, icon: Icon }) => {
                const active = selectedBank?.type === type
                return (
                  <div
                    key={type}
                    className={`rounded-card border p-3 flex items-start gap-2.5 transition-colors ${
                      active ? 'border-brand bg-brand/5' : 'border-line bg-bg'
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                      active ? 'bg-brand/10 text-brand' : 'bg-bg-subtle text-ink-muted'
                    }`}>
                      <Icon size={13} />
                    </div>
                    <div>
                      <p className={`text-fs-small font-semibold ${active ? 'text-brand' : 'text-ink'}`}>{label}</p>
                      <p className="text-fs-tiny text-ink-muted">{sub}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bank / MoMo search */}
            <div className="relative">
              <label className="block text-fs-small font-semibold text-ink mb-1.5">
                {isMoMo ? 'Mobile network' : 'Bank'} <span className="text-danger">*</span>
              </label>
              <div className="relative">
                {isMoMo
                  ? <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  : <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                }
                <input
                  type="text"
                  placeholder={banksLoading ? 'Loading…' : 'Search bank or mobile money provider'}
                  value={bankQuery}
                  onChange={(e) => { setBankQuery(e.target.value); setShowDropdown(true); setSelectedBank(null) }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  disabled={banksLoading}
                  className="w-full h-10 pl-9 pr-3 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50"
                />
              </div>
              {showDropdown && filtered.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-bg border border-line rounded-card shadow-elevated max-h-60 overflow-y-auto">
                  {filtered.map((bank, i) => {
                    const isMoMoItem = bank.type === 'mobile_money'
                    const prevIsMoMo = i > 0 && filtered[i - 1].type === 'mobile_money'
                    const showDivider = !isMoMoItem && prevIsMoMo
                    return (
                      <li key={bank.code}>
                        {showDivider && <div className="border-t border-line mx-3 my-1" />}
                        <button
                          onMouseDown={() => handleSelectBank(bank)}
                          className="w-full text-left px-4 py-2.5 text-fs-small text-ink hover:bg-bg-subtle transition-colors flex items-center gap-2"
                        >
                          {isMoMoItem && <Smartphone size={11} className="text-brand shrink-0" />}
                          {bank.name}
                          {isMoMoItem && (
                            <span className="ml-auto text-[10px] font-medium text-brand bg-brand/10 px-1.5 py-0.5 rounded-full">MoMo</span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Account number / phone number */}
            <div>
              <label className="block text-fs-small font-semibold text-ink mb-1.5">
                {isMoMo ? 'Phone number' : 'Account number'} <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={isMoMo ? 10 : 13}
                placeholder={isMoMo ? '0244123456' : '0123456789'}
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value.replace(/\D/g, ''))
                  setVerifiedName(null)
                  setVerifyError(null)
                }}
                onBlur={handleAccountBlur}
                disabled={!selectedBank}
                className="w-full h-10 px-3 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50 disabled:bg-bg-subtle"
              />
              <p className="text-fs-tiny text-ink-muted mt-1">
                {isMoMo
                  ? 'Enter the MoMo number.'
                  : 'Enter your account number, then click away to verify.'}
              </p>
            </div>

            {/* MoMo only: account holder name */}
            {isMoMo && (
              <div>
                <label className="block text-fs-small font-semibold text-ink mb-1.5">
                  Account holder name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={momoName}
                  onChange={(e) => {
                    setMomoName(e.target.value)
                    setVerifiedName(null)
                    setVerifyError(null)
                  }}
                  onBlur={handleMomoNameBlur}
                  disabled={!selectedBank || accountNumber.length < 10}
                  className="w-full h-10 px-3 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50 disabled:bg-bg-subtle"
                />
                <p className="text-fs-tiny text-ink-muted mt-1">
                  Enter your name then click away to save.
                </p>
              </div>
            )}

            {isVerifying && (
              <div className="flex items-center gap-2 text-fs-small text-ink-muted">
                <Loader2 size={13} className="animate-spin" />
                Verifying…
              </div>
            )}

            {verifiedName && !isVerifying && (
              <div className="flex items-start gap-3 rounded-input bg-green-50 border border-green-200 px-4 py-3">
                <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-fs-tiny text-green-700 font-medium">{isMoMo ? 'Saved' : 'Verified'}</p>
                  <p className="text-fs-small text-green-800 font-semibold">{verifiedName}</p>
                </div>
              </div>
            )}

            {verifyError && !isVerifying && (
              <p className="text-fs-tiny text-danger bg-red-50 border border-red-100 rounded-input px-3 py-2">{verifyError}</p>
            )}

            <button
              onClick={handleSave}
              disabled={!verifiedName || saveMut.isPending}
              className="w-full h-11 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save account
            </button>
          </div>
        )}

        {hasAccounts && (
          <button
            onClick={() => navigate('/earnings')}
            className="w-full h-10 rounded-input border border-line text-fs-small text-ink-soft hover:text-ink hover:border-ink-soft transition-colors"
          >
            Back to Earnings
          </button>
        )}

      </div>
    </div>
  )
}
