import { useEffect, useMemo, useState } from 'react'

const API = import.meta.env.VITE_BACKEND_URL || ''

function useApi(path, params = null) {
  const url = useMemo(() => {
    if (!params) return `${API}${path}`
    const query = new URLSearchParams(params)
    return `${API}${path}?${query.toString()}`
  }, [path, params])

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch(url)
      .then(r => r.json())
      .then(d => mounted && setData(d))
      .finally(() => mounted && setLoading(false))
    return () => (mounted = false)
  }, [url])
  return { data, loading, reload: () => setData(null) }
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@example.com')
  const [name, setName] = useState('Admin')
  const [role, setRole] = useState('admin')

  const submit = async e => {
    e.preventDefault()
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role })
    })
    const json = await res.json()
    if (json.token) onLogin(json)
  }

  return (
    <div className="max-w-md w-full space-y-4">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border px-3 py-2 rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border px-3 py-2 rounded" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <select className="w-full border px-3 py-2 rounded" value={role} onChange={e=>setRole(e.target.value)}>
          <option value="admin">Admin</option>
          <option value="client">Client</option>
        </select>
        <button className="w-full bg-blue-600 text-white py-2 rounded">Continue</button>
      </form>
    </div>
  )
}

function ClientsList({ onOpen }) {
  const { data, loading } = useApi('/clients')
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Clients</h2>
        {loading && <span className="text-sm text-gray-500">Loading...</span>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map(c => (
          <button key={c.id} onClick={() => onOpen(c)} className="text-left bg-white rounded-lg border p-4 hover:shadow">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full" style={{ background: c.theme_color || '#e5e7eb' }} />
              <div>
                <div className="font-medium">{c.display_name}</div>
                <div className="text-xs text-gray-500">{c.notes || 'No notes yet'}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ClientPortal({ me, client, onBack }) {
  const [tab, setTab] = useState('chat')
  const [message, setMessage] = useState('')

  const messages = useApi('/messages', { client_id: client.id })
  const docs = useApi('/documents', { client_id: client.id })
  const invoices = useApi('/invoices', { client_id: client.id })
  const work = useApi('/work-requests', { client_id: client.id })
  const quotes = useApi('/quotes', { client_id: client.id })

  const send = async e => {
    e.preventDefault()
    if (!message.trim()) return
    await fetch(`${API}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: client.id, sender_id: me.id, sender_role: me.role || 'admin', content: message })
    })
    setMessage('')
    messages.reload()
  }

  const submitWork = async e => {
    e.preventDefault()
    const title = e.target.title.value
    const description = e.target.description.value
    await fetch(`${API}/work-requests`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: client.id, title, description })
    })
    e.target.reset()
    work.reload()
  }

  const addDoc = async e => {
    e.preventDefault()
    const filename = e.target.filename.value
    const url = e.target.url.value
    await fetch(`${API}/documents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: client.id, filename, url, uploaded_by: me.id })
    })
    e.target.reset()
    docs.reload()
  }

  const authorizeQuote = async id => {
    await fetch(`${API}/quotes/${id}/authorize`, { method: 'POST' })
    quotes.reload()
  }

  const color = client.theme_color || '#4f46e5'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sm text-gray-500 hover:underline">Back</button>
        <div className="h-8 w-8 rounded-full" style={{ background: color }} />
        <div>
          <div className="text-xl font-semibold">{client.display_name}</div>
          <div className="text-xs text-gray-500">Personalized portal</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['chat','documents','invoices','work','quotes'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-full border ${tab===t ? 'bg-gray-900 text-white' : 'bg-white'}`}>{t}</button>
        ))}
      </div>

      {tab==='chat' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border rounded-lg p-4 h-[420px] flex flex-col">
            <div className="flex-1 overflow-auto space-y-2">
              {messages.data?.map(m => (
                <div key={m.id} className={`max-w-[80%] ${m.sender_id===me.id ? 'ml-auto text-right' : ''}`}>
                  <div className={`inline-block px-3 py-2 rounded-lg ${m.sender_id===me.id ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{m.content}</div>
                  <div className="text-[10px] text-gray-400">{new Date(m.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="flex gap-2 pt-2">
              <input value={message} onChange={e=>setMessage(e.target.value)} className="flex-1 border rounded px-3" placeholder="Type a message" />
              <button className="px-4 bg-blue-600 text-white rounded">Send</button>
            </form>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-2">Notifications</h3>
            <Notifications userId={me.id} />
          </div>
        </div>
      )}

      {tab==='documents' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Files</h3>
            <ul className="space-y-2">
              {docs.data?.map(d => (
                <li key={d.id} className="flex items-center justify-between border rounded px-3 py-2">
                  <a href={d.url} target="_blank" className="text-blue-600 underline">{d.filename}</a>
                  <span className="text-xs text-gray-500">{d.kind}</span>
                </li>
              ))}
            </ul>
          </div>
          <form onSubmit={addDoc} className="bg-white border rounded-lg p-4 space-y-2">
            <h3 className="font-medium">Add File (URL)</h3>
            <input name="filename" className="w-full border rounded px-3 py-2" placeholder="Filename" />
            <input name="url" className="w-full border rounded px-3 py-2" placeholder="https://..." />
            <button className="w-full bg-gray-900 text-white rounded py-2">Upload</button>
          </form>
        </div>
      )}

      {tab==='invoices' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Invoices</h3>
            <ul className="space-y-2">
              {invoices.data?.map(i => (
                <li key={i.id} className="flex items-center justify-between border rounded px-3 py-2">
                  <div>
                    <div className="font-medium">{i.number}</div>
                    <div className="text-xs text-gray-500">${i.amount.toFixed(2)} · {i.status}</div>
                  </div>
                  {i.url && <a href={i.url} target="_blank" className="text-blue-600 underline">PDF</a>}
                </li>
              ))}
            </ul>
          </div>
          <InvoiceForm client={client} onDone={invoices.reload} />
        </div>
      )}

      {tab==='work' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Requests</h3>
            <ul className="space-y-2">
              {work.data?.map(w => (
                <li key={w.id} className="border rounded px-3 py-2">
                  <div className="font-medium">{w.title}</div>
                  <div className="text-sm text-gray-600">{w.description}</div>
                  <div className="text-xs text-gray-500">{w.status}</div>
                </li>
              ))}
            </ul>
          </div>
          <form onSubmit={submitWork} className="bg-white border rounded-lg p-4 space-y-2">
            <h3 className="font-medium">New Work Request</h3>
            <input name="title" className="w-full border rounded px-3 py-2" placeholder="Title" />
            <textarea name="description" className="w-full border rounded px-3 py-2" placeholder="Describe the work" />
            <button className="w-full bg-gray-900 text-white rounded py-2">Submit</button>
          </form>
        </div>
      )}

      {tab==='quotes' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Quotes</h3>
            <ul className="space-y-2">
              {quotes.data?.map(q => (
                <li key={q.id} className="flex items-center justify-between border rounded px-3 py-2">
                  <div>
                    <div className="font-medium">${q.amount.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">{q.status}</div>
                  </div>
                  {q.status==='pending' && <button onClick={()=>authorizeQuote(q.id)} className="px-3 py-1 rounded bg-emerald-600 text-white">Authorize</button>}
                </li>
              ))}
            </ul>
          </div>
          <QuoteForm client={client} onDone={quotes.reload} workList={work.data||[]} />
        </div>
      )}
    </div>
  )
}

