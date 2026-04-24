import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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

  const handleSelectBank = (bank) => {
    setSelectedBank(bank)
    setBankQuery(bank.name)
    setShowDropdown(false)
    setVerifiedName(null)
    setVerifyError(null)
  }

  const handleAccountBlur = async () => {
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
      setSaved(true)
    } catch (err) {
      setVerifyError(err.body?.detail || 'Could not verify account. Check the number and try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  if (saved && verifiedName) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 space-y-6">
        <h1 className="text-xl font-bold text-ink">Bank account saved</h1>
        <div className="bg-bg-subtle rounded-2xl p-5 space-y-1">
          <p className="text-sm font-medium text-ink">{verifiedName}</p>
          <p className="text-sm text-ink-muted">{selectedBank?.name} · ****{accountNumber.slice(-4)}</p>
        </div>
        <button
          onClick={() => navigate('/earnings')}
          className="w-full bg-brand text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-ink transition-colors"
        >
          Back to Earnings
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Bank account</h1>
        <p className="text-sm text-ink-muted mt-1">Add a bank account to receive withdrawals.</p>
      </div>

      {/* Bank search */}
      <div className="relative">
        <label className="block text-xs text-ink-muted mb-1">Bank</label>
        <input
          type="text"
          placeholder={banksLoading ? 'Loading banks…' : 'Search bank name'}
          value={bankQuery}
          onChange={(e) => { setBankQuery(e.target.value); setShowDropdown(true); setSelectedBank(null) }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          disabled={banksLoading}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
        />
        {showDropdown && filtered.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-white border border-line rounded-lg shadow-lg max-h-52 overflow-y-auto">
            {filtered.map((bank) => (
              <li
                key={bank.code}
                onMouseDown={() => handleSelectBank(bank)}
                className="px-3 py-2 text-sm hover:bg-bg-subtle cursor-pointer"
              >
                {bank.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Account number */}
      <div>
        <label className="block text-xs text-ink-muted mb-1">Account number</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={13}
          placeholder="0123456789"
          value={accountNumber}
          onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, '')); setVerifiedName(null); setVerifyError(null) }}
          onBlur={handleAccountBlur}
          disabled={!selectedBank}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
        />
      </div>

      {/* Verification feedback */}
      {isVerifying && (
        <p className="text-xs text-ink-muted">Verifying account…</p>
      )}
      {verifiedName && !isVerifying && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Is this you? <span className="font-semibold">{verifiedName}</span>
        </div>
      )}
      {verifyError && !isVerifying && (
        <p className="text-xs text-danger">{verifyError}</p>
      )}

      {/* Save */}
      <button
        onClick={() => { if (verifiedName) setSaved(true) }}
        disabled={!verifiedName || saveMut.isPending}
        className="w-full bg-brand text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Save bank account
      </button>
    </div>
  )
}
