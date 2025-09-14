/**
 * CVPlus Premium Phase 4: Role-Based Access Control (RBAC)
 * Enterprise-grade permission management system
 * 
 * @author Gil Klainert
 * @version 4.0.0
 * @category Enterprise Security
 */

import { Logger } from '../../shared/logger';

const logger = new Logger();
import { BaseService } from '../../shared/base-service';
import { db } from '../../../config/firebase';
import { EnterpriseRole, Permission, AccessCondition } from './tenantManager';

export interface UserRole {
  userId: string;
  tenantId: string;
  roleId: string;
  departmentId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  conditions?: RoleCondition[];
  isActive: boolean;
}

export interface RoleCondition {
  type: 'time_based' | 'location_based' | 'ip_based' | 'project_based';
  configuration: any;
}

export interface PermissionCheck {
  userId: string;
  tenantId: string;
  resource: string;
  action: string;
  context?: PermissionContext;
}

export interface PermissionContext {
  departmentId?: string;
  projectId?: string;
  resourceOwnerId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface AccessAttempt {
  userId: string;
  tenantId: string;
  resource: string;
  action: string;
  result: 'granted' | 'denied' | 'conditional';
  reason: string;
  context: PermissionContext;
  timestamp: Date;
}

export interface RoleTemplate {
  templateId: string;
  name: string;
  description: string;
  permissions: Permission[];
  category: 'executive' | 'management' | 'operations' | 'technical' | 'support';
  level: number;
}

export interface PermissionGroup {
  groupId: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystemGroup: boolean;
}

export interface AccessPolicy {
  policyId: string;
  name: string;
  description: string;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  priority: number;
  isActive: boolean;
}

export interface PolicyCondition {
  type: 'user' | 'role' | 'department' | 'time' | 'location' | 'resource';
  operator: 'equals' | 'in' | 'not_in' | 'contains' | 'matches';
  value: any;
}

export interface PolicyAction {
  type: 'allow' | 'deny' | 'require_approval' | 'log' | 'notify';
  configuration?: any;
}

/**
 * Enterprise Role-Based Access Control Service
 * Manages complex permission structures for enterprise environments
 */
export class EnterpriseRBACService extends BaseService {
  private readonly USER_ROLES_COLLECTION = 'user_roles';
  private readonly PERMISSIONS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private permissionsCache: Map<string, { permissions: Permission[], expires: number }> = new Map();

