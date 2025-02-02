import { describe, it, expect } from 'vitest';
import { add } from '../../src/lib/math';

describe('math utilities', () => {
    describe('add', () => {
        it('should correctly add two positive numbers', () => {
            expect(add(2, 3)).toBe(5);
        });

        it('should correctly handle negative numbers', () => {
            expect(add(-2, 3)).toBe(1);
            expect(add(-2, -3)).toBe(-5);
        });

        it('should handle zero', () => {
            expect(add(0, 5)).toBe(5);
            expect(add(5, 0)).toBe(5);
            expect(add(0, 0)).toBe(0);
        });
    });
}); 