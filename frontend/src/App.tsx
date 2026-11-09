import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import AdminLayout from './components/admin/AdminLayout';
import Layout from './components/Layout';
import AdminDevotionsPage from './pages/admin/AdminDevotionsPage';
import AdminDevotionView from './pages/admin/AdminDevotionView';
import AdminLearningPage from './pages/admin/AdminLearningPage';
import AdminLearningView from './pages/admin/AdminLearningView';
import AdminHome from './pages/admin/AdminHome';
import AdminLogin from './pages/admin/AdminLogin';
import DevotionDetail from './pages/DevotionDetail';
import Devotions from './pages/Devotions';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import Learning from './pages/Learning';
import LearningDetail from './pages/LearningDetail';
import Login from './pages/Login';
import Profile from './pages/Profile';

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-note">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Layout />;
}

function AdminShell() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-note">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <AdminLayout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login mode="login" />} />
      <Route path="/register" element={<Login mode="register" />} />
      <Route element={<Protected />}>
        <Route path="/" element={<Home />} />
        <Route path="/devotions" element={<Devotions />} />
        <Route path="/devotion/:id" element={<DevotionDetail />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/learning/:id" element={<LearningDetail />} />
        <Route path="/blogs/*" element={<Navigate to="/learning" replace />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Route>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminShell />}>
        <Route index element={<AdminHome />} />
        <Route path="devotions" element={<AdminDevotionsPage />} />
        <Route path="devotions/:id" element={<AdminDevotionView />} />
        <Route path="learning" element={<AdminLearningPage />} />
        <Route path="learning/:id" element={<AdminLearningView />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
