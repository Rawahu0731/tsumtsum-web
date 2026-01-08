import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';

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
    return (
        <div className="layout">
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
