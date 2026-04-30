
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import { CpmMain } from './cpm/App';
import WalletApp from './wallet/App';
import SyncPage from './pages/SyncPage';
import TsumCountApp from './tsumCount/App';
import UsagePage from './pages/UsagePage';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="cpm" element={<CpmMain />} />
        <Route path="wallet/*" element={<WalletApp />} />
        <Route path="sync" element={<SyncPage />} />
        <Route path="tsum-count" element={<TsumCountApp />} />
        <Route path="usage" element={<UsagePage />} />
      </Route>
    </Routes>
  );
}
