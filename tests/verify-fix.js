#!/usr/bin/env node
/**
 * Verification Tests - Ensure the fix doesn't break existing functionality
 */

const { NovelParser } = require('../out/parsers/novelParser');

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║  Verification Tests - Existing Functionality        ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

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

// Test 1: Normal chapter structure (no content before first chapter)
test('Normal chapter structure works correctly', () => {
  const content = '第一章 开始\n内容1\n第二章 继续\n内容2';
  const result = parser.parse(content, 'test.txt');
  
  assert(result.lines.length === 4, `Expected 4 lines, got ${result.lines.length}`);
  assert(result.chapters.length === 2, `Expected 2 chapters, got ${result.chapters.length}`);
  assert(result.chapters[0].startLine === 0, `Chapter 1 should start at line 0, got ${result.chapters[0].startLine}`);
  assert(result.chapters[1].startLine === 2, `Chapter 2 should start at line 2, got ${result.chapters[1].startLine}`);
  assert(result.chapters[0].lines.length === 2, `Chapter 1 should have 2 lines, got ${result.chapters[0].lines.length}`);
  assert(result.chapters[1].lines.length === 2, `Chapter 2 should have 2 lines, got ${result.chapters[1].lines.length}`);
});

// Test 2: File with no chapters
test('File with no chapters creates fallback chapter', () => {
  const content = '普通文本\n没有章节';
  const result = parser.parse(content, 'plain.txt');
  
  assert(result.chapters.length === 1, `Expected 1 chapter, got ${result.chapters.length}`);
  assert(result.chapters[0].title === 'plain.txt', `Expected fallback title, got ${result.chapters[0].title}`);
  assert(result.chapters[0].startLine === 0, `Fallback chapter should start at 0, got ${result.chapters[0].startLine}`);
  assert(result.chapters[0].lines.length === result.lines.length, 'Fallback chapter should contain all lines');
});

// Test 3: Empty file
test('Empty file creates single chapter', () => {
  const result = parser.parse('', 'empty.txt');
  
  assert(result.lines.length === 1, `Expected 1 line, got ${result.lines.length}`);
  assert(result.chapters.length === 1, `Expected 1 chapter, got ${result.chapters.length}`);
  assert(result.chapters[0].title === 'empty.txt', `Expected fallback title, got ${result.chapters[0].title}`);
});

// Test 4: Single chapter at end with no newline
test('Chapter at end with no newline', () => {
  const content = '第一章 开始\n内容\n第二章 结束';
  const result = parser.parse(content, 'test.txt');
  
  assert(result.chapters.length === 2, `Expected 2 chapters, got ${result.chapters.length}`);
  assert(result.chapters[1].lines.length > 0, 'Last chapter should have content');
});

// Test 5: Content before first chapter is now included
test('Content before first chapter is included in first chapter', () => {
  const content = '序言\n\n第一章 开始\n内容';
  const result = parser.parse(content, 'test.txt');
  
  assert(result.chapters.length === 1, `Expected 1 chapter, got ${result.chapters.length}`);
  assert(result.chapters[0].startLine === 0, `First chapter should start at 0, got ${result.chapters[0].startLine}`);
  assert(result.chapters[0].lines.length === 4, `Chapter should have all 4 lines, got ${result.chapters[0].lines.length}`);
  assert(result.chapters[0].lines[0] === '序言', 'Prologue should be first line');
  assert(result.chapters[0].lines[2] === '第一章 开始', 'Chapter title should be at correct position');
});

// Test 6: Multiple chapters with content before first
test('Multiple chapters with prologue', () => {
  const content = '前言\n第一章 开始\n内容1\n第二章 继续\n内容2';
  const result = parser.parse(content, 'test.txt');
  
  assert(result.chapters.length === 2, `Expected 2 chapters, got ${result.chapters.length}`);
  assert(result.chapters[0].startLine === 0, `First chapter should start at 0, got ${result.chapters[0].startLine}`);
  assert(result.chapters[1].startLine === 3, `Second chapter should start at 3, got ${result.chapters[1].startLine}`);
  assert(result.chapters[0].lines[0] === '前言', 'Prologue should be in first chapter');
  
  // Verify all lines are accounted for
  const totalChapterLines = result.chapters.reduce((sum, ch) => sum + ch.lines.length, 0);
  assert(totalChapterLines === result.lines.length, `All lines should be in chapters: ${totalChapterLines} vs ${result.lines.length}`);
});

// Test 7: CRLF line endings
test('CRLF line endings are normalized', () => {
  const content = '第一章\r\n内容1\r\n第二章\r\n内容2';
  const result = parser.parse(content, 'test.txt');
  
  assert(result.lines.length === 4, `Expected 4 lines, got ${result.lines.length}`);
  assert(result.chapters.length === 2, `Expected 2 chapters, got ${result.chapters.length}`);
});

// Test 8: Consecutive chapters
test('Consecutive chapters (no content between)', () => {
  const content = '第一章 A\n第二章 B\n第三章 C';
  const result = parser.parse(content, 'test.txt');
  
  assert(result.chapters.length === 3, `Expected 3 chapters, got ${result.chapters.length}`);
  assert(result.chapters[0].lines.length === 1, `Chapter 1 should have 1 line, got ${result.chapters[0].lines.length}`);
  assert(result.chapters[1].lines.length === 1, `Chapter 2 should have 1 line, got ${result.chapters[1].lines.length}`);
  assert(result.chapters[2].lines.length === 1, `Chapter 3 should have 1 line, got ${result.chapters[2].lines.length}`);
});

// Test 9: Lines after last chapter are included
test('Lines after last chapter', () => {
  const content = '第一章 开始\n内容\n\n\n';
  const result = parser.parse(content, 'test.txt');
  
  const totalChapterLines = result.chapters.reduce((sum, ch) => sum + ch.lines.length, 0);
  assert(totalChapterLines === result.lines.length, `All lines should be in chapters: ${totalChapterLines} vs ${result.lines.length}`);
});

// Test 10: Chapter pattern matching
test('Chapter pattern matching works correctly', () => {
  const patterns = [
    ['第1章 测试', true],
    ['第一百章 测试', true],
    ['Chapter 1', true],
    ['CHAPTER 42', true],
    ['第 一 章 测试', true],
    ['普通文本', false]
  ];
  
  patterns.forEach(([pattern, shouldBeChapter]) => {
    const result = parser.parse(pattern, 'test.txt');
    const isDetected = result.chapters.length > 1 || (result.chapters[0] && result.chapters[0].title === pattern);
    if (shouldBeChapter) {
      assert(isDetected, `Pattern "${pattern}" should be detected as chapter`);
    }
  });
});

console.log(`\n${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n✓ All verification tests passed! The fix is working correctly.');
} else {
  console.log('\n✗ Some tests failed. Please review the fix.');
}

process.exit(failed > 0 ? 1 : 0);
