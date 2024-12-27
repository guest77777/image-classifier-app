import { logManager } from './log-manager';
import { textClassifier, ClassificationResult } from './text-classifier';

export interface OCRResult {
  text: string;
  confidence: number;
  classification?: ClassificationResult;
  error?: string;
}

export interface OCRProcessOptions {
  language?: string;
  enhanceImage?: boolean;
  timeout?: number;
}

export class OCRProcessor {
  private static instance: OCRProcessor;
  private readonly MODULE_NAME = 'OCRProcessor';
  private readonly DEFAULT_OPTIONS: OCRProcessOptions = {
    language: 'ja',
    enhanceImage: true,
    timeout: 30000 // 30秒
  };

  private constructor() {}

  static getInstance(): OCRProcessor {
    if (!OCRProcessor.instance) {
      OCRProcessor.instance = new OCRProcessor();
    }
    return OCRProcessor.instance;
  }

  // 画像の前処理
  private async preprocessImage(imageData: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(imageData);
    });
  }

  // 画像の品質向上
  private async enhanceImage(img: HTMLImageElement): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // キャンバスのサイズを設定
    canvas.width = img.width;
    canvas.height = img.height;

    // 画像を描画
    ctx.drawImage(img, 0, 0);

    // グレースケール変換とコントラスト強調
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // グレースケール変換
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      
      // コントラスト強調
      const contrast = 1.2; // コントラスト係数
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const newValue = factor * (gray - 128) + 128;
      
      data[i] = data[i + 1] = data[i + 2] = newValue;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // OCR処理の実行
  async processImage(file: File, options?: OCRProcessOptions): Promise<OCRResult> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      logManager.info(this.MODULE_NAME, 'OCR処理開始', { fileName: file.name });

      // 画像の前処理
      const img = await this.preprocessImage(file);
      
      // 画質向上処理（オプション）
      const processedImage = opts.enhanceImage ? 
        await this.enhanceImage(img) : 
        img;

      // TODO: ここで実際のOCRエンジン（例：Tesseract.js）を使用してテキスト抽出
      // 現在はダミーの実装
      const ocrResult = await this.mockOCRProcess(processedImage);

      // テキストの分類
      const classification = await textClassifier.classifyText(ocrResult.text);

      const processingTime = Date.now() - startTime;
      logManager.info(this.MODULE_NAME, 'OCR処理完了', { 
        processingTime,
        confidence: ocrResult.confidence 
      });

      return {
        ...ocrResult,
        classification
      };

    } catch (error) {
      logManager.error(this.MODULE_NAME, 'OCR処理中にエラーが発生', error);
      return {
        text: '',
        confidence: 0,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  // 複数画像の一括処理
  async processBatch(files: File[], options?: OCRProcessOptions): Promise<OCRResult[]> {
    try {
      logManager.info(this.MODULE_NAME, '一括処理開始', { fileCount: files.length });
      
      const results = await Promise.all(
        files.map(file => this.processImage(file, options))
      );

      logManager.info(this.MODULE_NAME, '一括処理完了', { 
        successCount: results.filter(r => !r.error).length,
        errorCount: results.filter(r => r.error).length
      });

      return results;
    } catch (error) {
      logManager.error(this.MODULE_NAME, '一括処理中にエラーが発生', error);
      return files.map(() => ({
        text: '',
        confidence: 0,
        error: error instanceof Error ? error.message : '不明なエラー'
      }));
    }
  }

  // OCRエンジンのモック実装（開発用）
  private async mockOCRProcess(image: HTMLImageElement | HTMLCanvasElement): Promise<OCRResult> {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 処理時間をシミュレート

    return {
      text: '株式会社テスト\n補助金交付申請書\n2024年1月1日\n事業名：AI開発プロジェクト\n申請金額：1,000,000円',
      confidence: 0.95
    };
  }
}

export const ocrProcessor = OCRProcessor.getInstance(); 