import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-cbc";
const KEY_LENGTH = 32;
const SALT = randomBytes(16); // In production, use a secure salt

export class EncryptionManager {
  private key: Buffer;

  constructor(password: string) {
    this.key = scryptSync(password, SALT, KEY_LENGTH);
  }

  encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  }

  decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
}
