"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const novelParser_1 = require("../parsers/novelParser");
suite('NovelParser Test Suite', () => {
    let parser;
    setup(() => {
        parser = new novelParser_1.NovelParser();
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
//# sourceMappingURL=novelParser.test.js.map