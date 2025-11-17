import { useEffect, useMemo, useRef, useState } from 'react'

const API = import.meta.env.VITE_BACKEND_URL || ''

const STATUS_COLUMNS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'completed', label: 'Completed' },
]

function getRole() {
  try {
    const s = localStorage.getItem('session')
    if (!s) return 'viewer'
    const json = JSON.parse(s)
    return json?.user?.role || 'viewer'
  } catch {
    return 'viewer'
  }
}

function useTasks(clientId, { search, assignee } = {}) {
  const query = useMemo(() => {
    const q = new URLSearchParams({ client_id: clientId })
    if (search) q.set('search', search)
    if (assignee) q.set('assignee', assignee)
    return `${API}/kanban/tasks?${q.toString()}`
  }, [clientId, search, assignee])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const reload = () => setData(null)
  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch(query)
      .then(r => r.json())
      .then(d => { if (mounted) setData(d) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [query])
  return { data, loading, reload }
}

function TaskCard({ task, onDragStart }) {
  const due = task.due_date ? new Date(task.due_date) : null
  const overdue = due && due.getTime() < Date.now()
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className="rounded-md border p-3 bg-white shadow-sm cursor-grab active:cursor-grabbing"
      style={{ borderColor: 'rgba(0,0,0,0.08)' }}
    >
      <div className="font-medium text-slate-800 mb-1">{task.title}</div>
      {task.description && <div className="text-xs text-slate-600 line-clamp-2 mb-2">{task.description}</div>}
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          {due && (
            <span className={`px-2 py-0.5 rounded-full border`} style={{
              borderColor: overdue ? '#ef4444' : 'rgba(0,0,0,0.08)',
              color: overdue ? '#ef4444' : '#334155',
              background: 'rgba(0,0,0,0.02)'
            }}>
              {due.toLocaleDateString()}
            </span>
          )}
          {task.assignees?.length > 0 && (
            <span className="px-2 py-0.5 rounded-full border" style={{borderColor:'rgba(0,0,0,0.08)'}}>
              {task.assignees.length} assignee{task.assignees.length>1?'s':''}
            </span>
          )}
        </div>
        {task.status === 'completed' && (
          <span className="text-green-600 font-medium">Done</span>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({ client, currentUser }) {
  const [search, setSearch] = useState('')
  const [assignee, setAssignee] = useState('')
  const { data: allTasks, loading, reload } = useTasks(client.id, { search, assignee })
  const dragging = useRef(null)
  const role = getRole()

  // Realtime updates via WebSocket
  useEffect(() => {
    if (!client?.id) return
    const wsBase = API.replace('https://', 'wss://').replace('http://', 'ws://')
    const ws = new WebSocket(`${wsBase}/ws/kanban/${client.id}`)
    ws.onmessage = () => {
      reload()
    }
    ws.onerror = () => {}
    return () => { try { ws.close() } catch {} }
  }, [client?.id])

  const grouped = useMemo(() => {
    const by = { todo: [], in_progress: [], under_review: [], completed: [] }
    ;(allTasks || []).forEach(t => { by[t.status]?.push(t) })
    // ensure stable ordering by position then created_at if provided
    Object.keys(by).forEach(k => by[k].sort((a,b) => (a.position||0)-(b.position||0)))
    return by
  }, [allTasks])

  const onDragStart = (e, task) => {
    dragging.current = task
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (e, status) => {
    e.preventDefault()
    const t = dragging.current
    if (!t) return
    // compute neighbors for end-of-column drop
    const col = grouped[status] || []
    const before_id = null
    const after_id = col.length ? col[col.length - 1].id : null
    await fetch(`${API}/kanban/tasks/${t.id}/move`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Role': role },
      body: JSON.stringify({ to_status: status, before_id, after_id })
    })
    dragging.current = null
    reload()
  }

  const allowDrop = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const createTask = async (e) => {
    e.preventDefault()
    const form = e.target
    const title = form.title.value
    const description = form.description.value
    const due_date = form.due_date.value ? new Date(form.due_date.value).toISOString() : null
    const assignees = form.assignees.value ? form.assignees.value.split(',').map(s=>s.trim()).filter(Boolean) : []
    await fetch(`${API}/kanban/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Role': role },
      body: JSON.stringify({ client_id: client.id, title, description, due_date, assignees })
    })
    form.reset()
    reload()
  }

  const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand')?.trim() || '#32CD32'

  const canEdit = role === 'admin' || role === 'project_manager'

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks" className="w-full border rounded px-3 py-2 bg-white/90" />
          <input value={assignee} onChange={e=>setAssignee(e.target.value)} placeholder="Filter by assignee id" className="w-64 border rounded px-3 py-2 bg-white/90" />
        </div>
        {canEdit && (
          <form onSubmit={createTask} className="grid grid-cols-5 gap-2">
            <input name="title" required placeholder="Task title" className="col-span-2 border rounded px-3 py-2 bg-white/90" />
            <input name="description" placeholder="Description" className="col-span-2 border rounded px-3 py-2 bg-white/90" />
            <button className="col-span-1 rounded text-white font-medium" style={{background: brand}}>Add</button>
            <input name="due_date" type="date" className="col-span-2 border rounded px-3 py-2 bg-white/90" />
            <input name="assignees" placeholder="assignee ids (comma separated)" className="col-span-3 border rounded px-3 py-2 bg-white/90" />
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(col => (
          <div key={col.key} className="rounded-lg border p-3 bg-white/80 min-h-[260px] flex flex-col" style={{borderColor:'rgba(0,0,0,0.08)'}} onDrop={canEdit ? (e)=>handleDrop(e, col.key) : undefined} onDragOver={canEdit ? (e)=>allowDrop(e) : undefined}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{background: brand}} />
                <h4 className="font-semibold text-slate-800">{col.label}</h4>
              </div>
              <span className="text-xs text-slate-500">{grouped[col.key]?.length || 0}</span>
            </div>
            <div className="space-y-2 flex-1">
              {grouped[col.key]?.map(t => (
                <TaskCard key={t.id} task={t} onDragStart={onDragStart} />
              ))}
              {loading && <div className="text-xs text-slate-500">Loading…</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-slate-500">
        {canEdit ? 'Tip: Drag a card to another column to update its status instantly.' : 'Read-only view. Project managers and admins can create and move tasks.'}
      </div>
    </div>
  )
}
