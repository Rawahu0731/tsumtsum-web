import React from 'react';
import './Home.css';
import FeatureCard from './FeatureCard';

const CPMIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <rect x="3" y="10" width="3" height="8" rx="0.5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="9" y="6" width="3" height="12" rx="0.5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="15" y="3" width="3" height="15" rx="0.5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WalletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <rect x="2" y="6" width="20" height="12" rx="2" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 10h.01" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FEATURES = [
  {
    title: 'CPM Calculator',
    description:
      'コイン稼ぎ効率（Coins Per Minute）を簡単に計算。プレイ時間と獲得コイン数から効率を分析します。',
    to: '/cpm',
    icon: <CPMIcon />,
  },
  {
    title: 'Coin Wallet',
    description:
      '日々のコイン収支をスマートに管理。稼いだコインや使ったコインを記録して振り返れます。',
    to: '/wallet',
    icon: <WalletIcon />,
  },
];

export default function Home() {
  return (
    <div className="home-root">
      <div className="home-hero">
        <div className="hero-inner">
          <h1 className="hero-title">TSUM TSUM UTILITIES</h1>
          <p className="hero-sub">ツムツム非公式攻略ツール</p>
        </div>
      </div>

      <main className="features-wrap">
        <div className="features-grid">
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.to}
              title={f.title}
              description={f.description}
              to={f.to}
              icon={f.icon}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
