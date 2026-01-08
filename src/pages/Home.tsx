import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1 className="home-title">TSUM TSUM UTILITIES</h1>
        <p className="home-subtitle">ツムツム非公式攻略ツール</p>
      </header>

      <main className="tools-grid">
        <Link to="/cpm" className="tool-card">
          <div className="card-content">
            <h2>
              <span>📊</span> CPM Calculator
            </h2>
            <p>
              コイン稼ぎ効率（Coins Per Minute）を簡単に計算。
              プレイ時間と獲得コイン数から、あなたの効率を分析します。
            </p>
            <div className="card-arrow">
              使ってみる →
            </div>
          </div>
        </Link>

        <Link to="/wallet" className="tool-card">
          <div className="card-content">
            <h2>
              <span>💰</span> Coin Wallet
            </h2>
            <p>
              日々のコイン収支をスマートに管理。
              稼いだコインとガチャで使ったコインを記録してグラフ化します。
            </p>
            <div className="card-arrow">
              管理する →
            </div>
          </div>
        </Link>
      </main>
    </div>
  );
}
