import { Repository } from 'typeorm';

export function mockRepository<T extends object>(): jest.Mocked<
  Pick<
    Repository<T>,
    'findOne' | 'find' | 'save' | 'create' | 'remove' | 'delete' | 'update'
  >
> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(async (entity) => entity),
    create: jest.fn((entity) => entity),
    remove: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      Repository<T>,
      'findOne' | 'find' | 'save' | 'create' | 'remove' | 'delete' | 'update'
    >
  >;
}
