# Repository Guidelines

## Project Structure & Module Organization

- `src/index.ts`：MCP 伺服器進入點，統一匯出命令與 UI 元件。
- `src/commands/`：封裝 CLI 動作與工具互動流程；新增指令時請在此模組化。
- `src/components/`, `src/ui/`：使用 Ink/React 建構的終端互動介面元件。
- `src/tool-definitions/` 與 `src/utils/`：工具註冊與共用邏輯；共用常數位於 `src/constants.ts`。
- `docs/assets/`：示範 GIF 與文件素材；`dist/` 為 `pnpm build` 產生的輸出，請勿手動編輯。

## Build, Test, and Development Commands

- `pnpm install`：安裝開發依賴（專案偏好 pnpm，避免混用 npm/yarn）。
- `pnpm build`：以 `tsc` 與 `tsc-alias` 編譯 TypeScript 至 `dist/`，提交前務必確保成功。
- `pnpm start`：從已建置的 `dist/index.js` 啟動伺服器，用於手動驗證互動流程。
- `pnpm lint` 與 `pnpm format`：使用 ESLint 與 Prettier 驗證／修正程式風格；CI 會執行相同規則。
- `pnpm check-types`：執行無輸出的型別檢查，適合作為 PR 前的最後一道守門。

## Coding Style & Naming Conventions

- 採 TypeScript ESM 模組與 Prettier 預設 2 空格縮排；請保持單一語句匯入排序並善用類型別名。
- 檔名以-kebab-case 或 camelCase 命名，React/Ink 元件採 PascalCase。
- 共同邏輯集中於 `src/utils`，避免重複程式碼；常數使用全大寫蛇形命名。
- 提交前執行 `pnpm lint`，並確保 lint-staged 自動修正結果已被 `git add`。

## Testing Guidelines

- 目前尚未引入自動化測試套件；請在本機執行 `pnpm build` 與 `pnpm start` 手動演練主要互動情境。
- 新增功能時建議放置於 `src/__tests__/` 或模組鄰近目錄，檔名遵循 `*.spec.ts`。
- 撰寫測試時優先模擬 MCP 工具輸入輸出與 Ink UI 呈現，確保問題可重製。
- 若引入新測試依賴，請在 PR 說明中附上執行指令與預期輸出摘要。

## Commit & Pull Request Guidelines

- Git 歷史採用 Conventional Commits，例如 `feat(commands): ...`、`fix(ui): ...`；非語意版本相關修改使用 `chore:` 或 `docs:`。
- 一個 commit 聚焦單一職責，避免同時修改程式與格式。
- PR 描述需包含：目的摘要、主要變更點、驗證步驟（含指令與截圖／錄影如適用）、相關 Issue 連結。
- 請確認分支已與 `main` 同步，並在 PR 中勾選所有檢查項（格式、建置、測試）後再送審。

## Agent Collaboration Tips

- 在本地代理環境中新增互動時，請使用 `request_user_input` 先取得明確指示，再觸發實際命令。
- UI 調整務必在 `src/components` 中保持元件純粹，將副作用封裝在指令層，以利日後自動化測試。
