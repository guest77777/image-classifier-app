import { logManager } from './log-manager';

export interface TokenizedText {
  text: string;
  tokens: string[];
}

export interface KeywordExtraction {
  keyword: string;
  score: number;
}

export class NLPProcessor {
  private static instance: NLPProcessor;
  private readonly MODULE_NAME = 'NLPProcessor';

  private constructor() {}

  static getInstance(): NLPProcessor {
    if (!NLPProcessor.instance) {
      NLPProcessor.instance = new NLPProcessor();
    }
    return NLPProcessor.instance;
  }

  // テキストの正規化
  normalizeText(text: string): string {
    try {
      // 空白の正規化
      let normalized = text.replace(/\s+/g, ' ').trim();
      // 全角数字を半角に変換
      normalized = normalized.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
      // 全角英字を半角に変換
      normalized = normalized.replace(/[Ａ-Ｚａ-ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

      logManager.debug(this.MODULE_NAME, '正規化完了', { original: text, normalized });
      return normalized;
    } catch (error) {
      logManager.error(this.MODULE_NAME, 'テキスト正規化中にエラーが発生', error);
      return text;
    }
  }

  // テキストのトークン化（単語分割）
  tokenize(text: string): TokenizedText {
    try {
      // 基本的な区切り文字でトークン化
      const tokens = text
        .split(/[\s,\.。、]+/)
        .filter(token => token.length > 0);

      logManager.debug(this.MODULE_NAME, 'トークン化完了', { text, tokens });
      return { text, tokens };
    } catch (error) {
      logManager.error(this.MODULE_NAME, 'トークン化中にエラーが発生', error);
      return { text, tokens: [text] };
    }
  }

  // キーワード抽出（TF-IDF的なアプローチ）
  extractKeywords(text: string, maxKeywords: number = 10): KeywordExtraction[] {
    try {
      const normalized = this.normalizeText(text);
      const { tokens } = this.tokenize(normalized);
      
      // 単語の出現回数をカウント
      const wordCount = new Map<string, number>();
      tokens.forEach(token => {
        wordCount.set(token, (wordCount.get(token) || 0) + 1);
      });

      // スコアの計算（単純な頻度ベース）
      const keywords: KeywordExtraction[] = Array.from(wordCount.entries())
        .map(([keyword, count]) => ({
          keyword,
          score: count / tokens.length
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxKeywords);

      logManager.debug(this.MODULE_NAME, 'キーワード抽出完了', { keywords });
      return keywords;
    } catch (error) {
      logManager.error(this.MODULE_NAME, 'キーワード抽出中にエラーが発生', error);
      return [];
    }
  }

  // テキストの要約（簡易版）
  summarize(text: string, maxLength: number = 100): string {
    try {
      const normalized = this.normalizeText(text);
      if (normalized.length <= maxLength) {
        return normalized;
      }

      // 簡易的な要約（先頭から指定文字数）
      const summary = normalized.slice(0, maxLength) + '...';
      
      logManager.debug(this.MODULE_NAME, 'テキスト要約完了', { 
        originalLength: text.length,
        summaryLength: summary.length 
      });
      return summary;
    } catch (error) {
      logManager.error(this.MODULE_NAME, 'テキスト要約中にエラーが発生', error);
      return text;
    }
  }

  // 文字種別の判定
  detectCharacterTypes(text: string): Set<string> {
    try {
      const types = new Set<string>();
      
      if (/[\u3040-\u309F]/.test(text)) types.add('hiragana');
      if (/[\u30A0-\u30FF]/.test(text)) types.add('katakana');
      if (/[\u4E00-\u9FFF]/.test(text)) types.add('kanji');
      if (/[a-zA-Z]/.test(text)) types.add('alphabet');
      if (/[0-9]/.test(text)) types.add('number');
      
      logManager.debug(this.MODULE_NAME, '文字種別判定完了', { types: Array.from(types) });
      return types;
    } catch (error) {
      logManager.error(this.MODULE_NAME, '文字種別判定中にエラーが発生', error);
      return new Set();
    }
  }
}

export const nlpProcessor = NLPProcessor.getInstance(); 