// 📄 auto-extract.js
import fs from 'fs';
import path from 'path';
import getPixels from 'get-pixels';

const publicDir = path.join(process.cwd(), 'public');

// 📄 auto-extract.js (修改第 8-14 行)

// 1. 尋找 public 資料夾內所有包含 level 和 .png 的檔案
const files = fs.readdirSync(publicDir)
    .filter(file => file.toLowerCase().startsWith('level') && file.toLowerCase().includes('.png'))
    .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)) || 0;
        const numB = parseInt(b.match(/\d+/)) || 0;
        return numA - numB;
    });


if (files.length === 0) {
    console.log("❌ 在 public 資料夾中找不到任何 level*.png 檔案！");
    process.exit(1);
}

console.log(`=== 🎨 全自動多關卡色彩提取引擎 ===`);
console.log(`偵測到關卡檔案: ${files.join(', ')}\n`);

const finalConfigs = {};

// 2. 核心遞迴函式：依序解析每一張圖片的像素
function processImage(index) {
    if (index >= files.length) {
        // 當所有圖片都讀取完畢，華麗地印出最終成果
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("👑 提取成功！請直接複製下方整段程式碼，貼入 useGameController.js 頂部：");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        console.log(`const LEVEL_CONFIGS = ${JSON.stringify(finalConfigs, null, 4)};`);
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return;
    }

    const filename = files[index];
    const filepath = path.join(publicDir, filename);
    const levelNum = parseInt(filename.match(/\d+/)[0]);

    getPixels(filepath, (err, pixels) => {
        if (err) {
            console.error(`❌ 讀取 ${filename} 失敗:`, err);
            processImage(index + 1);
            return;
        }

        const width = pixels.shape[0];
        const height = pixels.shape[1];
        const colorSet = new Set();

        // 走訪該張圖片的所有像素點
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const r = pixels.get(x, y, 0);
                const g = pixels.get(x, y, 1);
                const b = pixels.get(x, y, 2);
                const a = pixels.get(x, y, 3);

                // 💡 只有當透明度大於 128（非背景）時，才精確抓取顏色 Hex 碼
                if (a >= 128) {
                    const hex = "#" + [r, g, b].map(val => {
                        const h = val.toString(16);
                        return h.length === 1 ? '0' + h : h;
                    }).join('').toUpperCase();
                    colorSet.add(hex);
                }
            }
        }

        // 將這關抓到的精確顏色陣列存入設定物件中
        finalConfigs[levelNum] = {
            path: `/${filename}`,
            colors: Array.from(colorSet)
        };

        console.log(`✅ 已成功解析 Level ${levelNum} (${filename}) -> 偵測到 ${colorSet.size} 種不透明顏色。`);
        
        // 繼續處理下一張圖
        processImage(index + 1);
    });
}

// 啟動提取引擎
processImage(0);
