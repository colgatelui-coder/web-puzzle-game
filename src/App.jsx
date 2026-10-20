import React, { useState, useEffect } from 'react';
import { useGameController } from './hooks/useGameController';
import './App.css';

function App() {
  const {
    playerGrid,
    selectedColor,
    setSelectedColor,
    hp,
    gameStatus,
    colors,
    guessTile,
    triggerHint,
    remainingByColor,
    totalRemaining,
    currentLevel, 
    nextLevel,    
    currentHints,
    answerGrid,
    isCelebrating,
    boardWidth,   
    boardHeight,  
    isAutoSolving,
    restartGame
  } = useGameController();

  // 🌟 核心新增：控制教學彈窗顯示的狀態，預設為 false (不顯示)
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div className="game-wrapper">
      
      <header className="game-header">
        <div className="header-top-row">
          <h1>像素色彩解謎遊戲 🧠 (第 {currentLevel} 關)</h1>
          
          {/* 🌟 核心新增：教學按鈕 */}
          <button className="tutorial-toggle-btn" onClick={() => setShowTutorial(true)}>
            💡 遊戲教學
          </button>
        </div>

        <div className="status-bar">
          <div className="hp-display">
            生命值 (HP): {Array.from({ length: Math.max(0, hp) }).map((_, i) => (
              <span key={i} className="heart-icon">❤️</span>
            ))}
            {hp <= 0 && <span>💀</span>}
          </div>
          <div className="status-text">
            {gameStatus === 'loading' && '載入地圖中...'}
            {gameStatus === 'playing' && `總共還剩: ${totalRemaining} 格 | 右擊格子探測當前顏色`}
            {gameStatus === 'won' && '🎉 恭喜通關！'}
            {gameStatus === 'gameover' && '❌ 遊戲結束'}
          </div>
        </div>
      </header>

      <main className="game-main">
        <section className="palette-section">
          <h3>選擇顏色與剩餘格數：</h3>
          <div className="color-palette-list">
            {colors.map((color, index) => (
              <div 
                key={index} 
                className={`palette-item ${selectedColor === color ? 'active-item' : ''}`} 
                onClick={() => setSelectedColor(color)}
              >
                <button className="palette-color" style={{ backgroundColor: color }} disabled={gameStatus !== 'playing'} />
                <span className="color-count">剩餘：<strong>{remainingByColor[color] || 0}</strong> 格</span>
              </div>
            ))}
          </div>
          <button className="restart-btn" onClick={restartGame}>重新開始</button>
        </section>

        <section className="board-section">
          <div className="tile-map-container">
            <div 
              className={`tile-map ${isCelebrating ? 'celebrate-zoom' : ''}`}
              style={{
                gridTemplateColumns: `repeat(${boardWidth}, 18px)`,
                gridTemplateRows: `repeat(${boardHeight}, 18px)`,
                backgroundImage: `url('/map_bg${((currentLevel - 1) % 3) + 1}.png')`, 
                backgroundSize: 'cover',         
                backgroundPosition: 'center',    
                backgroundColor: '#222'          
              }}
            >
              {playerGrid.map((tile, index) => {
                const isWon = gameStatus === 'won';
                const showFullImage = isWon || isCelebrating;

                let displayColor = '#CCCCCC'; 
                if (answerGrid[index] === '#E0E0E0') {
                  displayColor = 'transparent';   
                } else if (showFullImage) {
                  displayColor = answerGrid[index]; 
                } else if (tile.isRevealed && tile.color === selectedColor) {
                  displayColor = tile.color;      
                }

                const hintData = currentHints && currentHints[index];
                const isHintVisible = !showFullImage && hintData && hintData.isVisible;
                const hintNumber = (isHintVisible && displayColor === '#CCCCCC') ? hintData.number : null;

                return (
                  <div
                    key={index}
                    className={`tile-slot ${showFullImage ? 'revealed won-complete' : (displayColor !== '#CCCCCC' ? 'revealed' : 'hidden')} ${displayColor === '#CCCCCC' && isHintVisible ? 'has-hint' : ''} ${tile.isErrorFlashing ? 'error-flash' : ''}`}
                    style={{ backgroundColor: displayColor }}
                    onClick={() => guessTile(index)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      triggerHint(index);
                    }}
                  >
                    {tile.isErrorFlashing && <span className="error-x-mark">❌</span>}

                    {!tile.isErrorFlashing && hintNumber !== null && (
                      <span 
                        className="hint-number"
                        style={{ color: selectedColor === '#FFFFFF' ? '#FFFF00' : selectedColor }} 
                      >
                        {hintNumber}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {gameStatus === 'won' && (
              <div className="overlay win-overlay">
                <h2>👑 完美解鎖！</h2>
                <p>你成功利用邏輯破解了第 {currentLevel} 關！</p>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button onClick={restartGame}>再玩一次</button>
                  {currentLevel < 3 ? <button style={{ backgroundColor: '#ffbe0b', color: '#000', fontWeight: 'bold' }} onClick={nextLevel}>進入下一關 ➡️</button> : <button style={{ backgroundColor: '#00ffcc', color: '#000', fontSize: '18px', fontWeight: 'bold' }} onClick={() => alert("🎉 完美全通關！")}>🏆 完美全通關！</button>}
                </div>
              </div>
            )}
            {gameStatus === 'gameover' && <div className="overlay lose-overlay"><h2>💀 挑戰失敗</h2><p>生命值歸零了，再試一次吧！</p><button onClick={restartGame}>重新挑戰</button></div>}
          </div>
        </section>
      </main>

      {/* 🌟 核心新增：教學說明的彈窗視窗 */}
      {showTutorial && (
        <div className="tutorial-modal-overlay">
          <div className="tutorial-modal-card">
            <button className="modal-close-corner-btn" onClick={() => setShowTutorial(false)}>❌</button>
            
            <h2>📄 遊戲玩法教學說明</h2>
            <hr />
            
            <div className="tutorial-content-body">
              <div className="tutorial-step-item">
                <h3>🖱️ 滑鼠左擊（左鍵）：大膽填色</h3>
                <p>先在左側選取你想猜的顏色，然後在灰色格子上按<strong>滑鼠左鍵</strong>。</p>
                <ul>
                  <li>若該格答案<strong>等於</strong>目前選色：格子會成功亮起該色彩！</li>
                  <li>若該格答案<strong>不等於</strong>目前選色：格子會瘋狂抖動、彈出 ❌ 判定錯誤，並<strong>扣減玩家 1 HP</strong>！</li>
                </ul>
              </div>

              <div className="tutorial-step-item">
                <h3>🖱️ 滑鼠右擊（右鍵）：雷達探測</h3>
                <p>在灰色格子上按<strong>滑鼠右鍵</strong>，可以發動當前顏色的安全線索探測。</p>
                <ul>
                  <li>若該格答案<strong>剛好是</strong>目前選色：視為探測失誤，觸發 ❌ 特效並<strong>扣減玩家 1 HP</strong>！</li>
                  <li>若該格答案<strong>不是</strong>目前選色：格子會安全亮起該顏色的<strong>提示數字</strong>。</li>
                </ul>
              </div>

              <div className="tutorial-step-item">
                <h3>🔢 核心數字提示：什麼意思？</h3>
                <p>格子上浮現的彩色數字，代表<strong>「這一格周圍鄰近的 8 個格子中，隱藏了多少個你目前選中的顏色」</strong>。</p>
                <ul>
                  <li><strong>智慧切換</strong>：當你點選左側切換到不同顏色時，地圖上所有的提示數字會<strong>同步連動改變</strong>，切換成相對應顏色的數字！</li>
                  <li><strong>開局 0 提示</strong>：開局時大腦會自動亮起所有為 0 的安全起步點。但如果某格算出來是 0 且本身就是該顏色，則會智慧隱藏，需要用邏輯推導出來！</li>
                </ul>
              </div>

              <div className="tutorial-step-item special-skill">
                <h3>🔥 終極連擊大招：全自動填滿</h3>
                <p>當場面上所有尚未解鎖的灰色格子數量，<strong>剛好等於</strong>你目前選中顏色的剩餘格數時，大腦會發動必殺技——<strong>自動 HOLD 住你的所有指令，以 2 倍速連續填滿剩下的格子</strong>，並直接無縫進入超帥氣的放大通關運鏡！</p>
              </div>
            </div>

            <button className="modal-confirm-btn" onClick={() => setShowTutorial(false)}>
              我明白了，開始破局！
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
