import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Layout.css';
import SettingsPanel from './SettingsPanel';
import './SettingsPanel.css';

// アイコンコンポーネント
function RegisterIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
    );
}

function StatsIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    );
}

export default function Layout() {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        const head = document.head;
        let meta = head.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
        let prevContent: string | null = null;
        let created = false;

        if (meta) {
            prevContent = meta.getAttribute('content');
            meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
        } else {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'viewport');
            head.appendChild(meta);
            created = true;
        }

        return () => {
            if (!meta) return;
            if (created) {
                head.removeChild(meta);
            } else if (prevContent !== null) {
                meta.setAttribute('content', prevContent);
            } else {
                meta.removeAttribute('content');
            }
        };
    }, []);

    return (
        <div className="layout">
            {/* Settings panel (overlay) */}
            <SettingsPanel isOpen={open} onClose={() => setOpen(false)} />

            {/* PC Header */}
            <header className="header">
                <div className="header__inner">
                    <h1 className="header__title">ツムツム コイン管理</h1>
                    <nav className="header__nav">
                        <NavLink
                            to="register"
                            className={({ isActive }) =>
                                `header__link ${isActive ? 'header__link--active' : ''}`
                            }
                        >
                            <RegisterIcon className="header__icon" />
                            登録
                        </NavLink>
                        <NavLink
                            to="stats"
                            className={({ isActive }) =>
                                `header__link ${isActive ? 'header__link--active' : ''}`
                            }
                        >
                            <StatsIcon className="header__icon" />
                            統計
                        </NavLink>
                    </nav>

                    {/* 右上の設定ボタン */}
                    <div style={{ marginLeft: 12 }}>
                        <button className="settings-button" onClick={() => setOpen(true)} aria-label="設定">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06A2 2 0 014.28 16.9l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82L4.31 4.7A2 2 0 017.14 1.87l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001 1.51V3a2 2 0 014 0v.09c.13.66.53 1.24 1 1.51h.12a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.12c.27.47.85.87 1.51 1z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="layout__main">
                <Outlet />
            </main>

            {/* Mobile Tab Bar */}
            <nav className="tabbar">
                <NavLink
                    to="register"
                    className={({ isActive }) =>
                        `tabbar__link ${isActive ? 'tabbar__link--active' : ''}`
                    }
                >
                    <RegisterIcon className="tabbar__icon" />
                    <span className="tabbar__label">登録</span>
                </NavLink>
                <NavLink
                    to="stats"
                    className={({ isActive }) =>
                        `tabbar__link ${isActive ? 'tabbar__link--active' : ''}`
                    }
                >
                    <StatsIcon className="tabbar__icon" />
                    <span className="tabbar__label">統計</span>
                </NavLink>
            </nav>
        </div>
    );
}

