type TabKey = 'measure' | 'ranking' | 'analysis';

type TabBarProps = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
};

const tabs: Array<{ key: TabKey; label: string; sub: string }> = [
  { key: 'measure', label: 'Measure', sub: 'Play' },
  { key: 'ranking', label: 'Ranking', sub: 'Compare' },
  { key: 'analysis', label: 'Analysis', sub: 'Sessions' },
];

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`tab-btn ${active === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          <span className="tab-label">{tab.label}</span>
          <span className="tab-sub">{tab.sub}</span>
        </button>
      ))}
    </div>
  );
}
