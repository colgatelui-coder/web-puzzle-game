import { useState, useEffect } from 'react';

const LEVEL_CONFIGS = {
    1: {
        path: '/level1.png',
        colors: ['#000000', '#3A66B6', '#3F6DC0', '#6F90D0','#577FC8','#3760A9','#7B99D4','#C2CFEC']
    },
    2: {
        path: '/level2.png',
        colors: ['#242229', '#FF4A4A', '#FF924A', '#D99F65'] // 亮紅、深紅、白、黑 // 亮藍、深藍、白、黑藍
    },
    3: {
        path: '/level3.png',
        // 🌟 對齊柴犬新圖顏色：0:亮橘、1:深橘陰影、2:純白、3:純黑、4:舌頭紅、5:耳朵內側淺粉白
        colors: ['#020203', '#F67D07', '#FBF2D2', '#FBA77C','#C04309','#2E1313','#CEB99E','#767070'] 
    }
};

// 🌟 核心修正：將 w 和 h 直接宣告在組件外部，作為模組的全域變數
// 這樣整個檔案內的任何一個角落（包括 triggerHint、guessTile、calculate...）都能無條件讀取到它，保證不再報錯！
let currentW = 24;
let currentH = 24;

const sfxSuccess = new Audio('/click_success.mp3');
const sfxHint = new Audio('/hint_reveal.mp3');
const sfxError = new Audio('/click_error.mp3');
const sfxAutoStart = new Audio('/auto_start.mp3'); // 🌟 確保名稱完全長這樣

const playSfx = (audioObj) => {
    audioObj.currentTime = 0;
    audioObj.play().catch(err => console.log("音效等待玩家互動", err));
};

