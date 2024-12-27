import { ImageAnnotatorClient } from '@google-cloud/vision';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  let client: ImageAnnotatorClient | null = null;
  console.log('Vision API: リクエスト開始');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      console.error('Vision API: ファイルが見つかりません');
      return NextResponse.json(
        { error: 'ファイルが見つかりません', success: false },
        { status: 400 }
      );
    }

    console.log('Vision API: ファイル名:', file.name);
    console.log('Vision API: ファイルサイズ:', file.size, 'bytes');
    console.log('Vision API: ファイルタイプ:', file.type);

    const buffer = await file.arrayBuffer();
    console.log('Vision API: バッファ変換完了');
    
    // 新しいクライアントを作成
    console.log('Vision API: クライアント初期化開始');
    client = new ImageAnnotatorClient();
    console.log('Vision API: クライアント初期化完了');
    
    // 画像の処理
    console.log('Vision API: テキスト検出開始');
    const [result] = await client.textDetection({
      image: { content: Buffer.from(buffer) },
      imageContext: {
        languageHints: ['ja', 'en'] // 日本語と英語を優先的に認識
      }
    });
    console.log('Vision API: テキスト検出完了');

    const text = result.fullTextAnnotation?.text || '';
    console.log('Vision API: 検出テキスト長:', text.length);
    console.log('Vision API: 検出テキスト:', text);

    // データベースに保存
    const savedImage = await prisma.processedImage.create({
      data: {
        fileName: file.name,
        filePath: file.name, // 一時的にファイル名と同じにする
        text: text,
        keywords: '', // 初期値は空文字列
      },
    });

    console.log('Vision API: データベースに保存完了:', savedImage.id);

    // クライアントをクリーンアップ
    if (client) {
      await client.close();
      client = null;
    }

    return NextResponse.json({ 
      text,
      imageId: savedImage.id,
      success: true 
    });
  } catch (error) {
    console.error('Vision API Error:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    console.error('Vision API: 詳細エラー:', errorMessage);
    
    // エラー時もクライアントをクリーンアップ
    if (client) {
      await client.close();
      client = null;
    }

    return NextResponse.json(
      { error: 'OCR処理に失敗しました', success: false },
      { status: 500 }
    );
  }
} 