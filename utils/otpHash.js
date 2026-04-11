        // utils/otpHash.js
export class OTPHash {
  
  /**
   * Hash an OTP code using SHA-256
   * @param {string} otpCode - Plain text OTP (6 digits)
   * @returns {Promise<string>} - Hashed OTP
   */
  static async hash(otpCode) {
    const encoder = new TextEncoder();
    const data = encoder.encode(otpCode);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Generate a random 6-digit OTP
   * @returns {string} - Plain text OTP
   */
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  /**
   * Verify OTP by comparing hashes
   * @param {string} enteredOTP - OTP entered by user
   * @param {string} storedHash - Hash from database
   * @returns {Promise<boolean>} - True if valid
   */
  static async verify(enteredOTP, storedHash) {
    const hashedInput = await this.hash(enteredOTP);
    return hashedInput === storedHash;
  }
}