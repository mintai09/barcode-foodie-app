/**
 * 식품의약품안전처 API 연동 서비스
 * 공공데이터포털의 푸드QR 정보 서비스 API 사용
 */

// 식약처 API 키 (환경 변수에서 가져오기)
const API_KEY = process.env.REACT_APP_FOOD_API_KEY;

/**
 * 텍스트에서 알레르기 정보 추출
 * @param {string} text - 분석할 텍스트
 * @returns {Array<string>} 추출된 알레르기 항목 배열
 */
const extractAllergensFromText = (text) => {
  if (!text) return [];

  const normalizedText = text.toLowerCase();

  // 19개 주요 알레르기 항목 매핑 (키워드 포함)
  const allergenKeywords = {
    '계란': ['난류', '계란', '달걀', '난', '에그', 'egg'],
    '우유': ['우유', '유당', '유제품', '밀크', 'milk', '치즈', '버터', '크림'],
    '메밀': ['메밀'],
    '땅콩': ['땅콩', '피넛', 'peanut'],
    '대두': ['대두', '콩', '두유', '간장', '된장', 'soy'],
    '밀': ['밀', '밀가루', '글루텐', 'wheat'],
    '고등어': ['고등어', '갈치'],
    '게': ['게'],
    '새우': ['새우', '크릴'],
    '돼지고기': ['돼지고기', '돈육', '포크', 'pork'],
    '복숭아': ['복숭아'],
    '토마토': ['토마토'],
    '아황산류': ['아황산', '이산화황', '아황산염'],
    '호두': ['호두', '월넛', 'walnut'],
    '닭고기': ['닭고기', '계육', '치킨', 'chicken'],
    '쇠고기': ['쇠고기', '소고기', '우육', '비프', 'beef'],
    '오징어': ['오징어'],
    '조개류': ['조개', '홍합', '바지락', '굴', '전복', '조갯살'],
    '잣': ['잣'],
  };

  const foundAllergens = new Set();

  // 각 알레르기 항목의 키워드를 텍스트에서 검색
  for (const [allergen, keywords] of Object.entries(allergenKeywords)) {
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword)) {
        foundAllergens.add(allergen);
        console.log(`✓ 텍스트에서 알레르기 감지: "${keyword}" -> ${allergen}`);
        break; // 하나라도 매칭되면 다음 알레르기로
      }
    }
  }

  return Array.from(foundAllergens);
};

/**
 * 식약처 API에서 제품 정보 조회
 * @param {string} barcode - 제품 바코드 번호
 * @returns {Promise<Object>} 제품 정보 객체
 */
