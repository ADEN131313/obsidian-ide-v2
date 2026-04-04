import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
  addBinary,
  compareBinary,
  divideBinary,
  multiplyBinary,
  subtractBinary,
} from "./binary-math.ts";

test("binary addition and subtraction preserve proprietary math behavior", () => {
  assert.equal(addBinary("1011", "110"), "10001");
  assert.equal(subtractBinary("1011", "110"), "101");
  assert.equal(subtractBinary("110", "1011"), "-101");
});

test("binary multiplication and division use binary algorithms", () => {
  assert.equal(multiplyBinary("101", "11"), "1111");
  const division = divideBinary("1111", "11");
  assert.equal(division.quotient, "101");
  assert.equal(division.remainder, "0");
});

test("binary compare and normalization behave consistently", () => {
  assert.equal(compareBinary("00101", "101"), 0);
  assert.equal(compareBinary("101", "111"), -1);
  assert.equal(compareBinary("1000", "111"), 1);
});
