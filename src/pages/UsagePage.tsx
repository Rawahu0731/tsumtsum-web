const pageSections = [
  {
    id: 'home',
    title: 'ホーム',
    summary: '最初に開く入口ページです。ここから各ツールへ移動します。',
    what: [
      'CPM Calculator、Coin Wallet、Skill Progress Tracker、Sync へすぐ移動できます。',
      '各カードは「このアプリで何ができるか」を短くまとめた案内です。',
    ],
    how: [
      'まずはホームを開き、使いたい機能のカードをタップします。',
      '迷ったら「How to Use」カードからこのページに戻れます。',
    ],
    tips: [
      'iPhone では下部タブを使うと移動しやすいです。',
      'データは基本的に端末内に保存されるので、必要に応じて Sync や JSON 出力を使ってください。',
    ],
  },
  {
    id: 'cpm',
    title: 'CPM Calculator',
    summary: 'プレイ 1 分あたりのコイン効率を計算し、履歴として残せます。',
    what: [
      'プレイ時間、獲得コイン、使用アイテムをもとに １分効率 を計算します。',
      '保存した記録はツム別にランキング表示できます。',
      'JSON でエクスポート／インポートできるので、端末間の移動にも使えます。',
    ],
    how: [
      'プレイ開始時にストップウォッチを開始し、終了したら適用します。',
      'キャラクター名、スキルレベル、素コイン数、使用アイテムを入力して Calculate を押します。',
      '結果を確認したら Save Record で保存します。',
    ],
    tips: [
      '同じ内容の記録は重複保存を防ぐようになっています。',
      'Export Data と Import JSON は、まとめてバックアップしたいときに便利です。',
      '時間は mm:ss 形式で入れます。アイテムの有無で効率計算が変わります。',
    ],
    calculation: {
      costs: {
        score: 500,
        coin: 500,
        exp: 500,
        timeItem: 1000,
        bomb: 1500,
        fivetofour: 1800,
      },
      note: '',
    },
  },
  {
    id: 'wallet',
    title: 'Coin Wallet',
    summary: '日々のコイン収支を記録して、登録画面と統計画面で管理します。',
    what: [
      'Register で日付ごとのコイン増減を登録できます。',
      'Stats で合計、直近 7 日、月別、週別、使い道の割合を確認できます。',
      '設定パネルから目標値や OCR 範囲を調整できます。',
    ],
    how: [
      '初回は現在の所持コインを初期設定として登録します。',
      'Register で日付、増減モード、現在のコイン枚数を入力して登録します。',
      'スクリーンショットから数字を読み取りたい場合は「画像から読み取る（クリップボード）」を使います。',
      '画像はクリップボードにコピーしてから実行してください',
      'Stats では目標との差分や推移を見ながら、今週の進捗を確認します。',
    ],
    tips: [
      '登録画面は「追加」「プレボ」「セレボ」「ピック」「その他」を切り替えて用途別に残せます。',
      'OCR がうまく読めない場合は、設定で切り取り範囲を調整してください。',
      '設定ボタンは右上にあり、iPhone では固定ボタンから開けます。',
    ],
    subpages: [
      {
        title: 'Register',
        body: 'コインの増減を 1 件ずつ登録する画面です。日付、モード、現在のコイン枚数を入れて保存します。',
      },
      {
        title: 'Stats',
        body: '日ごとの収支や週・月の集計を見る画面です。目標との比較やデータ管理もここで行います。',
      },
    ],
  },
  {
    id: 'skill',
    title: 'Skill Progress Tracker',
    summary: 'ツムの所持数やスキル進行を整理し、完売までの見通しを立てます。',
    what: [
      'ガチャ結果入力で、ツムごとの所持数や進行状況を手動で登録できます。',
      'スクショ OCR 一括入力で、画像からまとめて入力できます。',
      '種類別サマリー、全体サマリー、プレミアムボックス完売まで、の 3 つの見方で進捗を整理できます。',
    ],
    how: [
      'まずはガチャ結果入力で、持っている数を登録します。',
      'スクショから入れる場合は OCR に使う範囲を整えて、一括入力を実行します。',
      'サマリーで種類別や全体の残り数を確認し、完売までの進捗を追います。',
    ],
    tips: [
      'OCR は画像の切り取り位置が合っているほど精度が上がります。',
      'OCRの精度には限界があるため、必ず結果を確認して必要に応じて修正してください。',
      'プレミアムボックス完売までの表示は、長期目標の確認に向いています。',
    ],
  },
  {
    id: 'sync',
    title: 'Sync',
    summary: 'ローカル保存したデータを Google アカウント経由でクラウド同期します。',
    what: [
      '現在の Wallet、CPM、Skill データをまとめて保存できます。',
      'クラウド上のデータをローカルに復元できます。',
      '1 日あたりの保存回数には上限があります。',
    ],
    how: [
      'Google でログインしてから保存または復元を実行します。',
      '保存は今の端末のデータをクラウドに送る操作、復元はクラウドの内容を端末に戻す操作です。',
      '大事な変更をした直後は、保存しておくと端末紛失時の保険になります。',
    ],
    tips: [
      '保存は 1 日 10 回までです。回数を使い切るとその日は保存できません。',
      '復元はローカルデータを完全に上書きするので、必要なら先にバックアップを取ってください。',
      'ログインしていない状態では保存・復元はできません。',
    ],
  },
];

