interface TempFile {
  id: string;
  file: File;
  url: string;
  timestamp: number;
}

class TempStorage {
  private static instance: TempStorage;
  private files: Map<string, TempFile>;
  private readonly EXPIRY_TIME = 1000 * 60 * 60; // 1時間

  private constructor() {
    this.files = new Map();
    this.startCleanupInterval();
  }

  static getInstance(): TempStorage {
    if (!TempStorage.instance) {
      TempStorage.instance = new TempStorage();
    }
    return TempStorage.instance;
  }

  private startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, 1000 * 60 * 15); // 15分ごとにクリーンアップ
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, file] of this.files.entries()) {
      if (now - file.timestamp > this.EXPIRY_TIME) {
        URL.revokeObjectURL(file.url);
        this.files.delete(id);
      }
    }
  }

  async store(file: File): Promise<string> {
    const id = Math.random().toString(36).slice(2);
    const url = URL.createObjectURL(file);
    
    this.files.set(id, {
      id,
      file,
      url,
      timestamp: Date.now()
    });

    return id;
  }

  get(id: string): TempFile | undefined {
    return this.files.get(id);
  }

  remove(id: string): boolean {
    const file = this.files.get(id);
    if (file) {
      URL.revokeObjectURL(file.url);
      return this.files.delete(id);
    }
    return false;
  }

  clear() {
    for (const [_, file] of this.files.entries()) {
      URL.revokeObjectURL(file.url);
    }
    this.files.clear();
  }
}

export const tempStorage = TempStorage.getInstance(); 