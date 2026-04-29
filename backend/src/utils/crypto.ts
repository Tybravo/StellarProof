import crypto from 'crypto';

/**
 * Recursively sorts the keys of an object to ensure deterministic stringification.
 */
const sortObjectKeys = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, any> = {};
  
  sortedKeys.forEach((key) => {
    result[key] = sortObjectKeys(obj[key]);
  });
  
  return result;
};

/**
 * Generates a deterministic SHA256 hash from a JSON object.
 */
export const generateDeterministicHash = (data: Record<string, any>): string => {
  const sortedObject = sortObjectKeys(data);
  const jsonString = JSON.stringify(sortedObject);
  
  return crypto.createHash('sha256').update(jsonString).digest('hex');
};