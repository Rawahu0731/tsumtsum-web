import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/cpm', label: 'CPM' },
  { to: '/wallet', label: 'Wallet' },
  { to: '/tsum-count', label: 'Skill' },
  { to: '/sync', label: 'Sync' },
];

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">Tsum Tsum Utilities</div>
        <nav className="app-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `app-nav__link ${isActive ? 'app-nav__link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="app-tabbar" aria-label="Mobile navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `app-tabbar__link ${isActive ? 'app-tabbar__link--active' : ''}`
            }
          >
            <span className="app-tabbar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
