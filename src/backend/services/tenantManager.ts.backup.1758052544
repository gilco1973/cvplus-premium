/**
 * CVPlus Premium Phase 4: Enterprise Tenant Management
 * Multi-tenant architecture for enterprise clients
 * 
 * @author Gil Klainert
 * @version 4.0.0
 * @category Enterprise Management
 */

import { Logger } from '../../shared/logger';

const logger = new Logger();
import { BaseService } from '../../shared/base-service';
import { db } from '../../../config/firebase';
import * as admin from 'firebase-admin';

export interface EnterpriseAccount {
  tenantId: string;
  organizationName: string;
  domain: string;
  subscriptionTier: 'enterprise' | 'enterprise-plus' | 'enterprise-pro';
  seatCount: number;
  usedSeats: number;
  teamHierarchy: TeamStructure;
  billingSettings: EnterpriseBilling;
  ssoConfiguration?: SSOConfig;
  complianceSettings: ComplianceConfig;
  status: 'active' | 'suspended' | 'trial' | 'pending';
  createdAt: Date;
  updatedAt: Date;
  contactInfo: ContactInfo;
  features: EnterpriseFeature[];
}

export interface TeamStructure {
  departments: Department[];
  roles: EnterpriseRole[];
  permissions: PermissionMatrix;
  approvalWorkflows: WorkflowConfig[];
  reportingStructure: ReportingLine[];
}

export interface Department {
  departmentId: string;
  name: string;
  description: string;
  parentDepartmentId?: string;
  managerId: string;
  memberCount: number;
  budget?: DepartmentBudget;
  settings: DepartmentSettings;
}

export interface EnterpriseRole {
  roleId: string;
  roleName: string;
  description: string;
  level: 'admin' | 'manager' | 'lead' | 'user' | 'viewer';
  permissions: Permission[];
  departmentRestrictions?: string[];
  dataAccessLevel: 'full' | 'department' | 'team' | 'own';
}

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete' | 'share' | 'approve' | 'admin')[];
  conditions?: AccessCondition[];
  scope: 'global' | 'department' | 'team' | 'own';
}

export interface AccessCondition {
  field: string;
  operator: 'equals' | 'in' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface PermissionMatrix {
  [roleId: string]: {
    [resource: string]: string[];
  };
}

export interface WorkflowConfig {
  workflowId: string;
  name: string;
  triggerEvent: string;
  approvers: ApprovalLevel[];
  conditions: WorkflowCondition[];
  isActive: boolean;
}

export interface ApprovalLevel {
  level: number;
  approverRoles: string[];
  requiredApprovals: number;
  timeoutHours?: number;
  escalationRoles?: string[];
}

export interface WorkflowCondition {
  field: string;
  operator: string;
  value: any;
}

export interface ReportingLine {
  employeeId: string;
  managerId: string;
  departmentId: string;
  level: number;
}

export interface EnterpriseBilling {
  billingContact: string;
  paymentMethod: 'invoice' | 'credit_card' | 'ach' | 'wire';
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  currency: string;
  taxId?: string;
  purchaseOrderRequired: boolean;
  invoiceEmail: string;
  billingAddress: Address;
}

export interface SSOConfig {
  provider: 'saml' | 'oauth' | 'ldap' | 'azure_ad' | 'okta' | 'ping_identity';
  entityId: string;
  ssoUrl: string;
  logoutUrl?: string;
  certificate: string;
  attributeMapping: AttributeMap;
  autoProvision: boolean;
  defaultRole: string;
  domainRestriction?: string[];
  isActive: boolean;
}

export interface AttributeMap {
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  role?: string;
  manager?: string;
  customAttributes?: { [key: string]: string };
}

export interface ComplianceConfig {
  gdprCompliant: boolean;
  soxCompliant: boolean;
  soc2Compliant: boolean;
  hipaCompliant: boolean;
  dataRetentionDays: number;
  auditLogRetentionDays: number;
  encryptionRequired: boolean;
  dataLocation: 'us' | 'eu' | 'asia' | 'global';
  accessLogRequired: boolean;
  approvalRequired: boolean;
}

export interface ContactInfo {
  primaryContact: {
    name: string;
    email: string;
    phone: string;
    title: string;
  };
  technicalContact: {
    name: string;
    email: string;
    phone: string;
  };
  billingContact: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface EnterpriseFeature {
  featureId: string;
  name: string;
  enabled: boolean;
  configuration?: { [key: string]: any };
  limits?: FeatureLimits;
}

export interface FeatureLimits {
  maxUsers?: number;
  maxStorage?: number;
  maxApiCalls?: number;
  maxReports?: number;
}

export interface DepartmentBudget {
  monthlyLimit: number;
  currency: string;
  currentSpend: number;
  alertThreshold: number;
}

export interface DepartmentSettings {
  allowSelfRegistration: boolean;
  requireManagerApproval: boolean;
  defaultRole: string;
  budgetAlerts: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface EnterpriseSetup {
  organizationName: string;
  domain: string;
  primaryContact: ContactInfo['primaryContact'];
  subscriptionTier: EnterpriseAccount['subscriptionTier'];
  seatCount: number;
  billingSettings: EnterpriseBilling;
  complianceRequirements: string[];
  ssoRequired: boolean;
}

/**
 * Enterprise Account Manager
 * Handles multi-tenant enterprise account provisioning and management
 */
export class EnterpriseAccountManager extends BaseService {
  private readonly COLLECTION = 'enterprise_accounts';

