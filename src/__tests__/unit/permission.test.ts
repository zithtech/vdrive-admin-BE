import { transformPermissions, RawPermission } from '../../utilities/permission.helper';

describe('Permissions Transformation Helper', () => {
  it('should successfully transform a flat array of database rows into a nested object map', () => {
    const raw: RawPermission[] = [
      { module: 'drivers', action: 'read' },
      { module: 'drivers', action: 'create' },
      { module: 'pricing', action: 'read' },
    ];

    const result = transformPermissions(raw);

    expect(result).toEqual({
      drivers: {
        read: true,
        create: true,
      },
      pricing: {
        read: true,
      },
    });
  });

  it('should return an empty object when passed an empty array', () => {
    expect(transformPermissions([])).toEqual({});
  });

  it('should gracefully handle invalid inputs', () => {
    expect(transformPermissions(null as any)).toEqual({});
    expect(transformPermissions(undefined as any)).toEqual({});
    expect(transformPermissions({} as any)).toEqual({});
  });
});
