// Type definitions for JSON data handling

// Recursive JSON type definition
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[]

// For database columns that store JSON
export type JsonColumn = JsonObject | JsonArray | null;

// For API responses with flexible data
export type ApiJsonResponse = {
  [key: string]: JsonValue;
};