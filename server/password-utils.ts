import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Define scryptAsync at the module level
const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.log("Invalid stored password format");
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Check buffer lengths to avoid RangeError
    if (hashedBuf.length !== suppliedBuf.length) {
      console.log(`Buffer length mismatch: ${hashedBuf.length} vs ${suppliedBuf.length}`);
      return false;
    }
    
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

// This function can be used to create a properly hashed admin password
export async function createAdminPassword() {
  const adminPassword = await hashPassword("admin123");
  console.log("Generated admin password hash:", adminPassword);
  return adminPassword;
}