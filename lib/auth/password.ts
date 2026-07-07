import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// Not a real credential — bcrypt.compare-ed against when no user/hash exists,
// so a "no such account" lookup takes the same time as a real password check.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8Q0i9E9tLL1JZFhpH2W3EAeZqUUuFO";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  return bcrypt.compare(password, hash ?? DUMMY_HASH);
}
