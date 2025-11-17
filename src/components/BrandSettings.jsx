import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_BACKEND_URL || ''

export default function BrandSettings({ client, onUpdated }) {
  const [display_name, setDisplayName] = useState(client.display_name || '')
  const [theme_color, setThemeColor] = useState(client.theme_color || '#4f46e5')
  const [logo_url, setLogoUrl] = useState(client.logo_url || '')
  const [notes, setNotes] = useState(client.notes || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDisplayName(client.display_name || '')
    setThemeColor(client.theme_color || '#4f46e5')
    setLogoUrl(client.logo_url || '')
    setNotes(client.notes || '')
  }, [client])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    await fetch(`${API}/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name, theme_color, logo_url, notes })
    })
    setSaving(false)
    onUpdated && onUpdated()
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Display name</label>
        <input value={display_name} onChange={e=>setDisplayName(e.target.value)} className="w-full border rounded px-3 py-2 bg-white/90" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Theme color</label>
        <div className="flex items-center gap-2">
          <input value={theme_color} onChange={e=>setThemeColor(e.target.value)} className="flex-1 border rounded px-3 py-2 bg-white/90" placeholder="#facc15" />
          <input type="color" value={theme_color} onChange={e=>setThemeColor(e.target.value)} className="h-10 w-10 rounded" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Logo URL</label>
        <input value={logo_url} onChange={e=>setLogoUrl(e.target.value)} className="w-full border rounded px-3 py-2 bg-white/90" placeholder="https://.../logo.png" />
        {logo_url && (
          <div className="mt-2">
            <img src={logo_url} alt="logo preview" className="h-12 object-contain bg-white rounded p-2" />
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Notes</label>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded px-3 py-2 bg-white/90" rows={3} />
      </div>
      <button disabled={saving} className="px-4 py-2 rounded text-white" style={{background:'var(--brand)'}}>
        {saving ? 'Saving...' : 'Save brand'}
      </button>
    </form>
  )
}
