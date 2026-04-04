import { runObsidian } from "../index.mjs";

// Simple test runner
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.log(`✗ ${name}: ${error.message}`);
  }
}

function expect(actual) {
  return {
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(
          `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
        );
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${actual}`);
      }
    },
  };
}

// Test suite for Phase 1 advanced language features
console.log("Running Obsidian Language Phase 1 Tests...\n");

test("arrays and indexing", () => {
  const code = `
fn main() {
  let arr = [1, 2, 3];
  println(arr[0]);
  arr[1] = 42;
  println(arr[1]);
}
`;
  const result = runObsidian(code);
  expect(result.error).toBeNull();
  expect(result.output).toEqual(["1", "42"]);
});

test("for loops and ranges", () => {
  const code = `
fn main() {
  for i in 0..3 {
    println(i);
  }
}
`;
  const result = runObsidian(code);
  expect(result.error).toBeNull();
  expect(result.output).toEqual(["0", "1", "2"]);
});

test("structs", () => {
  const code = `
struct Point {
  x: f64,
  y: f64,
}

fn main() {
  let p = Point { x: 1.5, y: 2.5 };
  println(f"Point: ({p.x}, {p.y})");
  p.x = 3.0;
  println(f"Updated: ({p.x}, {p.y})");
}
`;
  const result = runObsidian(code);
  expect(result.error).toBeNull();
  expect(result.output).toEqual(["Point: (1.5, 2.5)", "Updated: (3.0, 2.5)"]);
});

test("enums and pattern matching", () => {
  const code = `
enum Result {
  Ok { value: i64 },
  Err { message: str },
}

fn main() {
  let result = Result::Ok { value: 42 };
  match result {
    Result::Ok { value } => println(f"Got {value}"),
    Result::Err { message } => println(f"Error: {message}"),
  }
}
`;
  const result = runObsidian(code);
  expect(result.error).toBeNull();
  expect(result.output).toEqual(["Got 42"]);
});

test("closures and higher-order functions", () => {
  const code = `
fn main() {
  let numbers = [1, 2, 3, 4, 5];
  let doubled = numbers.map(|x| x * 2);
  println(doubled.join(", "));
}
`;
  const result = runObsidian(code);
  expect(result.error).toBeNull();
  expect(result.output).toEqual(["2, 4, 6, 8, 10"]);
});

test("string interpolation", () => {
  const code = `
fn main() {
  let name = "World";
  let num = 42;
  println(f"Hello, {name}! The answer is {num}");
}
`;
  const result = runObsidian(code);
  expect(result.error).toBeNull();
  expect(result.output).toEqual(["Hello, World! The answer is 42"]);
});

test("method calls", () => {
  const code = `
fn main() {
  let text = "hello world";
  println(text.to_upper());
  println(text.contains("world"));
  let arr = [1, 2, 3];
  arr.push(4);
  println(arr.len());
}
`;
  const result = runObsidian(code);
  expect(result.error).toBeNull();
  expect(result.output).toEqual(["HELLO WORLD", "true", "4"]);
});

test("float numbers", () => {
  const code = `
fn main() {
  let x = 3.14;
  let y = 2.0;
  println(x + y);
}
`;
  const result = runObsidian(code);
  expect(result.error).toBeNull();
  expect(result.output).toEqual(["5.14"]);
});

test("complex example", () => {
  const code = `
struct Person {
  name: str,
  age: i64,
}

enum Status {
  Active,
  Inactive { reason: str },
}

fn is_adult(person: Person) -> bool {
  person.age >= 18
}

fn main() {
  let people = [
    Person { name: "Alice", age: 25 },
    Person { name: "Bob", age: 17 },
  ];

  let adults = people.filter(is_adult);
  let names = adults.map(|p| p.name);

  println(f"Adults: {names.join(", ")}");

  let status = if names.len() > 0 {
    Status::Active
  } else {
    Status::Inactive { reason: "No adults found" }
  };

  match status {
    Status::Active => println("System active"),
    Status::Inactive { reason } => println(f"Inactive: {reason}"),
  }
}
`;
  const result = runObsidian(code);
  expect(result.error).toBeNull();
  expect(result.output).toEqual(["Adults: Alice", "System active"]);
});

console.log("\nAll tests completed!");
