import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
@Injectable()
export class CryptoService {
  private key(): Buffer {
    const raw=process.env.APP_KEY || '';
    const key=raw.startsWith('base64:')?Buffer.from(raw.slice(7),'base64'):Buffer.from(raw);
    if(key.length!==32) throw new Error('APP_KEY must be the existing Laravel AES-256 key. Never replace it during migration.');
    if(process.env.APP_CIPHER && process.env.APP_CIPHER!=='AES-256-CBC') throw new Error('Only the existing AES-256-CBC key format is supported.');
    return key;
  }
  encrypt(value:string): string {
    const key=this.key(), iv=randomBytes(16), cipher=createCipheriv('aes-256-cbc',key,iv);
    const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]).toString('base64');
    const ivText=iv.toString('base64'),mac=createHmac('sha256',key).update(ivText+encrypted).digest('hex');
    return Buffer.from(JSON.stringify({iv:ivText,value:encrypted,mac,tag:''})).toString('base64');
  }
  decrypt(value:string): string {
    try {
      const key=this.key(),payload=JSON.parse(Buffer.from(value,'base64').toString('utf8'));
      if(typeof payload.iv!=='string'||typeof payload.value!=='string'||typeof payload.mac!=='string') throw new Error();
      const expected=createHmac('sha256',key).update(payload.iv+payload.value).digest();
      const mac=Buffer.from(payload.mac,'hex'),iv=Buffer.from(payload.iv,'base64');
      if(mac.length!==expected.length||!timingSafeEqual(mac,expected)||iv.length!==16)throw new Error();
      const decipher=createDecipheriv('aes-256-cbc',key,iv);
      return Buffer.concat([decipher.update(Buffer.from(payload.value,'base64')),decipher.final()]).toString('utf8');
    }catch { throw new Error('Encrypted credential could not be verified with APP_KEY.'); }
  }
}
