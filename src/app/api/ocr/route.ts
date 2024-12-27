import { NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 400 }
      );
    }

    // ログ記録
    await prisma.processingLog.create({
      data: {
        level: 'info',
        module: 'OCR',
        message: 'OCR処理開始',
        data: JSON.stringify({ fileName: file.name, fileSize: file.size })
      }
    });

    // ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Tesseract Workerの作成（初期化パラメータを追加）
    const worker = await createWorker({
      logger: progress => {
        console.log('OCR Progress:', progress);
      },
      errorHandler: error => {
        console.error('OCR Error:', error);
      },
      langPath: 'https://raw.githubusercontent.com/naptha/tessdata/4.0.0',
    });

    try {
      // 言語の設定
      await worker.loadLanguage('jpn');
      await worker.initialize('jpn');

      // OCR処理の実行
      const { data } = await worker.recognize(buffer);
      
      // 結果をログに記録
      await prisma.processingLog.create({
        data: {
          level: 'info',
          module: 'OCR',
          message: 'OCR処理完了',
          data: JSON.stringify({ 
            confidence: data.confidence,
            textLength: data.text.length 
          })
        }
      });

      // Workerの終了
      await worker.terminate();

      return NextResponse.json({
        text: data.text,
        confidence: data.confidence / 100
      });

    } catch (error) {
      // エラーをログに記録
      await prisma.processingLog.create({
        data: {
          level: 'error',
          module: 'OCR',
          message: 'OCR処理エラー',
          data: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
        }
      });

      throw error;
    }

  } catch (error) {
    console.error('OCR処理エラー:', error);
    return NextResponse.json(
      { error: 'OCR処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 