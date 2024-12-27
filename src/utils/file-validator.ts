export interface FileValidationOptions {
  maxFiles?: number;
  maxSizeInMB?: number;
  allowedTypes?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const DEFAULT_OPTIONS: FileValidationOptions = {
  maxFiles: 10,
  maxSizeInMB: 10,
  allowedTypes: ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf']
};

export class FileValidator {
  private options: FileValidationOptions;

  constructor(options: Partial<FileValidationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  validateFiles(files: File[]): ValidationResult {
    const errors: string[] = [];

    // ファイル数チェック
    if (files.length > (this.options.maxFiles || DEFAULT_OPTIONS.maxFiles!)) {
      errors.push(`ファイル数は${this.options.maxFiles}個以下にしてください`);
    }

    // 各ファイルのチェック
    files.forEach((file, index) => {
      // ファイルタイプチェック
      if (!this.options.allowedTypes?.includes(file.type)) {
        errors.push(`ファイル ${file.name} は許可されていない形式です`);
      }

      // ファイルサイズチェック
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > (this.options.maxSizeInMB || DEFAULT_OPTIONS.maxSizeInMB!)) {
        errors.push(`ファイル ${file.name} は${this.options.maxSizeInMB}MB以下にしてください`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 単一ファイルの検証
  validateFile(file: File): ValidationResult {
    return this.validateFiles([file]);
  }
} 