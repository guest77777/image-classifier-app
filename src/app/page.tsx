'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

export default function Home() {
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [prediction, setPrediction] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // モデルの初期化
  useEffect(() => {
    const loadModel = async () => {
      try {
        const loadedModel = await mobilenet.load();
        setModel(loadedModel);
      } catch (error) {
        console.error('モデルの読み込みに失敗しました:', error);
      }
    };
    loadModel();
  }, []);

  // 画像の分類
  const classifyImage = async (imageElement: HTMLImageElement) => {
    if (!model) return;
    
    try {
      const predictions = await model.classify(imageElement);
      if (predictions && predictions.length > 0) {
        setPrediction(`${predictions[0].className} (${Math.round(predictions[0].probability * 100)}%)`);
      }
    } catch (error) {
      console.error('画像の分類に失敗しました:', error);
      setPrediction('エラー: 画像の分類に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ドロップゾーンの設定
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsLoading(true);
    setPrediction('');

    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => classifyImage(img);
    };

    reader.readAsDataURL(file);
  }, [model]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    multiple: false
  });

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">画像分類アプリ</h1>
      
      <div
        {...getRootProps()}
        className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-500">ここにドロップしてください</p>
        ) : (
          <p>クリックまたはドラッグ＆ドロップで画像をアップロード</p>
        )}
      </div>

      {isLoading && (
        <div className="mt-4 text-center text-gray-600">
          分類中...
        </div>
      )}

      {prediction && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <h2 className="font-bold mb-2">分類結果:</h2>
          <p>{prediction}</p>
        </div>
      )}
    </div>
  );
}
