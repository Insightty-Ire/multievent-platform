import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import EventSelectPage from './pages/EventSelectPage'
import EventDashboardWrapper from './pages/EventDashboardWrapper'
import FormBuilderPage from './pages/FormBuilderPage'
import SuperAdminHub from './pages/SuperAdminHub'
import PublicRegistrationPage from './pages/PublicRegistrationPage'

export default function App() {
  const { user, loading, denied, sendMagicLink, signOut } = useAuth()

  return (
    <>
      <Toaster position="top-right" />

      <Routes>
        {/* ── Public — no login required ───────────────────────── */}
        <Route path="/register/:eventId" element={<PublicRegistrationPage />} />

        {/* ── Auth gate for everything else ────────────────────── */}
        <Route path="/*" element={
          loading ? (
            <div className="min-h-screen bg-portal-grad flex items-center justify-center">
              <div className="text-center text-white space-y-4">
                <div className="text-4xl">🏆</div>
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                <p className="text-sm text-white/60 font-medium">Loading...</p>
              </div>
            </div>
          ) : (
            <Routes>
              <Route path="/login" element={
                user
                  ? <Navigate to="/" replace />
                  : <LoginPage onSendLink={sendMagicLink} denied={denied} onRetry={() => window.location.reload()} />
              } />

              {!user ? (
                <Route path="*" element={<Navigate to="/login" replace />} />
              ) : (
                <>
                  {/* Super admin command center */}
                  <Route path="/admin" element={
                    user.global_role === 'super_admin'
                      ? <SuperAdminHub />
                      : <Navigate to="/select-event" replace />
                  } />

                  {/* Pick which event to manage/staff */}
                  <Route path="/select-event" element={<EventSelectPage user={user} onSignOut={signOut} />} />

                  {/* A specific event's check-in dashboard */}
                  <Route path="/event/:eventId" element={<EventDashboardWrapper user={user} />} />

                  {/* Form builder for that event */}
                  <Route path="/event/:eventId/form" element={<FormBuilderPage />} />

                  {/* Default landing: super_admin → /admin, everyone else → /select-event */}
                  <Route path="*" element={
                    <Navigate to={user.global_role === 'super_admin' ? '/admin' : '/select-event'} replace />
                  } />
                </>
              )}
            </Routes>
          )
        } />
      </Routes>
    </>
  )
}