const fetchFromFoodSafetyAPI = async (barcode) => {
  try {
    // 바코드 정규화
    let normalizedBarcode = barcode;

    // 14자리이고 0으로 시작하는 경우 앞의 0 제거
    if (barcode.length === 14 && barcode.startsWith('0')) {
      normalizedBarcode = barcode.substring(1);
      console.log(`바코드 정규화: ${barcode} (14자리) -> ${normalizedBarcode} (13자리)`);
    }
    // 13자리이지만 0으로 시작하고 880으로 시작하지 않는 경우 (잘못된 바코드)
    else if (barcode.length === 13 && barcode.startsWith('0') && !barcode.startsWith('088')) {
      normalizedBarcode = barcode.substring(1);
      console.log(`바코드 정규화 (13자리 오류 수정): ${barcode} -> ${normalizedBarcode} (12자리)`);
    }
    // 13자리이고 정상적인 경우
    else if (barcode.length === 13) {
      normalizedBarcode = barcode;
      console.log(`바코드 정상: ${barcode} (13자리)`);
    }
    // 12자리인 경우 그대로 사용
    else if (barcode.length === 12 || barcode.length === 8) {
      normalizedBarcode = barcode;
      console.log(`바코드 정상: ${barcode} (${barcode.length}자리)`);
    }
    else {
      console.warn(`비표준 바코드 길이: ${barcode.length}자리 - ${barcode}`);
    }

    console.log(`원본 바코드: ${barcode}, 정규화된 바코드: ${normalizedBarcode}`);

    // XML 형식으로 요청 (파라미터명: bar_cd)
    // GitHub Pages 배포 시 프록시를 사용할 수 없으므로 직접 API 호출
    const url = `https://apis.data.go.kr/1471000/FoodQrInfoService01/getFoodQrAllrgyInfo?serviceKey=${API_KEY}&pageNo=1&numOfRows=100&bar_cd=${normalizedBarcode}`;

    console.log(`식약처 API 호출: 바코드 ${normalizedBarcode}`);

    const response = await fetch(url);
    const xmlText = await response.text();

    console.log('API 응답 (XML):', xmlText);

    // XML 파싱
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // 에러 체크
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('XML 파싱 오류:', parseError.textContent);
      return null;
    }

    // 응답 헤더 확인
    const resultCode = xmlDoc.querySelector('resultCode')?.textContent;
    const resultMsg = xmlDoc.querySelector('resultMsg')?.textContent;

    console.log(`API 응답 코드: ${resultCode}, 메시지: ${resultMsg}`);

    if (resultCode !== '00') {
      console.warn(`API 오류: ${resultMsg}`);
      return null;
    }

    // 아이템 목록 가져오기
    const items = xmlDoc.querySelectorAll('item');

    if (items.length === 0) {
      console.log('API에서 제품 정보를 찾지 못했습니다.');
      return null;
    }

    console.log(`${items.length}개의 알레르기 항목을 찾았습니다.`);

    // 알레르기 성분 추출 및 19개 주요 항목 매핑
    const allergenMapping = {
      '난류': '계란',
      '계란': '계란',
      '우유': '우유',
      '메밀': '메밀',
      '땅콩': '땅콩',
      '대두': '대두',
      '콩': '대두',
      '밀': '밀',
      '고등어': '고등어',
      '게': '게',
      '새우': '새우',
      '돼지고기': '돼지고기',
      '복숭아': '복숭아',
      '토마토': '토마토',
      '아황산류': '아황산류',
      '아황산염': '아황산류',
      '호두': '호두',
      '닭고기': '닭고기',
      '쇠고기': '쇠고기',
      '소고기': '쇠고기',
      '오징어': '오징어',
      '조개류': '조개류',
      '조개': '조개류'
    };

    const allergenSet = new Set();
    const allergenDetails = [];
    let productName = '';

    items.forEach((item) => {
      const allergenName = item.querySelector('ALG_CSG_MTR_NM')?.textContent || '';
      productName = item.querySelector('PRDCT_NM')?.textContent || '알 수 없는 제품';

      if (allergenName) {
        allergenDetails.push(allergenName);

        // 19개 주요 알레르기 항목으로 매핑
        const mappedAllergen = allergenMapping[allergenName];
        if (mappedAllergen) {
          allergenSet.add(mappedAllergen);
          console.log(`✓ 알레르기 감지: ${allergenName} -> ${mappedAllergen}`);
        } else {
          // 매핑되지 않은 항목도 그대로 추가
          allergenSet.add(allergenName);
          console.log(`⚠ 매핑되지 않은 알레르기: ${allergenName}`);
        }
      }
    });

    const allergens = Array.from(allergenSet);

    console.log(`최종 알레르기 목록 (${allergens.length}개):`, allergens);

    return {
      barcode: barcode,
      name: productName,
      brand: '식약처 데이터',
      price: '정보 없음',
      ingredients: allergenDetails,
      allergens: allergens,
      warnings: allergens.length > 0
        ? `이 제품에는 ${allergens.join(', ')}이(가) 포함되어 있습니다.`
        : '알레르기 정보가 없습니다.',
      nutrition: {
        calories: '정보 없음',
        sodium: '정보 없음',
        carbs: '정보 없음',
        sugars: '정보 없음',
        fat: '정보 없음',
        protein: '정보 없음'
      },
      apiSource: 'foodsafety',
      rawAllergenData: allergenDetails
    };

  } catch (error) {
    console.error('식약처 API 호출 오류:', error);
    return null;
  }
};

/**
 * HACCP API에서 제품 정보 조회 (푸드QR API 폴백)
 * @param {string} barcode - 제품 바코드 번호
 * @returns {Promise<Object>} 제품 정보 객체
 */
