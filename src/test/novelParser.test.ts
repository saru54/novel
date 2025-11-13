import * as assert from 'assert';
import { NovelParser } from '../parsers/novelParser';

suite('NovelParser Test Suite', () => {
  let parser: NovelParser;

  setup(() => {
    parser = new NovelParser();
  });

  test('Bug: Empty file should create single chapter with fallback title', () => {
    const result = parser.parse('', 'EmptyFile.txt');
    
    assert.strictEqual(result.lines.length, 1);
    assert.strictEqual(result.chapters.length, 1);
    assert.strictEqual(result.chapters[0].title, 'EmptyFile.txt');
    assert.strictEqual(result.chapters[0].lines.length, 1);
  });

  test('Bug: Single chapter with empty content after title', () => {
    const content = '第一章 开始\n';
    const result = parser.parse(content, 'test.txt');
    
    assert.strictEqual(result.chapters.length, 1);
    assert.strictEqual(result.chapters[0].title, '第一章 开始');
    // Bug: The chapter should include the title line in its content
    assert.ok(result.chapters[0].lines.length > 0, 'Chapter lines should not be empty');
  });

  test('Bug: Multiple chapters with edge case - last chapter empty', () => {
    const content = '第一章 开始\n一些内容\n第二章 结束';
    const result = parser.parse(content, 'test.txt');
    
    assert.strictEqual(result.chapters.length, 2);
    assert.strictEqual(result.chapters[0].title, '第一章 开始');
    assert.strictEqual(result.chapters[1].title, '第二章 结束');
    
    // Bug: Last chapter should have at least the title line
    assert.ok(result.chapters[1].lines.length > 0, 'Last chapter should have content');
  });

  test('Bug: Chapter with only whitespace lines', () => {
    const content = '第一章 测试\n   \n\t\n  \n第二章 继续\n内容';
    const result = parser.parse(content, 'test.txt');
    
    assert.strictEqual(result.chapters.length, 2);
    // Each chapter should preserve whitespace lines
    assert.ok(result.chapters[0].lines.length >= 4, 'First chapter should include whitespace lines');
  });

  test('Bug: Buffer reference issue - chapters sharing lines', () => {
    const content = '第一章\n内容1\n第二章\n内容2';
    const result = parser.parse(content, 'test.txt');
    
    assert.strictEqual(result.chapters.length, 2);
    
    // Verify chapters have independent line arrays
    const chapter1Lines = result.chapters[0].lines;
    const chapter2Lines = result.chapters[1].lines;
    
    assert.notStrictEqual(chapter1Lines, chapter2Lines, 'Chapters should have different line arrays');
  });

  test('Bug: Encoding detection for GBK content', () => {
    // Create a Buffer with GBK encoded Chinese text
    const gbkContent = Buffer.from([0xB5, 0xDA, 0xD2, 0xBB, 0xD5, 0xC2]); // "第一章" in GBK
    const result = parser.parse(gbkContent, 'test.txt');
    
    // Should successfully decode GBK content
    assert.ok(result.lines.length > 0);
    assert.ok(result.chapters.length > 0);
  });

  test('Bug: CRLF line endings should be normalized', () => {
    const content = '第一章\r\n内容1\r\n第二章\r\n内容2';
    const result = parser.parse(content, 'test.txt');
    
    // Lines should be split correctly
    assert.strictEqual(result.lines.length, 4);
    assert.strictEqual(result.chapters.length, 2);
  });
});
