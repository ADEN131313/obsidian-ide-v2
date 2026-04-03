import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
  UNRESTRICTED_PERMISSION_OVERRIDE,
  buildCapabilityContextPrompt,
  buildLanguageMathContextPrompt,
  canExecuteRequestedOperation,
} from "./config.ts";

test("permission override allows arbitrary operations by default", () => {
  assert.equal(UNRESTRICTED_PERMISSION_OVERRIDE, true);
  assert.equal(canExecuteRequestedOperation("internet_tools:search"), true);
  assert.equal(
    canExecuteRequestedOperation("gpu_specification_generation"),
    true,
  );
  assert.equal(canExecuteRequestedOperation("any_future_tool:custom"), true);
});

test("capability context prompt documents system policy", () => {
  const prompt = buildCapabilityContextPrompt();
  assert.equal(prompt.includes("unrestricted_permission_override"), true);
  assert.equal(prompt.includes("enabled_capabilities"), true);
  assert.equal(prompt.includes("external_tool_endpoints"), true);
});

test("language and binary math context prompt is documented", () => {
  const prompt = buildLanguageMathContextPrompt();
  assert.equal(prompt.includes("OBSIDIAN Language Canonical Reference"), true);
  assert.equal(
    prompt.includes("OBSIDIAN Proprietary Binary Mathematics Framework"),
    true,
  );
  assert.equal(prompt.includes("binary addition"), true);
});