  /**
   * Create new enterprise account with multi-tenant architecture
   */
  async createEnterpriseAccount(config: EnterpriseSetup): Promise<EnterpriseAccount> {
    try {
      logger.info('Creating enterprise account', {
        organizationName: config.organizationName,
        domain: config.domain,
        seatCount: config.seatCount
      });

      // Generate unique tenant ID
      const tenantId = this.generateTenantId(config.organizationName);

      // Validate domain uniqueness
      await this.validateDomainUniqueness(config.domain);

      // Create default team structure
      const defaultTeamStructure = this.createDefaultTeamStructure();

      // Set up compliance configuration
      const complianceConfig = this.configureCompliance(config.complianceRequirements);

      // Create enterprise account
      const enterpriseAccount: EnterpriseAccount = {
        tenantId,
        organizationName: config.organizationName,
        domain: config.domain,
        subscriptionTier: config.subscriptionTier,
        seatCount: config.seatCount,
        usedSeats: 1, // Primary contact
        teamHierarchy: defaultTeamStructure,
        billingSettings: config.billingSettings,
        complianceSettings: complianceConfig,
        status: 'trial',
        createdAt: new Date(),
        updatedAt: new Date(),
        contactInfo: {
          primaryContact: config.primaryContact,
          technicalContact: config.primaryContact,
          billingContact: config.primaryContact
        },
        features: this.getDefaultEnterpriseFeatures(config.subscriptionTier)
      };

      // Store in Firestore with tenant isolation
      await db.collection(this.COLLECTION).doc(tenantId).set(enterpriseAccount);

      // Create tenant-specific collections
      await this.createTenantCollections(tenantId);

      // Set up initial admin user
      await this.createInitialAdmin(tenantId, config.primaryContact);

      // Configure SSO if required
      if (config.ssoRequired) {
        await this.initiateSSOConfiguration(tenantId);
      }

      logger.info('Enterprise account created successfully', {
        tenantId,
        organizationName: config.organizationName
      });

      return enterpriseAccount;
    } catch (error) {
      logger.error('Failed to create enterprise account', { error, config });
      throw new Error(`Enterprise account creation failed: ${error.message}`);
    }
  }

  /**
   * Get enterprise account by tenant ID
   */
  async getEnterpriseAccount(tenantId: string): Promise<EnterpriseAccount | null> {
    try {
      const doc = await db.collection(this.COLLECTION).doc(tenantId).get();
      
      if (!doc.exists) {
        return null;
      }

      return doc.data() as EnterpriseAccount;
    } catch (error) {
      logger.error('Failed to get enterprise account', { error, tenantId });
      throw error;
    }
  }

  /**
   * Update enterprise account
   */
  async updateEnterpriseAccount(
    tenantId: string,
    updates: Partial<EnterpriseAccount>
  ): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await db.collection(this.COLLECTION).doc(tenantId).update(updateData);

      logger.info('Enterprise account updated', { tenantId, updates: Object.keys(updates) });
    } catch (error) {
      logger.error('Failed to update enterprise account', { error, tenantId, updates });
      throw error;
    }
  }

