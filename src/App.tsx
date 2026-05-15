import React from 'react';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Timetable from './components/Timetable';
import Grades from './components/Grades';
import Homework from './components/Homework';
import Attendance from './components/Attendance';
import Messages from './components/Messages';
import Notifications from './components/Notifications';

// Placeholder for messages/notifications
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
    <div className="w-16 h-16 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-indigo-400">
      <span className="text-2xl font-bold animate-pulse">!</span>
    </div>
    <div className="text-center">
      <h2 className="text-xl font-semibold text-[#fafafa] mb-2">{title}</h2>
      <p className="text-[#a1a1aa] text-sm max-w-sm">Tato sekce bude plně integrována s real-time API SPŠD Motol.</p>
    </div>
    <button className="px-5 py-2 bg-[#18181b] border border-[#27272a] rounded-lg hover:bg-[#27272a] transition-colors text-xs font-medium text-[#fafafa]">
      Zpět na přehled
    </button>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs text-[#71717a] font-medium animate-pulse">Načítání systému...</p>
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          } />
          
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="marks" element={<Grades />} />
            <Route path="homework" element={<Homework />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="messages" element={<Messages />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

