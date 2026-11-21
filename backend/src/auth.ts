/**
 * Вход в админку: один пароль, хэш в переменной окружения ADMIN_PASSWORD_HASH
 * (генерация: npm run backend:hash -- "пароль"). Сессия — случайный токен в HttpOnly-cookie.
 * Пароль и токены в репозиторий не попадают. Сессии хранятся в памяти (перезапуск = повторный вход).
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return "scrypt$" + salt + "$" + scryptSync(password, salt, 64).toString("hex");
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  const [alg, salt, hash] = (stored ?? "").split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const a = scryptSync(password, salt, 64), b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const SESSION_MS = 12 * 3600_000, LOCK_AFTER = 10, LOCK_MS = 10 * 60_000;

export class Sessions {
  private s = new Map<string, number>();
  private fails: number[] = [];
  constructor(private now: () => number = Date.now) {}
  locked(): boolean { this.fails = this.fails.filter((t) => this.now() - t < LOCK_MS); return this.fails.length >= LOCK_AFTER; }
  /** Возвращает токен сессии или null. Общий счётчик неудач (IP не храним): 10 неудач → пауза 10 минут. */
  login(password: string, storedHash: string | undefined): string | null {
    if (this.locked()) return null;
    if (!verifyPassword(password, storedHash)) { this.fails.push(this.now()); return null; }
    const t = randomBytes(32).toString("hex");
    this.s.set(t, this.now() + SESSION_MS);
    return t;
  }
  valid(token: string | undefined): boolean {
    if (!token) return false;
    const exp = this.s.get(token);
    if (!exp || exp < this.now()) { this.s.delete(token); return false; }
    return true;
  }
  logout(token: string | undefined) { if (token) this.s.delete(token); }
}
