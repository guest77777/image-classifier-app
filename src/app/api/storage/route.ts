import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 全てのアイテムを取得
export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { uploadDate: 'desc' }
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('ストレージ取得エラー:', error);
    return NextResponse.json(
      { error: 'ストレージの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 新しいアイテムを保存
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const document = await prisma.document.create({
      data: {
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        text: data.ocrResult.text,
        confidence: data.ocrResult.confidence,
        category: data.category,
        metadata: JSON.stringify(data.metadata || {}),
        tags: data.tags?.join(',') || ''
      }
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('ストレージ保存エラー:', error);
    return NextResponse.json(
      { error: 'アイテムの保存に失敗しました' },
      { status: 500 }
    );
  }
}

// アイテムを削除
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    
    await prisma.document.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ストレージ削除エラー:', error);
    return NextResponse.json(
      { error: 'アイテムの削除に失敗しました' },
      { status: 500 }
    );
  }
}

// アイテムを更新
export async function PUT(request: Request) {
  try {
    const { id, updates } = await request.json();
    
    const document = await prisma.document.update({
      where: { id },
      data: {
        ...updates,
        metadata: updates.metadata ? JSON.stringify(updates.metadata) : undefined,
        tags: updates.tags ? updates.tags.join(',') : undefined
      }
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('ストレージ更新エラー:', error);
    return NextResponse.json(
      { error: 'アイテムの更新に失敗しました' },
      { status: 500 }
    );
  }
} 