import { Repository } from 'typeorm';

export interface CrudConfig<T> {
  entityName: string;
  allowedUpdateFields?: (keyof T)[];
  customUpdateLogic?: (entity: T, updateData: Partial<T>) => Partial<T>;
  beforeUpdate?: (entity: T, updateData: Partial<T>) => Promise<void>;
  afterUpdate?: (entity: T, updateData: Partial<T>) => Promise<void>;
  relations?: string[];
  validationRules?: { [K in keyof T]?: (value: T[K]) => boolean | string };
}

/**
 * Generic CRUD service for common entity operations
 */
export class GenericCrudService {
  /**
   * Generic update method with configurable field filtering and validation
   */
  static async updateEntity<T extends { id: string }>(
    repository: Repository<T>,
    id: string,
    updateData: Partial<T>,
    config: CrudConfig<T>,
  ): Promise<{ message: string; entity?: T }> {
    // Find entity with relations if specified
    const findOptions: any = { where: { id } };
    if (config.relations) {
      findOptions.relations = config.relations;
    }

    const entity = await repository.findOne(findOptions);
    if (!entity) {
      throw new Error(`${config.entityName} not found`);
    }

    // Run before update hook
    if (config.beforeUpdate) {
      await config.beforeUpdate(entity, updateData);
    }

    // Filter allowed fields or use custom update logic
    let fieldsToUpdate: Partial<T>;
    if (config.customUpdateLogic) {
      fieldsToUpdate = config.customUpdateLogic(entity, updateData);
    } else if (config.allowedUpdateFields) {
      fieldsToUpdate = {};
      config.allowedUpdateFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          // Validate field if rules exist
          if (config.validationRules?.[field]) {
            const validation = config.validationRules[field]!(updateData[field]!);
            if (typeof validation === 'string') {
              throw new Error(`Validation failed for ${String(field)}: ${validation}`);
            }
            if (!validation) {
              throw new Error(`Invalid value for ${String(field)}`);
            }
          }
          fieldsToUpdate[field] = updateData[field];
        }
      });
    } else {
      // Use all provided fields (not recommended for production)
      fieldsToUpdate = updateData;
    }

    // Perform update
    await repository.update(id, fieldsToUpdate as any);

    // Run after update hook
    if (config.afterUpdate) {
      await config.afterUpdate(entity, updateData);
    }

    return {
      message: `${config.entityName} updated successfully`,
      entity: { ...entity, ...fieldsToUpdate },
    };
  }

  /**
   * Generic delete method with cascade handling
   */
  static async deleteEntity<T extends { id: string }>(
    repository: Repository<T>,
    id: string,
    config: {
      entityName: string;
      relations?: string[];
      cascadeDeletes?: {
        [relationName: string]: {
          repository: Repository<any>;
          deleteKey: string;
        };
      };
      beforeDelete?: (entity: T) => Promise<void>;
      afterDelete?: (entity: T) => Promise<void>;
    },
  ): Promise<{ message: string }> {
    // Find entity with relations
    const findOptions: any = { where: { id } };
    if (config.relations) {
      findOptions.relations = config.relations;
    }

    const entity = await repository.findOne(findOptions);
    if (!entity) {
      throw new Error(`${config.entityName} not found`);
    }

    // Run before delete hook
    if (config.beforeDelete) {
      await config.beforeDelete(entity);
    }

    // Handle cascade deletes
    if (config.cascadeDeletes) {
      for (const [relationName, cascadeConfig] of Object.entries(config.cascadeDeletes)) {
        const relatedEntities = (entity as any)[relationName];
        if (relatedEntities && Array.isArray(relatedEntities) && relatedEntities.length > 0) {
          const idsToDelete = relatedEntities.map((item) => item[cascadeConfig.deleteKey]);
          await cascadeConfig.repository.delete(idsToDelete);
        }
      }
    }

    // Delete the main entity
    await repository.remove(entity);

    // Run after delete hook
    if (config.afterDelete) {
      await config.afterDelete(entity);
    }

    return { message: `${config.entityName} deleted successfully` };
  }

  /**
   * Generic method to check if entity exists
   */
  static async entityExists<T>(
    repository: Repository<T>,
    id: string,
    entityName: string,
  ): Promise<T> {
    const entity = await repository.findOne({ where: { id } } as any);
    if (!entity) {
      throw new Error(`${entityName} not found`);
    }
    return entity;
  }
}
