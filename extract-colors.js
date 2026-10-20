// 📄 extract-colors.js
// 這是專門用來提取像素圖片中所有不透明顏色 Hex 碼的小工具

import fs from 'fs';
import path from 'path';

// 💡 只需要在這裡更換你想查詢的圖片檔名（請確保圖片已放入 public 資料夾）
const TARGET_IMAGE = 'level3.png'; 

const imagePath = path.join(process.cwd(), 'public', TARGET_IMAGE);

console.log(`=== 🧱 像素地圖顏色 Hex 提取器 ===`);
console.log(`正在讀取檔案: ${imagePath}`);

// 透過瀏覽器底層或隱藏的 Canvas 讀取像素
// 為了讓你在 Node.js 終端機就能直接執行，我們用最簡單的 HTML5 Canvas 模擬方式
// 請直接在你的 React 網頁「控制台 (Console)」裡跑下面這段程式碼，最直覺、免安裝任何套件！

const webExtractSnippet = `
============================================================
【網頁快捷提取教學】
為了免去安裝複雜的 Node.js 圖片解析套件，請直接跟著以下步驟操作：
1. 啟動你的遊戲網頁 (npm run dev)，並在瀏覽器按下 F12 開啟主控台 (Console)。
2. 把下方這段程式碼複製，直接貼進瀏覽器的 Console 欄位並按下 Enter。
3. 它會瞬間精確列出該圖片中所有不透明的 Hex 顏色！
============================================================

(function() {
    const img = new Image();
    img.src = '/${TARGET_IMAGE}'; // 自動讀取 public 下的圖
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height).data;
        
        const colorSet = new Set();
        for (let i = 0; i < imgData.length; i += 4) {
            const r = imgData[i];
            const g = imgData[i+1];
            const b = imgData[i+2];
            const a = imgData[i+3];
            
            // 💡 只有當透明度不低於 128（非背景）時，才抓取顏色
            if (a >= 128) {
                const hex = "#" + [r, g, b].map(x => {
                    const h = x.toString(16);
                    return h.length === 1 ? '0' + h : h;
                }).join('').toUpperCase();
                colorSet.add(hex);
            }
        }
        console.log("🎨 偵測到該圖片中所有不透明的顏色清單如下：");
        console.log(Array.from(colorSet));
        console.log("總共有 " + colorSet.size + " 種顏色。");
    };
})();
`;

console.log(webExtractSnippet);
