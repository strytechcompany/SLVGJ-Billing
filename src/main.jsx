import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import POS from './renderer/pages/POS'
import DebtLedger from './renderer/pages/DebtLedger'
import LoginPage from './renderer/pages/LoginPage'
import RegisterPage from './renderer/pages/RegisterPage'
import Placeholder from './renderer/pages/Placeholder'
import Inventory from './renderer/pages/Inventory'
import Customers from './renderer/pages/Customers'
import Reports from './renderer/pages/Reports'

import './renderer/styles/theme.css'
import './renderer/styles/layout.css'

// Simple session guard — set by LoginPage/RegisterPage on successful OTP verification
const ProtectedRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem('slj_authenticated') === 'true';
  return isLoggedIn ? children : <Navigate to="/" replace />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/"         element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pos"      element={<ProtectedRoute><POS /></ProtectedRoute>} />
        <Route path="/debts"    element={<ProtectedRoute><DebtLedger /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
        <Route path="/reports"  element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Placeholder title="Settings" /></ProtectedRoute>} />
        <Route path="*"         element={<Navigate to="/pos" replace />} />
      </Routes>
      <ToastContainer position="bottom-right" theme="dark" autoClose={3000} />
    </Router>
  </React.StrictMode>
)
