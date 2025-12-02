// Netlify Function to proxy Food Safety API requests
exports.handler = async function(event, context) {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { barcode, serviceKey } = event.queryStringParameters;

    if (!barcode || !serviceKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'barcode and serviceKey are required' })
      };
    }

    // 식약처 API 호출
    const url = `https://apis.data.go.kr/1471000/FoodQrInfoService01/getFoodQrAllrgyInfo?serviceKey=${serviceKey}&pageNo=1&numOfRows=100&bar_cd=${barcode}`;

    const response = await fetch(url);
    const xmlText = await response.text();

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/xml'
      },
      body: xmlText
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
