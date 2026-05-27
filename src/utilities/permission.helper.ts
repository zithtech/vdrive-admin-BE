export interface RawPermission {
  module: string;
  action: string;
}

export interface NestedPermissions {
  [module: string]: {
    [action: string]: boolean;
  };
}

/**
 * Transforms a flat list of module-action permissions into a nested boolean lookup structure.
 * Example input: [{ module: 'drivers', action: 'read' }, { module: 'drivers', action: 'create' }]
 * Example output: { drivers: { read: true, create: true } }
 */
export function transformPermissions(rawPermissions: RawPermission[]): NestedPermissions {
  const nested: NestedPermissions = {};

  if (!rawPermissions || !Array.isArray(rawPermissions)) {
    return nested;
  }

  rawPermissions.forEach(({ module, action }) => {
    if (module && action) {
      if (!nested[module]) {
        nested[module] = {};
      }
      nested[module][action] = true;
    }
  });

  return nested;
}
