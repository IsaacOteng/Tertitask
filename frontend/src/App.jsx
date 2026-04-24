import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import Header from './components/Header'

import Landing from './pages/Landing'
import Browse from './pages/Browse'
import GigDetail from './pages/GigDetail'
import FreelancerProfile from './pages/FreelancerProfile'
import Onboarding from './pages/Onboarding'
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
import NotFound from './pages/NotFound'

// Redirects to /onboarding when signed-in user hasn't completed onboarding.
// Also requires sign-in (redirects to / if no user at all).
function OnboardedRoute({ element }) {
  const { user, me, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  if (me && !me.onboarding_complete) return <Navigate to="/onboarding" replace />
  return element
}

function AppRoutes() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/gig/:id" element={<GigDetail />} />
        <Route path="/freelancer/:id" element={<FreelancerProfile />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Routes that require sign-in + completed onboarding */}
        <Route path="/me" element={<OnboardedRoute element={<Me />} />} />
        <Route path="/me/edit" element={<OnboardedRoute element={<EditProfile />} />} />
        <Route path="/me/gigs" element={<OnboardedRoute element={<MyGigs />} />} />
        <Route path="/me/gigs/new" element={<OnboardedRoute element={<GigForm />} />} />
        <Route path="/me/gigs/:id/edit" element={<OnboardedRoute element={<GigForm />} />} />
        <Route path="/me/saved" element={<OnboardedRoute element={<Saved />} />} />
        <Route path="/order/:id/checkout" element={<OnboardedRoute element={<Checkout />} />} />
        <Route path="/order/:id/return" element={<OnboardedRoute element={<PaymentReturn />} />} />
        <Route path="/orders" element={<OnboardedRoute element={<MyOrders />} />} />
        <Route path="/orders/:id" element={<OnboardedRoute element={<OrderDetail />} />} />
        <Route path="/sales" element={<OnboardedRoute element={<MySales />} />} />
        <Route path="/sales/:id/deliver" element={<OnboardedRoute element={<DeliverPage />} />} />
        <Route path="/earnings" element={<OnboardedRoute element={<Earnings />} />} />
        <Route path="/earnings/bank" element={<OnboardedRoute element={<BankDetails />} />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