const fetchFromHACCPAPI = async (barcode) => {
  try {
    // 바코드 정규화
    let normalizedBarcode = barcode;

    // 14자리이고 0으로 시작하는 경우 앞의 0 제거
    if (barcode.length === 14 && barcode.startsWith('0')) {
      normalizedBarcode = barcode.substring(1);
      console.log(`HACCP - 바코드 정규화: ${barcode} (14자리) -> ${normalizedBarcode} (13자리)`);
    }
    // 13자리이지만 0으로 시작하고 880으로 시작하지 않는 경우 (잘못된 바코드)
    else if (barcode.length === 13 && barcode.startsWith('0') && !barcode.startsWith('088')) {
      normalizedBarcode = barcode.substring(1);
      console.log(`HACCP - 바코드 정규화 (13자리 오류 수정): ${barcode} -> ${normalizedBarcode} (12자리)`);
    }
    // 13자리이고 정상적인 경우
    else if (barcode.length === 13) {
      normalizedBarcode = barcode;
      console.log(`HACCP - 바코드 정상: ${barcode} (13자리)`);
    }
    // 12자리인 경우 그대로 사용
    else if (barcode.length === 12 || barcode.length === 8) {
      normalizedBarcode = barcode;
      console.log(`HACCP - 바코드 정상: ${barcode} (${barcode.length}자리)`);
    }
    else {
      console.warn(`HACCP - 비표준 바코드 길이: ${barcode.length}자리 - ${barcode}`);
    }

    console.log(`HACCP API - 원본 바코드: ${barcode}, 정규화된 바코드: ${normalizedBarcode}`);

    // HACCP API 엔드포인트 (한국식품안전관리인증원)
    // GitHub Pages 배포 시 프록시를 사용할 수 없으므로 직접 API 호출
    const url = `https://apis.data.go.kr/B553748/CertImgListService/getCertImgListService?serviceKey=${API_KEY}&pageNo=1&numOfRows=10&bar_cd=${normalizedBarcode}`;

    console.log(`HACCP API 호출: 바코드 ${normalizedBarcode}`);

    const response = await fetch(url);
    const xmlText = await response.text();

    console.log('HACCP API 응답 (XML):', xmlText);

    // XML 파싱
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // 에러 체크
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('XML 파싱 오류:', parseError.textContent);
      return null;
    }

    // 응답 헤더 확인
    const resultCode = xmlDoc.querySelector('resultCode')?.textContent;
    const resultMsg = xmlDoc.querySelector('resultMsg')?.textContent;

    console.log(`HACCP API 응답 코드: ${resultCode}, 메시지: ${resultMsg}`);

    if (resultCode !== '00') {
      console.warn(`HACCP API 오류: ${resultMsg}`);
      return null;
    }

    // 아이템 가져오기
    const items = xmlDoc.querySelectorAll('item');

    if (items.length === 0) {
      console.log('HACCP API에서 제품 정보를 찾지 못했습니다.');
      return null;
    }

    const item = items[0]; // 첫 번째 아이템 사용

    // 제품 정보 추출
    const productName = item.querySelector('PRDLST_NM')?.textContent ||
                       item.querySelector('PRDCT_NM')?.textContent ||
                       '알 수 없는 제품';
    const manufacturer = item.querySelector('BSSH_NM')?.textContent ||
                        item.querySelector('ENTRPS_NM')?.textContent ||
                        '정보 없음';

    // 알레르기 정보가 포함된 필드들 (API마다 다를 수 있음)
    const allergyFields = [
      item.querySelector('ALLERGY_INFO')?.textContent,
      item.querySelector('ALLRGY_INFO')?.textContent,
      item.querySelector('ALLRGY_PRDLST_INFO')?.textContent,
      item.querySelector('RAWMTRL_NM')?.textContent, // 원재료명
      item.querySelector('PRDLST_DCNTS')?.textContent, // 제품설명
      item.querySelector('CSTDY_ASORT_MATR')?.textContent, // 보관방법
    ];

    // 모든 필드를 합쳐서 알레르기 정보 추출
    const combinedText = allergyFields.filter(f => f).join(' ');
    console.log('HACCP API 텍스트 데이터:', combinedText);

    // 텍스트에서 알레르기 정보 추출
    const allergens = extractAllergensFromText(combinedText);

    console.log(`HACCP API에서 추출한 알레르기 목록 (${allergens.length}개):`, allergens);

    // 원재료 정보 추출
    const rawMaterialText = item.querySelector('RAWMTRL_NM')?.textContent || '';
    const ingredients = rawMaterialText ?
      rawMaterialText.split(/[,、]/).map(i => i.trim()).filter(i => i) :
      [];

    return {
      barcode: barcode,
      name: productName,
      brand: manufacturer,
      price: '정보 없음',
      ingredients: ingredients,
      allergens: allergens,
      warnings: allergens.length > 0
        ? `이 제품에는 ${allergens.join(', ')}이(가) 포함되어 있을 수 있습니다.`
        : '알레르기 정보를 확인할 수 없습니다. 제품 포장지를 직접 확인해주세요.',
      nutrition: {
        calories: '정보 없음',
        sodium: '정보 없음',
        carbs: '정보 없음',
        sugars: '정보 없음',
        fat: '정보 없음',
        protein: '정보 없음'
      },
      apiSource: 'haccp',
      rawAllergenText: combinedText
    };

  } catch (error) {
    console.error('HACCP API 호출 오류:', error);
    return null;
  }
};

