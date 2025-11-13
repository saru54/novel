// Simple test runner for Node.js without VSCode
const { NovelParser } = require('./out/parsers/novelParser');

console.log('Running NovelParser Tests...\n');

const parser = new NovelParser();
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test 1: Empty file
test('Empty file should create single chapter with fallback title', () => {
  const result = parser.parse('', 'EmptyFile.txt');
  assert(result.lines.length === 1, `Expected 1 line, got ${result.lines.length}`);
  assert(result.chapters.length === 1, `Expected 1 chapter, got ${result.chapters.length}`);
  assert(result.chapters[0].title === 'EmptyFile.txt', `Expected title 'EmptyFile.txt', got '${result.chapters[0].title}'`);
  assert(result.chapters[0].lines.length === 1, `Expected 1 line in chapter, got ${result.chapters[0].lines.length}`);
});

// Test 2: Single chapter with empty content after title
test('Single chapter with empty content after title', () => {
  const content = '第一章 开始\n';
  const result = parser.parse(content, 'test.txt');
  assert(result.chapters.length === 1, `Expected 1 chapter, got ${result.chapters.length}`);
  assert(result.chapters[0].title === '第一章 开始', `Expected title '第一章 开始', got '${result.chapters[0].title}'`);
  assert(result.chapters[0].lines.length > 0, `Chapter lines should not be empty, got ${result.chapters[0].lines.length} lines`);
});

// Test 3: Multiple chapters with last chapter empty
test('Multiple chapters with edge case - last chapter empty', () => {
  const content = '第一章 开始\n一些内容\n第二章 结束';
  const result = parser.parse(content, 'test.txt');
  assert(result.chapters.length === 2, `Expected 2 chapters, got ${result.chapters.length}`);
  assert(result.chapters[0].title === '第一章 开始', `Expected '第一章 开始', got '${result.chapters[0].title}'`);
  assert(result.chapters[1].title === '第二章 结束', `Expected '第二章 结束', got '${result.chapters[1].title}'`);
  assert(result.chapters[1].lines.length > 0, `Last chapter should have content, got ${result.chapters[1].lines.length} lines`);
});

// Test 4: Chapter with only whitespace lines
test('Chapter with only whitespace lines', () => {
  const content = '第一章 测试\n   \n\t\n  \n第二章 继续\n内容';
  const result = parser.parse(content, 'test.txt');
  assert(result.chapters.length === 2, `Expected 2 chapters, got ${result.chapters.length}`);
  assert(result.chapters[0].lines.length >= 4, `First chapter should include whitespace lines, got ${result.chapters[0].lines.length}`);
});

// Test 5: Buffer reference issue
test('Buffer reference issue - chapters should have independent line arrays', () => {
  const content = '第一章\n内容1\n第二章\n内容2';
  const result = parser.parse(content, 'test.txt');
  assert(result.chapters.length === 2, `Expected 2 chapters, got ${result.chapters.length}`);
  
  const chapter1Lines = result.chapters[0].lines;
  const chapter2Lines = result.chapters[1].lines;
  assert(chapter1Lines !== chapter2Lines, 'Chapters should have different line arrays');
});

// Test 6: CRLF line endings
test('CRLF line endings should be normalized', () => {
  const content = '第一章\r\n内容1\r\n第二章\r\n内容2';
  const result = parser.parse(content, 'test.txt');
  assert(result.lines.length === 4, `Expected 4 lines, got ${result.lines.length}`);
  assert(result.chapters.length === 2, `Expected 2 chapters, got ${result.chapters.length}`);
});

// Test 7: Encoding detection
test('Encoding detection for GBK content', () => {
  const gbkContent = Buffer.from([0xB5, 0xDA, 0xD2, 0xBB, 0xD5, 0xC2]);
  const result = parser.parse(gbkContent, 'test.txt');
  assert(result.lines.length > 0, `Should have lines, got ${result.lines.length}`);
  assert(result.chapters.length > 0, `Should have chapters, got ${result.chapters.length}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
