import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Lazy load all page components for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Groups = lazy(() => import('./pages/Groups'));
const GroupDetails = lazy(() => import('./pages/GroupDetails'));
const InvitePage = lazy(() => import('./pages/InvitePage'));
const Settings = lazy(() => import('./pages/Settings'));
const Expenses = lazy(() => import('./pages/Expenses'));
const ExpenseDetails = lazy(() => import('./pages/ExpenseDetails'));
const Notifications = lazy(() => import('./pages/Notifications'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-4">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/invite/:token" element={<InvitePage />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/groups/:id" element={<GroupDetails />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/expense/:id" element={<ExpenseDetails />} />
              </Route>
            </Routes>
          </Suspense>
        </div>
      </div>
    </Router>
  );
}

export default App;
