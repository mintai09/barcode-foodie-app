import React, { useState, useEffect, useRef } from 'react';
import '../styles/AIChatbot.css';

function AIChatbot({ selectedAllergens, onComplete, speak, voiceModeEnabled, setVoiceModeEnabled }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversationState, setConversationState] = useState('intro');
  const [collectedData, setCollectedData] = useState({});
  const [currentAllergenIndex, setCurrentAllergenIndex] = useState(0);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // LLM API는 선택적 기능으로 유지 (향후 요약/분석용)
  const API_URL = '/api/v1/chat/completions';
  const USE_LLM = false; // 전문가 시스템 우선 사용

  // 커스텀 프롬프트 (나중에 요약용으로 사용)
  const getSystemPrompt = () => {
    return `당신은 식품 알레르기 환자를 돕는 전문 의료 문진 AI 비서입니다.
사용자의 알레르기 정보를 체계적으로 수집하여 맞춤형 위험 프로필을 생성합니다.

### 규칙
1. 한 번에 하나의 질문만 합니다.
2. 짧고 명확하게 질문합니다 (2-3문장 이내).
3. 의학 용어는 쉽게 설명합니다.
4. 사용자에게 공감적이고 따뜻하게 응답합니다.
5. 질문 끝에는 선택지를 제공하거나, 예/아니오로 답할 수 있게 합니다.

### 현재 상황
사용자가 선택한 알레르기 항목: ${selectedAllergens.join(', ')}

### 수집할 정보 (각 알레르겐마다)
1. 주요 증상 (두드러기, 호흡곤란, 복통, 입술 부종 등)
2. 반응 시간 (즉시, 30분 이내, 1-2시간 후)
3. 심각도 (가벼움, 중간, 심각함)
4. 아나필락시스(심각한 알레르기 쇼크) 이력
5. 교차 반응 (관련 식품에 대한 반응)
6. 미량 노출 민감도

### 현재 진행 상태
현재 ${selectedAllergens[0] || '알레르기'}에 대해 질문 중입니다.

질문을 시작하거나 계속하세요. 친근하고 따뜻하게 대화하세요.`;
  };

  // TTS 래퍼 함수 (음성 모드가 활성화된 경우에만 음성 출력)
  const speakIfEnabled = (text) => {
    if (voiceModeEnabled && speak) {
      speak(text);
    }
  };

  // 초기 메시지
  useEffect(() => {
    const welcomeMessage = {
      role: 'assistant',
      content: `안녕하세요! 저는 알레르기 안전 비서 AI입니다. 🏥\n\n${selectedAllergens.join(', ')}에 대한 알레르기가 있으시다고 선택하셨네요.\n\n몇 가지 질문으로 더 자세한 정보를 수집하여 안전한 식품 선택을 도와드리겠습니다. 편하게 답변해주세요!\n\n💡 "음성 모드 시작"이라고 입력하시면 음성 안내를 받을 수 있습니다.\n\n시작하시겠습니까? (예/아니요로 답해주세요)`
    };
    setMessages([welcomeMessage]);
  }, []);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Web Speech API 초기화
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'ko-KR';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        speakIfEnabled(`${transcript}라고 말씀하셨습니다.`);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        speakIfEnabled('음성 인식에 실패했습니다. 다시 시도해주세요.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // 음성 인식 시작
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
      speakIfEnabled('말씀하세요.');
    }
  };

  // 음성 인식 중지
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // AI에게 메시지 전송
  const sendMessageToAI = async (userMessage) => {
    const conversationHistory = [
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma-3-12b-it',
          messages: conversationHistory,
          system_prompt: getSystemPrompt(),
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      return aiResponse;
    } catch (error) {
      console.error('AI API Error:', error);

      // 폴백: 미리 정의된 질문 시퀀스 사용
      return getFallbackResponse(userMessage);
    }
  };

  // 폴백 응답 (API 실패 시)
  const getFallbackResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();

    // 시작 확인
    if (conversationState === 'intro') {
      if (lowerMessage.includes('예') || lowerMessage.includes('네') || lowerMessage.includes('yes') || lowerMessage.includes('시작')) {
        setConversationState('symptoms');
        const allergen = selectedAllergens[currentAllergenIndex];
        return `좋습니다! 먼저 "${allergen}" 알레르기에 대해 여쭤보겠습니다.\n\n"${allergen}"을(를) 섭취했을 때 주로 어떤 증상이 나타나나요?\n\n1. 피부 반응 (두드러기, 가려움)\n2. 호흡기 증상 (호흡곤란, 천명)\n3. 소화기 증상 (복통, 구토, 설사)\n4. 입술/혀 부종\n5. 어지러움/실신\n\n해당하는 번호를 말씀해주시거나 직접 설명해주세요.`;
      } else if (lowerMessage.includes('아니') || lowerMessage.includes('no')) {
        return '알겠습니다. 준비되시면 "예" 또는 "시작"이라고 말씀해주세요.';
      } else {
        // 다른 입력은 다시 안내
        return '시작할 준비가 되셨나요? "예" 또는 "시작"이라고 말씀해주세요.';
      }
    }

    // 증상 수집
    if (conversationState === 'symptoms') {
      setConversationState('severity');
      const allergen = selectedAllergens[currentAllergenIndex];
      return `알려주셔서 감사합니다. "${allergen}" 알레르기 증상이 얼마나 심각했나요?\n\n1️⃣ 가벼움 - 일상생활 가능 (약간의 불편)\n2️⃣ 중간 - 불편하지만 견딜만함 (약 복용 필요)\n3️⃣ 심각함 - 응급실 방문 또는 에피펜 사용\n\n번호를 선택해주세요.`;
    }

    // 심각도 수집
    if (conversationState === 'severity') {
      setConversationState('anaphylaxis');
      return `이해했습니다. 혹시 지금까지 심각한 알레르기 쇼크(아나필락시스)를 경험하신 적이 있나요? 에피네프린 주사(에피펜)를 사용한 적이 있으신가요?\n\n예 또는 아니오로 답해주세요.`;
    }

    // 아나필락시스 이력
    if (conversationState === 'anaphylaxis') {
      setConversationState('cross_reactivity');
      const allergen = selectedAllergens[currentAllergenIndex];

      let crossReactivityQuestion = '';
      if (allergen === '땅콩' || allergen === '견과류') {
        crossReactivityQuestion = '땅콩 알레르기가 있으신 분은 다른 견과류(아몬드, 호두, 캐슈넛)에도 반응할 수 있습니다.';
      } else if (allergen === '우유') {
        crossReactivityQuestion = '우유 알레르기가 있으신 분은 치즈, 버터, 요거트에도 반응할 수 있습니다.';
      } else if (allergen === '새우' || allergen === '갑각류') {
        crossReactivityQuestion = '새우 알레르기가 있으신 분은 게, 랍스터 등 다른 갑각류에도 반응할 수 있습니다.';
      } else {
        crossReactivityQuestion = `${allergen}와 관련된 다른 식품에도 반응하신 적이 있나요?`;
      }

      return `알겠습니다. ${crossReactivityQuestion}\n\n이런 식품들을 드셔보신 적 있나요? 반응이 있었나요?`;
    }

    // 교차 반응
    if (conversationState === 'cross_reactivity') {
      setConversationState('trace_sensitivity');
      return `감사합니다. 마지막 질문입니다.\n\n"이 제품은 ${selectedAllergens[currentAllergenIndex]}를 사용한 시설에서 제조되었습니다"라는 경고 문구가 있는 제품을 먹어도 반응이 나타나나요?\n\n즉, 미량 노출에도 민감하신가요?`;
    }

    // 미량 민감도
    if (conversationState === 'trace_sensitivity') {
      const currentAllergen = selectedAllergens[currentAllergenIndex];

      // 다음 알레르겐으로 이동
      if (currentAllergenIndex < selectedAllergens.length - 1) {
        const nextIndex = currentAllergenIndex + 1;
        const nextAllergen = selectedAllergens[nextIndex];

        // 상태 업데이트 (다음 렌더링 사이클에서 적용됨)
        setCurrentAllergenIndex(nextIndex);
        setConversationState('symptoms');

        return `✅ "${currentAllergen}"에 대한 정보 수집이 완료되었습니다!\n\n이제 "${nextAllergen}"에 대해 질문하겠습니다.\n\n"${nextAllergen}"을(를) 섭취했을 때 주로 어떤 증상이 나타나나요?\n\n1. 피부 반응 (두드러기, 가려움)\n2. 호흡기 증상 (호흡곤란, 천명)\n3. 소화기 증상 (복통, 구토, 설사)\n4. 입술/혀 부종\n5. 어지러움/실신\n\n해당하는 번호를 말씀해주시거나 직접 설명해주세요.`;
      } else {
        setConversationState('complete');
        return `✅ "${currentAllergen}"에 대한 정보가 저장되었습니다!\n\n🎉 모든 알레르기 정보 수집이 완료되었습니다!\n\n수집된 알레르기 항목:\n${selectedAllergens.map(a => `• ${a}`).join('\n')}\n\n맞춤형 알레르기 위험 프로필이 생성되었습니다.\n이제 안전하게 제품을 스캔하실 수 있습니다.\n\n아래 "완료하고 계속하기" 버튼을 눌러주세요.`;
      }
    }

    return '죄송합니다. 다시 한 번 말씀해주시겠어요?';
  };

  // 메시지 전송 (전문가 시스템 기반)
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputText
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = inputText;
    setInputText('');
    setIsLoading(true);

    // 음성 모드 시작 핫워드 감지
    if (userInput.includes('음성 모드 시작') || userInput.includes('음성모드 시작')) {
      setVoiceModeEnabled(true);
      const voiceActivationMessage = {
        role: 'assistant',
        content: '🔊 음성 모드가 활성화되었습니다!\n\n이제 모든 응답을 음성으로 안내해드리겠습니다. 계속 진행하시겠습니까?'
      };
      setMessages(prev => [...prev, voiceActivationMessage]);
      // 음성 모드 활성화 직후에는 즉시 음성 출력 (활성화 전이라 speak가 작동 안 하므로 직접 처리)
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance('음성 모드가 활성화되었습니다. 이제 모든 응답을 음성으로 안내해드리겠습니다. 계속 진행하시겠습니까?');
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
      setIsLoading(false);
      return;
    }

    // 현재 상태 저장 (getFallbackResponse 내에서 상태가 변경되기 전)
    const currentState = conversationState;
    const currentIndex = currentAllergenIndex;

    // 전문가 시스템 기반 응답 생성 (내부에서 상태 업데이트 발생)
    const aiResponse = getFallbackResponse(userInput);

    // 응답 생성 전 상태로 데이터 저장
    saveUserResponse(userInput, currentState, currentIndex);

    const assistantMessage = {
      role: 'assistant',
      content: aiResponse
    };

    setMessages(prev => [...prev, assistantMessage]);
    speakIfEnabled(aiResponse);

    // 완료 감지: "모든 알레르기 정보 수집이 완료"만 감지
    if (aiResponse.includes('모든 알레르기 정보 수집이 완료') || aiResponse.includes('모든 정보 수집이 완료')) {
      setConversationState('complete');
    }

    setIsLoading(false);
  };

  // 사용자 응답 데이터 저장 (상태와 인덱스를 명시적으로 받음)
  const saveUserResponse = (response, state, index) => {
    const allergen = selectedAllergens[index];

    setCollectedData(prevData => {
      const newData = { ...prevData };

      if (!newData[allergen]) {
        newData[allergen] = {};
      }

      switch (state) {
        case 'symptoms':
          newData[allergen].symptoms = response;
          break;
        case 'severity':
          newData[allergen].severity = response;
          break;
        case 'anaphylaxis':
          newData[allergen].anaphylaxis = response;
          break;
        case 'cross_reactivity':
          newData[allergen].crossReactivity = response;
          break;
        case 'trace_sensitivity':
          newData[allergen].traceSensitivity = response;

          // 미량 민감도 저장 후 다음 알레르겐으로 이동 준비
          if (index < selectedAllergens.length - 1) {
            console.log(`✅ [${allergen}] 완료 - 다음: ${selectedAllergens[index + 1]}`);
          } else {
            console.log(`✅ [${allergen}] 완료 - 모든 알레르기 문진 종료`);
          }
          break;
        default:
          break;
      }

      console.log(`[${allergen}] ${state}: ${response}`);
      return newData;
    });
  };

  // 엔터키로 전송
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 빠른 응답 버튼
  const quickResponses = {
    intro: ['예', '시작', '음성 모드 시작'],
    symptoms: ['1번', '2번', '3번', '4번', '5번', '1, 2번', '2, 3번'],
    severity: ['1 (가벼움)', '2 (중간)', '3 (심각함)'],
    anaphylaxis: ['예', '아니요'],
    cross_reactivity: ['예', '아니요', '모르겠어요'],
    trace_sensitivity: ['예', '아니요']
  };

  const handleQuickResponse = (response) => {
    setInputText(response);
  };

  const handleComplete = () => {
    // 수집된 데이터를 구조화하여 전달
    const profile = {
      allergens: selectedAllergens,
      detailedData: collectedData, // 알레르겐별 상세 정보
      conversationHistory: messages,
      timestamp: new Date().toISOString()
    };

    console.log('수집된 알레르기 프로필:', profile);
    onComplete(profile);
  };

  return (
    <div className="ai-chatbot">
      <div className="chatbot-header">
        <div className="chatbot-title">
          <span className="chatbot-icon">🤖</span>
          <h2>AI 알레르기 문진</h2>
        </div>
        <div className="chatbot-status">
          <span className={`voice-mode-indicator ${voiceModeEnabled ? 'enabled' : 'disabled'}`}>
            {voiceModeEnabled ? '🔊 음성 모드 ON' : '🔇 음성 모드 OFF'}
          </span>
          {isListening && (
            <span className="listening-indicator">
              🎤 듣는 중...
            </span>
          )}
          {isLoading && (
            <span className="loading-indicator">
              ⏳ AI 응답 중...
            </span>
          )}
        </div>
      </div>

      <div className="chatbot-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-avatar">
              {message.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              <div className="message-text">
                {message.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant-message">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {quickResponses[conversationState] && (
        <div className="quick-responses">
          <p className="quick-responses-label">빠른 응답:</p>
          <div className="quick-response-buttons">
            {quickResponses[conversationState].map((response, index) => (
              <button
                key={index}
                className="quick-response-btn"
                onClick={() => handleQuickResponse(response)}
                disabled={isLoading}
              >
                {response}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chatbot-input-area">
        <div className="input-group">
          <button
            className={`mic-btn ${isListening ? 'listening' : ''}`}
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading}
            aria-label={isListening ? '음성 입력 중지' : '음성 입력 시작'}
            title="음성으로 답변하기"
          >
            {isListening ? '🎤' : '🎙️'}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="답변을 입력하세요... (또는 음성 버튼을 누르세요)"
            disabled={isLoading}
            aria-label="답변 입력"
          />

          <button
            className="send-btn"
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            aria-label="답변 전송"
          >
            ➤
          </button>
        </div>
      </div>

      {conversationState === 'complete' && (
        <div className="completion-banner">
          <p>✅ 문진이 완료되었습니다!</p>
          <button
            className="complete-btn"
            onClick={handleComplete}
            aria-label="문진 완료하고 계속하기"
          >
            완료하고 계속하기
          </button>
        </div>
      )}
    </div>
  );
}

export default AIChatbot;
