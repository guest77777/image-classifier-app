'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, Upload, X, Download, MoveRight, MoveLeft } from 'lucide-react';
import JSZip from 'jszip';

interface MatchedFile {
  name: string;
  text: string;
  matchedKeywords: string[];
  preview: string;
}

export function OCRProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const [matchedFiles, setMatchedFiles] = useState<MatchedFile[]>([]);
  const [unmatchedFiles, setUnmatchedFiles] = useState<MatchedFile[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: boolean }>({});
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const addDebugLog = useCallback((message: string) => {
    console.log(message);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setImageScale(prev => {
      const delta = -e.deltaY * 0.01;
      const newScale = Math.max(0.1, Math.min(5, prev + delta));
      return newScale;
    });
  }, []);

  const handleImageModalClose = useCallback(() => {
    setSelectedImage(null);
    setImageScale(1);
  }, []);

  const processFiles = async (files: File[]) => {
    const keywords = searchText
      .split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0);

    if (keywords.length === 0) {
      setError('検索するキーワードを入力してください（カンマ区切りで複数入力可能）');
      return;
    }

    addDebugLog(`処理開始: ${files.length}個のファイル`);
    setIsProcessing(true);
    setProgress(0);
    setStatus('準備中...');
    setError(null);

    try {
      const newMatched: MatchedFile[] = [];
      const newUnmatched: MatchedFile[] = [];
      let processedCount = 0;

      for (const file of files) {
        try {
          addDebugLog(`\n---\nファイル処理中: ${file.name}`);
          processedCount++;
          setProgress((processedCount / files.length) * 100);
          setStatus(`ファイル ${processedCount}/${files.length} を処理中...`);

          // APIエンドポイントにファイルを送信
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/vision', {
            method: 'POST',
            body: formData
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'OCR処理に失敗しました');
          }

          const text = result.text;
          const imageId = result.imageId;
          
          addDebugLog(`\n元のテキスト:\n${text}\n`);
          
          // テキストの前処理
          const normalizedText = text
            .replace(/\s+/g, ' ') // 連続する空白を単一の空白に
            .toLowerCase() // 小文字に変換
            .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角数字を半角に
            .replace(/[ａ-ｚＡ-Ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角英字を半角に
            .replace(/[-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━]/g, '-'); // 各種ハイフンを統一

          addDebugLog(`\n正規化後のテキスト:\n${normalizedText}\n`);

          // 製品種別の判定ルール
          const productRules = {
            gateway: {
              keywords: ['ゲートウェイ', 'マルチ蓄電システム用ゲートウェイ', 'ゲートウエイ'],
              modelPatterns: ['kp-gwbp', 'gwbp', 'kpgwbp'],
              excludePatterns: ['パワーコンディショナ', 'パワコン', 'kp-bp', 'kpbp']
            },
            powerConditioner: {
              keywords: ['パワーコンディショナ', 'マルチ蓄電パワーコンディショナ', 'パワコン'],
              modelPatterns: ['kpbp', 'kp-bp'],
              excludePatterns: ['ゲートウェイ', 'ゲートウエイ', 'kp-gwbp', 'kpgwbp']
            },
            batteryUnit: {
              keywords: ['蓄電池ユニット', '蓄電池'],
              modelPatterns: ['kp-bu', 'kpbu'],
              excludePatterns: []
            },
            pvUnit: {
              keywords: ['pvユニット', 'pv'],
              modelPatterns: ['kp-pv', 'kppv'],
              excludePatterns: []
            }
          };

          // 製品種別の判定
          let productType = null;
          let confidenceScore = 0;

          // 1. テキスト全体から製品種別を判定
          for (const [type, rule] of Object.entries(productRules)) {
            // キーワードによる判定（複数マッチでスコア加算）
            let score = 0;
            const matchedKeywordsCount = rule.keywords.filter(keyword => 
              normalizedText.includes(keyword.toLowerCase())
            ).length;
            score += matchedKeywordsCount * 2;

            // 型番による判定（より確実な判定）
            const matchedModelPatterns = rule.modelPatterns.filter(pattern => 
              normalizedText.includes(pattern.toLowerCase())
            ).length;
            score += matchedModelPatterns * 3;

            // 除外パターンのチェック
            const hasExcludePattern = rule.excludePatterns.some(pattern =>
              normalizedText.includes(pattern.toLowerCase())
            );
            if (hasExcludePattern) {
              score = 0;
            }

            // より高いスコアの製品種別を採用
            if (score > confidenceScore) {
              confidenceScore = score;
              productType = type;
              addDebugLog(`\n製品種別判定更新: ${type} (スコア: ${score})`);
              addDebugLog(`- キーワードマッチ数: ${matchedKeywordsCount}`);
              addDebugLog(`- 型番マッチ数: ${matchedModelPatterns}`);
            }
          }

          addDebugLog(`\n最終判定された製品種別: ${productType || '不明'} (確信度スコア: ${confidenceScore})`);

          // キーワードの前処理とマッチング
          const matchedKeywords = keywords.filter(keyword => {
            const normalizedKeyword = keyword
              .trim()
              .toLowerCase()
              .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
              .replace(/[ａ-ｚＡ-Ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
              .replace(/[-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━]/g, '-');
            
            addDebugLog(`\nキーワードチェック: "${normalizedKeyword}"`);

            // 製品種別に基づくマッチング（確信度スコアも考慮）
            if (confidenceScore >= 3) {  // 最低限の確信度を要求
              switch (normalizedKeyword) {
                case 'ゲートウェイ':
                case 'ゲートウエイ':
                  return productType === 'gateway';
                case 'パワーコンディショナ':
                case 'パワコン':
                  return productType === 'powerConditioner';
                case '蓄電池ユニット':
                case '蓄電池':
                  return productType === 'batteryUnit';
                case 'pvユニット':
                case 'pv':
                  return productType === 'pvUnit';
                default:
                  return normalizedText.includes(normalizedKeyword);
              }
            }
            return false;
          });

          if (matchedKeywords.length > 0) {
            const preview = URL.createObjectURL(file);
            // キーワードをデータベースに保存
            await fetch('/api/update-keywords', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageId,
                keywords: matchedKeywords,
              }),
            });

            newMatched.push({
              name: file.name,
              text,
              matchedKeywords,
              preview
            });
            addDebugLog(`✅ マッチしました: ${matchedKeywords.join(', ')}\n---\n`);
          } else {
            const preview = URL.createObjectURL(file);
            newUnmatched.push({
              name: file.name,
              text,
              matchedKeywords: [],
              preview
            });
            addDebugLog(`❌ マッチなし\n---\n`);
          }
        } catch (error) {
          addDebugLog(`⚠️ ファイル処理エラー: ${file.name}\n---\n`);
          console.error(`Error processing file ${file.name}:`, error);
        }
      }

      addDebugLog(`処理完了: ${newMatched.length}件マッチ, ${newUnmatched.length}件アンマッチ`);
      setStatus('検索完了');
      setMatchedFiles(prev => [...prev, ...newMatched]);
      setUnmatchedFiles(prev => [...prev, ...newUnmatched]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '処理中にエラーが発生しました';
      addDebugLog(`エラー発生: ${errorMessage}`);
      console.error('検索エラー:', error);
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      addDebugLog(`ファイルドロップ: ${acceptedFiles.length}個`);
      await processFiles(acceptedFiles);
    } catch (error) {
      console.error('ファイル処理エラー:', error);
    }
  }, [searchText]);

  const removeFile = useCallback((index: number, isMatched: boolean) => {
    const setter = isMatched ? setMatchedFiles : setUnmatchedFiles;
    setter(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  const moveFile = useCallback((index: number, fromMatched: boolean) => {
    if (fromMatched) {
      // 検索結果から対象外へ移動
      setMatchedFiles(prev => {
        const newFiles = [...prev];
        const [movedFile] = newFiles.splice(index, 1);
        setUnmatchedFiles(prev => [...prev, { ...movedFile, matchedKeywords: [] }]);
        return newFiles;
      });
    } else {
      // 対象外から検索結果へ移動
      setUnmatchedFiles(prev => {
        const newFiles = [...prev];
        const [movedFile] = newFiles.splice(index, 1);
        setMatchedFiles(prev => [...prev, { ...movedFile, matchedKeywords: searchText.split(',').map(k => k.trim()).filter(k => k) }]);
        return newFiles;
      });
    }
  }, [searchText]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp']
    },
    disabled: isProcessing,
    multiple: true
  });

  const handleExport = async () => {
    if (matchedFiles.length === 0) {
      setError('エクスポートする画像がありません');
      return;
    }

    setIsExporting(true);
    try {
      const zip = new JSZip();
      const promises = matchedFiles.map(async (file) => {
        const response = await fetch(file.preview);
        const blob = await response.blob();
        // キーワードをファイル名の先頭に追加
        const keywords = file.matchedKeywords.join('_');
        const newFileName = keywords ? `[${keywords}]_${file.name}` : file.name;
        zip.file(newFileName, blob);
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matched_images_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      setError('エクスポート中にエラーが発生しました');
    } finally {
      setIsExporting(false);
    }
  };

  // 選択状態の切り替え
  const toggleFileSelection = useCallback((index: number, isMatched: boolean) => {
    setSelectedFiles(prev => ({
      ...prev,
      [`${isMatched ? 'matched' : 'unmatched'}-${index}`]: !prev[`${isMatched ? 'matched' : 'unmatched'}-${index}`]
    }));
  }, []);

  // 選択された画像の一括移動
  const moveSelectedFiles = useCallback((toMatched: boolean) => {
    if (toMatched) {
      // 対象外から検索結果へ一括移動
      const selectedIndices = Object.entries(selectedFiles)
        .filter(([key, selected]) => selected && key.startsWith('unmatched-'))
        .map(([key]) => parseInt(key.split('-')[1]))
        .sort((a, b) => b - a);

      setUnmatchedFiles(prev => {
        const newFiles = [...prev];
        const movedFiles = selectedIndices.map(index => {
          const [file] = newFiles.splice(index, 1);
          return { ...file, matchedKeywords: searchText.split(',').map(k => k.trim()).filter(k => k) };
        });
        setMatchedFiles(prev => [...prev, ...movedFiles.reverse()]);
        return newFiles;
      });
    } else {
      // 検索結果から対象外へ一括移動
      const selectedIndices = Object.entries(selectedFiles)
        .filter(([key, selected]) => selected && key.startsWith('matched-'))
        .map(([key]) => parseInt(key.split('-')[1]))
        .sort((a, b) => b - a);

      setMatchedFiles(prev => {
        const newFiles = [...prev];
        const movedFiles = selectedIndices.map(index => {
          const [file] = newFiles.splice(index, 1);
          return { ...file, matchedKeywords: [] };
        });
        setUnmatchedFiles(prev => [...prev, ...movedFiles.reverse()]);
        return newFiles;
      });
    }
    // 選択をクリア
    setSelectedFiles({});
  }, [searchText, selectedFiles]);

  // ドラッグ&ドロップのハンドラー
  const handleDragStart = useCallback((e: React.DragEvent, index: number, isMatched: boolean) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ index, isMatched }));
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropToMatched: boolean) => {
    e.preventDefault();
    try {
      const { index, isMatched } = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (isMatched !== dropToMatched) {
        moveFile(index, isMatched);
      }
    } catch (error) {
      console.error('Drop handling error:', error);
    }
    setIsDragging(false);
  }, [moveFile]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1">
          <label htmlFor="searchText" className="block text-sm font-medium text-gray-700 mb-1">
            検索キーワード（カンマ区切りで複数入力可能）
          </label>
          <input
            type="text"
            id="searchText"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="例: ゲートウェイ, 設置前, 設置後, PVユニット"
            disabled={isProcessing}
          />
        </div>
        {matchedFiles.length > 0 && (
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`ml-4 px-4 py-2 rounded-md text-white flex items-center gap-2 ${
              isExporting ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isExporting ? 'エクスポート中...' : 'エクスポート'}
          </button>
        )}
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 mb-4
          transition-colors duration-200 ease-in-out
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-500'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4">
          {isProcessing ? (
            <>
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <div className="text-center">
                <p className="text-gray-600">{status}</p>
                {progress > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {Math.round(progress)}%
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-400" />
              <p className="text-gray-600">
                {isDragActive
                  ? 'ここにファイルをドロップ'
                  : 'クリックまたはドラッグ&ドロップでファイルを選択'}
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-500 hover:text-red-600"
          >
            閉じる
          </button>
        </div>
      )}

      <div className="flex gap-8 mt-4">
        {/* 検索結果（左カラム） */}
        <div 
          className={`flex-1 ${isDragging ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg' : ''}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, true)}
        >
          {matchedFiles.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">検索結果: {matchedFiles.length}件</h3>
                <button
                  onClick={() => moveSelectedFiles(false)}
                  className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-1"
                  title="選択した画像を対象外に移動"
                >
                  <MoveRight className="w-4 h-4" />
                  <span>選択を移動</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {matchedFiles.map((file, index) => (
                  <div 
                    key={index} 
                    className={`relative bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${
                      selectedFiles[`matched-${index}`] ? 'ring-2 ring-blue-500' : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index, true)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedFiles[`matched-${index}`] || false}
                        onChange={() => toggleFileSelection(index, true)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      <button
                        onClick={() => moveFile(index, true)}
                        className="p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                        title="対象外に移動"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeFile(index, true)}
                        className="p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                        title="削除"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                    <div 
                      className="aspect-video relative cursor-pointer"
                      onClick={() => setSelectedImage(file.preview)}
                    >
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-2 bg-gray-50">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      {file.matchedKeywords.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {file.matchedKeywords.map((keyword, kidx) => (
                            <span
                              key={kidx}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 対象外（右カラム） */}
        <div 
          className={`w-1/3 ${isDragging ? 'bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg' : ''}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, false)}
        >
          {unmatchedFiles.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">対象外: {unmatchedFiles.length}件</h3>
                <button
                  onClick={() => moveSelectedFiles(true)}
                  className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-1"
                  title="選択した画像を検索結果に移動"
                >
                  <MoveLeft className="w-4 h-4" />
                  <span>選択を移動</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {unmatchedFiles.map((file, index) => (
                  <div 
                    key={index} 
                    className={`relative bg-white border rounded-lg overflow-hidden opacity-50 hover:opacity-100 transition-opacity ${
                      selectedFiles[`unmatched-${index}`] ? 'ring-2 ring-blue-500 opacity-100' : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index, false)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="absolute top-1 left-1 z-10">
                      <input
                        type="checkbox"
                        checked={selectedFiles[`unmatched-${index}`] || false}
                        onChange={() => toggleFileSelection(index, false)}
                        className="w-3 h-3 rounded border-gray-300"
                      />
                    </div>
                    <div className="absolute top-1 right-1 flex gap-1 z-10">
                      <button
                        onClick={() => moveFile(index, false)}
                        className="p-0.5 bg-white rounded-full shadow-md hover:bg-gray-100"
                        title="検索結果に移動"
                      >
                        <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeFile(index, false)}
                        className="p-0.5 bg-white rounded-full shadow-md hover:bg-gray-100"
                        title="削除"
                      >
                        <X className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                    <div 
                      className="aspect-square relative cursor-pointer"
                      onClick={() => setSelectedImage(file.preview)}
                    >
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-1 bg-gray-50">
                      <p className="text-xs truncate">{file.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 cursor-pointer"
          onClick={handleImageModalClose}
        >
          <img
            src={selectedImage}
            alt="拡大表示"
            className="max-w-[90vw] max-h-[90vh] object-contain transition-transform duration-200"
            style={{ transform: `scale(${imageScale})` }}
            onWheel={handleWheel}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
} 