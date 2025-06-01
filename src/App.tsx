import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-4">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/groups" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><h1 className="text-2xl font-bold text-gray-900">Groups</h1><p className="mt-4">Coming soon...</p></div>} />
              <Route path="/expenses" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><h1 className="text-2xl font-bold text-gray-900">Expenses</h1><p className="mt-4">Coming soon...</p></div>} />
              <Route path="/settings" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><h1 className="text-2xl font-bold text-gray-900">Settings</h1><p className="mt-4">Coming soon...</p></div>} />
            </Route>
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
