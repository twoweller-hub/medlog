# 服薬管理アプリ ドキュメント

## 概要

`medlog.html` を**ダブルクリックしてブラウザで開くだけ**で使えるシンプルな服薬管理Webアプリ。
サーバー不要・インストール不要。HTML + CSS + JavaScript の1ファイル完結。

**対象ユーザー：** プログラミング知識のない個人ユーザー
**主な使用環境：** Mac（薬の登録）＋ Galaxy S25（日々の服薬チェック）

---

## ファイル構成

```
medlog/
├── medlog.html    ← アプリ本体（これ1つだけ）
└── DOCUMENT.md   ← このファイル
```

---

## データ構造（localStorage）

キー `medicines` と `logs` の2つで管理。Firebase Realtime Database と互換性のある構造。

### medicines（薬マスタ）

```json
[
  {
    "id": "m1abc123",
    "name": "アロゲイン5",
    "dose": "1ml",
    "type": "regular",
    "timings": ["朝", "夜"],
    "memo": "食後",
    "active": true,
    "registeredAt": "2026-03-15"
  },
  {
    "id": "m2def456",
    "name": "ロキソニン",
    "dose": "1錠",
    "type": "prn",
    "timings": [],
    "memo": "頭痛時",
    "active": true
  }
]
```

**フィールド説明：**
- `type`: `"regular"`（定期服用）または `"prn"`（頓服）
- `timings`: 定期服用の場合は `["朝", "昼", "夜", "就寝前"]` の組み合わせ。頓服は空配列 `[]`
- `active`: `true` = 表示中、`false` = 一時停止中。未定義の場合は `true` として扱う（後方互換）
- `registeredAt`: `"YYYY-MM-DD"` 形式の登録日。履歴でこの日より前の日付を表示しない。未定義の場合は全日付を表示（後方互換）

### logs（服薬記録）

```json
{
  "2026-03-15": {
    "m1abc123": {
      "朝": { "taken": true,  "time": "2026-03-15T08:32:00.000Z" },
      "夜": { "taken": false, "time": null }
    },
    "m2def456": {
      "prn": [
        "2026-03-15T13:20:00.000Z",
        "2026-03-15T17:45:00.000Z"
      ]
    }
  }
}
```

**フィールド説明：**
- キーは `"YYYY-MM-DD"` 形式の日付文字列
- 定期服用：タイミングごとに `{ taken: bool, time: ISO文字列|null }` を持つ
- 頓服：`prn` キーに服用したISO時刻の配列を持つ

---

## 画面構成（3タブ）

### タブ1：今日

- 定期服用薬をタイミング（朝・昼・夜・就寝前）でグループ表示
- チェックで服用済み記録（時刻自動記録）。再チェックで取消し
- 達成率バー（定期服用のみカウント、頓服は含まない）
- 頓服薬は下部に別セクション表示。「今服用した」ボタンで時刻を積み重ね記録
- 記録済み時刻の `✎` をタップ → 時刻修正モーダル

### タブ2：薬の登録

- 種別（定期服用 / 頓服）を選択して登録
- 一時停止 / 再開ボタン（停止中はグレーアウト表示）
- 編集・削除
- バックアップ（`medlog_backup.json` のダウンロード）・復元（JSONファイルのインポート）

### タブ3：履歴

- **月ナビゲーション（◀ ▶）** で月単位の切り替え表示
- 定期服用：✅（服用済み）/ ❌（未服用）で表示
- 頓服：💊 アイコンと服用時刻・回数を表示
- ❌ の「未服用 → 記録する」をタップ → 時刻入力モーダルで後から記録可能
- ✅ / 頓服の時刻 `✎` をタップ → 時刻修正モーダル（「未服用にする」ボタンあり）
- 一時停止中の薬：✅ のある日のみ薄く表示。❌は表示しない

---

## 主要関数一覧

