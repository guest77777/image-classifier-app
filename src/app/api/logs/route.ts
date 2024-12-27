import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ログの取得
export async function GET() {
  try {
    const logs = await prisma.processingLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100 // 最新100件のみ取得
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('ログ取得エラー:', error);
    return NextResponse.json(
      { error: 'ログの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// ログの記録
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const log = await prisma.processingLog.create({
      data: {
        level: data.level,
        module: data.module,
        message: data.message,
        data: data.data ? JSON.stringify(data.data) : null
      }
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error('ログ記録エラー:', error);
    return NextResponse.json(
      { error: 'ログの記録に失敗しました' },
      { status: 500 }
    );
  }
}

// ログのクリア
export async function DELETE() {
  try {
    await prisma.processingLog.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ログ削除エラー:', error);
    return NextResponse.json(
      { error: 'ログの削除に失敗しました' },
      { status: 500 }
    );
  }
} 