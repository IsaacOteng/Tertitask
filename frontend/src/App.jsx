import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import Header from './components/Header'
import OnboardingModal from './components/OnboardingModal'
import SignInModal from './components/SignInModal'

import Landing from './pages/Landing'
import Browse from './pages/Browse'
import GigDetail from './pages/GigDetail'
import FreelancerProfile from './pages/FreelancerProfile'
import Me from './pages/Me'
import EditProfile from './pages/EditProfile'
import MyGigs from './pages/MyGigs'
import GigForm from './pages/GigForm'
import Saved from './pages/Saved'
import Checkout from './pages/Checkout'
import PaymentReturn from './pages/PaymentReturn'
import MyOrders from './pages/MyOrders'
import OrderDetail from './pages/OrderDetail'
import MySales from './pages/MySales'
import DeliverPage from './pages/DeliverPage'
import Earnings from './pages/Earnings'
import BankDetails from './pages/BankDetails'
import JobBoard from './pages/JobBoard'
import JobDetail from './pages/JobDetail'
import JobForm from './pages/JobForm'
import ClientProfile from './pages/ClientProfile'
import Messages from './pages/Messages'
import MessageThread from './pages/MessageThread'
import NotFound from './pages/NotFound'

function AuthRoute({ element }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  return element
}

function AppRoutes() {
  const { user, me, loading, showSignIn, setShowSignIn } = useAuth()

  // Only show onboarding when the server has confirmed it's incomplete (not during sync failures)
  const needsOnboarding = !loading && user && me && !me.onboarding_complete && !me._syncFailed

  return (
    <>
      <Header />
      {needsOnboarding && <OnboardingModal />}
      {showSignIn && !user && <SignInModal onClose={() => setShowSignIn(false)} />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/gig/:id" element={<GigDetail />} />
        <Route path="/freelancer/:id" element={<FreelancerProfile />} />

        <Route path="/me" element={<AuthRoute element={<Me />} />} />
        <Route path="/me/edit" element={<AuthRoute element={<EditProfile />} />} />
        <Route path="/me/gigs" element={<AuthRoute element={<MyGigs />} />} />
        <Route path="/me/gigs/new" element={<AuthRoute element={<GigForm />} />} />
        <Route path="/me/gigs/:id/edit" element={<AuthRoute element={<GigForm />} />} />
        <Route path="/me/saved" element={<AuthRoute element={<Saved />} />} />
        <Route path="/order/:id/checkout" element={<AuthRoute element={<Checkout />} />} />
        <Route path="/orders/:id/return" element={<AuthRoute element={<PaymentReturn />} />} />
        <Route path="/orders" element={<AuthRoute element={<MyOrders />} />} />
        <Route path="/orders/:id" element={<AuthRoute element={<OrderDetail />} />} />
        <Route path="/sales" element={<AuthRoute element={<MySales />} />} />
        <Route path="/sales/:id/deliver" element={<AuthRoute element={<DeliverPage />} />} />
        <Route path="/earnings" element={<AuthRoute element={<Earnings />} />} />
        <Route path="/earnings/bank" element={<AuthRoute element={<BankDetails />} />} />

        <Route path="/jobs" element={<JobBoard />} />
        <Route path="/jobs/new" element={<AuthRoute element={<JobForm />} />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/jobs/:id/edit" element={<AuthRoute element={<JobForm />} />} />
        <Route path="/client/:id" element={<ClientProfile />} />

        <Route path="/messages" element={<AuthRoute element={<Messages />} />} />
        <Route path="/messages/:id" element={<AuthRoute element={<MessageThread />} />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
