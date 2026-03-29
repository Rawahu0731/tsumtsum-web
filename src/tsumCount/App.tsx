import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { data as rawData } from './data';

type TsumRow = {
	no: number;
	name: string;
	type: number;
	cookieId: number;
	needs: number[];
	max: number;
	defaultOwned: number;
	isMedal: boolean;
	unitCost: number;
};

type RowState = Record<number, { owned: number; checked: boolean }>;

type EnrichedRow = TsumRow & {
	owned: number;
	level: number;
	remaining: number;
	completion: number;
	checked: boolean;
	requiredCost: number;
};

type Aggregate = {
	owned: number;
	max: number;
	remaining: number;
	coinCost: number;
	medalCost: number;
	skillMaxCount: number;
	totalCount: number;
};

const STORAGE_KEY = 'tsum-count-state-v1';

// type=4 をメダルツムとして扱う。必要なら調整してください。
const MEDAL_TYPES = new Set([4]);
// 12850メダルで計算するツムの cookieId をここに列挙する。
const SPECIAL_MEDAL_IDS = new Set<number>([]);

const TYPE_LABEL: Record<number, string> = {
	0: '常駐ツム',
	1: '期間限定ツム',
	2: 'ピックアップ',
	3: '報酬ツム',
	4: '復活しないツム',
	5: 'プラスツム',
};

const formatter = new Intl.NumberFormat('ja-JP');

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function levelToPieces(level: number, needs: number[]): number {
	const cappedLevel = clamp(level, 0, 6);
	const fullLevel = Math.floor(cappedLevel);
	const fraction = cappedLevel - fullLevel;

	let sum = 0;
	for (let i = 0; i < fullLevel && i < needs.length; i += 1) {
		sum += needs[i] ?? 0;
	}

	if (fullLevel < needs.length && fraction > 0) {
		sum += fraction * (needs[fullLevel] ?? 0);
	}

	return sum;
}

function piecesToLevel(pieces: number, needs: number[]): number {
	let remaining = Math.max(pieces, 0);
	for (let i = 0; i < needs.length; i += 1) {
		const cost = needs[i] ?? 0;
		if (remaining >= cost) {
			remaining -= cost;
		} else {
			const fraction = cost === 0 ? 0 : remaining / cost;
			return Number((i + fraction).toFixed(2));
		}
	}
	return 6;
}

function parseData(): TsumRow[] {
	return rawData.map((row, idx) => {
		const name = String(row[1] ?? '').trim();
		const type = Number(row[7] ?? 0);
		const cookieId = Number(row[10] ?? idx + 1);
		const needs = [12, 13, 14, 15, 16, 17].map((i) => Number(row[i] ?? 0));
		const max = needs.reduce((acc, v) => acc + v, 0);
		const defaultOwned = Number(row[18] ?? 0);
		const isMedal = MEDAL_TYPES.has(type);
		const unitCost = SPECIAL_MEDAL_IDS.has(cookieId) ? 12850 : isMedal ? 10000 : 30000;

		return {
			no: idx + 1,
			name,
			type,
			cookieId,
			needs,
			max,
			defaultOwned,
			isMedal,
			unitCost,
		};
	});
}

function loadState(): RowState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as RowState;
		return parsed ?? {};
	} catch (err) {
		console.error('Failed to load state', err);
		return {};
	}
}

function persistState(state: RowState) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (err) {
		console.error('Failed to save state', err);
	}
}

function formatCost(amount: number, currency: 'coin' | 'medal') {
	return `${formatter.format(Math.round(amount))} ${currency === 'coin' ? 'coin' : 'medal'}`;
}

function formatPercent(value: number) {
	return `${value.toFixed(2)}%`;
}

function progressBar(level: number) {
	const capped = clamp(level, 0, 6);
	const full = Math.floor(capped);
	const frac = capped - full;
	const blocks: string[] = [];

	for (let i = 0; i < 6; i += 1) {
		if (i < full) {
			blocks.push('■');
		} else if (i === full && frac > 0) {
			blocks.push('▣');
		} else {
			blocks.push('□');
		}
	}

	return blocks.join('');
}

function buildLevelChoices(needs: number[], max: number) {
	const set = new Set<number>();
	const cappedMax = Math.max(0, Math.round(max));
	for (let pieces = 0; pieces <= cappedMax; pieces += 1) {
		const lv = piecesToLevel(pieces, needs);
		set.add(Number(lv.toFixed(4)));
	}
	if (!set.has(6)) set.add(6);
	return Array.from(set).sort((a, b) => a - b);
}

