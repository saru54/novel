// Test for more subtle edge cases
const { NovelParser } = require('./out/parsers/novelParser');

console.log('Testing Edge Cases...\n');

const parser = new NovelParser();

// Test case: What happens when we have a chapter at the very end with no newline?
console.log('Test 1: Chapter at end with no newline');
const content1 = '第一章 开始\n内容1\n第二章 结束';
const result1 = parser.parse(content1, 'test.txt');
console.log(`Lines: ${result1.lines.length}`);
console.log(`Chapters: ${result1.chapters.length}`);
console.log('Chapter 1:', {
  title: result1.chapters[0].title,
  startLine: result1.chapters[0].startLine,
  linesCount: result1.chapters[0].lines.length,
  lines: result1.chapters[0].lines
});
console.log('Chapter 2:', {
  title: result1.chapters[1].title,
  startLine: result1.chapters[1].startLine,
  linesCount: result1.chapters[1].lines.length,
  lines: result1.chapters[1].lines
});

console.log('\nTest 2: File with no chapters');
const content2 = '这是一些普通文本\n没有章节标题\n只是内容';
const result2 = parser.parse(content2, 'plain.txt');
console.log(`Lines: ${result2.lines.length}`);
console.log(`Chapters: ${result2.chapters.length}`);
console.log('Chapter:', {
  title: result2.chapters[0].title,
  startLine: result2.chapters[0].startLine,
  linesCount: result2.chapters[0].lines.length,
  lines: result2.chapters[0].lines
});

console.log('\nTest 3: Empty lines at start');
const content3 = '\n\n第一章 开始\n内容';
const result3 = parser.parse(content3, 'test.txt');
console.log(`Lines: ${result3.lines.length}`);
console.log(`Chapters: ${result3.chapters.length}`);
result3.chapters.forEach((ch, i) => {
  console.log(`Chapter ${i+1}:`, {
    title: ch.title,
    startLine: ch.startLine,
    linesCount: ch.lines.length
  });
});

console.log('\nTest 4: Consecutive chapters (no content between)');
const content4 = '第一章 开始\n第二章 继续\n第三章 结束';
const result4 = parser.parse(content4, 'test.txt');
console.log(`Lines: ${result4.lines.length}`);
console.log(`Chapters: ${result4.chapters.length}`);
result4.chapters.forEach((ch, i) => {
  console.log(`Chapter ${i+1}:`, {
    title: ch.title,
    startLine: ch.startLine,
    linesCount: ch.lines.length,
    lines: ch.lines
  });
});

console.log('\nTest 5: Chapter pattern edge cases');
const patterns = [
  '第1章 测试',
  '第一百章 测试',
  'Chapter 1',
  'CHAPTER 42',
  '第 一 章 测试'  // spaces in Chinese
];
patterns.forEach(pattern => {
  const result = parser.parse(pattern, 'test.txt');
  console.log(`Pattern: "${pattern}" -> Detected as chapter: ${result.chapters[0]?.title === pattern || result.chapters.length > 1}`);
});
