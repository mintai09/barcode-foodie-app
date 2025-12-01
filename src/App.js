import React, { useState, useEffect } from 'react';
import './styles/App.css';
import AllergyProfileSetup from './components/AllergyProfileSetup';
import AIChatbot from './components/AIChatbot';
import BarcodeScanner from './components/BarcodeScanner';
import ProductAnalysis from './components/ProductAnalysis';
import Header from './components/Header';
import { getProductByBarcode } from './services/foodSafetyAPI';

function App() {
  const [currentScreen, setCurrentScreen] = useState('profile');
  const [allergyProfile, setAllergyProfile] = useState(null);
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false); // 음성 모드 전역 관리

  // 음성 안내 함수 (음성 모드가 활성화된 경우에만)
  const speak = (text) => {
    if (voiceModeEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // 이전 음성 중지
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    // 앱 시작 시 환영 메시지
    speak('들리는 바코드 푸디에 오신 것을 환영합니다. 시각장애인과 알레르기 환자를 위한 AI 식품 안전 비서입니다.');
  }, []);

  const handleProfileInitialSetup = (profile) => {
    // 초기 프로필 설정 완료 후 AI 챗봇으로 이동
    setSelectedAllergens(profile.allergens);
    setCurrentScreen('chatbot');
    speak('알레르기 항목이 선택되었습니다. 이제 AI 비서가 상세한 정보를 수집합니다.');
  };

  const handleChatbotComplete = (chatbotProfile) => {
    // AI 챗봇 완료 후 최종 프로필 생성
    const completeProfile = {
      allergens: selectedAllergens,
      chatbotData: chatbotProfile,
      createdAt: new Date().toISOString()
    };
    setAllergyProfile(completeProfile);
    setCurrentScreen('scanner');
    speak('알레르기 프로필이 완성되었습니다. 이제 제품 바코드를 스캔해주세요.');
  };

  const handleBarcodeScanned = (barcode) => {
    // 바코드 데이터를 기반으로 제품 분석
    analyzeProduct(barcode);
  };

  const analyzeProduct = async (barcode) => {
    try {
      speak('제품 정보를 조회하고 있습니다.');

      // 식약처 API를 통해 실제 제품 정보 조회
      const product = await getProductByBarcode(barcode);

      if (product.notFound) {
        speak('제품 정보를 찾을 수 없습니다. 제조사에 직접 문의하시거나 다른 제품을 스캔해주세요.');
      }

      // 위험도 분석
      const riskLevel = calculateRiskLevel(product, allergyProfile);

      setScannedProduct({
        ...product,
        riskLevel: riskLevel.level,
        riskReasons: riskLevel.reasons
      });

      setCurrentScreen('analysis');

      // 음성 안내
      announceProduct(product, riskLevel);
    } catch (error) {
      console.error('제품 분석 오류:', error);
      speak('제품 정보를 불러오는 데 실패했습니다. 다시 시도해주세요.');
    }
  };

  const calculateRiskLevel = (product, profile) => {
    if (!profile) return { level: 'unknown', reasons: [] };

    const userAllergens = profile.allergens.map(a => a.toLowerCase());
    const productAllergens = product.allergens.map(a => a.toLowerCase());
    const reasons = [];

    // 직접 알레르겐 확인
    const directMatches = productAllergens.filter(allergen =>
      userAllergens.some(userAllergen => allergen.includes(userAllergen))
    );

    if (directMatches.length > 0) {
      directMatches.forEach(match => {
        reasons.push(`위험 성분 발견: ${match}`);
      });
      return { level: 'danger', reasons };
    }

    // 교차 오염 위험
    if (product.warnings && userAllergens.some(allergen =>
      product.warnings.toLowerCase().includes(allergen)
    )) {
      reasons.push('교차 오염 가능성이 있습니다');
      return { level: 'warning', reasons };
    }

    return { level: 'safe', reasons: ['알려진 알레르겐이 발견되지 않았습니다'] };
  };

  const announceProduct = (product, riskLevel) => {
    let announcement = `${product.brand} ${product.name} 제품입니다. `;

    if (riskLevel.level === 'danger') {
      announcement += `위험! 이 제품은 섭취하지 마세요. `;
      announcement += riskLevel.reasons.join('. ');
    } else if (riskLevel.level === 'warning') {
      announcement += `주의가 필요합니다. `;
      announcement += riskLevel.reasons.join('. ');
    } else {
      announcement += `안전합니다. ${riskLevel.reasons[0]}`;
    }

    speak(announcement);
  };

  const handleReset = () => {
    setCurrentScreen('scanner');
    setScannedProduct(null);
    speak('다시 바코드를 스캔해주세요.');
  };

  const handleChangeProfile = () => {
    setCurrentScreen('profile');
    setAllergyProfile(null);
    setScannedProduct(null);
    speak('알레르기 프로필 설정 화면으로 이동합니다.');
  };

  return (
    <div className="App">
      <Header
        currentScreen={currentScreen}
        onLogoClick={() => {
          if (allergyProfile) {
            setCurrentScreen('scanner');
            speak('홈 화면으로 이동합니다.');
          }
        }}
        onChangeProfile={allergyProfile ? handleChangeProfile : null}
      />

      <main className="main-content">
        {currentScreen === 'profile' && (
          <AllergyProfileSetup
            onComplete={handleProfileInitialSetup}
            speak={speak}
          />
        )}

        {currentScreen === 'chatbot' && selectedAllergens.length > 0 && (
          <AIChatbot
            selectedAllergens={selectedAllergens}
            onComplete={handleChatbotComplete}
            speak={speak}
            voiceModeEnabled={voiceModeEnabled}
            setVoiceModeEnabled={setVoiceModeEnabled}
          />
        )}

        {currentScreen === 'scanner' && allergyProfile && (
          <BarcodeScanner
            onBarcodeScanned={handleBarcodeScanned}
            speak={speak}
          />
        )}

        {currentScreen === 'analysis' && scannedProduct && (
          <ProductAnalysis
            product={scannedProduct}
            onReset={handleReset}
            speak={speak}
            isSpeaking={isSpeaking}
            voiceModeEnabled={voiceModeEnabled}
          />
        )}
      </main>
    </div>
  );
}

export default App;
