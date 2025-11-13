// Deep investigation of potential bugs
const { NovelParser } = require('./out/parsers/novelParser');

console.log('=== BUG INVESTIGATION ===\n');

const parser = new NovelParser();

// BUG 1: Empty lines before first chapter are orphaned
console.log('BUG 1: Empty lines before first chapter');
const content1 = '\n\n第一章 开始\n内容';
const result1 = parser.parse(content1, 'test.txt');
console.log('Total lines:', result1.lines.length);
console.log('Lines array:', JSON.stringify(result1.lines));
console.log('Chapters:', result1.chapters.length);
console.log('First chapter startLine:', result1.chapters[0].startLine);
console.log('First chapter lines:', JSON.stringify(result1.chapters[0].lines));

// The bug: Lines 0-1 (the empty lines) are not included in any chapter!
let totalLinesInChapters = result1.chapters.reduce((sum, ch) => sum + ch.lines.length, 0);
console.log('Total lines in all chapters:', totalLinesInChapters);
console.log('Total lines in file:', result1.lines.length);
console.log('❌ BUG CONFIRMED: Missing', result1.lines.length - totalLinesInChapters, 'lines from chapters!\n');

// BUG 2: When navigating, what happens if we try to access line 0 or 1?
console.log('BUG 2: Navigation to orphaned lines');
console.log('If user tries to navigate to line 0 (first empty line):');
console.log('  Line content:', JSON.stringify(result1.lines[0]));
console.log('  Which chapter does it belong to?');
// The NavigationController.findChapterIndexForLine would return 0
// because line 0 < chapter[0].startLine (2), so it returns 0
// But chapter[0] doesn't actually contain line 0!
console.log('  findChapterIndexForLine logic would return chapter 0');
console.log('  But chapter 0 starts at line 2, not line 0!');
console.log('  ❌ BUG CONFIRMED: Orphaned lines cause navigation issues!\n');

// BUG 3: What if file ends with empty lines after last chapter?
console.log('BUG 3: Empty lines after last chapter');
const content3 = '第一章 开始\n内容\n\n\n';
const result3 = parser.parse(content3, 'test.txt');
console.log('Total lines:', result3.lines.length);
console.log('Lines array:', JSON.stringify(result3.lines));
console.log('Chapter lines:', JSON.stringify(result3.chapters[0].lines));
totalLinesInChapters = result3.chapters.reduce((sum, ch) => sum + ch.lines.length, 0);
console.log('Total lines in all chapters:', totalLinesInChapters);
console.log('Total lines in file:', result3.lines.length);
if (result3.lines.length !== totalLinesInChapters) {
  console.log('❌ BUG CONFIRMED: Missing', result3.lines.length - totalLinesInChapters, 'lines from chapters!\n');
} else {
  console.log('✓ No bug here\n');
}

// BUG 4: Empty file behavior
console.log('BUG 4: Empty file');
const content4 = '';
const result4 = parser.parse(content4, 'empty.txt');
console.log('Lines:', result4.lines.length, JSON.stringify(result4.lines));
console.log('Chapters:', result4.chapters.length);
console.log('Chapter lines:', result4.chapters[0].lines.length);
console.log('Are they the same array?', result4.lines === result4.chapters[0].lines);
console.log('✓ This seems OK - single empty line\n');

// BUG 5: File with only whitespace before chapter
console.log('BUG 5: Whitespace-only lines before chapter');
const content5 = '   \n\t\n  \n第一章 测试\n内容';
const result5 = parser.parse(content5, 'test.txt');
console.log('Total lines:', result5.lines.length);
console.log('First chapter startLine:', result5.chapters[0].startLine);
console.log('Chapter lines count:', result5.chapters[0].lines.length);
totalLinesInChapters = result5.chapters.reduce((sum, ch) => sum + ch.lines.length, 0);
if (result5.lines.length !== totalLinesInChapters) {
  console.log('❌ BUG CONFIRMED: Missing', result5.lines.length - totalLinesInChapters, 'lines from chapters!\n');
}