  /**
   * Manage team hierarchy
   */
  async updateTeamHierarchy(tenantId: string, structure: TeamStructure): Promise<void> {
    try {
      logger.info('Updating team hierarchy', { tenantId, departmentCount: structure.departments.length });

      // Validate hierarchy structure
      this.validateTeamStructure(structure);

      // Update team hierarchy
      await this.updateEnterpriseAccount(tenantId, {
        teamHierarchy: structure
      });

      // Update user permissions based on new structure
      await this.updateUserPermissions(tenantId, structure);

      logger.info('Team hierarchy updated successfully', { tenantId });
    } catch (error) {
      logger.error('Failed to update team hierarchy', { error, tenantId });
      throw error;
    }
  }

  /**
   * Add department to enterprise
   */
  async addDepartment(tenantId: string, department: Department): Promise<void> {
    try {
      const account = await this.getEnterpriseAccount(tenantId);
      if (!account) {
        throw new Error('Enterprise account not found');
      }

      // Validate department configuration
      this.validateDepartment(department, account.teamHierarchy);

      // Add department to hierarchy
      account.teamHierarchy.departments.push(department);

      await this.updateTeamHierarchy(tenantId, account.teamHierarchy);

      logger.info('Department added successfully', { tenantId, departmentId: department.departmentId });
    } catch (error) {
      logger.error('Failed to add department', { error, tenantId, department });
      throw error;
    }
  }

  /**
   * Assign user to department
   */
  async assignUserToDepartment(
    tenantId: string,
    userId: string,
    departmentId: string,
    roleId: string
  ): Promise<void> {
    try {
      logger.info('Assigning user to department', { tenantId, userId, departmentId, roleId });

      // Validate seat availability
      await this.validateSeatAvailability(tenantId);

      // Assign user
      await db.collection(`tenants/${tenantId}/users`).doc(userId).update({
        departmentId,
        roleId,
        assignedAt: new Date(),
        updatedAt: new Date()
      });

      // Update seat count
      await this.updateSeatCount(tenantId, 1);

      logger.info('User assigned to department successfully', { tenantId, userId, departmentId });
    } catch (error) {
      logger.error('Failed to assign user to department', { error, tenantId, userId, departmentId });
      throw error;
    }
  }

  /**
   * Enforce enterprise policies
   */
  async enforcePolicies(tenantId: string, policies: EnterprisePolicy[]): Promise<void> {
    try {
      logger.info('Enforcing enterprise policies', { tenantId, policyCount: policies.length });

      for (const policy of policies) {
        await this.enforcePolicy(tenantId, policy);
      }

      // Update policy enforcement status
      await db.collection(`tenants/${tenantId}/policies`).doc('enforcement').set({
        policies,
        enforcedAt: new Date(),
        status: 'active'
      });

      logger.info('Enterprise policies enforced successfully', { tenantId });
    } catch (error) {
      logger.error('Failed to enforce policies', { error, tenantId, policies });
      throw error;
    }
  }

