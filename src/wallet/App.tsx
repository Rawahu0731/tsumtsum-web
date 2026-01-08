import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RegisterPage from './pages/RegisterPage';
import StatsPage from './pages/StatsPage';

export default function WalletRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="register" replace />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="stats" element={<StatsPage />} />
      </Route>
    </Routes>
  );
}
