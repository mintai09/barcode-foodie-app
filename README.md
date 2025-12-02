# 들리는 바코드 푸디 (Barcode Foodie)

**시각장애인과 알레르기 환자를 위한 AI 맞춤 식료품 비서 서비스**

## 📋 프로젝트 개요

"들리는 바코드 푸디"는 **들리는 바코드**와 **AI푸디** 두 가지 혁신적인 아이디어를 융합한 React 기반 웹 애플리케이션입니다.

### 핵심 기능

1. **🎤 음성 안내 (TTS)**: 시각장애인을 위한 전체 과정 음성 안내
2. **🏥 알레르기 프로필 구축**: 개인 맞춤형 알레르기 위험도 분석
3. **🤖 AI 챗봇 문진**: LLM 기반 대화형 상세 정보 수집 (STT/TTS 지원)
4. **📷 바코드 스캔**: 한 번의 스캔으로 즉시 제품 정보 확인
5. **🔍 AI 위험도 분석**: 개인 알레르기 정보와 제품 성분 교차 분석
6. **⚠️ 3단계 위험도 표시**: 섭취 가능(초록) / 주의(노랑) / 섭취 금지(빨강)

## 🎯 융합된 아이디어

### 1. 들리는 바코드 (시각장애인 접근성)
- 바코드 한 번 스캔으로 식약처 식품 정보 자동 호출
- TTS(음성 안내)로 제품명, 원재료, 알레르기 성분, 영양정보 읽어주기
- 시각장애인을 위한 직관적인 UX 설계
- 다시 듣기, 속도 조절 등 음성 제어 기능

### 2. AI푸디 (알레르기 환자 안전)
- 개인 건강 프로필 기반 위험 프로필 구축
- **AI 챗봇 문진으로 맞춤형 프로필 생성** (로컬 LLM 연동)
  - Web Speech API를 활용한 STT (음성 입력)
  - TTS를 통한 ARS 스타일 음성 응답
  - 증상, 민감도, 교차반응, 아나필락시스 이력 등 체계적 수집
- 성분표 분석 및 숨겨진 알레르겐 탐지 (예: 카제인=우유)
- 교차반응 가능 성분까지 NLP로 추적
- 실시간 안전도 판정

## 🚀 시작하기

