#!/usr/bin/env node
/**
 * Bug Reproduction Tests
 * 
 * This script demonstrates the bugs found in the Novel Navigator extension.
 * Run with: node tests/reproduce-bugs.js
 */

const { NovelParser } = require('../out/parsers/novelParser');

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║  Bug Reproduction Test Suite for Novel Navigator    ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

const parser = new NovelParser();

// ============================================================================
// BUG #1: Orphaned Lines Before First Chapter
// ============================================================================
console.log('═══ BUG #1: Orphaned Lines Before First Chapter ═══\n');
console.log('Description: When a file has content (empty lines or text) before');
console.log('the first chapter marker, these lines are NOT included in any chapter.');
console.log('This causes navigation issues and content loss.\n');

const bug1Content = '\n\n第一章 开始\n正文内容';
const bug1Result = parser.parse(bug1Content, 'test.txt');

console.log('Input file content:');
console.log('  Line 0: (empty)');
console.log('  Line 1: (empty)');
console.log('  Line 2: "第一章 开始"');
console.log('  Line 3: "正文内容"\n');

console.log(`Total lines in file: ${bug1Result.lines.length}`);
console.log(`Number of chapters: ${bug1Result.chapters.length}`);
console.log(`First chapter startLine: ${bug1Result.chapters[0].startLine}`);
console.log(`First chapter line count: ${bug1Result.chapters[0].lines.length}\n`);

const totalChapterLines = bug1Result.chapters.reduce((sum, ch) => sum + ch.lines.length, 0);
console.log(`Lines in all chapters combined: ${totalChapterLines}`);
console.log(`Total lines in file: ${bug1Result.lines.length}`);
console.log(`Missing lines: ${bug1Result.lines.length - totalChapterLines}\n`);

if (bug1Result.lines.length !== totalChapterLines) {
  console.log('❌ BUG CONFIRMED: Lines 0-1 are orphaned and not in any chapter!');
  console.log('   Impact: Users cannot navigate to or view these lines.');
  console.log('   Expected: All lines should be included in some chapter.\n');
} else {
  console.log('✓ No bug detected\n');
}

// ============================================================================
// BUG #2: Whitespace Lines Before First Chapter
// ============================================================================
console.log('═══ BUG #2: Whitespace Lines Before First Chapter ═══\n');
console.log('Description: Similar to Bug #1, but with whitespace-only lines.');
console.log('These lines have spaces/tabs but are not detected as chapter markers.\n');

const bug2Content = '   \n\t\n  \n第一章 测试\n内容';
const bug2Result = parser.parse(bug2Content, 'test.txt');

console.log('Input file content:');
console.log('  Line 0: "   " (spaces)');
console.log('  Line 1: "\\t" (tab)');
console.log('  Line 2: "  " (spaces)');
console.log('  Line 3: "第一章 测试"');
console.log('  Line 4: "内容"\n');

console.log(`Total lines in file: ${bug2Result.lines.length}`);
const totalChapterLines2 = bug2Result.chapters.reduce((sum, ch) => sum + ch.lines.length, 0);
console.log(`Lines in all chapters: ${totalChapterLines2}`);
console.log(`Missing lines: ${bug2Result.lines.length - totalChapterLines2}\n`);

if (bug2Result.lines.length !== totalChapterLines2) {
  console.log('❌ BUG CONFIRMED: Whitespace lines are orphaned!');
  console.log('   Impact: Same as Bug #1.\n');
} else {
  console.log('✓ No bug detected\n');
}

// ============================================================================
// BUG #3: Content Before First Chapter
// ============================================================================
console.log('═══ BUG #3: Actual Content Before First Chapter ═══\n');
console.log('Description: When a novel file has a prologue or introduction');
console.log('before the first numbered chapter, this content is lost.\n');

const bug3Content = '这是序言\n作者的话\n\n第一章 正式开始\n故事内容';
const bug3Result = parser.parse(bug3Content, 'test.txt');

console.log('Input file content:');
console.log('  Line 0: "这是序言"');
console.log('  Line 1: "作者的话"');
console.log('  Line 2: (empty)');
console.log('  Line 3: "第一章 正式开始"');
console.log('  Line 4: "故事内容"\n');

console.log(`Total lines in file: ${bug3Result.lines.length}`);
const totalChapterLines3 = bug3Result.chapters.reduce((sum, ch) => sum + ch.lines.length, 0);
console.log(`Lines in all chapters: ${totalChapterLines3}`);
console.log(`Missing lines: ${bug3Result.lines.length - totalChapterLines3}\n`);

if (bug3Result.lines.length !== totalChapterLines3) {
  console.log('❌ BUG CONFIRMED: Prologue content is lost!');
  console.log('   Impact: Users lose important context/introduction.');
  console.log('   Expected: Content before first chapter should be in a special');
  console.log('             chapter (e.g., "序言" or fallback title).\n');
} else {
  console.log('✓ No bug detected\n');
}

// ============================================================================
// Summary
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('SUMMARY');
console.log('═══════════════════════════════════════════════════════\n');
console.log('Root Cause: The parser only adds lines to chapters when a chapter');
console.log('           title is detected. Lines before the first chapter are');
console.log('           added to `buffer` but never committed to any chapter.\n');
console.log('Affected Code: src/parsers/novelParser.ts, lines 39-78\n');
console.log('Fix Required: Ensure all lines before the first chapter are either:');
console.log('              1. Added to a "prologue" chapter, or');
console.log('              2. Added to the first detected chapter\n');
