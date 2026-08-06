import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// Computed once at module load and compared against on every failed user
// lookup, so authorize() takes roughly the same time whether the email
// exists or not — otherwise response time alone could be used to enumerate
// registered accounts.
const DUMMY_HASH = bcrypt.hashSync("no-such-user", SALT_ROUNDS);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  return bcrypt.compare(password, hash ?? DUMMY_HASH);
}
