import { OCRResult } from './ocr-processor';
import { StorageItem } from './storage-manager';

class APIClient {
  private static instance: APIClient;

  private constructor() {}

  public static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient();
    }
    return APIClient.instance;
  }

  async processImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '画像処理に失敗しました');
    }

    return response.json();
  }

  async getProcessingLogs() {
    const response = await fetch('/api/logs');
    if (!response.ok) {
      throw new Error('ログの取得に失敗しました');
    }
    return response.json();
  }

  async clearProcessingLogs() {
    const response = await fetch('/api/logs', {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('ログのクリアに失敗しました');
    }
    return response.json();
  }
}

export const apiClient = APIClient.getInstance(); 