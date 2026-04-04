type BinaryCompareResult = -1 | 0 | 1;

function stripLeadingZeros(value: string): string {
  const normalized = value.replace(/^0+/, "");
  return normalized || "0";
}

function assertBinary(value: string): string {
  const normalized = value.trim();
  if (!/^[01]+$/.test(normalized)) {
    throw new Error("Invalid binary input");
  }
  return stripLeadingZeros(normalized);
}

export function compareBinary(a: string, b: string): BinaryCompareResult {
  const left = assertBinary(a);
  const right = assertBinary(b);
  if (left.length > right.length) {
    return 1;
  }
  if (left.length < right.length) {
    return -1;
  }
  if (left === right) {
    return 0;
  }
  return left > right ? 1 : -1;
}

export function addBinary(a: string, b: string): string {
  const left = assertBinary(a);
  const right = assertBinary(b);
  let i = left.length - 1;
  let j = right.length - 1;
  let carry = 0;
  let result = "";

  while (i >= 0 || j >= 0 || carry > 0) {
    const bitA = i >= 0 ? Number(left[i]) : 0;
    const bitB = j >= 0 ? Number(right[j]) : 0;
    const sum = bitA + bitB + carry;
    result = String(sum % 2) + result;
    carry = sum >= 2 ? 1 : 0;
    i -= 1;
    j -= 1;
  }

  return stripLeadingZeros(result);
}

function subtractUnsignedBinary(larger: string, smaller: string): string {
  let i = larger.length - 1;
  let j = smaller.length - 1;
  let borrow = 0;
  let result = "";

  while (i >= 0) {
    let bitA = Number(larger[i]) - borrow;
    const bitB = j >= 0 ? Number(smaller[j]) : 0;

    if (bitA < bitB) {
      bitA += 2;
      borrow = 1;
    } else {
      borrow = 0;
    }

    result = String(bitA - bitB) + result;
    i -= 1;
    j -= 1;
  }

  return stripLeadingZeros(result);
}

export function subtractBinary(a: string, b: string): string {
  const left = assertBinary(a);
  const right = assertBinary(b);
  const comparison = compareBinary(left, right);
  if (comparison === 0) {
    return "0";
  }
  if (comparison > 0) {
    return subtractUnsignedBinary(left, right);
  }
  return `-${subtractUnsignedBinary(right, left)}`;
}

export function multiplyBinary(a: string, b: string): string {
  const left = assertBinary(a);
  const right = assertBinary(b);
  if (left === "0" || right === "0") {
    return "0";
  }
  let result = "0";
  let shift = 0;

  for (let i = right.length - 1; i >= 0; i -= 1) {
    if (right[i] === "1") {
      const shifted = `${left}${"0".repeat(shift)}`;
      result = addBinary(result, shifted);
    }
    shift += 1;
  }

  return stripLeadingZeros(result);
}

export function divideBinary(
  dividend: string,
  divisor: string,
): {
  quotient: string;
  remainder: string;
} {
  const left = assertBinary(dividend);
  const right = assertBinary(divisor);
  if (right === "0") {
    throw new Error("Division by zero");
  }
  if (compareBinary(left, right) < 0) {
    return { quotient: "0", remainder: left };
  }

  let quotient = "";
  let remainder = "0";

  for (let i = 0; i < left.length; i += 1) {
    remainder = stripLeadingZeros(`${remainder}${left[i]}`);
    if (compareBinary(remainder, right) >= 0) {
      remainder = subtractUnsignedBinary(remainder, right);
      quotient += "1";
    } else {
      quotient += "0";
    }
  }

  return {
    quotient: stripLeadingZeros(quotient),
    remainder: stripLeadingZeros(remainder),
  };
}
