import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, Building2 } from 'lucide-react'
import { useBanks, useSaveBankAccount } from '../hooks/useEarnings'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function BankDetails() {
  useDocumentTitle('Bank Account')
  const navigate = useNavigate()
  const { data: banks = [], isLoading: banksLoading } = useBanks()
  const saveMut = useSaveBankAccount()

  const [bankQuery, setBankQuery] = useState('')
  const [selectedBank, setSelectedBank] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [accountNumber, setAccountNumber] = useState('')
  const [verifiedName, setVerifiedName] = useState(null)
  const [verifyError, setVerifyError] = useState(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [saved, setSaved] = useState(false)

  const filtered = useMemo(() => {
    if (!bankQuery) return banks.slice(0, 20)
    const q = bankQuery.toLowerCase()
    return banks.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 20)
  }, [banks, bankQuery])

  function handleSelectBank(bank) {
    setSelectedBank(bank)
    setBankQuery(bank.name)
    setShowDropdown(false)
    setVerifiedName(null)
    setVerifyError(null)
  }

  async function handleAccountBlur() {
    if (!selectedBank || accountNumber.length < 10) return
    setVerifiedName(null)
    setVerifyError(null)
    setIsVerifying(true)
    try {
      const data = await saveMut.mutateAsync({
        bank_code: selectedBank.code,
        bank_name: selectedBank.name,
        account_number: accountNumber,
      })
      setVerifiedName(data.account_name)
    } catch (err) {
      setVerifyError(err.body?.detail || 'Could not verify account. Check the number and try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  if (saved && verifiedName) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-bg rounded-card border border-line shadow-elevated p-8 text-center space-y-4">
          <CheckCircle2 size={40} className="text-brand mx-auto" />
          <div>
            <p className="font-semibold text-fs-body text-ink">Bank account saved</p>
            <p className="text-fs-small text-ink-muted mt-1">
              {selectedBank?.name} · ****{accountNumber.slice(-4)}
            </p>
            <p className="text-fs-small font-medium text-ink mt-0.5">{verifiedName}</p>
          </div>
          <button
            onClick={() => navigate('/earnings')}
            className="w-full h-10 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors"
          >
            Back to Earnings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">

        <div>
          <h1 className="font-display text-fs-h2 font-semibold text-ink">Bank account</h1>
          <p className="text-fs-small text-ink-muted mt-1">Add your Ghana bank account to receive withdrawals.</p>
        </div>

        <div className="bg-bg rounded-card border border-line p-5 space-y-5">

          {/* Bank search */}
          <div className="relative">
            <label className="block text-fs-small font-semibold text-ink mb-1.5">
              Bank <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                type="text"
                placeholder={banksLoading ? 'Loading banks…' : 'Search bank name'}
                value={bankQuery}
                onChange={(e) => { setBankQuery(e.target.value); setShowDropdown(true); setSelectedBank(null) }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                disabled={banksLoading}
                className="w-full h-10 pl-9 pr-3 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50"
              />
            </div>
            {showDropdown && filtered.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-bg border border-line rounded-card shadow-elevated max-h-52 overflow-y-auto">
                {filtered.map((bank) => (
                  <li
                    key={bank.code}
                    onMouseDown={() => handleSelectBank(bank)}
                    className="px-4 py-2.5 text-fs-small text-ink hover:bg-bg-subtle cursor-pointer transition-colors"
                  >
                    {bank.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Account number */}
          <div>
            <label className="block text-fs-small font-semibold text-ink mb-1.5">
              Account number <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={13}
              placeholder="0123456789"
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
            <p className="text-fs-tiny text-ink-muted mt-1">Enter your account number, then click away to verify.</p>
          </div>

          {/* Verification feedback */}
          {isVerifying && (
            <div className="flex items-center gap-2 text-fs-small text-ink-muted">
              <Loader2 size={13} className="animate-spin" />
              Verifying account…
            </div>
          )}

          {verifiedName && !isVerifying && (
            <div className="flex items-start gap-3 rounded-input bg-green-50 border border-green-200 px-4 py-3">
              <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-fs-tiny text-green-700 font-medium">Account verified</p>
                <p className="text-fs-small text-green-800 font-semibold">{verifiedName}</p>
              </div>
            </div>
          )}

          {verifyError && !isVerifying && (
            <p className="text-fs-tiny text-danger bg-red-50 border border-red-100 rounded-input px-3 py-2">{verifyError}</p>
          )}
        </div>

        <button
          onClick={() => { if (verifiedName) setSaved(true) }}
          disabled={!verifiedName || saveMut.isPending}
          className="w-full h-11 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save bank account
        </button>

      </div>
    </div>
  )
}
