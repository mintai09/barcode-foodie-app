import React, { useEffect } from 'react';
import '../styles/ProductAnalysis.css';

function ProductAnalysis({ product, onReset, speak, isSpeaking, voiceModeEnabled }) {
  useEffect(() => {
    // 화면 진입 시 추가 음성 안내는 이미 App.js에서 처리됨
  }, []);

  const getRiskColor = (level) => {
    switch (level) {
      case 'danger': return '#FF4444';
      case 'warning': return '#FFA500';
      case 'safe': return '#4CAF50';
      default: return '#999';
    }
  };

  const getRiskLabel = (level) => {
    switch (level) {
      case 'danger': return '섭취 금지';
      case 'warning': return '주의 필요';
      case 'safe': return '섭취 가능';
      default: return '알 수 없음';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'danger': return '🚫';
      case 'warning': return '⚠️';
      case 'safe': return '✅';
      default: return '❓';
    }
  };

  const handleReadAgain = () => {
    let announcement = `${product.brand} ${product.name} 제품입니다. `;

    if (product.riskLevel === 'danger') {
      announcement += `위험! 이 제품은 섭취하지 마세요. `;
      announcement += product.riskReasons.join('. ');
    } else if (product.riskLevel === 'warning') {
      announcement += `주의가 필요합니다. `;
      announcement += product.riskReasons.join('. ');
    } else if (product.riskLevel === 'unknown') {
      announcement += `제품 정보를 확인할 수 없습니다. 안전을 위해 섭취를 권장하지 않습니다.`;
    } else {
      announcement += `안전합니다. ${product.riskReasons[0]}`;
    }

    // 추가 정보 (제품 정보가 있는 경우만)
    if (!product.notFound) {
      announcement += ` 가격은 ${product.price}입니다. `;
      if (product.allergens.length > 0) {
        announcement += `알레르기 유발 성분은 ${product.allergens.join(', ')}입니다.`;
      }
    }

    speak(announcement);
  };

  const handleReadNutrition = () => {
    const nutrition = product.nutrition;
    const announcement = `영양 정보를 안내합니다.
      열량 ${nutrition.calories},
      나트륨 ${nutrition.sodium},
      탄수화물 ${nutrition.carbs},
      당류 ${nutrition.sugars},
      지방 ${nutrition.fat},
      단백질 ${nutrition.protein}입니다.`;
    speak(announcement);
  };

  const handleReadIngredients = () => {
    const announcement = `원재료는 ${product.ingredients.join(', ')}입니다.`;
    speak(announcement);
  };

  return (
    <div className="product-analysis">
      {/* 음성 모드 상태 표시 */}
      <div className={`voice-mode-banner ${voiceModeEnabled ? 'enabled' : 'disabled'}`}>
        <span className="voice-mode-icon">{voiceModeEnabled ? '🔊' : '🔇'}</span>
        <span className="voice-mode-text">
          {voiceModeEnabled ? '음성 모드 ON' : '음성 모드 OFF - 음성 기능을 사용하려면 AI 챗봇에서 활성화하세요'}
        </span>
      </div>

      <div
        className="risk-banner"
        style={{ backgroundColor: getRiskColor(product.riskLevel) }}
        role="alert"
        aria-live="assertive"
      >
        <div className="risk-icon">{getRiskIcon(product.riskLevel)}</div>
        <div className="risk-content">
          <h2>{getRiskLabel(product.riskLevel)}</h2>
          <div className="risk-reasons">
            {product.riskReasons.map((reason, index) => (
              <p key={index}>{reason}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="product-info-card">
        <div className="product-header">
          <div className="product-icon">📦</div>
          <div>
            <h3>{product.name}</h3>
            <p className="brand">{product.brand}</p>
            <p className="price">{product.price}</p>
            {product.barcode && (
              <p className="barcode-display">
                <span className="barcode-label">바코드:</span>
                <span className="barcode-number">{product.barcode}</span>
              </p>
            )}
            {product.notFound && (
              <div className="not-found-notice">
                <p>⚠️ 이 제품은 데이터베이스에 등록되지 않았습니다.</p>
                <p>제품 포장의 성분표를 직접 확인하시거나 제조사에 문의하세요.</p>
              </div>
            )}
          </div>
        </div>

        <div className="info-section">
          <h4>알레르기 유발 성분</h4>
          <div className="allergen-tags">
            {product.allergens.map((allergen, index) => (
              <span key={index} className="allergen-tag danger-tag">
                {allergen}
              </span>
            ))}
          </div>
        </div>

        <div className="info-section">
          <h4>원재료</h4>
          <p className="ingredients-text">{product.ingredients.join(', ')}</p>
        </div>

        {product.warnings && (
          <div className="info-section warning-box">
            <h4>⚠️ 주의사항</h4>
            <p>{product.warnings}</p>
          </div>
        )}

        <div className="info-section">
          <h4>영양 정보 (1회 제공량 기준)</h4>
          <div className="nutrition-grid">
            <div className="nutrition-item">
              <span className="nutrition-label">열량</span>
              <span className="nutrition-value">{product.nutrition.calories}</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">나트륨</span>
              <span className="nutrition-value">{product.nutrition.sodium}</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">탄수화물</span>
              <span className="nutrition-value">{product.nutrition.carbs}</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">당류</span>
              <span className="nutrition-value">{product.nutrition.sugars}</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">지방</span>
              <span className="nutrition-value">{product.nutrition.fat}</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-label">단백질</span>
              <span className="nutrition-value">{product.nutrition.protein}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button
          onClick={handleReadAgain}
          className="voice-btn"
          disabled={!voiceModeEnabled || isSpeaking}
          aria-label="제품 정보 다시 듣기"
          title={!voiceModeEnabled ? "음성 모드가 꺼져있습니다. AI 챗봇에서 '음성 모드 시작'을 입력하여 활성화하세요." : "제품 정보 다시 듣기"}
        >
          <span>🔊</span> 다시 듣기
        </button>

        <button
          onClick={handleReadIngredients}
          className="voice-btn"
          disabled={!voiceModeEnabled || isSpeaking}
          aria-label="원재료 듣기"
          title={!voiceModeEnabled ? "음성 모드가 꺼져있습니다. AI 챗봇에서 '음성 모드 시작'을 입력하여 활성화하세요." : "원재료 듣기"}
        >
          <span>📋</span> 원재료 듣기
        </button>

        <button
          onClick={handleReadNutrition}
          className="voice-btn"
          disabled={!voiceModeEnabled || isSpeaking}
          aria-label="영양 정보 듣기"
          title={!voiceModeEnabled ? "음성 모드가 꺼져있습니다. AI 챗봇에서 '음성 모드 시작'을 입력하여 활성화하세요." : "영양 정보 듣기"}
        >
          <span>🍱</span> 영양 정보 듣기
        </button>
      </div>

      <button
        onClick={onReset}
        className="scan-another-btn"
        aria-label="다른 제품 스캔하기"
      >
        <span>📷</span> 다른 제품 스캔하기
      </button>
    </div>
  );
}

export default ProductAnalysis;
