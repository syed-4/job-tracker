export default function DashboardPage({ token, onLogout }) {
  return (
    <div className="dashboard">
      <header>
        <h1>Job Tracker</h1>
        <button onClick={onLogout}>Log out</button>
      </header>
      <p>You're logged in. Applications go here next.</p>
    </div>
  )
}
