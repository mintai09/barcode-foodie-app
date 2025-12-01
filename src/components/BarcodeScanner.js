import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Quagga from 'quagga';
import '../styles/BarcodeScanner.css';

function BarcodeScanner({ onBarcodeScanned, speak }) {
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const html5QrcodeRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  const fileInputRef = useRef(null);

  // 한국 바코드 검증 및 정제 함수
  const validateAndCleanBarcode = (rawBarcode) => {
    console.log('📥 원본 스캔 데이터:', rawBarcode);

    // 1. 숫자만 추출
    const numericOnly = rawBarcode.replace(/\D/g, '');
    console.log('🔢 숫자만 추출:', numericOnly);

    // 2. 길이 검증
    if (numericOnly.length < 8) {
      console.warn('❌ 바코드가 너무 짧습니다:', numericOnly.length, '자리');
      return null;
    }

    // 3. 14자리인 경우 13자리로 정규화 (앞의 0 제거)
    if (numericOnly.length === 14 && numericOnly.startsWith('0')) {
      const normalized = numericOnly.substring(1);
      console.log('🔧 14자리 -> 13자리 정규화:', numericOnly, '->', normalized);
      return normalized;
    }

    // 4. 한국 바코드 표준 검증
    // EAN-13: 13자리, 한국 제품은 880으로 시작
    // EAN-8: 8자리
    // UPC-A: 12자리

    if (numericOnly.length === 13) {
      if (numericOnly.startsWith('880')) {
        console.log('✅ 한국 EAN-13 바코드:', numericOnly);
        return numericOnly;
      } else {
        console.log('⚠️ 해외 EAN-13 바코드:', numericOnly);
        return numericOnly; // 해외 제품도 허용
      }
    }

    if (numericOnly.length === 8) {
      console.log('✅ EAN-8 바코드:', numericOnly);
      return numericOnly;
    }

    if (numericOnly.length === 12) {
      console.log('✅ UPC-A 바코드:', numericOnly);
      return numericOnly;
    }

    // 5. 잘못 인식된 경우 처리
    if (numericOnly.length > 14) {
      // 14자리 추출 후 정규화 시도
      const extracted14 = numericOnly.substring(0, 14);
      if (extracted14.startsWith('0')) {
        const normalized = extracted14.substring(1);
        console.log('🔧 14자리로 추출 후 정규화:', normalized);
        return normalized;
      }

      // 13자리 추출 시도
      const extracted13 = numericOnly.substring(0, 13);
      if (extracted13.startsWith('880')) {
        console.log('🔧 13자리로 보정:', extracted13);
        return extracted13;
      }

      // 뒤에서 13자리 추출 시도
      const extracted13End = numericOnly.substring(numericOnly.length - 13);
      if (extracted13End.startsWith('880')) {
        console.log('🔧 뒤에서 13자리 보정:', extracted13End);
        return extracted13End;
      }
    }

    console.warn('⚠️ 비표준 바코드, 그대로 사용:', numericOnly);
    return numericOnly;
  };

  useEffect(() => {
    speak('바코드 스캔 화면입니다. 제품 뒷면 하단의 바코드를 카메라에 비추거나, 수동으로 입력해주세요.');

    const startScanner = async () => {
      try {
        // Html5Qrcode 인스턴스 생성
        html5QrcodeRef.current = new Html5Qrcode('barcode-reader');

        // 카메라 목록 가져오기
        const devices = await Html5Qrcode.getCameras();
        console.log('📷 사용 가능한 카메라:', devices);

        if (devices && devices.length > 0) {
          // 후면 카메라 우선 선택
          const backCamera = devices.find(device =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('후면') ||
            device.label.toLowerCase().includes('환경')
          ) || devices[devices.length - 1]; // 마지막 카메라 사용 (보통 후면)

          console.log('✅ 선택된 카메라:', backCamera.label);

          // 스캐너 시작 - 한국 바코드 최적화 설정
          await html5QrcodeRef.current.start(
            backCamera.id,
            {
              fps: 10, // 초당 10프레임 스캔
              qrbox: { width: 320, height: 100 }, // 바코드 형태에 맞게 가로로 넓게
              aspectRatio: 3.2, // 바코드 비율
              disableFlip: false,
              videoConstraints: {
                facingMode: 'environment', // 후면 카메라
                width: { ideal: 1920 }, // 고해상도
                height: { ideal: 1080 }
              }
            },
            (decodedText, decodedResult) => {
              const now = Date.now();

              // 중복 스캔 방지 (500ms 내 같은 바코드 무시)
              if (now - lastScanTimeRef.current < 500) {
                return;
              }

              console.log('📊 Raw 스캔 결과:', {
                text: decodedText,
                format: decodedResult.result.format?.formatName || 'unknown'
              });

              // 바코드 검증 및 정제
              const validatedBarcode = validateAndCleanBarcode(decodedText);

              if (!validatedBarcode) {
                console.warn('❌ 유효하지 않은 바코드, 재시도');
                return;
              }

              // 중복 바코드 체크
              if (validatedBarcode === lastScannedCode) {
                console.log('⏭️ 중복 바코드 무시');
                return;
              }

              lastScanTimeRef.current = now;
              setLastScannedCode(validatedBarcode);

              console.log('✅ 최종 바코드:', validatedBarcode);
              speak(`바코드 ${validatedBarcode}를 스캔했습니다.`);
              onBarcodeScanned(validatedBarcode);

              // 스캔 후 카메라 중지
              if (html5QrcodeRef.current) {
                html5QrcodeRef.current.stop().catch(err =>
                  console.log('Scanner stop error:', err)
                );
              }
            },
            (errorMessage) => {
              // 스캔 실패는 무시 (계속 시도)
            }
          );

          setIsScanning(true);
        } else {
          console.error('카메라를 찾을 수 없습니다.');
          speak('카메라를 찾을 수 없습니다. 수동으로 바코드를 입력해주세요.');
        }
      } catch (error) {
        console.error('Camera start error:', error);
        speak('카메라 시작에 실패했습니다. 수동으로 바코드를 입력해주세요.');
      }
    };

    startScanner();

    // 컴포넌트 언마운트 시 스캐너 정리
    return () => {
      if (html5QrcodeRef.current && isScanning) {
        html5QrcodeRef.current.stop().catch(err =>
          console.log('Cleanup error:', err)
        );
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      speak(`바코드 ${manualBarcode}를 분석합니다.`);
      onBarcodeScanned(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  const handleTestScan = (barcode, productName) => {
    speak(`${productName} 샘플을 스캔합니다.`);
    onBarcodeScanned(barcode);
  };

  // 바코드 영역 감지 (흰 배경 + 검은 수직선 패턴 찾기)
  const detectBarcodeRegions = (canvas, width, height) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const barcodeRegions = [];
    const scanStep = 10; // 성능을 위해 10픽셀마다 스캔

    console.log('🔍 바코드 패턴 감지 시작...');

    // 각 행을 스캔하여 수직선 패턴 찾기
    for (let y = 0; y < height; y += scanStep) {
      let transitions = 0; // 흑백 전환 횟수
      let lastBrightness = 0;
      let regionStart = -1;

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        // 밝기 차이가 크면 (흑백 전환) 카운트
        if (Math.abs(brightness - lastBrightness) > 50) {
          transitions++;
          if (regionStart === -1) regionStart = x;
        }

        lastBrightness = brightness;
      }

      // 바코드는 보통 30번 이상의 흑백 전환이 있음
      if (transitions > 30) {
        barcodeRegions.push({
          y: y,
          transitions: transitions
        });
      }
    }

    if (barcodeRegions.length === 0) {
      console.log('⚠️ 바코드 패턴을 찾지 못했습니다');
      return null;
    }

    // 가장 많은 전환이 있는 영역 찾기 (바코드 중심)
    barcodeRegions.sort((a, b) => b.transitions - a.transitions);
    const centerY = barcodeRegions[0].y;

    // 바코드 높이 추정 (보통 이미지의 10-20% 정도)
    const estimatedHeight = Math.min(Math.floor(height * 0.2), 200);
    const startY = Math.max(0, centerY - estimatedHeight / 2);
    const endY = Math.min(height, centerY + estimatedHeight / 2);

    // X축으로 바코드 경계 찾기 (왼쪽과 오른쪽 여백 제거)
    let leftBound = 0;
    let rightBound = width;

    // 중앙 행의 픽셀을 스캔하여 바코드 시작/끝 찾기
    const midY = Math.floor((startY + endY) / 2);
    let foundStart = false;

    for (let x = 0; x < width; x++) {
      const idx = (midY * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      if (!foundStart && brightness < 200) {
        leftBound = Math.max(0, x - 20); // 여유 공간
        foundStart = true;
      }
    }

    for (let x = width - 1; x >= 0; x--) {
      const idx = (midY * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      if (brightness < 200) {
        rightBound = Math.min(width, x + 20); // 여유 공간
        break;
      }
    }

    const barcodeWidth = rightBound - leftBound;
    const barcodeHeight = endY - startY;

    // 유효성 검사: 최소 크기 확인
    if (barcodeWidth < 50 || barcodeHeight < 20) {
      console.log(`⚠️ 감지된 영역이 너무 작음: w=${barcodeWidth}, h=${barcodeHeight}`);
      return null;
    }

    // 유효성 검사: 비율 확인 (바코드는 가로로 긴 형태)
    const aspectRatio = barcodeWidth / barcodeHeight;
    if (aspectRatio < 1.5 || aspectRatio > 10) {
      console.log(`⚠️ 비정상적인 바코드 비율: ${aspectRatio.toFixed(2)}`);
      return null;
    }

    console.log(`✅ 바코드 영역 감지됨: x=${leftBound}, y=${startY}, w=${barcodeWidth}, h=${barcodeHeight}`);
    console.log(`📊 전환 횟수: ${barcodeRegions[0].transitions}, 비율: ${aspectRatio.toFixed(2)}`);

    return {
      x: leftBound,
      y: startY,
      width: barcodeWidth,
      height: barcodeHeight
    };
  };

  // 이미지를 여러 영역으로 분할하여 크롭된 버전들 생성
  const createImageRegions = (canvas, width, height) => {
    const regions = [];

    // 먼저 바코드 패턴 감지 시도
    const barcodeRegion = detectBarcodeRegions(canvas, width, height);

    // 바코드 영역이 감지되면 해당 영역을 최우선으로 추가
    if (barcodeRegion && barcodeRegion.width > 0 && barcodeRegion.height > 0) {
      try {
        const barcodeCanvas = document.createElement('canvas');
        barcodeCanvas.width = barcodeRegion.width;
        barcodeCanvas.height = barcodeRegion.height;
        const barcodeCtx = barcodeCanvas.getContext('2d');

        barcodeCtx.drawImage(
          canvas,
          barcodeRegion.x, barcodeRegion.y, barcodeRegion.width, barcodeRegion.height,
          0, 0, barcodeRegion.width, barcodeRegion.height
        );

        regions.push({
          name: 'detected_barcode',
          canvas: barcodeCanvas,
          description: '🎯 감지된 바코드 영역 (최우선)'
        });

        // 감지된 영역의 확대 버전도 추가
        const zoomedCanvas = document.createElement('canvas');
        const zoomFactor = 1.5;
        zoomedCanvas.width = Math.floor(barcodeRegion.width * zoomFactor);
        zoomedCanvas.height = Math.floor(barcodeRegion.height * zoomFactor);
        const zoomedCtx = zoomedCanvas.getContext('2d');

        zoomedCtx.drawImage(
          canvas,
          barcodeRegion.x, barcodeRegion.y, barcodeRegion.width, barcodeRegion.height,
          0, 0, zoomedCanvas.width, zoomedCanvas.height
        );

        regions.push({
          name: 'detected_barcode_zoomed',
          canvas: zoomedCanvas,
          description: '🔍 감지된 영역 확대 (1.5배)'
        });

        console.log('✅ 바코드 영역 2개 추가됨 (원본 + 확대)');
      } catch (err) {
        console.log('⚠️ 바코드 영역 처리 중 오류:', err.message);
      }
    }

    // 전체 이미지
    regions.push({
      name: 'full',
      canvas: canvas,
      description: '전체 이미지'
    });

    // 3x3 그리드로 영역 분할
    const gridRows = 3;
    const gridCols = 3;
    const regionWidth = Math.floor(width / gridCols);
    const regionHeight = Math.floor(height / gridRows);

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x = col * regionWidth;
        const y = row * regionHeight;

        const regionCanvas = document.createElement('canvas');
        regionCanvas.width = regionWidth;
        regionCanvas.height = regionHeight;
        const regionCtx = regionCanvas.getContext('2d');

        // 해당 영역만 크롭
        regionCtx.drawImage(
          canvas,
          x, y, regionWidth, regionHeight,
          0, 0, regionWidth, regionHeight
        );

        regions.push({
          name: `grid_${row}_${col}`,
          canvas: regionCanvas,
          description: `영역 (행${row + 1}, 열${col + 1})`
        });
      }
    }

    // 상단/중단/하단 가로 스트립 (바코드는 보통 가로로 긴 형태)
    const stripHeight = Math.floor(height / 3);
    ['top', 'middle', 'bottom'].forEach((position, idx) => {
      const stripCanvas = document.createElement('canvas');
      stripCanvas.width = width;
      stripCanvas.height = stripHeight;
      const stripCtx = stripCanvas.getContext('2d');

      const y = idx * stripHeight;
      stripCtx.drawImage(
        canvas,
        0, y, width, stripHeight,
        0, 0, width, stripHeight
      );

      regions.push({
        name: `strip_${position}`,
        canvas: stripCanvas,
        description: `${position === 'top' ? '상단' : position === 'middle' ? '중단' : '하단'} 스트립`
      });
    });

    // 중앙 확대 영역 (50% 중앙 부분)
    const centerWidth = Math.floor(width * 0.5);
    const centerHeight = Math.floor(height * 0.5);
    const centerX = Math.floor(width * 0.25);
    const centerY = Math.floor(height * 0.25);

    const centerCanvas = document.createElement('canvas');
    centerCanvas.width = centerWidth;
    centerCanvas.height = centerHeight;
    const centerCtx = centerCanvas.getContext('2d');

    centerCtx.drawImage(
      canvas,
      centerX, centerY, centerWidth, centerHeight,
      0, 0, centerWidth, centerHeight
    );

    regions.push({
      name: 'center_zoom',
      canvas: centerCanvas,
      description: '중앙 확대 영역'
    });

    console.log(`✂️ 총 ${regions.length}개 영역 생성됨`);
    return regions;
  };

  // 이미지 전처리 및 영역별 스캔
  const preprocessAndScanImage = async (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        const width = img.width;
        const height = img.height;

        console.log(`📐 원본 이미지 크기: ${width}x${height}`);

        // Canvas 크기 설정
        canvas.width = width;
        canvas.height = height;

        // 이미지 그리기
        ctx.drawImage(img, 0, 0);

        // 대비 증가 및 선명도 향상
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // 대비 증가 (1.5배)
        const contrast = 1.5;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
          data[i] = factor * (data[i] - 128) + 128;     // R
          data[i + 1] = factor * (data[i + 1] - 128) + 128; // G
          data[i + 2] = factor * (data[i + 2] - 128) + 128; // B
        }

        ctx.putImageData(imageData, 0, 0);

        // 영역별로 분할된 이미지들 생성
        const regions = createImageRegions(canvas, width, height);

        // 전처리된 전체 이미지를 Blob으로 변환
        canvas.toBlob((blob) => {
          resolve({
            url: URL.createObjectURL(blob),
            width: width,
            height: height,
            canvas: canvas,
            regions: regions
          });
        }, 'image/jpeg', 0.95);
      };

      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Quagga를 사용하여 특정 영역에서 바코드 스캔
  const scanRegionWithQuagga = async (regionCanvas, regionName) => {
    return new Promise((resolve, reject) => {
      // Canvas를 Blob으로 변환
      regionCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Blob 변환 실패'));
          return;
        }

        const regionUrl = URL.createObjectURL(blob);

        const config = {
          src: regionUrl,
          numOfWorkers: 0,
          locate: true,
          inputStream: {
            size: Math.max(regionCanvas.width, regionCanvas.height)
          },
          decoder: {
            readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'upc_reader'],
            multiple: false
          },
          locator: {
            patchSize: 'medium',
            halfSample: false
          }
        };

        Quagga.decodeSingle(config, (result) => {
          URL.revokeObjectURL(regionUrl);

          if (result && result.codeResult) {
            console.log(`✅ ${regionName}에서 바코드 발견:`, result.codeResult.code);
            resolve(result.codeResult.code);
          } else {
            reject(new Error(`${regionName}에서 바코드를 찾지 못함`));
          }
        });
      }, 'image/jpeg', 0.95);
    });
  };

  // 이미지 파일에서 바코드 스캔 (Quagga.js 사용)
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    speak('이미지를 분석하고 있습니다.');
    setIsProcessingImage(true);

    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);

    try {
      console.log('📸 이미지 파일:', file.name, file.type, file.size, 'bytes');

      // 이미지 전처리 및 영역 분할
      console.log('🔧 이미지 전처리 및 영역 분할 중...');
      const processed = await preprocessAndScanImage(file);
      console.log('✅ 전처리 완료, 영역 개수:', processed.regions.length);

      let result = null;

      // 방법 1: 각 영역을 순차적으로 스캔
      try {
        console.log('🔍 방법 1: 영역별 바코드 탐지 시도...');

        for (let i = 0; i < processed.regions.length; i++) {
          const region = processed.regions[i];
          console.log(`🔎 영역 ${i + 1}/${processed.regions.length}: ${region.description} 스캔 중...`);

          try {
            result = await scanRegionWithQuagga(region.canvas, region.description);

            if (result) {
              console.log(`✅ 성공! ${region.description}에서 바코드 발견:`, result);
              break; // 바코드를 찾았으므로 중단
            }
          } catch (regionError) {
            console.log(`⚠️ ${region.description} 스캔 실패, 다음 영역 시도...`);
            // 계속 다음 영역 시도
          }
        }

        if (!result) {
          throw new Error('모든 영역에서 바코드를 찾지 못함');
        }

      } catch (quaggaError) {
        console.log('⚠️ 영역별 Quagga 스캔 실패, 전체 이미지로 Html5Qrcode 재시도...');

        // 방법 2: Html5Qrcode로 QR코드/바코드 스캔 시도
        try {
          const scannerId = 'barcode-reader-file-' + Date.now();
          const scannerDiv = document.createElement('div');
          scannerDiv.id = scannerId;
          scannerDiv.style.display = 'none';
          document.body.appendChild(scannerDiv);

          const html5QrCode = new Html5Qrcode(scannerId);
          result = await html5QrCode.scanFile(file, true);

          // 정리
          await html5QrCode.clear();
          document.body.removeChild(scannerDiv);

          console.log('✅ Html5Qrcode 스캔 성공:', result);
        } catch (qrError) {
          console.error('❌ Html5Qrcode도 실패:', qrError);
          throw new Error('바코드를 인식할 수 없습니다.');
        }
      }

      // 바코드 검증 및 정제
      const validatedBarcode = validateAndCleanBarcode(result);

      if (!validatedBarcode) {
        speak('바코드를 인식할 수 없습니다. 더 선명한 이미지를 사용해주세요.');
        setIsProcessingImage(false);
        setUploadedImage(null);
        URL.revokeObjectURL(imageUrl);
        return;
      }

      console.log('✅ 최종 바코드:', validatedBarcode);
      speak(`바코드 ${validatedBarcode}를 인식했습니다.`);

      // 바코드 스캔 완료 후 분석 시작
      setIsProcessingImage(false);
      onBarcodeScanned(validatedBarcode);

    } catch (error) {
      console.error('❌ 이미지 스캔 오류:', error);
      console.error('오류 상세:', error.message);

      // 정리
      setUploadedImage(null);
      URL.revokeObjectURL(imageUrl);
      setIsProcessingImage(false);

      speak('바코드를 인식할 수 없습니다. 바코드 번호를 직접 입력하거나, 더 선명한 이미지를 사용해주세요.');

      // 사용자에게 수동 입력 제안
      alert('⚠️ 바코드 인식 실패\n\n이미지에서 바코드를 인식하지 못했습니다.\n\n해결 방법:\n1. 바코드 부분만 확대한 선명한 이미지 사용\n2. 바코드가 수평으로 정렬된 이미지 사용\n3. 아래 "수동 입력"에서 바코드 번호 직접 입력\n\n바코드는 제품 뒷면 하단에 있는 13자리 숫자입니다.');
    }
  };

  const handleImageButtonClick = () => {
    speak('이미지 파일을 선택해주세요.');
    fileInputRef.current?.click();
  };

  // 샘플 제품 목록
  const sampleProducts = [
    { barcode: '8801019606557', name: '새우깡', icon: '🦐' },
    { barcode: '8801062638857', name: '초코파이', icon: '🍫' },
    { barcode: '8801047012634', name: '우유', icon: '🥛' },
    { barcode: '8801007325224', name: '비비고 왕교자', icon: '🥟' },
    { barcode: '8801019312007', name: '계란과자', icon: '🥚' },
    { barcode: '8801043001274', name: '땅콩버터', icon: '🥜' }
  ];

  return (
    <div className="barcode-scanner">
      <div className="scanner-card">
        <h2>바코드 스캔</h2>

        {/* html5-qrcode 스캐너가 렌더링될 영역 */}
        <div id="barcode-reader" className="scanner-area"></div>

        <div className="scanner-instructions">
          <h3>스캔 방법</h3>
          <ol>
            <li>제품을 손에 들고 뒷면을 확인하세요</li>
            <li>제품 하단에 있는 바코드를 찾으세요</li>
            <li>바코드를 화면 중앙의 가이드 라인에 맞춰주세요</li>
            <li>자동으로 스캔되면 분석이 시작됩니다</li>
          </ol>
        </div>

        <div className="divider">
          <span>또는</span>
        </div>

        {/* 이미지 업로드 섹션 */}
        <div className="image-upload-section">
          <h3>📷 이미지로 바코드 스캔</h3>
          <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
            💡 <strong>팁:</strong> 바코드 부분만 확대하고 수평으로 찍은 선명한 사진을 사용하세요
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            aria-label="바코드 이미지 선택"
          />
          <button
            type="button"
            onClick={handleImageButtonClick}
            className="upload-btn"
            disabled={isProcessingImage}
            aria-label="이미지 파일 선택하기"
          >
            {isProcessingImage ? '분석 중...' : '📁 이미지에서 바코드 찾기'}
          </button>
          {uploadedImage && (
            <div className="uploaded-image-preview">
              <img src={uploadedImage} alt="업로드된 바코드 이미지" />
              <p style={{ fontSize: '0.85em', color: '#999', marginTop: '5px' }}>
                바코드가 선명하게 보이지 않으면 수동 입력을 이용하세요
              </p>
            </div>
          )}
        </div>

        <div className="divider">
          <span>또는</span>
        </div>

        <form onSubmit={handleManualSubmit} className="manual-input-form">
          <h3>수동 입력</h3>
          <div className="manual-input-group">
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="바코드 번호 입력 (예: 8801234567890)"
              pattern="[0-9]*"
              maxLength="13"
              onFocus={() => speak('바코드 수동 입력')}
              aria-label="바코드 번호 입력"
            />
            <button
              type="submit"
              className="scan-btn"
              disabled={!manualBarcode.trim()}
              aria-label="바코드 분석하기"
            >
              분석하기
            </button>
          </div>
        </form>

        <div className="test-section">
          <h3>🧪 샘플 제품으로 테스트</h3>
          <p className="test-hint">다양한 제품으로 분석 결과를 미리 확인해보세요</p>
          <div className="sample-products">
            {sampleProducts.map((product) => (
              <button
                key={product.barcode}
                type="button"
                onClick={() => handleTestScan(product.barcode, product.name)}
                className="sample-btn"
                aria-label={`${product.name} 샘플 테스트`}
                onFocus={() => speak(`${product.name} 샘플 버튼`)}
              >
                <span className="sample-icon">{product.icon}</span>
                <span className="sample-name">{product.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="tips-card">
        <h3>💡 팁</h3>
        <ul>
          <li><strong>바코드 위치:</strong> 대부분의 제품은 후면 우측 하단에 바코드가 있습니다</li>
          <li><strong>조명:</strong> 밝은 곳에서 스캔하면 인식률이 높아집니다</li>
          <li><strong>거리:</strong> 카메라에서 10~20cm 거리를 유지하세요</li>
          <li><strong>안정성:</strong> 손을 안정적으로 유지하면 더 빨리 인식됩니다</li>
        </ul>
      </div>
    </div>
  );
}

export default BarcodeScanner;
