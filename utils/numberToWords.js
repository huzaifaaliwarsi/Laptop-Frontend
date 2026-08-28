/**
 * Convert numerical monetary amount to words (Rupees format)
 * Example: 59.00 -> "Rupees fifty-nine and 00/100 only."
 * Example: 1250.75 -> "Rupees one thousand two hundred fifty and 75/100 only."
 */

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'
];

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
];

function convertGroup(num) {
  let str = '';
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' hundred ';
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
    return 'Rupees zero and 00/100 only.';
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
    parts.push(`${convertGroup(billions)} billion`);
  }
  if (millions > 0) {
    parts.push(`${convertGroup(millions)} million`);
  }
  if (thousands > 0) {
    parts.push(`${convertGroup(thousands)} thousand`);
  }
  if (remainder > 0) {
    parts.push(convertGroup(remainder));
  }

  const words = parts.length > 0 ? parts.join(' ') : 'zero';
  const paisaStr = String(decimalPart).padStart(2, '0');

  return `${isNegative ? 'Minus ' : ''}Rupees ${words} and ${paisaStr}/100 only.`;
}

export default amountInWordsPKR;