### 필요 사항
- Node.js 14.0 이상
- npm 또는 yarn
- 식품의약품안전처 API 키 ([공공데이터포털](https://www.data.go.kr/)에서 발급)

### 설치 방법

```bash
# 프로젝트 디렉토리로 이동
cd barcode-foodie-app

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열고 발급받은 API 키를 입력하세요
# REACT_APP_FOOD_API_KEY=your_api_key_here

# 개발 서버 실행
npm start
```

애플리케이션이 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

### 환경 변수 설정

1. **식품의약품안전처 API 키 발급**:
   - [공공데이터포털](https://www.data.go.kr/) 접속
   - 회원가입 및 로그인
   - "식품의약품안전처_푸드QR API" 검색
   - 활용신청 후 인증키 발급

2. **.env 파일 설정**:
   ```bash
   # .env.example을 복사하여 .env 파일 생성
   cp .env.example .env
   ```

   `.env` 파일에 API 키 입력:
   ```
   REACT_APP_FOOD_API_KEY=발급받은_API_키
   ```

### 환경 설정 (LLM API)

AI 챗봇 기능을 사용하려면 로컬 LLM 서버가 필요합니다:

```bash
# LLM API 엔드포인트: http://mintai.gonetis.com:8888
# 모델: gemma-3-12b-it
```

자세한 프롬프트 설정은 [CHATBOT_PROMPT.md](./CHATBOT_PROMPT.md)를 참조하세요.

## 🌐 배포 방법

### 추천: Netlify 배포 (CORS 문제 해결됨)

Netlify는 서버리스 함수를 제공하여 CORS 문제를 해결할 수 있습니다.

#### 1단계: Netlify 계정 생성
1. [Netlify](https://www.netlify.com/) 접속
2. GitHub 계정으로 로그인

#### 2단계: 환경 변수 설정
1. Netlify 사이트 → `Site settings` → `Environment variables`
2. 환경 변수 추가:
   - `REACT_APP_FOOD_API_KEY`: 발급받은 식약처 API 키

#### 3단계: 배포
```bash
# Git에 커밋
git add .
git commit -m "Add Netlify configuration"
git push origin main

# Netlify에서 저장소 연결
# 1. New site from Git
# 2. GitHub 저장소 선택
# 3. Build settings:
#    - Build command: npm run build
#    - Publish directory: build
```

Netlify가 자동으로 빌드 및 배포를 진행하고, CORS 문제 없이 API를 호출할 수 있습니다!

### 대안: GitHub Pages 배포

⚠️ **주의**: GitHub Pages는 CORS 제한이 있어 개발 환경에서만 테스트 가능합니다.

#### 1단계: Repository 설정

```bash
# Git 저장소 초기화 (아직 안 했다면)
git init

# GitHub에 repository 생성 후
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/[YOUR_USERNAME]/barcode-foodie-app.git
git push -u origin main
```

#### 2단계: GitHub Secrets 설정

1. GitHub 저장소 페이지 → `Settings` → `Secrets and variables` → `Actions`
2. `New repository secret` 클릭
3. Secret 추가:
   - Name: `REACT_APP_FOOD_API_KEY`
   - Value: 발급받은 식약처 API 키

#### 3단계: package.json 수정

`homepage` 필드를 본인의 GitHub 사용자명으로 수정:
```json
"homepage": "https://[YOUR_GITHUB_USERNAME].github.io/barcode-foodie-app"
```

#### 4단계: 배포 실행

```bash
npm run deploy
```

몇 분 후 `https://[YOUR_USERNAME].github.io/barcode-foodie-app`에서 앱 확인!

## 📱 사용 방법

### Step 1: 알레르기 프로필 초기 설정
1. 앱 최초 실행 시 알레르기 프로필 설정 화면이 표시됩니다
2. 본인의 알레르기 항목을 선택하거나 직접 입력합니다
   - 땅콩, 우유, 계란, 새우, 밀 등 15가지 일반 항목
   - 직접 입력으로 추가 가능
3. "프로필 저장하고 계속하기" 버튼을 클릭합니다

### Step 2: AI 챗봇 문진 (신규!)
1. **전문가 시스템 기반 의료 문진**이 상세 정보를 수집합니다
2. **음성 입력 지원**: 🎙️ 버튼을 눌러 말로 답변 가능
3. **빠른 응답 버튼**: 자주 사용하는 답변을 원클릭
4. **각 알레르겐마다 체계적으로 수집**:
   - 주요 증상 (두드러기, 호흡곤란, 복통, 입술 부종 등)
   - 심각도 (가벼움/중간/심각함)
   - 아나필락시스 이력 (에피펜 사용 여부)
   - 교차 반응 (관련 식품군에 대한 반응)
   - 미량 노출 민감도 (교차 오염에 대한 반응)
5. 모든 대화는 음성으로도 안내됩니다
6. 알레르기별 문진 완료 후 다음 알레르기로 자동 진행
7. 모든 정보 수집 완료 후 "완료하고 계속하기" 클릭

### Step 3: 바코드 스캔
1. 구매하려는 제품의 뒷면 하단에 있는 바코드를 찾습니다
2. 카메라를 사용하여 바코드를 스캔하거나
3. 바코드 번호를 수동으로 입력할 수 있습니다
4. "샘플 제품으로 테스트" 버튼으로 데모를 체험할 수 있습니다

### Step 4: 분석 결과 확인
1. **위험도 배너**: 섭취 가능 여부를 한눈에 확인
   - 🚫 **빨강(섭취 금지)**: 위험 알레르겐 발견
   - ⚠️ **노랑(주의 필요)**: 교차 오염 가능성
   - ✅ **초록(섭취 가능)**: 안전한 제품

2. **상세 정보**:
   - 제품명, 브랜드, 가격
   - 알레르기 유발 성분
   - 전체 원재료 목록
   - 주의사항 및 경고 문구
   - 영양 정보

3. **음성 기능**:
   - 🔊 다시 듣기
   - 📋 원재료 듣기
   - 🍱 영양 정보 듣기

## 🎨 주요 특징

### 접근성 (Accessibility)
- **완전한 키보드 네비게이션 지원**
- **고대비 색상 구분**: 빨강/노랑/초록으로 직관적 위험도 표시
- **ARIA 레이블**: 스크린 리더 완벽 호환
- **큰 버튼과 명확한 텍스트**: 저시력 사용자 배려
- **음성 피드백**: 모든 주요 액션에 음성 안내

### 사용자 경험 (UX)
- **4단계 플로우**: 프로필 설정 → **AI 문진** → 스캔 → 결과 확인
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 모두 지원
- **즉각적인 피드백**: 실시간 위험도 분석
- **직관적인 UI**: 복잡한 정보를 시각적으로 정리
- **대화형 챗봇**: 친근하고 따뜻한 AI 의료 비서

### 기술적 특징
- **React 함수형 컴포넌트**: 최신 React 패턴 사용
- **LLM 통합**: 로컬 AI 모델 (gemma-3-12b-it) 연동
- **Web Speech API**:
  - **STT (Speech-to-Text)**: 음성 입력 기능
  - **TTS (Text-to-Speech)**: 브라우저 네이티브 음성 출력
- **ARS 스타일 음성 인터페이스**: 전화 상담 같은 자연스러운 경험
- **상태 관리**: React Hooks로 효율적인 상태 관리
- **CSS 애니메이션**: 부드러운 전환 효과 및 타이핑 인디케이터
- **모바일 최적화**: 터치 제스처 및 반응형 레이아웃

## 📊 시뮬레이션 데이터

현재 버전은 데모 목적으로 시뮬레이션 데이터를 사용합니다:

```javascript
// 예시: 새우깡 제품 데이터
{
  name: '새우깡',
  brand: '농심',
  price: '1,500원',
  ingredients: ['밀가루', '새우', '식물성유지', '설탕', ...],
  allergens: ['새우', '밀', '우유', '대두'],
  warnings: '같은 시설에서 계란, 게를 사용한 제품을 제조하고 있습니다.',
  nutrition: { calories: '480kcal', sodium: '450mg', ... }
}
```

## 🔮 향후 개발 계획

### 단기 계획
- [ ] 실제 바코드 스캐너 라이브러리 통합 (html5-qrcode)
- [ ] 식약처 공공 API 연동
- [ ] 제품 데이터베이스 구축
- [ ] 로컬 스토리지를 활용한 프로필 저장

### 중기 계획
- [x] **AI 챗봇 문진 시스템** (완료! 🎉)
- [x] **STT/TTS 음성 인터페이스** (완료! 🎉)
- [ ] OCR을 활용한 진단서 자동 분석
- [ ] 교차반응 알레르겐 데이터베이스 확장
- [ ] 대체 제품 추천 기능
- [ ] 사용자 히스토리 및 즐겨찾기

### 장기 계획
- [ ] 다국어 지원
- [ ] 오프라인 모드
- [ ] 웨어러블 디바이스 연동
- [ ] 음식점 메뉴 분석 기능
- [ ] 커뮤니티 기능 (리뷰, 평점)

## 🏗️ 프로젝트 구조

```
barcode-foodie-app/
├── public/
│   └── index.html          # HTML 템플릿
├── src/
│   ├── components/         # React 컴포넌트
│   │   ├── Header.js
│   │   ├── AllergyProfileSetup.js
│   │   ├── AIChatbot.js           # 🆕 AI 챗봇 문진
│   │   ├── BarcodeScanner.js
│   │   └── ProductAnalysis.js
│   ├── styles/            # CSS 스타일
│   │   ├── index.css
│   │   ├── App.css
│   │   ├── Header.css
│   │   ├── AllergyProfileSetup.css
│   │   ├── AIChatbot.css          # 🆕 챗봇 스타일
│   │   ├── BarcodeScanner.css
│   │   └── ProductAnalysis.css
│   ├── App.js            # 메인 앱 컴포넌트
│   └── index.js          # 진입점
├── CHATBOT_PROMPT.md     # 🆕 AI 챗봇 프롬프트 가이드
├── package.json          # 프로젝트 설정
└── README.md            # 이 파일
```

## 🤖 AI 챗봇 기능 상세

### 주요 기능
1. **대화형 문진**: LLM 기반 자연스러운 대화
2. **음성 입력 (STT)**: 마이크 버튼으로 말로 답변
3. **음성 출력 (TTS)**: 모든 질문을 음성으로 안내
4. **빠른 응답 버튼**: 자주 사용하는 답변 원클릭
5. **단계별 진행**: 증상 → 심각도 → 아나필락시스 → 교차반응 → 미량 민감도

### API 연동
```javascript
// API 엔드포인트
const API_URL = 'http://mintai.gonetis.com:8888/v1/chat/completions';

// 요청 예시
const response = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gemma-3-12b-it',
    messages: conversationHistory,
    system_prompt: customPrompt,
    temperature: 0.7,
    max_tokens: 500
  })
});
```

### 폴백 시스템
API 연결이 실패하거나 불가능한 경우, 미리 정의된 질문 시퀀스로 자동 전환됩니다.

### 음성 기능
- **STT**: `webkitSpeechRecognition` API 사용 (Chrome, Edge 지원)
- **TTS**: `speechSynthesis` API 사용 (모든 모던 브라우저 지원)
- **한국어 지원**: `lang: 'ko-KR'` 설정

### 수집되는 데이터
```json
{
  "allergens": ["땅콩", "우유"],
  "conversationHistory": [...],
  "timestamp": "2025-11-13T..."
}
```


## 🤝 기여하기

이 프로젝트는 사회적 가치를 추구하는 오픈소스 프로젝트입니다. 기여를 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.

## 👥 제작자

2025 AI 라이프 아이디어 챌린지 출품작

## 🙏 감사의 말

- 식약처 공공 데이터 API
- React 커뮤니티
- 시각장애인 및 알레르기 환자 커뮤니티의 피드백

## 📞 문의

프로젝트에 대한 문의사항이나 제안사항이 있으시면 이슈를 등록해주세요.

---

**"모든 사람이 안전하고 자유롭게 식품을 선택할 수 있는 세상을 만듭니다."**
