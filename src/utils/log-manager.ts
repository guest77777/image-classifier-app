export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

class LogManager {
  private static instance: LogManager;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  private constructor() {}

  static getInstance(): LogManager {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }

  private formatMessage(entry: LogEntry): string {
    const date = new Date(entry.timestamp).toISOString();
    return `[${date}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`;
  }

  private addEntry(entry: LogEntry) {
    // 最大ログ数を超えた場合、古いログを削除
    if (this.logs.length >= this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS + 1);
    }
    this.logs.push(entry);

    // 開発環境の場合はコンソールにも出力
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = this.formatMessage(entry);
      switch (entry.level) {
        case 'error':
          console.error(formattedMessage, entry.data);
          break;
        case 'warn':
          console.warn(formattedMessage, entry.data);
          break;
        case 'debug':
          console.debug(formattedMessage, entry.data);
          break;
        default:
          console.log(formattedMessage, entry.data);
      }
    }
  }

  info(module: string, message: string, data?: any) {
    this.addEntry({
      timestamp: Date.now(),
      level: 'info',
      module,
      message,
      data
    });
  }

  warn(module: string, message: string, data?: any) {
    this.addEntry({
      timestamp: Date.now(),
      level: 'warn',
      module,
      message,
      data
    });
  }

  error(module: string, message: string, data?: any) {
    this.addEntry({
      timestamp: Date.now(),
      level: 'error',
      module,
      message,
      data
    });
  }

  debug(module: string, message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      this.addEntry({
        timestamp: Date.now(),
        level: 'debug',
        module,
        message,
        data
      });
    }
  }

  // 全てのログを取得
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // 特定のモジュールのログを取得
  getModuleLogs(module: string): LogEntry[] {
    return this.logs.filter(log => log.module === module);
  }

  // 特定のレベルのログを取得
  getLevelLogs(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  // ログをクリア
  clear() {
    this.logs = [];
  }

  // ログをファイルとしてエクスポート（将来の機能）
  async exportLogs(): Promise<Blob> {
    const logData = JSON.stringify(this.logs, null, 2);
    return new Blob([logData], { type: 'application/json' });
  }
}

export const logManager = LogManager.getInstance(); 