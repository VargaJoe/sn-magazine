function deepEqual(a, b, visited = new WeakMap()) {
  // Handle primitive types and null/undefined
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  
  // Handle different types
  if (typeof a !== typeof b) return false;
  
  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i], visited)) return false;
    }
    return true;
  }
  
  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    // Check for circular reference
    if (visited.has(a)) return visited.get(a) === b;
    visited.set(a, b);
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key], visited)) return false;
    }
    return true;
  }
  
  return false;
}

export default deepEqual;