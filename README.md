# Cowell Design Department - 工作日報系統

設計部工作日報線上管理系統，前端使用 GitHub Pages 託管，後端使用 Google Sheets + Apps Script 作為雲端資料庫。

## 線上網址

GitHub Pages 啟用後可從以下網址存取：

- 首頁：`https://<GITHUB_USERNAME>.github.io/cowell-design-workday/`
- Jimmy：`https://<GITHUB_USERNAME>.github.io/cowell-design-workday/Jimmy.html`
- Joey：`https://<GITHUB_USERNAME>.github.io/cowell-design-workday/Joey.html`
- Cat：`https://<GITHUB_USERNAME>.github.io/cowell-design-workday/Cat.html`
- 阿柯：`https://<GITHUB_USERNAME>.github.io/cowell-design-workday/阿柯.html`

## 架構

```
┌─────────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│ GitHub Pages        │ fetch   │ Apps Script      │ R/W     │ Google Sheets    │
│ (Jimmy.html 等)     │ ──────► │ Web App (/exec)  │ ──────► │ 「工作日報」     │
│ localStorage 草稿快取│         │ doGet/doPost     │         │ 表單             │
└─────────────────────┘         └──────────────────┘         └──────────────────┘
```

## 部署步驟

### 1. 部署後端 Apps Script

**請用 `cowell.design.department@gmail.com` 登入 Google：**

1. 開 [https://sheets.new](https://sheets.new) 建立新試算表，命名為「設計部工作日報」
2. 擴充功能 → Apps Script
3. 把 `工作日報-AppsScript.gs` 的內容貼進編輯區並儲存
4. 點「部署」→「新增部署作業」
5. 設定：
   - 類型：**網頁應用程式**
   - 執行身分：**我**（cowell.design.department@gmail.com）
   - 存取權：**知道連結的任何人**
6. 部署並完成授權（首次出現未驗證警告時，點「進階」→「前往未驗證的應用程式」）
7. 複製產生的 **網路應用程式 URL**（`/exec` 結尾）

修改 `.gs` 後需要「管理部署作業 → 鉛筆圖示 → 版本選『新版本』→ 部署」才會生效。

### 2. 部署前端 GitHub Pages

到 repo 頁面 **Settings → Pages**：

1. Source：**Deploy from a branch**
2. Branch：**main** / **root**
3. Save，等待 1-2 分鐘
4. 頁面上方會顯示公開 URL

### 3. 設計師首次使用

1. 設計師開啟自己的頁面（例如 `https://<username>.github.io/cowell-design-workday/Jimmy.html`）
2. 頁面自動彈出「設定雲端」對話框
3. 貼上 Step 1 拿到的 Apps Script URL
4. 儲存並連線（URL 會記在瀏覽器 localStorage，之後免再設定）

## 使用說明

- **新增列**：在 6 大分類（會議／前台客服／網站建置／專案／內部協助／待處理項目）下點「+ 新增列」
- **暫存**：草稿存入 Sheet，狀態為 `draft`，仍可繼續編輯
- **送出（鎖定）**：狀態變為 `submitted`，伺服器端拒絕任何後續修改
- **歷史日報**：自動顯示在下方，由新至舊摺疊
- **自動暫存**：編輯時每 1.2 秒自動暫存一次；斷網時 localStorage 仍會保留草稿

## 資料表結構

Google Sheet「工作日報」共 18 欄：

| 欄位 | 說明 |
|---|---|
| `date` | 日期 (YYYY-MM-DD) |
| `author` | 設計師（Jimmy / Joey / Cat / 阿柯） |
| `status` | `draft` 或 `submitted` |
| `rowOrder` | 同張日報內的列順序 |
| `category` | 分類 |
| `case` / `type` | 案件 / 性質 |
| `assigned` / `dueDate` / `startDate` / `doneDate` | 4 個日期 |
| `estHours` / `todayHours` | 工時 |
| `plugin` / `progress` / `note` | 插件 / 進度 / 說明 |
| `submittedAt` / `updatedAt` | 時間戳 |

## 解鎖已送出的日報

「送出」後鎖定無法在前端修改。需修改時：直接到 Google Sheet 把該列的 `status` 從 `submitted` 改回 `draft`，前端「重新讀取」即可繼續編輯。

## 檔案清單

```
index.html                  - GitHub Pages 首頁（導覽）
Jimmy.html / Joey.html / Cat.html / 阿柯.html
                            - 各設計師的日報頁
Design_Department.html      - 案件安排
Workday.html                - 工作日報空白範本
reward.html                 - 獎金
other.html                  - 其他
Static_Pages.html           - 靜態頁
工作日報-AppsScript.gs       - 後端程式（部署到 Google Apps Script）
```
