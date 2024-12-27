import { OCRProcessor } from '@/components/OCRProcessor';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">画像分類アプリ</h1>
        <p className="text-gray-600 mb-8">
          画像をアップロードして、キーワードに基づいて自動的に分類します。
          分類された画像は、キーワード付きでまとめてダウンロードできます。
        </p>
        <OCRProcessor />
      </div>
    </main>
  );
}
