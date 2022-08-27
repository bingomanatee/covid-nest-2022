export function asInt(value) {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return null;
    }
    return Math.round(value);
  }
  if (typeof value === 'string') {
    return value ? asInt(Number.parseInt(value)) : null;
  }
  return null;
}

export function asFloat(value) {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return null;
    }
    return value;
  }
  if (typeof value === 'string') {
    return value ? asFloat(Number.parseFloat(value)) : null;
  }
  return null;
}

export function asString(value) {
  return `${value}`;
}