| 関数名 | 役割 |
|--------|------|
| `getData()` | localStorageから medicines と logs を取得 |
| `saveMedicines(medicines)` | medicines を保存 |
| `saveLogs(logs)` | logs を保存 |
| `todayKey()` | `"YYYY-MM-DD"` 形式の今日の日付文字列を返す |
| `medType(m)` | medicine の type を返す（未定義時は `"regular"`） |
| `renderToday()` | 今日タブを再描画 |
| `renderHistory()` | 履歴タブを `_historyYM` の月で再描画 |
| `renderMedicineList()` | 登録済み薬一覧を再描画 |
| `toggleTaken(medId, timing)` | 定期服用のチェックON/OFF |
| `addPrnDose(medId)` | 頓服の服用記録を追加 |
| `removePrnDose(medId, isoStr)` | 頓服の服用記録を削除 |
| `toggleMedicinePause(id)` | 薬の一時停止 / 再開 |
| `openTimeEdit(medId, timing, isoStr, dateKey)` | 時刻修正モーダルを開く（今日・履歴共通） |
| `openHistoryMissedEdit(dateKey, medId, timing, medName)` | 未服用の後付け記録モーダルを開く |
| `openPrnTimeEdit(medId, isoStr)` | 頓服の時刻修正モーダルを開く |
| `unmarkFromModal()` | モーダルから服用記録を取り消す |
| `changeHistoryMonth(delta)` | 履歴の表示月を前後に移動（-1 or +1） |
| `exportData()` | medlog_backup.json をダウンロード |
| `importData(event)` | JSONファイルをインポートして復元 |

---

## 主要な状態変数

| 変数名 | 説明 |
|--------|------|
| `_historyYM` | 履歴タブで現在表示中の年月 `{ year, month }`（month は0始まり） |
| `_timeEditContext` | 時刻修正モーダルの編集対象 `{ type, medId, timing?, oldIso, dateKey, isNew? }` |

---

## 設計上の判断・経緯

### 薬の登録日（registeredAt）
登録時に `registeredAt: "YYYY-MM-DD"` を自動付与。履歴ではこの日より前の日付を表示しない。
既存データ（`registeredAt` なし）は後方互換として全日付を表示する。

### 一時停止の仕組み
停止日は記録しない。「停止中の薬はログがある日（✅のある日）のみ履歴表示する」ルールで対応。
停止後に誤って記録してしまうケースは、停止中の薬が「今日」タブに出ないため実質起きない。

### 履歴の月切り替え
以前は直近30日表示だったが、長期運用でDOMが肥大化するため月単位切り替えに変更。
現在月より未来には進めないよう「▶」ボタンを無効化している。

### 時刻の保存形式
ISO 8601形式（`"2026-03-15T08:32:00.000Z"`）で保存。表示時に `formatTime()` でローカル時刻の `HH:MM` に変換。
Firebase Realtime Database に移行する際もこの形式のまま使用可能。

### 頓服ログの構造
定期服用と別キー `prn` で配列管理。`logs[dateKey][medId].prn = [ISO文字列, ...]`
同日に何回でも記録でき、各タイムスタンプが一意のキーになる。

---

## 将来の改善候補

- [ ] **Firebase Realtime Database 移行**（複数端末リアルタイム同期）
- [ ] **履歴のカレンダー表示**（月全体の達成状況を一目で確認）
- [ ] **薬の登録日フィールド**（履歴に登録前の❌が出ないようにする）
- [ ] **服用開始日・終了日の設定**（処方期間の管理）

---

## バックアップ・復元の仕様

- バックアップ：`medlog_backup.json` として保存。内容は `{ medicines: [...], logs: {...} }` のJSON
- 復元：JSONファイルを選択するとlocalStorageを上書き（確認ダイアログあり）
- Googleドライブに保存しておくことで、Mac↔スマホの擬似同期が可能
- この構造はFirebase Realtime Databaseと互換性があり、将来の移行が容易
