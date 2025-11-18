/**
 * ฟังก์ชันสำหรับแปลง Date object หรือ ISO string เป็นรูปแบบที่อ่านง่าย
 * @param {string | Date} dateString
 * @returns {string} (เช่น '15 พฤศจิกายน 2568')
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};