/**
 * 바코드로 제품 정보 조회
 * @param {string} barcode - 제품 바코드 번호
 * @returns {Promise<Object>} 제품 정보 객체
 */
export const getProductByBarcode = async (barcode) => {
  try {
    console.log(`바코드 ${barcode} 조회 중...`);

    // 1. 먼저 식약처 푸드QR API 호출 시도
    const apiProduct = await fetchFromFoodSafetyAPI(barcode);

    if (apiProduct) {
      console.log('✅ 식약처 푸드QR API에서 제품 정보를 찾았습니다:', apiProduct.name);
      return apiProduct;
    }

    console.log('⚠️ 식약처 푸드QR API에서 제품을 찾지 못했습니다.');

    // 2. HACCP API로 폴백 시도
    console.log('📋 HACCP API로 재시도합니다...');
    const haccpProduct = await fetchFromHACCPAPI(barcode);

    if (haccpProduct) {
      console.log('✅ HACCP API에서 제품 정보를 찾았습니다:', haccpProduct.name);
      return haccpProduct;
    }

    console.log('⚠️ HACCP API에서도 제품을 찾지 못했습니다. 로컬 DB를 확인합니다.');

    // 실제 제품 데이터베이스 (한국 제품 바코드 매핑)
    const productDatabase = {
      '8801019606557': {
        barcode: '8801019606557',
        name: '새우깡',
        brand: '농심',
        price: '1,500원',
        ingredients: ['밀가루', '새우', '식물성유지', '설탕', '소금', '조미료(L-글루타민산나트륨)', '카제인나트륨(우유)'],
        allergens: ['새우', '밀', '우유', '대두'],
        warnings: '같은 시설에서 계란, 게를 사용한 제품을 제조하고 있습니다.',
        nutrition: {
          calories: '480kcal',
          sodium: '450mg',
          carbs: '60g',
          sugars: '5g',
          fat: '22g',
          protein: '8g'
        }
      },
      '8801062638857': {
        barcode: '8801062638857',
        name: '오리온 초코파이',
        brand: '오리온',
        price: '2,800원',
        ingredients: ['밀가루', '설탕', '식물성유지', '계란', '코코아분말', '유당', '버터', '우유'],
        allergens: ['밀', '계란', '우유', '대두'],
        warnings: '같은 시설에서 땅콩, 견과류를 사용한 제품을 제조하고 있습니다.',
        nutrition: {
          calories: '168kcal',
          sodium: '60mg',
          carbs: '21g',
          sugars: '12g',
          fat: '8g',
          protein: '2g'
        }
      },
      '8801047012634': {
        barcode: '8801047012634',
        name: '서울우유',
        brand: '서울우유협동조합',
        price: '3,000원',
        ingredients: ['원유 100%'],
        allergens: ['우유'],
        warnings: '유당불내증이 있는 경우 주의하시기 바랍니다.',
        nutrition: {
          calories: '130kcal',
          sodium: '100mg',
          carbs: '11g',
          sugars: '11g',
          fat: '7.5g',
          protein: '6.4g'
        }
      },
      '8801019312007': {
        barcode: '8801019312007',
        name: '계란과자',
        brand: '농심',
        price: '1,200원',
        ingredients: ['밀가루', '계란', '설탕', '식물성유지', '버터', '우유'],
        allergens: ['밀', '계란', '우유', '대두'],
        warnings: '같은 시설에서 땅콩을 사용한 제품을 제조하고 있습니다.',
        nutrition: {
          calories: '520kcal',
          sodium: '220mg',
          carbs: '65g',
          sugars: '18g',
          fat: '24g',
          protein: '9g'
        }
      },
      '8801043001274': {
        barcode: '8801043001274',
        name: '땅콩버터',
        brand: '청우식품',
        price: '4,500원',
        ingredients: ['땅콩', '식물성유지', '설탕', '소금'],
        allergens: ['땅콩'],
        warnings: '심각한 땅콩 알레르기가 있는 경우 섭취하지 마세요. 아나필락시스 위험이 있습니다.',
        nutrition: {
          calories: '588kcal',
          sodium: '280mg',
          carbs: '20g',
          sugars: '9g',
          fat: '50g',
          protein: '25g'
        }
      },
      '8801007325224': {
        barcode: '8801007325224',
        name: '비비고 왕교자',
        brand: 'CJ제일제당',
        price: '6,500원',
        ingredients: ['돼지고기', '양배추', '밀가루', '부추', '양파', '대두유', '간장(대두)', '참기름', '마늘', '생강'],
        allergens: ['돼지고기', '밀', '대두'],
        warnings: '같은 시설에서 우유, 계란, 새우를 사용한 제품을 제조하고 있습니다.',
        nutrition: {
          calories: '280kcal',
          sodium: '520mg',
          carbs: '28g',
          sugars: '3g',
          fat: '12g',
          protein: '11g'
        }
      }
    };

    // 3. 로컬 DB에서 제품 조회 (바코드 정규화)
    let normalizedBarcode = barcode;

    // 14자리 -> 13자리 정규화
    if (barcode.length === 14 && barcode.startsWith('0')) {
      normalizedBarcode = barcode.substring(1);
      console.log(`로컬 DB - 바코드 정규화: ${barcode} -> ${normalizedBarcode}`);
    }
    // 13자리이지만 잘못된 형식 -> 12자리 정규화
    else if (barcode.length === 13 && barcode.startsWith('0') && !barcode.startsWith('088')) {
      normalizedBarcode = barcode.substring(1);
      console.log(`로컬 DB - 바코드 정규화 (오류 수정): ${barcode} -> ${normalizedBarcode}`);
    }

    const product = productDatabase[barcode] || productDatabase[normalizedBarcode];

    if (product) {
      console.log('로컬 DB에서 제품 정보를 찾았습니다:', product.name);
      return { ...product, apiSource: 'local' };
    }

    // 3. 제품을 찾지 못한 경우
    console.warn('제품 정보를 찾을 수 없습니다. 기본 정보를 반환합니다.');
    return {
      barcode: barcode,
      name: '알 수 없는 제품',
      brand: '정보 없음',
      price: '정보 없음',
      ingredients: ['제품 정보를 확인할 수 없습니다'],
      allergens: [],
      warnings: '제품 정보를 확인할 수 없습니다. 제조사에 직접 문의하시거나 제품 포장의 표시사항을 확인하시기 바랍니다.',
      nutrition: {
        calories: '정보 없음',
        sodium: '정보 없음',
        carbs: '정보 없음',
        sugars: '정보 없음',
        fat: '정보 없음',
        protein: '정보 없음'
      },
      notFound: true,
      apiSource: 'none'
    };
  } catch (error) {
    console.error('제품 조회 오류:', error);
    throw new Error('제품 정보를 불러오는 데 실패했습니다.');
  }
};
