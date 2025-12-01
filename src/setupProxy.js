const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // 식약처 푸드QR API 프록시
  app.use(
    '/api/food',
    createProxyMiddleware({
      target: 'http://apis.data.go.kr',
      changeOrigin: true,
      pathRewrite: {
        '^/api/food': '/1471000/FoodQrInfoService01',
      },
    })
  );

  // HACCP API 프록시 (한국식품안전관리인증원)
  app.use(
    '/api/haccp',
    createProxyMiddleware({
      target: 'http://apis.data.go.kr',
      changeOrigin: true,
      pathRewrite: {
        '^/api/haccp': '/B553748/CertImgListService',
      },
    })
  );

  // 기존 API 프록시
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://mintai.gonetis.com:8888',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '',
      },
    })
  );
};
