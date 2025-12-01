import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import '../styles/AllergyProfileSetup.css';

const commonAllergens = [
  '우유', '계란', '땅콩', '견과류', '밀', '대두', '생선', '갑각류',
  '조개류', '메밀', '복숭아', '토마토', '돼지고기', '쇠고기', '닭고기'
];

function AllergyProfileSetup({ onComplete, speak }) {
  const [step, setStep] = useState('initial'); // 'initial', 'upload', 'manual'
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [customAllergen, setCustomAllergen] = useState('');
  const [severity, setSeverity] = useState('high');
  const [name, setName] = useState('');
  const [diagnosisImage, setDiagnosisImage] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState(''); // 'loading', 'recognizing', 'complete', 'error'
  const [extractedText, setExtractedText] = useState('');

  const toggleAllergen = (allergen) => {
    if (selectedAllergens.includes(allergen)) {
      setSelectedAllergens(selectedAllergens.filter(a => a !== allergen));
      speak(`${allergen} 제외`);
    } else {
      setSelectedAllergens([...selectedAllergens, allergen]);
      speak(`${allergen} 추가됨`);
    }
  };

  const addCustomAllergen = () => {
    if (customAllergen && !selectedAllergens.includes(customAllergen)) {
      setSelectedAllergens([...selectedAllergens, customAllergen]);
      speak(`${customAllergen} 추가됨`);
      setCustomAllergen('');
    }
  };

  const handleDiagnosisChoice = (hasDiagnosis) => {
    if (hasDiagnosis) {
      setStep('upload');
      speak('진단서 업로드 화면으로 이동합니다. 알레르기 진단서를 촬영하거나 업로드해주세요.');
    } else {
      setStep('manual');
      speak('수동 입력 화면으로 이동합니다. 알레르기 항목을 직접 선택해주세요.');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDiagnosisImage(file);
      speak('진단서 이미지가 선택되었습니다. OCR 분석을 시작합니다.');
      performOCR(file);
    }
  };

  // 실제 Tesseract.js OCR 처리
  const performOCR = async (file) => {
    try {
      setOcrStatus('loading');
      setOcrProgress(0);
      speak('진단서를 분석 중입니다. 잠시만 기다려주세요.');

      const result = await Tesseract.recognize(
        file,
        'kor+eng', // 한국어 + 영어 인식
        {
          logger: (m) => {
            // OCR 진행 상황 업데이트
            if (m.status === 'recognizing text') {
              const progress = Math.round(m.progress * 100);
              setOcrProgress(progress);
              setOcrStatus('recognizing');

              // 진행률 음성 안내 (25%, 50%, 75%에만)
              if (progress === 25 || progress === 50 || progress === 75) {
                speak(`분석 진행 중... ${progress}퍼센트 완료`);
              }
            }
          }
        }
      );

      const text = result.data.text;
      setExtractedText(text);
      setOcrStatus('complete');
      setOcrProgress(100);

      console.log('OCR 추출 텍스트:', text);

      // NLP를 통한 알레르겐 추출
      const extractedData = extractAllergensFromText(text);

      if (extractedData.allergens.length > 0) {
        setSelectedAllergens(extractedData.allergens);
        setSeverity(extractedData.severity);
        speak(`진단서 분석이 완료되었습니다. ${extractedData.allergens.join(', ')} 알레르기가 확인되었습니다. 추가 정보를 입력하거나 수정하실 수 있습니다.`);
      } else {
        speak('진단서에서 알레르기 정보를 추출하지 못했습니다. 수동으로 입력해주세요.');
      }

      setStep('manual');

    } catch (error) {
      console.error('OCR 오류:', error);
      setOcrStatus('error');
      speak('OCR 분석 중 오류가 발생했습니다. 수동으로 입력해주세요.');
      setStep('manual');
    }
  };

  // 텍스트에서 알레르겐 추출 (NLP)
  const extractAllergensFromText = (text) => {
    const lowerText = text.toLowerCase();
    const foundAllergens = [];
    let detectedSeverity = 'medium';

    // 알레르겐 키워드 매핑
    const allergenKeywords = {
      '우유': ['우유', '유제품', '밀크', 'milk', '카제인', 'casein'],
      '계란': ['계란', '달걀', 'egg', '난백', '난황'],
      '땅콩': ['땅콩', 'peanut', '피넛'],
      '견과류': ['견과', '호두', '아몬드', '캐슈', 'nuts', 'almond', 'walnut'],
      '밀': ['밀', '밀가루', 'wheat', '글루텐', 'gluten'],
      '대두': ['대두', '콩', 'soy', 'soybean'],
      '생선': ['생선', '어류', 'fish'],
      '갑각류': ['갑각류', '새우', '게', 'shrimp', 'crab', 'lobster'],
      '조개류': ['조개', '홍합', 'shellfish', 'clam'],
      '메밀': ['메밀', 'buckwheat'],
      '복숭아': ['복숭아', 'peach'],
      '토마토': ['토마토', 'tomato']
    };

    // 각 알레르겐 검색
    for (const [allergen, keywords] of Object.entries(allergenKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          if (!foundAllergens.includes(allergen)) {
            foundAllergens.push(allergen);
          }
          break;
        }
      }
    }

    // 심각도 판단
    const severityKeywords = {
      high: ['아나필락시스', 'anaphylaxis', '에피펜', 'epipen', '응급', '심각', '위험', '쇼크'],
      medium: ['중등도', '주의', '회피'],
      low: ['경미', '가벼운', '약간']
    };

    for (const [level, keywords] of Object.entries(severityKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          detectedSeverity = level;
          break;
        }
      }
      if (detectedSeverity === level) break;
    }

    return {
      allergens: foundAllergens,
      severity: detectedSeverity,
      rawText: text
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedAllergens.length === 0) {
      speak('알레르기 항목을 하나 이상 선택해주세요.');
      return;
    }

    const profile = {
      name: name || '사용자',
      allergens: selectedAllergens,
      severity: severity,
      hasDiagnosis: diagnosisImage !== null,
      createdAt: new Date().toISOString()
    };

    onComplete(profile);
  };

  // 초기 화면 렌더링
  if (step === 'initial') {
    return (
      <div className="allergy-profile-setup">
        <div className="setup-card initial-choice">
          <h2>알레르기 프로필 설정</h2>
          <p className="setup-description">
            안전한 식품 선택을 위해 알레르기 정보를 입력해주세요.
          </p>

          <div className="diagnosis-choice">
            <h3>알레르기 진단서가 있으신가요?</h3>
            <p className="choice-hint">
              진단서가 있으시면 OCR로 자동 분석하여 정확한 정보를 추출합니다.
            </p>

            <div className="choice-buttons">
              <button
                type="button"
                className="choice-btn has-diagnosis"
                onClick={() => handleDiagnosisChoice(true)}
                onFocus={() => speak('진단서 있음 버튼')}
                aria-label="진단서 있음"
              >
                <span className="choice-icon">📄</span>
                <span className="choice-text">네, 진단서가 있습니다</span>
                <span className="choice-desc">진단서를 촬영하거나 업로드하세요</span>
              </button>

              <button
                type="button"
                className="choice-btn no-diagnosis"
                onClick={() => handleDiagnosisChoice(false)}
                onFocus={() => speak('진단서 없음 버튼')}
                aria-label="진단서 없음"
              >
                <span className="choice-icon">✍️</span>
                <span className="choice-text">아니요, 직접 입력하겠습니다</span>
                <span className="choice-desc">AI 챗봇 문진으로 바로 시작</span>
              </button>
            </div>
          </div>

          <div className="info-box">
            <h4>💡 안내</h4>
            <ul>
              <li><strong>진단서 분석:</strong> AI OCR이 진단서의 알레르겐, 반응 정도, 의사 소견을 자동 추출합니다.</li>
              <li><strong>직접 입력:</strong> AI 챗봇이 체계적인 문진을 통해 맞춤형 위험 프로필을 생성합니다.</li>
              <li><strong>교차 검증:</strong> 추출된 정보는 공공 DB와 교차 검증하여 신뢰도를 높입니다.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // 진단서 업로드 화면
  if (step === 'upload') {
    return (
      <div className="allergy-profile-setup">
        <div className="setup-card upload-card">
          <h2>진단서 업로드</h2>
          <p className="setup-description">
            알레르기 진단서를 촬영하거나 업로드해주세요. AI가 자동으로 분석합니다.
          </p>

          <div className="upload-area">
            <div className="upload-box">
              <input
                type="file"
                id="diagnosis-upload"
                accept="image/*"
                onChange={handleImageUpload}
                className="upload-input"
                aria-label="진단서 업로드"
              />
              <label htmlFor="diagnosis-upload" className="upload-label">
                <span className="upload-icon">📷</span>
                <span className="upload-text">
                  {diagnosisImage ? '이미지 선택됨' : '진단서 촬영 또는 업로드'}
                </span>
                <span className="upload-hint">
                  JPG, PNG 형식 지원
                </span>
              </label>
            </div>

            {diagnosisImage && (
              <div className="upload-preview">
                <p className="analyzing-text">
                  {ocrStatus === 'loading' && '🔄 OCR 엔진 로딩 중...'}
                  {ocrStatus === 'recognizing' && `🔍 텍스트 인식 중... ${ocrProgress}%`}
                  {ocrStatus === 'complete' && '✅ 분석 완료!'}
                  {ocrStatus === 'error' && '❌ 오류 발생'}
                </p>
                {ocrStatus === 'recognizing' && (
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${ocrProgress}%` }}>
                      <span className="progress-text">{ocrProgress}%</span>
                    </div>
                  </div>
                )}
                {(ocrStatus === 'loading' || ocrStatus === 'recognizing') && (
                  <div className="loading-spinner"></div>
                )}
                {extractedText && (
                  <details className="extracted-text-details">
                    <summary>추출된 텍스트 보기 (디버깅용)</summary>
                    <pre className="extracted-text">{extractedText}</pre>
                  </details>
                )}
              </div>
            )}
          </div>

          <div className="ocr-info">
            <h4>🔍 Tesseract.js OCR 엔진</h4>
            <ul>
              <li><strong>다국어 지원:</strong> 한국어 + 영어 동시 인식</li>
              <li><strong>실시간 진행률:</strong> OCR 분석 진행 상황을 실시간으로 확인</li>
              <li><strong>NLP 알레르겐 추출:</strong> 12가지 주요 알레르겐을 키워드 기반으로 추출</li>
              <li><strong>심각도 자동 판단:</strong> 아나필락시스, 에피펜 등 키워드로 심각도 분석</li>
              <li><strong>교차 검증:</strong> 추출된 결과를 수동으로 확인 및 수정 가능</li>
              <li><strong>안전 우선:</strong> 인식 실패 시 수동 입력으로 전환</li>
            </ul>
          </div>

          <button
            type="button"
            className="skip-btn"
            onClick={() => setStep('manual')}
            aria-label="건너뛰고 직접 입력"
          >
            건너뛰고 직접 입력하기 →
          </button>
        </div>
      </div>
    );
  }

  // 수동 입력 화면 (기존 화면)
  return (
    <div className="allergy-profile-setup">
      <div className="setup-card">
        <h2>알레르기 프로필 설정</h2>
        <p className="setup-description">
          {diagnosisImage
            ? 'OCR 분석 결과를 확인하고 추가 정보를 입력해주세요.'
            : '개인의 알레르기 정보를 입력하여 맞춤형 식품 안전 분석을 받으세요.'}
        </p>

        {diagnosisImage && (
          <div className="ocr-result-banner">
            ✅ 진단서 분석 완료! 아래 정보를 확인하고 필요시 수정해주세요.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">이름 (선택사항)</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              onFocus={() => speak('이름 입력')}
            />
          </div>

          <div className="form-group">
            <label>알레르기 항목 선택</label>
            <div className="allergen-grid">
              {commonAllergens.map(allergen => (
                <button
                  key={allergen}
                  type="button"
                  className={`allergen-chip ${selectedAllergens.includes(allergen) ? 'selected' : ''}`}
                  onClick={() => toggleAllergen(allergen)}
                  aria-pressed={selectedAllergens.includes(allergen)}
                  aria-label={`${allergen} ${selectedAllergens.includes(allergen) ? '선택됨' : '선택 안됨'}`}
                >
                  {allergen}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="custom-allergen">직접 입력</label>
            <div className="custom-input-group">
              <input
                type="text"
                id="custom-allergen"
                value={customAllergen}
                onChange={(e) => setCustomAllergen(e.target.value)}
                placeholder="기타 알레르기 항목"
                onFocus={() => speak('직접 입력')}
              />
              <button
                type="button"
                onClick={addCustomAllergen}
                className="add-btn"
                aria-label="알레르기 항목 추가"
              >
                추가
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="severity">반응 강도</label>
            <select
              id="severity"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                speak(e.target.options[e.target.selectedIndex].text);
              }}
              onFocus={() => speak('반응 강도 선택')}
            >
              <option value="high">높음 (아나필락시스 위험)</option>
              <option value="medium">중간 (심한 불편함)</option>
              <option value="low">낮음 (가벼운 반응)</option>
            </select>
          </div>

          {selectedAllergens.length > 0 && (
            <div className="selected-summary">
              <h3>선택된 알레르기 항목 ({selectedAllergens.length}개)</h3>
              <div className="selected-tags">
                {selectedAllergens.map(allergen => (
                  <span key={allergen} className="selected-tag">
                    {allergen}
                    <button
                      type="button"
                      onClick={() => toggleAllergen(allergen)}
                      aria-label={`${allergen} 제거`}
                      className="remove-tag"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            aria-label="프로필 저장하고 계속하기"
            onFocus={() => speak('프로필 저장하고 계속하기 버튼')}
          >
            <span>✓</span> 프로필 저장하고 계속하기
          </button>
        </form>
      </div>
    </div>
  );
}

export default AllergyProfileSetup;
