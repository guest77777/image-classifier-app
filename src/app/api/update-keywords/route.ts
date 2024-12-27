import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { imageId, keywords } = await request.json();

    const updatedImage = await prisma.processedImage.update({
      where: { id: imageId },
      data: {
        keywords: keywords.join(','), // 配列をカンマ区切りの文字列に変換
      },
    });

    return NextResponse.json({ 
      success: true,
      image: updatedImage
    });
  } catch (error) {
    console.error('キーワード更新エラー:', error);
    return NextResponse.json(
      { error: 'キーワードの更新に失敗しました', success: false },
      { status: 500 }
    );
  }
} 