const quickStartSteps = [
  'ホームから使いたい機能を開く',
  'まずは Wallet か CPM で 1 件だけ登録して、操作感をつかむ',
  '慣れてきたら Sync や JSON 出力でバックアップを取る',
  'OCR や設定は必要になってから調整する',
];

const tableOfContents = pageSections.map((section) => ({
  id: section.id,
  title: section.title,
}));

const commonNotes = [
  'このアプリは各機能ごとにデータを保存します。ブラウザのデータを消すと履歴も消えるため、定期的なバックアップが安全です。',
  '初めての人は、まず Wallet の初期設定と 1 件登録を試すと全体の流れがわかりやすいです。',
];

export default function UsagePage() {
  return (
    <div
      style={{
        padding: '24px 16px 40px',
        maxWidth: 960,
        margin: '0 auto',
        lineHeight: 1.75,
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', color: '#2563eb' }}>
          HOW TO USE
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1.15 }}>使い方</h1>
        <p style={{ margin: '12px 0 0', color: '#4b5563', maxWidth: 760 }}>
          初めて使う人でも迷わないように、各ページで何ができて、どう操作すればよいかをまとめています。
          まずは全体の流れをつかんでから、必要なページを開いてください。
        </p>
      </header>

      <section style={sectionCard}>
        <h2 style={sectionTitle}>まずやること</h2>
        <ol style={orderedList}>
          {quickStartSteps.map((step) => (
            <li key={step} style={listItem}>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section style={{ ...sectionCard, marginTop: 16 }}>
        <h2 style={sectionTitle}>目次</h2>
        <div style={tocGrid}>
          {tableOfContents.map((item) => (
            <a key={item.id} href={`#${item.id}`} style={tocLink}>
              {item.title}
            </a>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={sectionTitle}>ページ別ガイド</h2>
        <div style={stackList}>
          {pageSections.map((section) => (
            <article key={section.id} id={section.id} style={stackSection}>
              <div style={stackHeader}>
                <h3 style={pageCardTitle}>{section.title}</h3>
                <p style={pageCardSummary}>{section.summary}</p>
              </div>

              <div style={subBlock}>
                <h4 style={subTitle}>このページでできること</h4>
                <ul style={bulletList}>
                  {section.what.map((item) => (
                    <li key={item} style={listItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={subBlock}>
                <h4 style={subTitle}>使い方</h4>
                <ul style={bulletList}>
                  {section.how.map((item) => (
                    <li key={item} style={listItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={subBlock}>
                <h4 style={subTitle}>補足</h4>
                <ul style={bulletList}>
                  {section.tips.map((item) => (
                    <li key={item} style={listItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {section.calculation && (
                <div style={subBlock}>
                  <h4 style={subTitle}>計算式</h4>
                  <pre style={preStyle}>
                    {`+Coin アイテムあり:
  CPM = (coin × 1.3 - item) ÷ minutes

+Coin アイテムなし:
  CPM = (coin - item) ÷ minutes


※ item は使用アイテムによる固定の合計補正値（アプリ内で定義された値の合計）です。
※ minutes はプレイ時間を分単位で表したものです。`}
                  </pre>
                  <div style={{ color: '#6b7280', marginTop: 8 }}>{section.calculation.note}</div>
                </div>
              )}

              {section.subpages && (
                <div style={subBlock}>
                  <h4 style={subTitle}>中のページ</h4>
                  <div style={inlineList}>
                    {section.subpages.map((subpage) => (
                      <div key={subpage.title} style={inlineItem}>
                        <div style={miniCardTitle}>{subpage.title}</div>
                        <p style={miniCardBody}>{subpage.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section style={{ ...sectionCard, marginTop: 16 }}>
        <h2 style={sectionTitle}>共通の注意点</h2>
        <ul style={bulletList}>
          {commonNotes.map((item) => (
            <li key={item} style={listItem}>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const sectionCard = {
  border: '1px solid #e5e7eb',
  borderRadius: 20,
  background: '#fff',
  padding: 20,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
};

const sectionTitle = {
  margin: '0 0 12px',
  fontSize: '1.3rem',
  lineHeight: 1.3,
};

const orderedList = {
  margin: 0,
  paddingLeft: 20,
};

const bulletList = {
  margin: 0,
  paddingLeft: 20,
};

const listItem = {
  margin: '6px 0',
};

const tocGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 10,
};

const tocLink = {
  display: 'block',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #dbeafe',
  background: '#eff6ff',
  color: '#1d4ed8',
  textDecoration: 'none',
  fontWeight: 700,
};

const stackList = {
  display: 'grid',
  gap: 16,
};

const stackSection = {
  border: '1px solid #e5e7eb',
  borderRadius: 18,
  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
  padding: 18,
};

const stackHeader = {
  marginBottom: 8,
};

const pageCardTitle = {
  margin: 0,
  fontSize: '1.1rem',
};

const pageCardSummary = {
  margin: '4px 0 0',
  color: '#4b5563',
};

const subBlock = {
  marginTop: 14,
};

const subTitle = {
  margin: '0 0 8px',
  fontSize: '0.95rem',
  color: '#111827',
};

const inlineList = {
  display: 'grid',
  gap: 10,
};

const inlineItem = {
  borderRadius: 14,
  background: '#fff',
  border: '1px solid #e5e7eb',
  padding: 12,
};

const preStyle: any = {
  background: '#f8fafc',
  padding: 12,
  borderRadius: 8,
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  color: '#111827',
  fontSize: 13,
};

const miniCardTitle = {
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 6,
};

const miniCardBody = {
  margin: 0,
  color: '#4b5563',
  fontSize: 14,
};