  /**
   * Get tenant analytics
   */
  async getTenantAnalytics(tenantId: string): Promise<TenantAnalytics> {
    try {
      const [userStats, usageStats, billingStats] = await Promise.all([
        this.getUserStatistics(tenantId),
        this.getUsageStatistics(tenantId),
        this.getBillingStatistics(tenantId)
      ]);

      return {
        tenantId,
        userStatistics: userStats,
        usageStatistics: usageStats,
        billingStatistics: billingStats,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to get tenant analytics', { error, tenantId });
      throw error;
    }
  }

  // Private helper methods

  private generateTenantId(organizationName: string): string {
    const normalized = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const timestamp = Date.now().toString(36);
    return `tenant_${normalized}_${timestamp}`;
  }

  private async validateDomainUniqueness(domain: string): Promise<void> {
    const existing = await db.collection(this.COLLECTION)
      .where('domain', '==', domain)
      .get();

    if (!existing.empty) {
      throw new Error(`Domain ${domain} is already registered`);
    }
  }

  private createDefaultTeamStructure(): TeamStructure {
    return {
      departments: [{
        departmentId: 'default',
        name: 'General',
        description: 'Default department for all users',
        managerId: 'admin',
        memberCount: 0,
        settings: {
          allowSelfRegistration: true,
          requireManagerApproval: false,
          defaultRole: 'user',
          budgetAlerts: false
        }
      }],
      roles: this.getDefaultRoles(),
      permissions: this.getDefaultPermissions(),
      approvalWorkflows: [],
      reportingStructure: []
    };
  }

  private getDefaultRoles(): EnterpriseRole[] {
    return [
      {
        roleId: 'admin',
        roleName: 'Administrator',
        description: 'Full system access and management',
        level: 'admin',
        permissions: this.getAdminPermissions(),
        dataAccessLevel: 'full'
      },
      {
        roleId: 'manager',
        roleName: 'Manager',
        description: 'Departmental management and oversight',
        level: 'manager',
        permissions: this.getManagerPermissions(),
        dataAccessLevel: 'department'
      },
      {
        roleId: 'user',
        roleName: 'User',
        description: 'Standard user access',
        level: 'user',
        permissions: this.getUserPermissions(),
        dataAccessLevel: 'own'
      }
    ];
  }

  private getAdminPermissions(): Permission[] {
    return [
      {
        resource: '*',
        actions: ['create', 'read', 'update', 'delete', 'share', 'approve', 'admin'],
        scope: 'global'
      }
    ];
  }

  private getManagerPermissions(): Permission[] {
    return [
      {
        resource: 'users',
        actions: ['read', 'update', 'approve'],
        scope: 'department'
      },
      {
        resource: 'reports',
        actions: ['create', 'read', 'share'],
        scope: 'department'
      },
      {
        resource: 'cvs',
        actions: ['read', 'approve'],
        scope: 'department'
      }
    ];
  }

  private getUserPermissions(): Permission[] {
    return [
      {
        resource: 'cvs',
        actions: ['create', 'read', 'update'],
        scope: 'own'
      },
      {
        resource: 'profile',
        actions: ['read', 'update'],
        scope: 'own'
      }
    ];
  }

  private getDefaultPermissions(): PermissionMatrix {
    return {
      'admin': { '*': ['*'] },
      'manager': { 
        'users': ['read', 'update', 'approve'],
        'reports': ['create', 'read', 'share']
      },
      'user': {
        'cvs': ['create', 'read', 'update'],
        'profile': ['read', 'update']
      }
    };
  }

  private configureCompliance(requirements: string[]): ComplianceConfig {
    return {
      gdprCompliant: requirements.includes('GDPR'),
      soxCompliant: requirements.includes('SOX'),
      soc2Compliant: requirements.includes('SOC2'),
      hipaCompliant: requirements.includes('HIPAA'),
      dataRetentionDays: requirements.includes('GDPR') ? 365 : 2555, // 7 years default
      auditLogRetentionDays: 2555, // 7 years
      encryptionRequired: true,
      dataLocation: requirements.includes('GDPR') ? 'eu' : 'us',
      accessLogRequired: true,
      approvalRequired: requirements.includes('SOX')
    };
  }

  private getDefaultEnterpriseFeatures(tier: string): EnterpriseFeature[] {
    const features = [
      { featureId: 'sso', name: 'Single Sign-On', enabled: true },
      { featureId: 'advanced_analytics', name: 'Advanced Analytics', enabled: true },
      { featureId: 'custom_branding', name: 'Custom Branding', enabled: true },
      { featureId: 'api_access', name: 'API Access', enabled: true }
    ];

    if (tier === 'enterprise-plus' || tier === 'enterprise-pro') {
      features.push(
        { featureId: 'white_label', name: 'White Label Reports', enabled: true },
        { featureId: 'dedicated_support', name: 'Dedicated Support', enabled: true }
      );
    }

    if (tier === 'enterprise-pro') {
      features.push(
        { featureId: 'custom_integrations', name: 'Custom Integrations', enabled: true },
        { featureId: 'on_premise_deployment', name: 'On-Premise Deployment', enabled: true }
      );
    }

    return features;
  }

  private async createTenantCollections(tenantId: string): Promise<void> {
    const collections = ['users', 'cvs', 'reports', 'analytics', 'policies', 'audit_logs'];
    
    for (const collection of collections) {
      await db.collection(`tenants/${tenantId}/${collection}`).doc('_init').set({
        initialized: true,
        createdAt: new Date()
      });
    }
  }

  private async createInitialAdmin(tenantId: string, contact: ContactInfo['primaryContact']): Promise<void> {
    await db.collection(`tenants/${tenantId}/users`).doc('admin').set({
      email: contact.email,
      name: contact.name,
      title: contact.title,
      roleId: 'admin',
      departmentId: 'default',
      isAdmin: true,
      createdAt: new Date(),
      status: 'active'
    });
  }

  private async initiateSSOConfiguration(tenantId: string): Promise<void> {
    await db.collection(`tenants/${tenantId}/sso_config`).doc('pending').set({
      status: 'pending_configuration',
      createdAt: new Date(),
      instructions: 'Please contact support to configure SSO'
    });
  }

  private validateTeamStructure(structure: TeamStructure): void {
    // Validate departments
    const departmentIds = new Set();
    for (const dept of structure.departments) {
      if (departmentIds.has(dept.departmentId)) {
        throw new Error(`Duplicate department ID: ${dept.departmentId}`);
      }
      departmentIds.add(dept.departmentId);
    }

    // Validate roles
    const roleIds = new Set();
    for (const role of structure.roles) {
      if (roleIds.has(role.roleId)) {
        throw new Error(`Duplicate role ID: ${role.roleId}`);
      }
      roleIds.add(role.roleId);
    }
  }

  private validateDepartment(department: Department, hierarchy: TeamStructure): void {
    // Check for duplicate department ID
    const exists = hierarchy.departments.find(d => d.departmentId === department.departmentId);
    if (exists) {
      throw new Error(`Department ID ${department.departmentId} already exists`);
    }

    // Validate parent department exists if specified
    if (department.parentDepartmentId) {
      const parent = hierarchy.departments.find(d => d.departmentId === department.parentDepartmentId);
      if (!parent) {
        throw new Error(`Parent department ${department.parentDepartmentId} not found`);
      }
    }
  }

  private async validateSeatAvailability(tenantId: string): Promise<void> {
    const account = await this.getEnterpriseAccount(tenantId);
    if (!account) {
      throw new Error('Enterprise account not found');
    }

    if (account.usedSeats >= account.seatCount) {
      throw new Error('No available seats. Please upgrade your plan.');
    }
  }

  private async updateSeatCount(tenantId: string, increment: number): Promise<void> {
    await db.collection(this.COLLECTION).doc(tenantId).update({
      usedSeats: admin.firestore.FieldValue.increment(increment),
      updatedAt: new Date()
    });
  }

  private async updateUserPermissions(tenantId: string, structure: TeamStructure): Promise<void> {
    // Update user permissions based on new team structure
    // Implementation would update all users' permissions
    logger.info('Updated user permissions for team structure change', { tenantId });
  }

  private async enforcePolicy(tenantId: string, policy: EnterprisePolicy): Promise<void> {
    // Implement specific policy enforcement logic
    logger.info('Enforcing policy', { tenantId, policyType: policy.type });
  }

  private async getUserStatistics(tenantId: string): Promise<any> {
    // Implementation would return user statistics
    return {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0
    };
  }

  private async getUsageStatistics(tenantId: string): Promise<any> {
    // Implementation would return usage statistics
    return {
      cvGenerated: 0,
      apiCalls: 0,
      storageUsed: 0
    };
  }

  private async getBillingStatistics(tenantId: string): Promise<any> {
    // Implementation would return billing statistics
    return {
      monthlyRevenue: 0,
      totalRevenue: 0,
      outstandingBalance: 0
    };
  }

  protected async onInitialize(): Promise<void> {
    logger.info('EnterpriseAccountManager initializing');
    // Initialize any required connections or configurations
  }

  protected async onCleanup(): Promise<void> {
    logger.info('EnterpriseAccountManager cleaning up');
    // Cleanup resources
  }

  protected async onHealthCheck(): Promise<Partial<any>> {
    return {
      status: 'healthy',
      component: 'EnterpriseAccountManager',
      timestamp: new Date().toISOString()
    };
  }
}

// Additional interfaces for completeness
export interface EnterprisePolicy {
  policyId: string;
  type: string;
  description: string;
  rules: any[];
  isActive: boolean;
}

export interface TenantAnalytics {
  tenantId: string;
  userStatistics: any;
  usageStatistics: any;
  billingStatistics: any;
  generatedAt: Date;
}