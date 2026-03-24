import { describe, it, expect, beforeEach } from 'vitest';
import { JSONSerializer } from '../services/JSONSerializer';

describe('JSONSerializer', () => {
  beforeEach(() => {
    // Reset state if needed
  });

  it('should serialize data to JSON string', () => {
    const data = { name: 'test', value: 123 };
    const serialized = JSONSerializer.serialize(data);
    
    expect(typeof serialized).toBe('string');
    expect(serialized).toContain('"name": "test"');
    expect(serialized).toContain('"value": 123');
  });

  it('should deserialize JSON string to data', () => {
    const data = { name: 'test', value: 123 };
    const serialized = JSONSerializer.serialize(data);
    const deserialized = JSONSerializer.deserialize(serialized);
    
    expect(deserialized).toEqual(data);
  });

  it('should serialize to RPG Maker format', () => {
    const data = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ];
    const serialized = JSONSerializer.serializeToRPGMaker(data);
    const parsed = JSON.parse(serialized);
    
    expect(parsed[0]).toBeNull();
    expect(parsed[1]).toEqual({ id: 1, name: 'Item 1' });
    expect(parsed[2]).toEqual({ id: 2, name: 'Item 2' });
  });

  it('should deserialize from RPG Maker format', () => {
    const rpgData = [
      null,
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ];
    const deserialized = JSONSerializer.deserializeFromRPGMaker(JSON.stringify(rpgData));
    
    expect(deserialized).toHaveLength(2);
    expect(deserialized[0]).toEqual({ id: 1, name: 'Item 1' });
  });

  it('should remove null values when configured', () => {
    const data = { name: 'test', nullField: null, undefinedField: undefined };
    const serialized = JSONSerializer.serialize(data, { includeNulls: false });
    const deserialized = JSONSerializer.deserialize(serialized);
    
    expect(deserialized.nullField).toBeUndefined();
    expect(deserialized.undefinedField).toBeUndefined();
  });

  it('should clone data correctly', () => {
    const data = { nested: { value: 123 } };
    const cloned = JSONSerializer.clone(data);
    
    expect(cloned).toEqual(data);
    expect(cloned).not.toBe(data);
    expect(cloned.nested).not.toBe(data.nested);
  });

  it('should deep merge objects', () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { b: { d: 3 }, e: 4 };
    const merged = JSONSerializer.deepMerge(target, source);
    
    expect(merged).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
  });

  it('should validate data against schema', () => {
    const data = { name: 'test', count: 5 };
    const schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        count: { type: 'number' },
      },
    };
    
    const result = JSONSerializer.validate(data, schema);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect validation errors', () => {
    const data = { count: 'not a number' };
    const schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        count: { type: 'number' },
      },
    };
    
    const result = JSONSerializer.validate(data, schema);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
