/**
 * CVPlus Premium Phase 4: Advanced Analytics Cloud Functions
 * Custom report builder and white-label analytics endpoints
 * 
 * @author Gil Klainert
 * @version 4.0.0
 * @category Enterprise Analytics
 */

import { https } from 'firebase-functions/v2';
import { logger } from 'firebase-functions/v2';
import { ReportBuilderService } from '../../services/premium/reportBuilder';
import { requireAuth } from '../../middleware/authGuard';
import { enhancedPremiumGuard } from '../../middleware/enhancedPremiumGuard';

const reportBuilder = new ReportBuilderService({
  name: 'ReportBuilderService',
  version: '1.0.0',
  enabled: true
});

/**
 * Create custom report (Enterprise only)
 */
export const createCustomReport = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { tenantId, reportConfig } = request.data;

      if (!tenantId || !reportConfig) {
        throw new https.HttpsError('invalid-argument', 'Tenant ID and report configuration are required');
      }

      // Check enterprise analytics access
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_analytics', { tenantId });

      logger.info('Creating custom report', {
        tenantId,
        title: reportConfig.title,
        createdBy: request.auth.uid
      });

      const report = await reportBuilder.createCustomReport(tenantId, {
        ...reportConfig,
        createdBy: request.auth.uid
      });

      return {
        success: true,
        report: {
          reportId: report.reportId,
          title: report.title,
          description: report.description,
          status: report.status,
          createdAt: report.createdAt
        }
      };
    } catch (error) {
      logger.error('Custom report creation failed', { error, data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to create custom report',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Generate report data
 */
export const generateReportData = https.onCall(
  {
    cors: true,
    region: 'us-central1',
    timeoutSeconds: 180
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { reportId, parameters } = request.data;

      if (!reportId || !parameters) {
        throw new https.HttpsError('invalid-argument', 'Report ID and parameters are required');
      }

      // Check access to report
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_reports');

      logger.info('Generating report data', {
        reportId,
        userId: request.auth.uid,
        dateRange: parameters.dateRange
      });

      const reportData = await reportBuilder.generateReport(reportId, parameters);

      return {
        success: true,
        reportData: {
          reportId: reportData.reportId,
          generatedAt: reportData.generatedAt,
          data: reportData.data,
          metadata: reportData.metadata,
          summary: reportData.summary
        }
      };
    } catch (error) {
      logger.error('Report data generation failed', { error, data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to generate report data',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Create interactive dashboard (Enterprise only)
 */
export const createDashboard = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { tenantId, dashboardConfig } = request.data;

      if (!tenantId || !dashboardConfig) {
        throw new https.HttpsError('invalid-argument', 'Tenant ID and dashboard configuration are required');
      }

      // Check enterprise analytics access
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_analytics', { tenantId });

      logger.info('Creating dashboard', {
        tenantId,
        name: dashboardConfig.name,
        createdBy: request.auth.uid
      });

      const dashboard = await reportBuilder.createDashboard(tenantId, dashboardConfig);

      return {
        success: true,
        dashboard: {
          dashboardId: dashboard.dashboardId,
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout,
          reports: dashboard.reports,
          filters: dashboard.filters
        }
      };
    } catch (error) {
      logger.error('Dashboard creation failed', { error, data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to create dashboard',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Schedule report delivery (Enterprise only)
 */
export const scheduleReportDelivery = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { reportId, scheduleConfig } = request.data;

      if (!reportId || !scheduleConfig) {
        throw new https.HttpsError('invalid-argument', 'Report ID and schedule configuration are required');
      }

      // Check enterprise scheduling access
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_scheduling');

      // Validate schedule configuration
      if (!scheduleConfig.frequency || !scheduleConfig.recipients || scheduleConfig.recipients.length === 0) {
        throw new https.HttpsError('invalid-argument', 'Invalid schedule configuration');
      }

      logger.info('Scheduling report delivery', {
        reportId,
        frequency: scheduleConfig.frequency,
        recipientCount: scheduleConfig.recipients.length,
        scheduledBy: request.auth.uid
      });

      await reportBuilder.scheduleReport(reportId, scheduleConfig);

      return {
        success: true,
        message: 'Report scheduled successfully',
        schedule: {
          frequency: scheduleConfig.frequency,
          time: scheduleConfig.time,
          recipients: scheduleConfig.recipients.length,
          format: scheduleConfig.format
        }
      };
    } catch (error) {
      logger.error('Report scheduling failed', { error, data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to schedule report',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Generate white-labeled report (Enterprise Plus/Pro only)
 */
export const generateWhiteLabelReport = https.onCall(
  {
    cors: true,
    region: 'us-central1',
    timeoutSeconds: 240
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { reportId, brandingConfig } = request.data;

      if (!reportId || !brandingConfig) {
        throw new https.HttpsError('invalid-argument', 'Report ID and branding configuration are required');
      }

      // Check white-label access (Enterprise Plus/Pro only)
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_white_label');

      // Validate branding configuration
      if (!brandingConfig.companyName || !brandingConfig.brandColors) {
        throw new https.HttpsError('invalid-argument', 'Company name and brand colors are required');
      }

      logger.info('Generating white-labeled report', {
        reportId,
        companyName: brandingConfig.companyName,
        requestedBy: request.auth.uid
      });

      const brandedReport = await reportBuilder.generateBrandedReport(reportId, brandingConfig);

      return {
        success: true,
        brandedReport: {
          reportId: brandedReport.reportId,
          generatedAt: brandedReport.generatedAt,
          branding: {
            companyName: brandedReport.branding.companyName,
            customDomain: brandedReport.branding.customDomain
          },
          customStyling: brandedReport.customStyling
        }
      };
    } catch (error) {
      logger.error('White-label report generation failed', { error, data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to generate white-labeled report',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Export report in various formats
 */
export const exportReport = https.onCall(
  {
    cors: true,
    region: 'us-central1',
    timeoutSeconds: 300
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { reportId, format, parameters } = request.data;

      if (!reportId || !format || !parameters) {
        throw new https.HttpsError('invalid-argument', 'Report ID, format, and parameters are required');
      }

      // Validate format
      const supportedFormats = ['pdf', 'xlsx', 'csv', 'json'];
      if (!supportedFormats.includes(format)) {
        throw new https.HttpsError('invalid-argument', `Unsupported format. Supported: ${supportedFormats.join(', ')}`);
      }

      // Check export access
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_export');

      logger.info('Exporting report', {
        reportId,
        format,
        userId: request.auth.uid
      });

      const exportResult = await reportBuilder.exportReport(reportId, format, parameters);

      return {
        success: true,
        export: {
          downloadUrl: exportResult.downloadUrl,
          format: exportResult.format,
          fileSize: exportResult.fileSize,
          expiresAt: exportResult.expiresAt,
          generatedAt: exportResult.generatedAt
        }
      };
    } catch (error) {
      logger.error('Report export failed', { error, data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to export report',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Get available data sources for report building
 */
export const getDataSources = https.onCall(
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

      // Check data access
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_analytics', { tenantId });

      logger.info('Getting data sources', { tenantId, userId: request.auth.uid });

      const dataSources = await reportBuilder.getDataSources(tenantId);

      return {
        success: true,
        dataSources: dataSources.map(source => ({
          sourceId: source.sourceId,
          name: source.name,
          description: source.description,
          fields: source.fields
        }))
      };
    } catch (error) {
      logger.error('Failed to get data sources', { error, data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to retrieve data sources',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Get report templates for quick setup
 */
export const getReportTemplates = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      // Basic authentication check
      const templates = [
        {
          templateId: 'user_analytics',
          name: 'User Analytics Report',
          description: 'Comprehensive user behavior and engagement analytics',
          category: 'user_insights',
          dimensions: ['date', 'user_segment', 'subscription_tier'],
          metrics: ['active_users', 'new_registrations', 'retention_rate'],
          visualization: { type: 'line_chart', configuration: {} }
        },
        {
          templateId: 'revenue_dashboard',
          name: 'Revenue Dashboard',
          description: 'Financial performance and revenue tracking',
          category: 'financial',
          dimensions: ['date', 'region', 'product'],
          metrics: ['revenue', 'mrr', 'churn_rate', 'ltv'],
          visualization: { type: 'bar_chart', configuration: {} }
        },
        {
          templateId: 'cv_generation_metrics',
          name: 'CV Generation Metrics',
          description: 'CV creation and usage analytics',
          category: 'product_usage',
          dimensions: ['date', 'template_type', 'user_tier'],
          metrics: ['cvs_generated', 'processing_time', 'success_rate'],
          visualization: { type: 'table', configuration: {} }
        },
        {
          templateId: 'enterprise_overview',
          name: 'Enterprise Overview',
          description: 'High-level enterprise performance metrics',
          category: 'executive',
          dimensions: ['date', 'department', 'team'],
          metrics: ['team_usage', 'feature_adoption', 'productivity_score'],
          visualization: { type: 'kpi_card', configuration: {} }
        }
      ];

      return {
        success: true,
        templates
      };
    } catch (error) {
      logger.error('Failed to get report templates', { error });
      
      throw new https.HttpsError(
        'internal',
        'Failed to retrieve report templates',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Validate report configuration
 */
export const validateReportConfig = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { reportConfig } = request.data;

      if (!reportConfig) {
        throw new https.HttpsError('invalid-argument', 'Report configuration is required');
      }

      // Perform validation
      const validation = {
        isValid: true,
        errors: [] as string[],
        warnings: [] as string[]
      };

      // Check required fields
      if (!reportConfig.title || reportConfig.title.trim().length === 0) {
        validation.errors.push('Report title is required');
        validation.isValid = false;
      }

      if (!reportConfig.dimensions || reportConfig.dimensions.length === 0) {
        if (!reportConfig.metrics || reportConfig.metrics.length === 0) {
          validation.errors.push('Report must have at least one dimension or metric');
          validation.isValid = false;
        }
      }

      // Check for potential performance issues
      if (reportConfig.dimensions && reportConfig.dimensions.length > 10) {
        validation.warnings.push('Large number of dimensions may impact performance');
      }

      if (reportConfig.metrics && reportConfig.metrics.length > 15) {
        validation.warnings.push('Large number of metrics may impact performance');
      }

      return {
        success: true,
        validation
      };
    } catch (error) {
      logger.error('Report configuration validation failed', { error, data: request.data });
      
      return {
        success: false,
        validation: {
          isValid: false,
          errors: ['Validation failed due to system error'],
          warnings: []
        }
      };
    }
  }
);

/**
 * Health check for analytics services
 */
export const analyticsHealthCheck = https.onCall(
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
          reportBuilder: 'operational',
          dataExport: 'operational',
          whiteLabelReports: 'operational',
          dashboards: 'operational',
          scheduling: 'operational'
        },
        capabilities: {
          customReports: true,
          whiteLabeling: true,
          dataExport: true,
          scheduling: true,
          dashboards: true
        },
        version: '4.0.0'
      };

      return {
        success: true,
        health: healthStatus
      };
    } catch (error) {
      logger.error('Analytics health check failed', { error });
      
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