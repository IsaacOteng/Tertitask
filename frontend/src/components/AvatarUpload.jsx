import { useRef, useState } from 'react'
import { Camera, Loader2, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

function avatarInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?'
}

export default function AvatarUpload({ size = 24 }) {
  const { me, setMe } = useAuth()
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const sizeClass = `w-${size} h-${size}`

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (!ALLOWED.includes(file.type)) {
      setError('Only JPG, PNG, or WebP images are allowed.')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Image must be under 5 MB.')
      return
    }

    setUploading(true)
    try {
      const { upload_url, public_url } = await api.post('/uploads/presign/', {
        purpose: 'avatar',
        content_type: file.type,
        size_bytes: file.size,
      })

      const putRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) throw new Error('storage_put_failed')

      const updated = await api.patch('/me/', { avatar_url: public_url })
      setMe(updated)
    } catch (err) {
      console.error('Avatar upload failed:', err)
      setError('Photo upload failed. Please try again.')
    } finally {
      setUploading(false)
      // Reset so the same file can be re-selected after an error
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        {/* Avatar display */}
        <div className={`${sizeClass} rounded-full overflow-hidden border-4 border-white shadow-elevated shrink-0`}>
          {me?.avatar_url ? (
            <img
              src={me.avatar_url}
              alt={me?.full_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand to-brand-ink flex items-center justify-center">
              <span
                className="text-white font-display font-bold select-none"
                style={{ fontSize: `${parseInt(size) * 0.35}rem` }}
              >
                {avatarInitial(me?.full_name)}
              </span>
            </div>
          )}
        </div>

        {/* Overlay button */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full flex items-center justify-center bg-ink/0 group-hover:bg-ink/40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Change profile photo"
        >
          {uploading ? (
            <Loader2 size={20} className="text-white animate-spin" />
          ) : (
            <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>

        {/* Edit badge */}
        {!uploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-ink border-2 border-white flex items-center justify-center shadow-sm hover:bg-ink-soft transition-colors"
            aria-label="Change photo"
          >
            <Camera size={12} className="text-white" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-fs-small text-brand hover:underline font-medium disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : me?.avatar_url ? 'Change photo' : 'Upload photo'}
      </button>

      {error && (
        <p className="flex items-center gap-1.5 text-fs-tiny text-danger">
          <AlertCircle size={12} />
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFile}
      />
    </div>
  )
}
