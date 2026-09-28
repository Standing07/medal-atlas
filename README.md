# 運動賽事獎牌地圖 Medal Atlas

奧運（1896 起全部）、亞運、泛美運動會、大英國協運動會、世大運、歐洲運動會、非洲運動會的歷屆獎牌榜，
看各國體育實力的起落；進行中的賽事可即時比較「上屆同進度」成績。

研究與規劃見 [規劃.md](規劃.md)。

## 本機執行

```bash
npm install
npm run dev
```

## 更新資料

```bash
npm run data:fetch     # 下載各屆維基獎牌表（已下載的跳過；--force 全部重抓）
npm run data:pace      # 重建進行中賽事與上屆的每日累計
npm run data           # 產生 public/data/medals.json（含驗證關卡）
npm run data:verify    # 第二來源查核（Olympedia＋維基變動偵測，約 12 分鐘）
```

## 資料來源與授權

- 獎牌數據：英文維基百科各屆 medal table 頁（CC BY-SA 4.0），每屆記錄取用的版本編號。
- 奧運第二來源：Olympedia（https://www.olympedia.org）。
- 更正：`scripts/corrections.mjs`，每筆附官方來源。