function InvoiceForm({ client, onDone }) {
  const submit = async e => {
    e.preventDefault()
    const number = e.target.number.value
    const amount = parseFloat(e.target.amount.value || '0')
    const url = e.target.url.value || null
    await fetch(`${API}/invoices`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: client.id, number, amount, url })
    })
    e.target.reset()
    onDone && onDone()
  }
  return (
    <form onSubmit={submit} className="bg-white border rounded-lg p-4 space-y-2">
      <h3 className="font-medium">Add Invoice</h3>
      <input name="number" className="w-full border rounded px-3 py-2" placeholder="INV-001" />
      <input name="amount" type="number" step="0.01" className="w-full border rounded px-3 py-2" placeholder="Amount" />
      <input name="url" className="w-full border rounded px-3 py-2" placeholder="PDF URL (optional)" />
      <button className="w-full bg-gray-900 text-white rounded py-2">Save</button>
    </form>
  )
}

function QuoteForm({ client, onDone, workList }) {
  const submit = async e => {
    e.preventDefault()
    const amount = parseFloat(e.target.amount.value || '0')
    const wr = e.target.work.value
    await fetch(`${API}/quotes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: client.id, work_request_id: wr, amount })
    })
    e.target.reset()
    onDone && onDone()
  }
  return (
    <form onSubmit={submit} className="bg-white border rounded-lg p-4 space-y-2">
      <h3 className="font-medium">Create Quote</h3>
      <select name="work" className="w-full border rounded px-3 py-2">
        {workList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
      </select>
      <input name="amount" type="number" step="0.01" className="w-full border rounded px-3 py-2" placeholder="Amount" />
      <button className="w-full bg-gray-900 text-white rounded py-2">Create</button>
    </form>
  )
}

function Notifications({ userId }) {
  const { data, loading } = useApi('/notifications', { user_id: userId })
  const markRead = async () => {
    await fetch(`${API}/notifications/read?user_id=${userId}`, { method: 'POST' })
    window.location.reload()
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{loading ? 'Loading...' : `${data?.length||0} notifications`}</span>
        <button onClick={markRead} className="text-xs underline">Mark all read</button>
      </div>
      <ul className="space-y-2 max-h-64 overflow-auto">
        {data?.map(n => (
          <li key={n.id} className={`border rounded px-3 py-2 ${n.read ? 'opacity-60' : ''}`}>
            <div className="text-sm">{n.text}</div>
            <div className="text-[10px] text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('session')
    return saved ? JSON.parse(saved) : null
  })
  const [activeClient, setActiveClient] = useState(null)

  useEffect(() => {
    if (session) localStorage.setItem('session', JSON.stringify(session))
  }, [session])

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Login onLogin={setSession} />
      </div>
    )
  }

  const me = session.user && { ...session.user, id: session.user.id || session.user._id }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-semibold">Client Portal</div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{me?.name}</span>
            <button className="text-xs underline" onClick={()=>{localStorage.removeItem('session'); setSession(null)}}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {!activeClient ? (
          <ClientsList onOpen={setActiveClient} />
        ) : (
          <ClientPortal me={me} client={activeClient} onBack={() => setActiveClient(null)} />
        )}
      </main>
    </div>
  )
}