function aggregate(rows: EnrichedRow[]): Aggregate {
	return rows.reduce<Aggregate>(
		(acc, row) => {
			acc.owned += row.owned;
			acc.max += row.max;
			acc.remaining += row.remaining;
			if (row.isMedal) {
				acc.medalCost += row.requiredCost;
			} else {
				acc.coinCost += row.requiredCost;
			}
			if (row.remaining <= 0) {
				acc.skillMaxCount += 1;
			}
			acc.totalCount += 1;
			return acc;
		},
		{ owned: 0, max: 0, remaining: 0, coinCost: 0, medalCost: 0, skillMaxCount: 0, totalCount: 0 },
	);
}

type SortKey = 'no' | 'name' | 'type' | 'level' | 'owned' | 'remaining' | 'max' | 'completion' | 'cost';

export default function TsumCountApp() {
	const baseRows = useMemo(parseData, []);
	const baseMap = useMemo(() => new Map(baseRows.map((r) => [r.cookieId, r])), [baseRows]);
	const [state, setState] = useState<RowState>(() => loadState());
	const [filter, setFilter] = useState('');
	const [sortKey, setSortKey] = useState<SortKey>('no');
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
	const tableRef = useRef<HTMLTableElement>(null);
	const tableWrapRef = useRef<HTMLDivElement>(null);
	const scrollTopRef = useRef<HTMLDivElement>(null);
	const [tableWidth, setTableWidth] = useState(1200);

	useEffect(() => {
		persistState(state);
	}, [state]);

	const enrichedRows = useMemo<EnrichedRow[]>(() => {
		return baseRows.map((row) => {
			const saved = state[row.cookieId];
			const owned = clamp(Number(saved?.owned ?? row.defaultOwned ?? 0), 0, row.max);
			const level = piecesToLevel(owned, row.needs);
			const remaining = Math.max(row.max - owned, 0);
			const completion = row.max > 0 ? (owned / row.max) * 100 : 0;
			const requiredCost = remaining * row.unitCost;
			const checked = Boolean(saved?.checked);

			return {
				...row,
				owned,
				level,
				remaining,
				completion,
				checked,
				requiredCost,
			};
		});
	}, [baseRows, state]);

	const filtered = useMemo(() => {
		const keyword = filter.trim();
		const rows = keyword
			? enrichedRows.filter((r) => r.name.toLowerCase().includes(keyword.toLowerCase()))
			: enrichedRows;

		const sorted = [...rows].sort((a, b) => {
			const dir = sortDir === 'asc' ? 1 : -1;
			switch (sortKey) {
				case 'name':
					return dir * a.name.localeCompare(b.name, 'ja');
				case 'type':
					return dir * (a.type - b.type || a.name.localeCompare(b.name, 'ja'));
				case 'level':
					return dir * (a.level - b.level || a.no - b.no);
				case 'owned':
					return dir * (a.owned - b.owned || a.no - b.no);
				case 'remaining':
					return dir * (a.remaining - b.remaining || a.no - b.no);
				case 'max':
					return dir * (a.max - b.max || a.no - b.no);
				case 'completion':
					return dir * (a.completion - b.completion || a.no - b.no);
				case 'cost':
					return dir * (a.requiredCost - b.requiredCost || a.no - b.no);
				default:
					return dir * (a.no - b.no);
			}
		});

		return sorted;
	}, [enrichedRows, filter, sortDir, sortKey]);

	const selectedRows = filtered.filter((r) => r.checked);

	const levelChoices = useMemo(() => {
		const map: Record<number, number[]> = {};
		enrichedRows.forEach((row) => {
			map[row.cookieId] = buildLevelChoices(row.needs, row.max);
		});
		return map;
	}, [enrichedRows]);

	const summaryByType = useMemo(() => {
		const bucket = new Map<number, EnrichedRow[]>();
		enrichedRows.forEach((row) => {
			const list = bucket.get(row.type) ?? [];
			list.push(row);
			bucket.set(row.type, list);
		});
		return Array.from(bucket.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([type, rows]) => ({
				type,
				label: TYPE_LABEL[type] ?? `Type ${type}`,
				aggregate: aggregate(rows),
			}));
	}, [enrichedRows]);

	const overall = useMemo(() => aggregate(enrichedRows), [enrichedRows]);
	const selectedSummary = useMemo(() => aggregate(selectedRows), [selectedRows]);

	useEffect(() => {
		const updateWidth = () => {
			setTableWidth(tableRef.current?.scrollWidth ?? 1200);
		};
		updateWidth();
		const onResize = () => updateWidth();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, [filtered]);

	const syncScrollFromTop = () => {
		if (tableWrapRef.current && scrollTopRef.current) {
			tableWrapRef.current.scrollLeft = scrollTopRef.current.scrollLeft;
		}
	};

	const syncScrollFromBody = () => {
		if (tableWrapRef.current && scrollTopRef.current) {
			scrollTopRef.current.scrollLeft = tableWrapRef.current.scrollLeft;
		}
	};

	const setOwned = (cookieId: number, owned: number) => {
		const max = baseMap.get(cookieId)?.max ?? Infinity;
		const nextOwned = clamp(Math.round(owned), 0, max);
		setState((prev) => ({
			...prev,
			[cookieId]: {
				owned: nextOwned,
				checked: prev[cookieId]?.checked ?? false,
			},
		}));
	};

	const setChecked = (cookieId: number, checked: boolean) => {
		setState((prev) => ({
			...prev,
			[cookieId]: {
				owned: prev[cookieId]?.owned ?? baseRows.find((r) => r.cookieId === cookieId)?.defaultOwned ?? 0,
				checked,
			},
		}));
	};

	const toggleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortKey(key);
			setSortDir('asc');
		}
	};

	const toggleAll = (checked: boolean) => {
		setState((prev) => {
			const next: RowState = { ...prev };
			filtered.forEach((row) => {
				next[row.cookieId] = {
					owned: prev[row.cookieId]?.owned ?? row.defaultOwned,
					checked,
				};
			});
			return next;
		});
	};

	const resetState = () => {
		setState({});
	};

	const buildCsv = () => {
		const header = 'name,type,cookieId,owned,checked';
		const lines = enrichedRows.map((r) => {
			const safeName = `"${r.name.replace(/"/g, '""')}"`;
			return [safeName, r.type, r.cookieId, r.owned, r.checked ? 1 : 0].join(',');
		});
		return [header, ...lines].join('\n');
	};

	const downloadCsv = () => {
		const csv = buildCsv();
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'tsum-skill-progress.csv';
		a.click();
		URL.revokeObjectURL(url);
	};

	const copyCsv = async () => {
		try {
			await navigator.clipboard.writeText(buildCsv());
			alert('クリップボードにコピーしました');
		} catch (err) {
			alert('コピーに失敗しました。ブラウザの権限を確認してください');
			console.error(err);
		}
	};

	const importCsvText = (text: string) => {
		const lines = text.split(/\r?\n/).filter(Boolean);
		if (lines.length <= 1) return;
		const next: RowState = { ...state };
		for (let i = 1; i < lines.length; i += 1) {
			const row = lines[i];
			const cells = row.split(',');
			if (cells.length < 5) continue;
			const cookieId = Number(cells[2]);
			if (!Number.isFinite(cookieId)) continue;
			const owned = Number(cells[3]);
			const checked = cells[4] === '1' || cells[4].toLowerCase() === 'true';
			if (!baseRows.find((r) => r.cookieId === cookieId)) continue;
			next[cookieId] = { owned: Number.isFinite(owned) ? owned : 0, checked };
		}
		setState(next);
	};

	const onFileImport = (file: File) => {
		const reader = new FileReader();
		reader.onload = (ev) => {
			const text = ev.target?.result;
			if (typeof text === 'string') {
				importCsvText(text);
			}
		};
		reader.readAsText(file, 'utf-8');
	};

	const renderAggregate = (label: string, agg: Aggregate) => (
		<div className="agg-card" key={label}>
			<div className="agg-title">{label}</div>
			<div className="agg-grid">
				<div>所持</div>
				<div>{formatter.format(Math.round(agg.owned))}</div>
				<div>最大</div>
				<div>{formatter.format(Math.round(agg.max))}</div>
				<div>残り</div>
				<div>{formatter.format(Math.round(agg.remaining))}</div>
				<div>コンプ率</div>
				<div>{agg.max > 0 ? formatPercent((agg.owned / agg.max) * 100) : '0.00%'}</div>
				<div>必要コイン</div>
				<div>{formatter.format(Math.round(agg.coinCost))}</div>
				<div>必要メダル</div>
				<div>{formatter.format(Math.round(agg.medalCost))}</div>
				<div>スキルマ</div>
				<div>
					{agg.skillMaxCount} / {agg.totalCount}
				</div>
			</div>
		</div>
	);

	return (
		<div className="tsum-page">
			<header className="tsum-header">
				<div>
					<p className="eyebrow">TSUM SKILL TRACKER</p>
					<h1>スキル進行・コイン/メダル計算</h1>
				</div>
				<div className="header-actions">
					<button type="button" onClick={downloadCsv} className="ghost-btn">
						CSVダウンロード
					</button>
					<button type="button" onClick={copyCsv} className="ghost-btn">
						クリップボードコピー
					</button>
					<label className="file-btn">
						CSV読み込み
						<input
							type="file"
							accept=".csv,text/csv"
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) onFileImport(file);
								e.target.value = '';
							}}
						/>
					</label>
					<button type="button" onClick={resetState} className="danger-btn">
						リセット
					</button>
				</div>
			</header>

			<section className="toolbar">
				<input
					className="search"
					placeholder="名前で検索"
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
				/>
				<div className="toolbar-meta">
					<span>表示: {filtered.length} 件</span>
					<span>選択: {selectedRows.length} 件</span>
					<label className="check-all">
						<input
							type="checkbox"
							checked={filtered.length > 0 && selectedRows.length === filtered.length}
							onChange={(e) => toggleAll(e.target.checked)}
						/>
						一括選択
					</label>
				</div>
			</section>

			<div
				className="table-scroll-top"
				ref={scrollTopRef}
				onScroll={syncScrollFromTop}
				aria-hidden
			>
				<div style={{ width: tableWidth }} />
			</div>

			<div className="table-wrap" ref={tableWrapRef} onScroll={syncScrollFromBody}>
				<table className="tsum-table" ref={tableRef}>
					<thead>
						<tr>
							<th>#</th>
							<th>
								<button type="button" onClick={() => toggleSort('name')}>名前</button>
							</th>
							<th>
								<button type="button" onClick={() => toggleSort('type')}>種類</button>
							</th>
							<th>スキルLv</th>
							<th>
								<button type="button" onClick={() => toggleSort('owned')}>所持数</button>
							</th>
							<th>
								<button type="button" onClick={() => toggleSort('remaining')}>残り</button>
							</th>
							<th>
								<button type="button" onClick={() => toggleSort('max')}>最大</button>
							</th>
							<th>
								<button type="button" onClick={() => toggleSort('completion')}>コンプ率</button>
							</th>
							<th>
								<button type="button" onClick={() => toggleSort('cost')}>必要コイン/メダル</button>
							</th>
							<th>チェック</th>
							<th>進捗</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((row) => (
							<tr key={row.cookieId} className={row.checked ? 'row-checked' : ''}>
								<td>{row.no}</td>
								<td className="name-col">{row.name}</td>
								<td>{TYPE_LABEL[row.type] ?? `Type ${row.type}`}</td>
								<td>
									<select
										value={Number(row.level.toFixed(4))}
										onChange={(e) => {
											const lv = Number(e.target.value);
											const owned = levelToPieces(lv, row.needs);
											setOwned(row.cookieId, clamp(owned, 0, row.max));
										}}
									>
										{(levelChoices[row.cookieId] ?? [row.level]).map((lv) => (
											<option key={lv} value={lv}>
												{lv.toFixed(2)}
											</option>
										))}
									</select>
								</td>
								<td>
									<input
										type="number"
										min={0}
										max={row.max}
										step={1}
										value={row.owned}
										onChange={(e) => {
											const owned = clamp(Number(e.target.value), 0, row.max);
											setOwned(row.cookieId, owned);
										}}
									/>
								</td>
								<td>{formatter.format(Math.round(row.remaining))}</td>
								<td>{formatter.format(Math.round(row.max))}</td>
								<td>{formatPercent(row.completion)}</td>
								<td>
									{formatCost(row.requiredCost, row.isMedal ? 'medal' : 'coin')}
								</td>
								<td>
									<input
										type="checkbox"
										checked={row.checked}
										onChange={(e) => setChecked(row.cookieId, e.target.checked)}
									/>
								</td>
								<td className="progress-col">{progressBar(row.level)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<section className="summary">
				<h2>種類別サマリー</h2>
				<div className="agg-list">
					{summaryByType.map(({ label, aggregate: agg, type }) =>
						renderAggregate(`${label} (type ${type})`, agg),
					)}
				</div>
			</section>

			<section className="summary">
				<h2>全体サマリー</h2>
				<div className="agg-list">
					{renderAggregate('全ツム', overall)}
					{renderAggregate('チェック済みのみ', selectedSummary)}
				</div>
			</section>
		</div>
	);
}
