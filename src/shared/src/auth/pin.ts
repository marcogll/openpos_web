import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const HASH_PREFIX = "pbkdf2";
const ITERATIONS = 120_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export const isHashedPin = (pin: string) => pin.startsWith(`${HASH_PREFIX}$`);

export const hashPin = (pin: string) => {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(pin, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("base64url");
  return `${HASH_PREFIX}$${ITERATIONS}$${salt}$${hash}`;
};

export const verifyPin = (storedPin: string, candidatePin: string) => {
  if (!isHashedPin(storedPin)) {
    return storedPin === candidatePin;
  }

  const [, iterationsRaw, salt, storedHash] = storedPin.split("$");
  const iterations = Number(iterationsRaw);
  if (!iterations || !salt || !storedHash) return false;

  const candidateHash = pbkdf2Sync(candidatePin, salt, iterations, KEY_LENGTH, DIGEST);
  const storedHashBuffer = Buffer.from(storedHash, "base64url");
  if (candidateHash.length !== storedHashBuffer.length) return false;
  return timingSafeEqual(candidateHash, storedHashBuffer);
};

