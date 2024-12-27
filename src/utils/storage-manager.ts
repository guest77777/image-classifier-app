import { logManager } from './log-manager';
import { OCRResult } from './ocr-processor';
import { DocumentCategory } from './text-classifier';

export interface StorageItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  ocrResult: OCRResult;
  category: DocumentCategory;
  tags?: string[];
}

export interface StorageStats {
  totalItems: number;
  totalSize: number;
  categoryCount: Record<DocumentCategory, number>;
}

export class StorageManager {
  private static instance: StorageManager;
  private readonly MODULE_NAME = 'StorageManager';
  private readonly STORAGE_KEY = 'ocr_results';
  private items: Map<string, StorageItem>;

  private constructor() {
    this.items = new Map();
    this.loadFromLocalStorage();
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  // ローカルストレージからデータを読み込む
  private loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const items = JSON.parse(data) as StorageItem[];
        this.items = new Map(items.map(item => [item.id, item]));
        logManager.info(this.MODULE_NAME, 'ストレージデータを読み込みました', {
          itemCount: this.items.size
        });
      }
    } catch (error) {
      logManager.error(this.MODULE_NAME, 'ストレージデータの読み込みに失敗', error);
    }
  }

  // ローカルストレージにデータを保存
  private saveToLocalStorage() {
    try {
      const data = Array.from(this.items.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      logManager.info(this.MODULE_NAME, 'ストレージデータを保存しました', {
        itemCount: this.items.size
      });
    } catch (error) {
      logManager.error(this.MODULE_NAME, 'ストレージデータの保存に失敗', error);
    }
  }

  // 新しいアイテムを保存
  async saveItem(file: File, ocrResult: OCRResult): Promise<StorageItem> {
    try {
      const id = crypto.randomUUID();
      const item: StorageItem = {
        id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        ocrResult,
        category: ocrResult.classification?.category ?? 'その他'
      };

      this.items.set(id, item);
      this.saveToLocalStorage();

      logManager.info(this.MODULE_NAME, 'アイテムを保存しました', { id, fileName: file.name });
      return item;
    } catch (error) {
      logManager.error(this.MODULE_NAME, 'アイテムの保存に失敗', error);
      throw error;
    }
  }

  // アイテムの取得
  getItem(id: string): StorageItem | undefined {
    return this.items.get(id);
  }

  // 全アイテムの取得
  getAllItems(): StorageItem[] {
    return Array.from(this.items.values());
  }

  // カテゴリ別のアイテム取得
  getItemsByCategory(category: DocumentCategory): StorageItem[] {
    return Array.from(this.items.values())
      .filter(item => item.category === category);
  }

  // アイテムの削除
  deleteItem(id: string): boolean {
    const deleted = this.items.delete(id);
    if (deleted) {
      this.saveToLocalStorage();
      logManager.info(this.MODULE_NAME, 'アイテムを削除しました', { id });
    }
    return deleted;
  }

  // アイテムの更新
  updateItem(id: string, updates: Partial<StorageItem>): StorageItem | undefined {
    const item = this.items.get(id);
    if (!item) return undefined;

    const updatedItem = { ...item, ...updates };
    this.items.set(id, updatedItem);
    this.saveToLocalStorage();

    logManager.info(this.MODULE_NAME, 'アイテムを更新しました', { id });
    return updatedItem;
  }

  // タグの追加
  addTag(id: string, tag: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    item.tags = [...(item.tags || []), tag];
    this.items.set(id, item);
    this.saveToLocalStorage();

    logManager.info(this.MODULE_NAME, 'タグを追加しました', { id, tag });
    return true;
  }

  // タグの削除
  removeTag(id: string, tag: string): boolean {
    const item = this.items.get(id);
    if (!item || !item.tags) return false;

    item.tags = item.tags.filter(t => t !== tag);
    this.items.set(id, item);
    this.saveToLocalStorage();

    logManager.info(this.MODULE_NAME, 'タグを削除しました', { id, tag });
    return true;
  }

  // ストレージの統計情報を取得
  getStats(): StorageStats {
    const items = Array.from(this.items.values());
    const categoryCount = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<DocumentCategory, number>);

    return {
      totalItems: items.length,
      totalSize: items.reduce((sum, item) => sum + item.fileSize, 0),
      categoryCount
    };
  }

  // ストレージのクリア
  clear() {
    this.items.clear();
    localStorage.removeItem(this.STORAGE_KEY);
    logManager.info(this.MODULE_NAME, 'ストレージをクリアしました');
  }

  // データのエクスポート
  async exportData(): Promise<Blob> {
    const data = Array.from(this.items.values());
    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  // データのインポート
  async importData(file: File): Promise<number> {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as StorageItem[];
      
      data.forEach(item => {
        this.items.set(item.id, item);
      });
      
      this.saveToLocalStorage();
      
      logManager.info(this.MODULE_NAME, 'データをインポートしました', { 
        itemCount: data.length 
      });
      
      return data.length;
    } catch (error) {
      logManager.error(this.MODULE_NAME, 'データのインポートに失敗', error);
      throw error;
    }
  }
}

export const storageManager = StorageManager.getInstance(); 