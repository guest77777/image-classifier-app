import { logManager } from './log-manager';
import { nlpProcessor, KeywordExtraction } from './nlp-processor';

export type DocumentCategory = 
  | '申請書' 
  | '事業計画書' 
  | '収支計画書' 
  | '見積書' 
  | '請求書' 
  | 'その他';

export interface ClassificationResult {
  category: DocumentCategory;
  confidence: number;
  keywords: KeywordExtraction[];
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  documentDate?: string;
  amount?: number;
  companyName?: string;
  projectName?: string;
}

export class TextClassifier {
  private static instance: TextClassifier;
  private readonly MODULE_NAME = 'TextClassifier';

  // カテゴリごとの特徴的なキーワード
  private readonly categoryKeywords: Record<DocumentCategory, string[]> = {
    '申請書': ['申請', '補助金', '助成金', '交付', '様式', '承認'],
    '事業計画書': ['事業計画', '実施計画', '目的', '概要', '効果', '期間'],
    '収支計画書': ['収支', '予算', '経費', '支出', '収入', '内訳'],
    '見積書': ['見積', '見積書', '税込', '消費税', '合計金額', '単価'],
    '請求書': ['請求', '請求書', '支払', '振込', '口座', '期限'],
    'その他': []
  };

  private constructor() {}

  static getInstance(): TextClassifier {
    if (!TextClassifier.instance) {
      TextClassifier.instance = new TextClassifier();
    }
    return TextClassifier.instance;
  }

  // テキストを分類
  async classifyText(text: string): Promise<ClassificationResult> {
    try {
      const normalizedText = nlpProcessor.normalizeText(text);
      const keywords = nlpProcessor.extractKeywords(normalizedText);
      
      // カテゴリごとのスコアを計算
      const categoryScores = new Map<DocumentCategory, number>();
      
      Object.entries(this.categoryKeywords).forEach(([category, keywords]) => {
        const score = this.calculateCategoryScore(normalizedText, keywords);
        categoryScores.set(category as DocumentCategory, score);
      });

      // 最も高いスコアのカテゴリを選択
      let maxScore = 0;
      let bestCategory: DocumentCategory = 'その他';

      categoryScores.forEach((score, category) => {
        if (score > maxScore) {
          maxScore = score;
          bestCategory = category;
        }
      });

      // メタデータの抽出
      const metadata = this.extractMetadata(normalizedText);

      logManager.debug(this.MODULE_NAME, '分類完了', { 
        category: bestCategory, 
        confidence: maxScore,
        metadata 
      });

      return {
        category: bestCategory,
        confidence: maxScore,
        keywords,
        metadata
      };
    } catch (error) {
      logManager.error(this.MODULE_NAME, 'テキスト分類中にエラーが発生', error);
      return {
        category: 'その他',
        confidence: 0,
        keywords: [],
        metadata: {}
      };
    }
  }

  // カテゴリごとのスコアを計算
  private calculateCategoryScore(text: string, keywords: string[]): number {
    try {
      let matchCount = 0;
      keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = text.match(regex);
        if (matches) {
          matchCount += matches.length;
        }
      });

      // スコアの正規化（0-1の範囲に）
      return matchCount / (keywords.length + 1);
    } catch (error) {
      logManager.error(this.MODULE_NAME, 'スコア計算中にエラーが発生', error);
      return 0;
    }
  }

  // メタデータの抽出
  private extractMetadata(text: string): DocumentMetadata {
    const metadata: DocumentMetadata = {};

    try {
      // 日付の抽出
      const dateMatch = text.match(/\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?/);
      if (dateMatch) {
        metadata.documentDate = dateMatch[0];
      }

      // 金額の抽出
      const amountMatch = text.match(/[¥￥]?\s*([0-9,]+)\s*円/);
      if (amountMatch) {
        metadata.amount = parseInt(amountMatch[1].replace(/,/g, ''));
      }

      // 会社名の抽出（株式会社、有限会社などの後に続く文字列）
      const companyMatch = text.match(/[（(]?(?:株式|有限|合同)?会社[）)]?\s*([^\s「」（）()]+)/);
      if (companyMatch) {
        metadata.companyName = companyMatch[1];
      }

      // プロジェクト名の抽出（「事業」「計画」の前に来る文字列）
      const projectMatch = text.match(/([^\s「」（）()]+)(?:事業|計画)/);
      if (projectMatch) {
        metadata.projectName = projectMatch[1];
      }

      logManager.debug(this.MODULE_NAME, 'メタデータ抽出完了', metadata);
      return metadata;
    } catch (error) {
      logManager.error(this.MODULE_NAME, 'メタデータ抽出中にエラーが発生', error);
      return metadata;
    }
  }
}

export const textClassifier = TextClassifier.getInstance(); 