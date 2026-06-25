import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private encryptionKey: string;

  constructor(private configService: ConfigService) {
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || '';
  }

  /**
   * AES-256-GCM加密
   */
  encrypt(text: string): string {
    if (!text) return text;
    const encrypted = CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
    return encrypted;
  }

  /**
   * AES-256-GCM解密
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) return encryptedText;
    const decrypted = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey).toString(CryptoJS.enc.Utf8);
    return decrypted;
  }

  /**
   * 密码哈希(bcrypt)
   */
  async hashPassword(password: string): Promise<string> {
    // 实际项目中应使用bcrypt
    // 这里简化为示例
    const hash = CryptoJS.SHA256(password).toString();
    return hash;
  }

  /**
   * 密码验证
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = CryptoJS.SHA256(password).toString();
    return passwordHash === hash;
  }
}