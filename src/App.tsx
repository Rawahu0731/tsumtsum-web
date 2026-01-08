import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CpmApp from './cpm/App';
import WalletRoutes from './wallet/App';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cpm/*" element={<CpmApp />} />
        <Route path="/wallet/*" element={<WalletRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