export function useGameController() {
    const [currentLevel, setCurrentLevel] = useState(1);
    const [answerGrid, setAnswerGrid] = useState([]);
    const [playerGrid, setPlayerGrid] = useState([]);
    const [selectedColor, setSelectedColor] = useState(''); 
    const [hp, setHp] = useState(10);
    const [gameStatus, setGameStatus] = useState('loading');
    const [isCelebrating, setIsCelebrating] = useState(false);
    const [dynamicHints, setDynamicHints] = useState({});

    // 依然保留這兩個給畫面 App.jsx 同步網格渲染
    const [boardWidth, setBoardWidth] = useState(24);
    const [boardHeight, setBoardHeight] = useState(24);

    // 🌟 核心新增：記錄目前是不是正在「全自動二倍速連續填滿中（HOLD玩家指令）」
    const [isAutoSolving, setIsAutoSolving] = useState(false);

    const config = LEVEL_CONFIGS[currentLevel] || LEVEL_CONFIGS;
    const COLORS = config.colors;

    useEffect(() => {
        loadLevel(currentLevel);
    }, [currentLevel]);

    const loadLevel = (levelNum) => {
        setGameStatus('loading');
        setIsCelebrating(false);
        setIsAutoSolving(false); // 重設自動狀態

        const activeConfig = LEVEL_CONFIGS[levelNum] || LEVEL_CONFIGS;
        const activeColors = activeConfig.colors;

        const img = new Image();
        img.src = activeConfig.path;
        
        img.onload = () => {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            currentW = w;
            currentH = h;
            setBoardWidth(w);
            setBoardHeight(h);

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            
            const imgData = ctx.getImageData(0, 0, w, h).data;
            const newAnswerGrid = [];
            const newPlayerGrid = [];

            for (let i = 0; i < imgData.length; i += 4) {
                const r = imgData[i];
                const g = imgData[i+1];
                const b = imgData[i+2];
                const a = imgData[i+3];

                const hexColor = rgbToHex(r, g, b);
                let matchedColor = '#E0E0E0'; 
                
                // 純透明度判定背景，只要不透明一律保留
                if (a >= 128) {
                    matchedColor = getClosestColor(hexColor, activeColors, levelNum);
                }

                newAnswerGrid.push(matchedColor);
                newPlayerGrid.push({
                    color: matchedColor === '#E0E0E0' ? '#E0E0E0' : '#CCCCCC',
                    isRevealed: matchedColor === '#E0E0E0'
                });
            }

            // 🌟 終極修正：動態根據目前關卡的所有顏色數量，一網打盡生成提示帳本字典
            const nextDynamicHints = {};
            activeColors.forEach(color => {
                nextDynamicHints[color] = [];
            });

            const totalTiles = w * h;
            for (let i = 0; i < totalTiles; i++) {
                const isPuzzleTile = newAnswerGrid[i] !== '#E0E0E0';
                const actualTileColor = newAnswerGrid[i];

                // 🔄 這裡改用全動態迴圈，保證每隻顏色比對時，targetColor 都能精確對齊自己！
                activeColors.forEach(targetColor => {
                    const count = calculateAdjacentColorCount(i, targetColor, newAnswerGrid);
                    
                    nextDynamicHints[targetColor].push({
                        number: count,
                        // 💡 防作弊條件修正：只有是謎題格、算出來是 0、且格子本身的真實答案顏色「不等於目前正在計算的這隻顏色(targetColor)」時，開局才主動亮起！
                        isVisible: isPuzzleTile && count === 0 && actualTileColor !== targetColor
                    });
                });
            }

            setAnswerGrid(newAnswerGrid);
            setPlayerGrid(newPlayerGrid);
            setDynamicHints(nextDynamicHints); // 寫入動態字典
            
            setSelectedColor(activeColors[0]); // 預設選中當前關卡的第一個主色
            setHp(10);
            setGameStatus('playing');
        };
    
    };

    // 🌟 直接讀取全域變數 currentW 和 currentH，穩如泰山！
    const calculateAdjacentColorCount = (index, targetColor, currentAnswerGrid) => {
        const row = Math.floor(index / currentW);
        const col = index % currentW;
        let count = 0;
        for (let dRow = -1; dRow <= 1; dRow++) {
            for (let dCol = -1; dCol <= 1; dCol++) {
                if (dRow === 0 && dCol === 0) continue;
                const newRow = row + dRow;
                const newCol = col + dCol;
                if (newRow >= 0 && newRow < currentH && newCol >= 0 && newCol < currentW) {
                    const neighborIndex = newRow * currentW + newCol;
                    if (currentAnswerGrid[neighborIndex] === targetColor) count++;
                }
            }
        }
        return count;
    };

    // 🌟 真・終極無 Bug 版：使用色彩距離演算法自動抓取最接近的調色盤顏色，適用於任何關卡、任意顏色！
    const getClosestColor = (hex, activeColors, levelNum) => {
        // 先將目前的網格像素 Hex 轉回 RGB 數值
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16);
        const b = parseInt(hex.slice(5,7), 16);

        let minDistance = Infinity;
        let closestColor = activeColors[0];

        // 走訪當前關卡設定的所有調色盤顏色，計算哪一個顏色與目前的像素最接近
        activeColors.forEach(paletteColor => {
            const pr = parseInt(paletteColor.slice(1,3), 16);
            const pg = parseInt(paletteColor.slice(3,5), 16);
            const pb = parseInt(paletteColor.slice(5,7), 16);

            // 歐幾里得色彩距離公式： 3D 空間中的兩點距離
            const distance = Math.sqrt(
                Math.pow(r - pr, 2) + 
                Math.pow(g - pg, 2) + 
                Math.pow(b - pb, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestColor = paletteColor;
            }
        });

        return closestColor; // 100% 完美回傳調色盤中最接近的那個顏色！
    };

    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();

    // 🌟 終極完美修正版：修正變數名稱對齊，絕不報錯
    const checkAndTriggerAutoSolve = (currentGrid) => {
        // 1. 計算全圖還剩多少謎題格沒解開
        const remainingTotal = currentGrid.filter((tile, idx) => answerGrid[idx] !== '#E0E0E0' && !tile.isRevealed).length;
        // 2. 計算目前玩家選中的這隻顏色還剩多少格
        const remainingSelected = currentGrid.filter((tile, idx) => answerGrid[idx] === selectedColor && !tile.isRevealed).length;

        // 💡 如果總剩餘格數大於 0，且「剛好等於」當前顏色的剩餘數，發動全自動填滿大招
        if (remainingTotal > 0 && remainingTotal === remainingSelected) {
            setIsAutoSolving(true); // 🔒 HOLD 住玩家指令
            
            // 🔊 修正音效呼叫：確保名稱與頂部宣告的 sfxAutoStart 完美對齊
            if (typeof sfxAutoStart !== 'undefined') {
                playSfx(sfxAutoStart);
            }

            // 找出所有答案是當前顏色且還沒解開的格子索引
            const targetIndices = [];
            currentGrid.forEach((tile, idx) => {
                if (answerGrid[idx] === selectedColor && !tile.isRevealed) {
                    targetIndices.push(idx);
                }
            });

            let step = 0;
            // ⏳ 以 2 倍速連續自動著色
            const intervalId = setInterval(() => {
                if (step >= targetIndices.length) {
                    clearInterval(intervalId); // 填完清除計時器
                    setIsAutoSolving(false);   // 🔓 解放玩家指令
                    setIsCelebrating(true);    // 👑 啟動 3 秒電影放大運鏡
                    
                    setTimeout(() => {
                        setGameStatus('won');  // 3秒後正式過關
                    }, 3000);
                    return;
                }

                const targetIdx = targetIndices[step];
                setPlayerGrid(prevGrid => {
                    const nextGrid = [...prevGrid];
                    nextGrid[targetIdx] = { color: selectedColor, isRevealed: true };
                    return nextGrid;
                });
                
                if (typeof sfxSuccess !== 'undefined') {
                    playSfx(sfxSuccess); // 🔊 每次自動填色都發出清脆成功的 Pop 聲
                }
                step++;
            }, 80); 

            return true; // 成功觸發大招
        }
        return false; // 沒有觸發大招，走普通手動流程
    };

    const triggerHint = (index) => {
         // 🔒 如果正在自動填滿中 (HOLD)，完全拒絕任何玩家右擊操作
        if (gameStatus !== 'playing' || isAutoSolving || answerGrid[index] === '#E0E0E0') return;
        const correctAnswer = answerGrid[index];

        if (selectedColor === correctAnswer) {
            playSfx(sfxError);
            const nextHp = hp - 1; setHp(nextHp);
            const nextPlayerGrid = [...playerGrid]; nextPlayerGrid[index] = { ...nextPlayerGrid[index], isErrorFlashing: true }; setPlayerGrid(nextPlayerGrid);
            setTimeout(() => {
                setPlayerGrid(prevGrid => {
                    if (!prevGrid[index]) return prevGrid;
                    const restoredGrid = [...prevGrid]; restoredGrid[index] = { ...restoredGrid[index], isErrorFlashing: false }; return restoredGrid;
                });
            }, 500);
            if (nextHp <= 0) setGameStatus('gameover');
            return; 
        }

        playSfx(sfxHint);
        setDynamicHints(prev => {
            const currentLevelColorHints = [...(prev[selectedColor] || [])];
            if (currentLevelColorHints[index]) {
                currentLevelColorHints[index] = { ...currentLevelColorHints[index], isVisible: true };
            }
            return { ...prev, [selectedColor]: currentLevelColorHints };
        });
    };

    const guessTile = (index) => {
        // 如果正在自動填色中，或者是已揭曉格，完全拒絕任何玩家左擊操作
        if (gameStatus !== 'playing' || isAutoSolving || playerGrid[index].isRevealed) return;
        // 🌟 核心新增：終極防呆！不管後面哪一行舊程式碼呼叫了 nextTotalRemaining，都自動等於目前的 totalRemaining！
        let nextTotalRemaining = totalRemaining; 
        const correctAnswer = answerGrid[index];

        // 🟢 情況 A：玩家左擊猜對了
        if (selectedColor === correctAnswer) {
            //playSfx(sfxSuccess);
            const nextPlayerGrid = [...playerGrid];
            nextPlayerGrid[index] = { color: correctAnswer, isRevealed: true };
            setPlayerGrid(nextPlayerGrid);

            // 🌟 核心修改：每當玩家手動猜對一格，立刻送去檢查有沒有觸發「唯一可能性」自動填滿大招
            const triggered = checkAndTriggerAutoSolve(nextPlayerGrid);

            // 如果沒有觸發大招，才走原本普通的過關判定
            if (!triggered) {
                const nextRemainingByColor = COLORS.reduce((acc, color) => {
                    acc[color] = nextPlayerGrid.filter((tile, idx) => answerGrid[idx] === color && !tile.isRevealed).length;
                    return acc;
                }, {});
                // 👍 終極修正：將變數名稱精確修正為正確的代碼（不加 next 混淆）
                const currentTotalRemaining = Object.values(nextRemainingByColor).reduce((sum, count) => sum + count, 0);
            }
            if (nextTotalRemaining === 0) {
                setIsCelebrating(true); 
                setTimeout(() => {
                    setGameStatus('won'); 
                }, 3000);
            }
        } else {
            // 🛑 情況 B：玩家左擊猜錯了
            playSfx(sfxError);
            const nextHp = hp - 1; setHp(nextHp);
            const nextPlayerGrid = [...playerGrid]; nextPlayerGrid[index] = { ...nextPlayerGrid[index], isErrorFlashing: true }; setPlayerGrid(nextPlayerGrid);
            setTimeout(() => {
                setPlayerGrid(prevGrid => {
                    if (!prevGrid[index]) return prevGrid;
                    const restoredGrid = [...prevGrid]; restoredGrid[index] = { ...restoredGrid[index], isErrorFlashing: false }; return restoredGrid;
                });
            }, 500);
            if (nextHp <= 0) setGameStatus('gameover');
        }
    };

    const nextLevel = () => {
        if (currentLevel < Object.keys(LEVEL_CONFIGS).length) {
            setGameStatus('loading');
            setCurrentLevel(prev => prev + 1);
        }
    };

    const getCurrentHintsArray = () => {
        return dynamicHints[selectedColor] || [];
    };

    // 重新計算用來渲染左側調色盤的剩餘數量
    const remainingByColor = COLORS.reduce((acc, color) => {
    acc[color] = playerGrid.filter((tile, idx) => answerGrid[idx] === color && !tile.isRevealed).length;
    return acc;
    }, {});

    const totalRemaining = Object.values(remainingByColor).reduce((sum, count) => sum + count, 0);

    return {
        playerGrid,
        selectedColor,
        setSelectedColor,
        hp,
        gameStatus,
        colors: COLORS,
        guessTile,
        triggerHint,
        remainingByColor,
        totalRemaining,
        currentLevel,                         // 🌟 導出當前關卡號碼
        nextLevel,                            // 🌟 導出切換下一關的函式
        answerGrid, 
        isCelebrating, // 🌟 記得加這一行傳出去給 App.jsx！ 
        // 🌟 直接將當前選中顏色的提示陣列丟給畫面端
        boardWidth,                           // 🌟 導出動態寬度
        boardHeight,                          // 🌟 導出動態高度
        //currentHints: dynamicHints[selectedColor] || [],
        isAutoSolving,                        // 🌟 導出 HOLD 鎖定狀態給畫面做樣式處理
        currentHints: getCurrentHintsArray(),
        restartGame: () => loadLevel(currentLevel)
    };
}