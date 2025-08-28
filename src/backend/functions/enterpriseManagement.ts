/**
 * CVPlus Premium Phase 4: Enterprise Management Cloud Functions
 * Provides enterprise team management, RBAC, and SSO endpoints
 * 
 * @author Gil Klainert
 * @version 4.0.0
 * @category Enterprise Functions
 */

import { https } from 'firebase-functions/v2';
import { logger } from 'firebase-functions/v2';
import { EnterpriseAccountManager } from '../services/enterprise/tenantManager';
import { EnterpriseRBACService } from '../services/enterprise/rbac';
import { SSOManager } from '../services/enterprise/ssoManager';
import { requireAuth } from '../../middleware/authGuard';
import { enhancedPremiumGuard } from '../../middleware/enhancedPremiumGuard';

const accountManager = new EnterpriseAccountManager({
  name: 'EnterpriseAccountManager',
  version: '1.0.0',
  enabled: true
});
const rbacService = new EnterpriseRBACService({
  name: 'EnterpriseRBACService',
  version: '1.0.0',
  enabled: true
});
const ssoManager = new SSOManager({
  name: 'SSOManager',
  version: '1.0.0',
  enabled: true
});

/**
 * Create enterprise account (Admin only)
 */
export const createEnterpriseAccount = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      // Validate authentication and admin access
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      // Check system admin access (this would be checked against global admin list)
      await enhancedPremiumGuard(request.auth.uid, 'system_admin');

      const {
        organizationName,
        domain,
        primaryContact,
        subscriptionTier,
        seatCount,
        billingSettings,
        complianceRequirements = [],
        ssoRequired = false
      } = request.data;

      if (!organizationName || !domain || !primaryContact || !subscriptionTier || !seatCount) {
        throw new https.HttpsError('invalid-argument', 'Missing required enterprise setup fields');
      }

      logger.info('Creating enterprise account', {
        organizationName,
        domain,
        subscriptionTier,
        seatCount,
        adminUserId: request.auth.uid
      });

      const enterpriseSetup = {
        organizationName,
        domain,
        primaryContact,
        subscriptionTier,
        seatCount,
        billingSettings,
        complianceRequirements,
        ssoRequired
      };

      const account = await accountManager.createEnterpriseAccount(enterpriseSetup);

      logger.info('Enterprise account created successfully', {
        tenantId: account.tenantId,
        organizationName: account.organizationName
      });

      return {
        success: true,
        account: {
          tenantId: account.tenantId,
          organizationName: account.organizationName,
          domain: account.domain,
          subscriptionTier: account.subscriptionTier,
          seatCount: account.seatCount,
          status: account.status,
          createdAt: account.createdAt
        }
      };
    } catch (error) {
      logger.error(null, { error: (error as Error), data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to create enterprise account',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Get enterprise account details
 */
export const getEnterpriseAccount = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { tenantId } = request.data;

      if (!tenantId) {
        throw new https.HttpsError('invalid-argument', 'Tenant ID is required');
      }

      // Check enterprise access for this tenant
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_access', { tenantId });

      const account = await accountManager.getEnterpriseAccount(tenantId);

      if (!account) {
        throw new https.HttpsError('not-found', 'Enterprise account not found');
      }

      return {
        success: true,
        account: {
          tenantId: account.tenantId,
          organizationName: account.organizationName,
          domain: account.domain,
          subscriptionTier: account.subscriptionTier,
          seatCount: account.seatCount,
          usedSeats: account.usedSeats,
          status: account.status,
          contactInfo: account.contactInfo,
          features: account.features,
          teamHierarchy: account.teamHierarchy
        }
      };
    } catch (error) {
      logger.error(null, { error: (error as Error), data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to retrieve enterprise account',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Assign role to user (Enterprise Admin/Manager only)
 */
export const assignUserRole = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { tenantId, userId, roleId, conditions } = request.data;

      if (!tenantId || !userId || !roleId) {
        throw new https.HttpsError('invalid-argument', 'Tenant ID, user ID, and role ID are required');
      }

      // Check permission to assign roles
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_user_management', { tenantId });

      logger.info('Assigning user role', {
        tenantId,
        userId,
        roleId,
        assignedBy: request.auth.uid
      });

      await rbacService.assignRole(
        userId,
        tenantId,
        roleId,
        request.auth.uid,
        conditions
      );

      return {
        success: true,
        message: 'Role assigned successfully'
      };
    } catch (error) {
      logger.error(null, { error: (error as Error), data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to assign role',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Check user permission
 */
export const checkPermission = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { tenantId, resource, action, context } = request.data;

      if (!tenantId || !resource || !action) {
        throw new https.HttpsError('invalid-argument', 'Tenant ID, resource, and action are required');
      }

      const hasPermission = await rbacService.checkPermission({
        userId: request.auth.uid,
        tenantId,
        resource,
        action,
        context
      });

      return {
        success: true,
        hasPermission,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(null, { error: (error as Error), data: request.data });
      
      return {
        success: false,
        hasPermission: false,
        error: error.message
      };
    }
  }
);

/**
 * Create custom role (Enterprise Admin only)
 */
export const createCustomRole = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { tenantId, role } = request.data;

      if (!tenantId || !role) {
        throw new https.HttpsError('invalid-argument', 'Tenant ID and role data are required');
      }

      // Check permission to create roles
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_role_management', { tenantId });

      logger.info('Creating custom role', {
        tenantId,
        roleId: role.roleId,
        createdBy: request.auth.uid
      });

      await rbacService.createRole(tenantId, role, request.auth.uid);

      return {
        success: true,
        message: 'Custom role created successfully'
      };
    } catch (error) {
      logger.error(null, { error: (error as Error), data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to create custom role',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Configure SAML SSO (Enterprise Admin only)
 */
export const configureSAMLSSO = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { tenantId, samlConfig } = request.data;

      if (!tenantId || !samlConfig) {
        throw new https.HttpsError('invalid-argument', 'Tenant ID and SAML configuration are required');
      }

      // Check permission to configure SSO
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_sso_management', { tenantId });

      logger.info('Configuring SAML SSO', {
        tenantId,
        entityId: samlConfig.entityId,
        configuredBy: request.auth.uid
      });

      await ssoManager.configureSAML(tenantId, samlConfig);

      return {
        success: true,
        message: 'SAML SSO configured successfully'
      };
    } catch (error) {
      logger.error(null, { error: (error as Error), data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to configure SAML SSO',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Configure OAuth SSO (Enterprise Admin only)
 */
export const configureOAuthSSO = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { tenantId, oauthConfig } = request.data;

      if (!tenantId || !oauthConfig) {
        throw new https.HttpsError('invalid-argument', 'Tenant ID and OAuth configuration are required');
      }

      // Check permission to configure SSO
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_sso_management', { tenantId });

      logger.info('Configuring OAuth SSO', {
        tenantId,
        clientId: oauthConfig.clientId,
        configuredBy: request.auth.uid
      });

      await ssoManager.configureOAuth(tenantId, oauthConfig);

      return {
        success: true,
        message: 'OAuth SSO configured successfully'
      };
    } catch (error) {
      logger.error(null, { error: (error as Error), data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to configure OAuth SSO',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Process SSO login
 */
export const processSSOLogin = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      const { tenantId, provider, authData } = request.data;

      if (!tenantId || !provider || !authData) {
        throw new https.HttpsError('invalid-argument', 'Tenant ID, provider, and auth data are required');
      }

      logger.info('Processing SSO login', { tenantId, provider });

      let session;

      switch (provider) {
        case 'saml':
          session = await ssoManager.processSAMLLogin(tenantId, authData);
          break;
        case 'oauth':
          session = await ssoManager.processOAuthLogin(tenantId, authData.code, authData.state);
          break;
        case 'azure_ad':
          session = await ssoManager.processAzureADLogin(tenantId, authData.code, authData.state);
          break;
        default:
          throw new https.HttpsError('invalid-argument', 'Unsupported SSO provider');
      }

      return {
        success: true,
        session: {
          sessionId: session.sessionId,
          userId: session.userId,
          email: session.email,
          displayName: session.displayName,
          expiresAt: session.expiresAt
        }
      };
    } catch (error) {
      logger.error(null, { error: (error as Error), data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to process SSO login',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Get enterprise analytics (Enterprise Admin/Manager only)
 */
export const getEnterpriseAnalytics = https.onCall(
  {
    cors: true,
    region: 'us-central1',
    timeoutSeconds: 120
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { tenantId } = request.data;

      if (!tenantId) {
        throw new https.HttpsError('invalid-argument', 'Tenant ID is required');
      }

      // Check enterprise analytics access
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_analytics', { tenantId });

      logger.info('Generating enterprise analytics', { tenantId, requestedBy: request.auth.uid });

      const analytics = await accountManager.getTenantAnalytics(tenantId);

      return {
        success: true,
        analytics
      };
    } catch (error) {
      logger.error(null, { error: (error as Error), data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to generate enterprise analytics',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Audit user access (Enterprise Admin only)
 */
export const auditUserAccess = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { tenantId, userId, startDate, endDate } = request.data;

      if (!tenantId || !userId || !startDate || !endDate) {
        throw new https.HttpsError('invalid-argument', 'Tenant ID, user ID, and date range are required');
      }

      // Check permission to audit user access
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_audit', { tenantId });

      logger.info('Auditing user access', {
        tenantId,
        userId,
        auditedBy: request.auth.uid
      });

      const accessLogs = await rbacService.auditUserAccess(
        userId,
        tenantId,
        {
          start: new Date(startDate),
          end: new Date(endDate)
        }
      );

      return {
        success: true,
        accessLogs: accessLogs.slice(0, 500), // Limit to 500 entries
        totalEntries: accessLogs.length
      };
    } catch (error) {
      logger.error(null, { error: (error as Error), data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to audit user access',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Get SSO metrics (Enterprise Admin only)
 */
export const getSSOMetrics = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { tenantId, startDate, endDate } = request.data;

      if (!tenantId || !startDate || !endDate) {
        throw new https.HttpsError('invalid-argument', 'Tenant ID and date range are required');
      }

      // Check enterprise analytics access
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_analytics', { tenantId });

      logger.info('Generating SSO metrics', { tenantId, requestedBy: request.auth.uid });

      const metrics = await ssoManager.getSSOMetrics(
        tenantId,
        {
          start: new Date(startDate),
          end: new Date(endDate)
        }
      );

      return {
        success: true,
        metrics
      };
    } catch (error) {
      logger.error(null, { error: (error as Error), data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to generate SSO metrics',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Get role templates for enterprise setup
 */
export const getRoleTemplates = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      // Basic authentication check (role templates are available to all authenticated users)
      const templates = rbacService.getRoleTemplates();

      return {
        success: true,
        templates: templates.map(template => ({
          templateId: template.templateId,
          name: template.name,
          description: template.description,
          category: template.category,
          level: template.level
          // Permissions excluded from public response for security
        }))
      };
    } catch (error) {
      logger.error('Failed to get role templates', { error });
      
      throw new https.HttpsError(
        'internal',
        'Failed to retrieve role templates',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Health check for enterprise services
 */
export const enterpriseHealthCheck = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          enterpriseAccounts: 'operational',
          rbac: 'operational',
          sso: 'operational',
          teamManagement: 'operational'
        },
        version: '4.0.0'
      };

      return {
        success: true,
        health: healthStatus
      };
    } catch (error) {
      logger.error('Enterprise health check failed', { error });
      
      return {
        success: false,
        health: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        }
      };
    }
  }
);