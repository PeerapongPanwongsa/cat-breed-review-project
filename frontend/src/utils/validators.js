/**
 * ฟังก์ชันตรวจสอบความยาวรหัสผ่าน
 * @param {string} password
 * @param {number} minLength
 * @returns {boolean}
 */
export const isPasswordValid = (password, minLength = 8) => {
  return password.length >= minLength;
};

/**
 * ฟังก์ชันตรวจสอบอีเมล (แบบง่าย)
 * @param {string} email
 * @returns {boolean}
 */
export const isEmailValid = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};