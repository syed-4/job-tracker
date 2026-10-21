import { useEffect, useState } from 'react'
import { apiRequest } from '../api/client'

const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected']

export default function DashboardPage({ token, onLogout }) {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadApplications()
  }, [])

  async function loadApplications() {
    setLoading(true)
    try {
      const data = await apiRequest('/applications', { token })
      setApplications(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(newApp) {
    const created = await apiRequest('/applications', {
      method: 'POST',
      body: newApp,
      token,
    })
    setApplications((prev) => [created, ...prev])
    setShowForm(false)
  }

  async function handleStatusChange(id, status) {
    const updated = await apiRequest(`/applications/${id}`, {
      method: 'PATCH',
      body: { status },
      token,
    })
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)))
  }

  async function handleDelete(id) {
    if (!confirm('Delete this application?')) return
    await apiRequest(`/applications/${id}`, { method: 'DELETE', token })
    setApplications((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Job Tracker</h1>
        <div>
          <button onClick={() => setShowForm(!showForm)} className="primary">
            {showForm ? 'Cancel' : '+ Add application'}
          </button>
          <button onClick={onLogout}>Log out</button>
        </div>
      </header>

      <main>
        {error && <p className="error">{error}</p>}

        {showForm && <ApplicationForm onCreate={handleCreate} />}

        {loading ? (
          <p>Loading...</p>
        ) : (
          <Board
            applications={applications}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        )}
      </main>
    </div>
  )
}

function ApplicationForm({ onCreate }) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      await onCreate({ company, role, link: link || null, notes: notes || null })
      setCompany('')
      setRole('')
      setLink('')
      setNotes('')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="app-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <input
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
        />
        <input
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />
      </div>
      <div className="form-row">
        <input
          placeholder="Job link (optional)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
      </div>
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      {formError && <p className="error">{formError}</p>}
      <button type="submit" className="primary" disabled={submitting}>
        {submitting ? 'Adding...' : 'Add application'}
      </button>
    </form>
  )
}

function Board({ applications, onStatusChange, onDelete }) {
  return (
    <div className="board">
      {STATUSES.map((status) => (
        <div key={status} className="column">
          <h2>{status}</h2>
          {applications
            .filter((a) => a.status === status)
            .map((app) => (
              <Card
                key={app.id}
                app={app}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
              />
            ))}
        </div>
      ))}
    </div>
  )
}

function Card({ app, onStatusChange, onDelete }) {
  return (
    <div className="card">
      <h3>{app.company}</h3>
      <p className="role">{app.role}</p>
      {app.link && (
        <a href={app.link} target="_blank" rel="noreferrer">
          Job link
        </a>
      )}
      {app.notes && <p className="notes">{app.notes}</p>}

      <select
        value={app.status}
        onChange={(e) => onStatusChange(app.id, e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <button className="delete-button" onClick={() => onDelete(app.id)}>
        Delete
      </button>
    </div>
  )
}