/**
 * Convert numerical monetary amount to clean, professional English words (Pakistani Rupees format)
 * Examples:
 *   3000    -> "Rupees Three Thousand Only."
 *   3000.50 -> "Rupees Three Thousand and Fifty Paisas Only."
 *   1250.75 -> "Rupees One Thousand Two Hundred Fifty and Seventy-Five Paisas Only."
 *   0       -> "Rupees Zero Only."
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertGroup(num) {
  let str = '';
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    const tensPart = TENS[Math.floor(num / 10)];
    const onesPart = ONES[num % 10];
    str += (onesPart ? `${tensPart}-${onesPart}` : tensPart) + ' ';
  } else if (num > 0) {
    str += ONES[num] + ' ';
  }
  return str.trim();
}

export function amountInWordsPKR(amount) {
  const num = parseFloat(amount || 0);
  if (isNaN(num) || num === 0) {
    return 'Rupees Zero Only.';
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const integerPart = Math.floor(absNum);
  const decimalPart = Math.round((absNum - integerPart) * 100);

  // Split into chunks: Billions, Millions, Thousands, Hundreds
  const billions = Math.floor(integerPart / 1000000000);
  const millions = Math.floor((integerPart % 1000000000) / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  const parts = [];

  if (billions > 0) {
    parts.push(`${convertGroup(billions)} Billion`);
  }
  if (millions > 0) {
    parts.push(`${convertGroup(millions)} Million`);
  }
  if (thousands > 0) {
    parts.push(`${convertGroup(thousands)} Thousand`);
  }
  if (remainder > 0) {
    parts.push(convertGroup(remainder));
  }

  const words = parts.length > 0 ? parts.join(' ') : 'Zero';
  
  if (decimalPart > 0) {
    const paisaWords = convertGroup(decimalPart);
    return `${isNegative ? 'Minus ' : ''}Rupees ${words} and ${paisaWords} Paisas Only.`;
  }

  return `${isNegative ? 'Minus ' : ''}Rupees ${words} Only.`;
}

export default amountInWordsPKR;