  /**
   * Assign role to user with optional conditions
   */
  async assignRole(
    userId: string,
    tenantId: string,
    roleId: string,
    assignedBy: string,
    conditions?: RoleCondition[]
  ): Promise<void> {
    try {
      logger.info('Assigning role to user', { userId, tenantId, roleId, assignedBy });

      // Validate role exists and is active
      await this.validateRoleExists(tenantId, roleId);

      // Check permission to assign roles
      const hasPermission = await this.checkPermission({
        userId: assignedBy,
        tenantId,
        resource: 'roles',
        action: 'assign'
      });

      if (!hasPermission) {
        throw new Error('Insufficient permissions to assign roles');
      }

      // Remove existing role assignments for this user in this tenant
      await this.removeUserRoles(userId, tenantId);

      // Create new role assignment
      const userRole: UserRole = {
        userId,
        tenantId,
        roleId,
        departmentId: await this.getUserDepartment(userId, tenantId),
        assignedBy,
        assignedAt: new Date(),
        conditions,
        isActive: true
      };

      // Store role assignment
      await db.collection(`tenants/${tenantId}/${this.USER_ROLES_COLLECTION}`)
        .doc(userId)
        .set(userRole);

      // Clear permissions cache for this user
      this.clearUserPermissionsCache(userId, tenantId);

      // Log role assignment
      await this.auditRoleAssignment(userRole, 'assign');

      logger.info('Role assigned successfully', { userId, tenantId, roleId });
    } catch (error) {
      logger.error('Failed to assign role', { error, userId, tenantId, roleId });
      throw error;
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(
    userId: string,
    tenantId: string,
    removedBy: string
  ): Promise<void> {
    try {
      logger.info('Removing role from user', { userId, tenantId, removedBy });

      // Check permission to remove roles
      const hasPermission = await this.checkPermission({
        userId: removedBy,
        tenantId,
        resource: 'roles',
        action: 'remove'
      });

      if (!hasPermission) {
        throw new Error('Insufficient permissions to remove roles');
      }

      // Get current role for audit
      const currentRole = await this.getUserRole(userId, tenantId);

      // Remove role assignment
      await db.collection(`tenants/${tenantId}/${this.USER_ROLES_COLLECTION}`)
        .doc(userId)
        .delete();

      // Clear permissions cache
      this.clearUserPermissionsCache(userId, tenantId);

      // Log role removal
      if (currentRole) {
        await this.auditRoleAssignment(currentRole, 'remove');
      }

      logger.info('Role removed successfully', { userId, tenantId });
    } catch (error) {
      logger.error('Failed to remove role', { error, userId, tenantId });
      throw error;
    }
  }

  /**
   * Check if user has permission for specific action
   */
  async checkPermission(check: PermissionCheck): Promise<boolean> {
    try {
      const { userId, tenantId, resource, action, context } = check;

      // Get user's effective permissions
      const permissions = await this.getUserEffectivePermissions(userId, tenantId);

      // Check direct permissions
      const hasDirectPermission = this.evaluatePermissions(permissions, resource, action, context);

      if (hasDirectPermission) {
        await this.logAccessAttempt({
          userId,
          tenantId,
          resource,
          action,
          result: 'granted',
          reason: 'Direct permission match',
          context: context || { timestamp: new Date() },
          timestamp: new Date()
        });
        return true;
      }

      // Check policy-based permissions
      const policyResult = await this.evaluatePolicies(userId, tenantId, resource, action, context);

      if (policyResult.allowed) {
        await this.logAccessAttempt({
          userId,
          tenantId,
          resource,
          action,
          result: policyResult.conditional ? 'conditional' : 'granted',
          reason: policyResult.reason,
          context: context || { timestamp: new Date() },
          timestamp: new Date()
        });
        return true;
      }

      // Access denied
      await this.logAccessAttempt({
        userId,
        tenantId,
        resource,
        action,
        result: 'denied',
        reason: 'No matching permissions or policies',
        context: context || { timestamp: new Date() },
        timestamp: new Date()
      });

      return false;
    } catch (error) {
      logger.error('Permission check failed', { error, check });
      
      // Fail secure - deny access on error
      await this.logAccessAttempt({
        userId: check.userId,
        tenantId: check.tenantId,
        resource: check.resource,
        action: check.action,
        result: 'denied',
        reason: `Permission check error: ${error.message}`,
        context: check.context || { timestamp: new Date() },
        timestamp: new Date()
      });

      return false;
    }
  }

  /**
   * Get user's effective permissions (role + conditions + policies)
   */
  async getUserEffectivePermissions(userId: string, tenantId: string): Promise<Permission[]> {
    try {
      const cacheKey = `${userId}:${tenantId}`;
      const cached = this.permissionsCache.get(cacheKey);

      if (cached && cached.expires > Date.now()) {
        return cached.permissions;
      }

      // Get user role
      const userRole = await this.getUserRole(userId, tenantId);
      if (!userRole || !userRole.isActive) {
        return [];
      }

      // Get role permissions
      const role = await this.getRole(tenantId, userRole.roleId);
      if (!role) {
        return [];
      }

      let effectivePermissions = [...role.permissions];

      // Apply role conditions
      if (userRole.conditions) {
        effectivePermissions = this.applyRoleConditions(effectivePermissions, userRole.conditions);
      }

      // Apply department restrictions
      if (role.departmentRestrictions && role.departmentRestrictions.length > 0) {
        effectivePermissions = effectivePermissions.map(permission => ({
          ...permission,
          conditions: [
            ...(permission.conditions || []),
            {
              field: 'departmentId',
              operator: 'in',
              value: role.departmentRestrictions
            }
          ]
        }));
      }

      // Cache permissions
      this.permissionsCache.set(cacheKey, {
        permissions: effectivePermissions,
        expires: Date.now() + this.PERMISSIONS_CACHE_DURATION
      });

      return effectivePermissions;
    } catch (error) {
      logger.error('Failed to get effective permissions', { error, userId, tenantId });
      return [];
    }
  }

  /**
   * Create custom role
   */
  async createRole(tenantId: string, role: EnterpriseRole, createdBy: string): Promise<void> {
    try {
      logger.info('Creating custom role', { tenantId, roleId: role.roleId, createdBy });

      // Check permission to create roles
      const hasPermission = await this.checkPermission({
        userId: createdBy,
        tenantId,
        resource: 'roles',
        action: 'create'
      });

      if (!hasPermission) {
        throw new Error('Insufficient permissions to create roles');
      }

      // Validate role data
      this.validateRoleData(role);

      // Store role
      await db.collection(`tenants/${tenantId}/roles`).doc(role.roleId).set({
        ...role,
        createdBy,
        createdAt: new Date(),
        isCustomRole: true
      });

      logger.info('Custom role created successfully', { tenantId, roleId: role.roleId });
    } catch (error) {
      logger.error('Failed to create role', { error, tenantId, role });
      throw error;
    }
  }

  /**
   * Update role permissions
   */
  async updateRole(
    tenantId: string,
    roleId: string,
    updates: Partial<EnterpriseRole>,
    updatedBy: string
  ): Promise<void> {
    try {
      logger.info('Updating role', { tenantId, roleId, updatedBy });

      // Check permission to update roles
      const hasPermission = await this.checkPermission({
        userId: updatedBy,
        tenantId,
        resource: 'roles',
        action: 'update'
      });

      if (!hasPermission) {
        throw new Error('Insufficient permissions to update roles');
      }

      // Update role
      await db.collection(`tenants/${tenantId}/roles`).doc(roleId).update({
        ...updates,
        updatedBy,
        updatedAt: new Date()
      });

      // Clear permissions cache for users with this role
      await this.clearRolePermissionsCache(tenantId, roleId);

      logger.info('Role updated successfully', { tenantId, roleId });
    } catch (error) {
      logger.error('Failed to update role', { error, tenantId, roleId, updates });
      throw error;
    }
  }

  /**
   * Audit user access patterns
   */
  async auditUserAccess(
    userId: string,
    tenantId: string,
    timeframe: { start: Date; end: Date }
  ): Promise<AccessAttempt[]> {
    try {
      const snapshot = await db.collection(`tenants/${tenantId}/audit_logs`)
        .where('userId', '==', userId)
        .where('timestamp', '>=', timeframe.start)
        .where('timestamp', '<=', timeframe.end)
        .orderBy('timestamp', 'desc')
        .limit(1000)
        .get();

      return snapshot.docs.map(doc => doc.data() as AccessAttempt);
    } catch (error) {
      logger.error('Failed to audit user access', { error, userId, tenantId, timeframe });
      throw error;
    }
  }

  /**
   * Get role templates for common enterprise roles
   */
  getRoleTemplates(): RoleTemplate[] {
    return [
      {
        templateId: 'ceo',
        name: 'Chief Executive Officer',
        description: 'Full organizational access and control',
        category: 'executive',
        level: 10,
        permissions: [
          {
            resource: '*',
            actions: ['create', 'read', 'update', 'delete', 'approve', 'admin'],
            scope: 'global'
          }
        ]
      },
      {
        templateId: 'hr_manager',
        name: 'HR Manager',
        description: 'Human resources management and employee data access',
        category: 'management',
        level: 7,
        permissions: [
          {
            resource: 'employees',
            actions: ['create', 'read', 'update', 'approve'],
            scope: 'global'
          },
          {
            resource: 'reports',
            actions: ['create', 'read', 'share'],
            scope: 'department'
          },
          {
            resource: 'policies',
            actions: ['create', 'read', 'update'],
            scope: 'department'
          }
        ]
      },
      {
        templateId: 'department_head',
        name: 'Department Head',
        description: 'Departmental leadership and management',
        category: 'management',
        level: 6,
        permissions: [
          {
            resource: 'employees',
            actions: ['read', 'update', 'approve'],
            scope: 'department'
          },
          {
            resource: 'reports',
            actions: ['create', 'read', 'share'],
            scope: 'department'
          },
          {
            resource: 'budget',
            actions: ['read', 'approve'],
            scope: 'department'
          }
        ]
      },
      {
        templateId: 'team_lead',
        name: 'Team Lead',
        description: 'Team management and coordination',
        category: 'operations',
        level: 4,
        permissions: [
          {
            resource: 'employees',
            actions: ['read'],
            scope: 'team'
          },
          {
            resource: 'projects',
            actions: ['create', 'read', 'update', 'approve'],
            scope: 'team'
          },
          {
            resource: 'reports',
            actions: ['create', 'read'],
            scope: 'team'
          }
        ]
      },
      {
        templateId: 'senior_employee',
        name: 'Senior Employee',
        description: 'Experienced individual contributor with mentoring responsibilities',
        category: 'operations',
        level: 3,
        permissions: [
          {
            resource: 'projects',
            actions: ['create', 'read', 'update'],
            scope: 'own'
          },
          {
            resource: 'cvs',
            actions: ['create', 'read', 'update', 'share'],
            scope: 'own'
          },
          {
            resource: 'mentoring',
            actions: ['create', 'read', 'update'],
            scope: 'team'
          }
        ]
      }
    ];
  }

  // Private helper methods

  private async validateRoleExists(tenantId: string, roleId: string): Promise<void> {
    const role = await this.getRole(tenantId, roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }
  }

  private async getRole(tenantId: string, roleId: string): Promise<EnterpriseRole | null> {
    const doc = await db.collection(`tenants/${tenantId}/roles`).doc(roleId).get();
    return doc.exists ? doc.data() as EnterpriseRole : null;
  }

  private async getUserRole(userId: string, tenantId: string): Promise<UserRole | null> {
    const doc = await db.collection(`tenants/${tenantId}/${this.USER_ROLES_COLLECTION}`)
      .doc(userId)
      .get();
    return doc.exists ? doc.data() as UserRole : null;
  }

  private async getUserDepartment(userId: string, tenantId: string): Promise<string> {
    const userDoc = await db.collection(`tenants/${tenantId}/users`).doc(userId).get();
    return userDoc.exists ? userDoc.data()?.departmentId || 'default' : 'default';
  }

  private async removeUserRoles(userId: string, tenantId: string): Promise<void> {
    await db.collection(`tenants/${tenantId}/${this.USER_ROLES_COLLECTION}`)
      .doc(userId)
      .delete();
  }

  private evaluatePermissions(
    permissions: Permission[],
    resource: string,
    action: string,
    context?: PermissionContext
  ): boolean {
    for (const permission of permissions) {
      if (this.matchesResource(permission.resource, resource) &&
          permission.actions.includes(action as any)) {
        
        // Check conditions if present
        if (permission.conditions && context) {
          if (!this.evaluateConditions(permission.conditions, context)) {
            continue;
          }
        }

        return true;
      }
    }
    return false;
  }

  private matchesResource(permissionResource: string, requestedResource: string): boolean {
    if (permissionResource === '*') return true;
    if (permissionResource === requestedResource) return true;
    
    // Support wildcard patterns
    const pattern = permissionResource.replace('*', '.*');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(requestedResource);
  }

  private evaluateConditions(conditions: AccessCondition[], context: PermissionContext): boolean {
    return conditions.every(condition => {
      const contextValue = context[condition.field as keyof PermissionContext];
      
      switch (condition.operator) {
        case 'equals':
          return contextValue === condition.value;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(contextValue);
        case 'contains':
          return String(contextValue).includes(condition.value);
        case 'greater_than':
          return Number(contextValue) > condition.value;
        case 'less_than':
          return Number(contextValue) < condition.value;
        default:
          return false;
      }
    });
  }

  private async evaluatePolicies(
    userId: string,
    tenantId: string,
    resource: string,
    action: string,
    context?: PermissionContext
  ): Promise<{ allowed: boolean; conditional: boolean; reason: string }> {
    // Policy evaluation would be implemented here
    // For now, return default deny
    return {
      allowed: false,
      conditional: false,
      reason: 'No applicable policies found'
    };
  }

  private applyRoleConditions(permissions: Permission[], conditions: RoleCondition[]): Permission[] {
    // Apply role-specific conditions to permissions
    return permissions.map(permission => ({
      ...permission,
      conditions: [
        ...(permission.conditions || []),
        ...this.convertRoleConditions(conditions)
      ]
    }));
  }

  private convertRoleConditions(conditions: RoleCondition[]): AccessCondition[] {
    // Convert role conditions to access conditions
    return conditions.map(condition => ({
      field: condition.type,
      operator: 'equals' as const,
      value: condition.configuration
    }));
  }

  private validateRoleData(role: EnterpriseRole): void {
    if (!role.roleId || !role.roleName) {
      throw new Error('Role ID and name are required');
    }

    if (!['admin', 'manager', 'lead', 'user', 'viewer'].includes(role.level)) {
      throw new Error('Invalid role level');
    }

    if (!Array.isArray(role.permissions)) {
      throw new Error('Permissions must be an array');
    }
  }

  private clearUserPermissionsCache(userId: string, tenantId: string): void {
    const cacheKey = `${userId}:${tenantId}`;
    this.permissionsCache.delete(cacheKey);
  }

  private async clearRolePermissionsCache(tenantId: string, roleId: string): Promise<void> {
    // Get all users with this role and clear their cache
    const usersWithRole = await db.collection(`tenants/${tenantId}/${this.USER_ROLES_COLLECTION}`)
      .where('roleId', '==', roleId)
      .get();

    for (const doc of usersWithRole.docs) {
      const userRole = doc.data() as UserRole;
      this.clearUserPermissionsCache(userRole.userId, tenantId);
    }
  }

  private async auditRoleAssignment(userRole: UserRole, action: string): Promise<void> {
    await db.collection(`tenants/${userRole.tenantId}/audit_logs`).add({
      type: 'role_assignment',
      action,
      userId: userRole.userId,
      roleId: userRole.roleId,
      assignedBy: userRole.assignedBy,
      timestamp: new Date(),
      details: userRole
    });
  }

  private async logAccessAttempt(attempt: AccessAttempt): Promise<void> {
    await db.collection(`tenants/${attempt.tenantId}/audit_logs`).add({
      type: 'access_attempt',
      ...attempt
    });
  }

  protected async onInitialize(): Promise<void> {
    logger.info('EnterpriseRBACService initializing');
    // Initialize any required connections or configurations
  }

  protected async onCleanup(): Promise<void> {
    logger.info('EnterpriseRBACService cleaning up');
    // Cleanup resources
  }

  protected async onHealthCheck(): Promise<Partial<any>> {
    return {
      status: 'healthy',
      component: 'EnterpriseRBACService',
      timestamp: new Date().toISOString()
    };
  }
}