import type { Items } from '../types';

const itemDefs: Array<{ key: keyof Items; label: string }> = [
  { key: 'score', label: 'Score' },
  { key: 'coin', label: 'Coin' },
  { key: 'exp', label: 'Exp' },
  { key: 'timeItem', label: 'Time' },
  { key: 'bomb', label: 'Bomb' },
  { key: 'fivetofour', label: '5-4' },
];

type ItemsToggleGridProps = {
  value: Items;
  onChange: (next: Items) => void;
};

export default function ItemsToggleGrid({ value, onChange }: ItemsToggleGridProps) {
  return (
    <div className="items-grid">
      {itemDefs.map((item) => (
        <label key={item.key} className={`item-chip ${value[item.key] ? 'active' : ''}`}>
          <input
            type="checkbox"
            checked={value[item.key]}
            onChange={(event) => onChange({ ...value, [item.key]: event.target.checked })}
          />
          <span>{item.label}</span>
        </label>
      ))}
    </div>
  );
}
