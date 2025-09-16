/**
 * ExternalDataBenefitsShowcase - Comprehensive benefits display for External Data Sources
 * 
 * This component showcases the tangible value and competitive advantages of the
 * External Data Sources feature with visual demonstrations and impact metrics.
 */

import React, { useState } from 'react';
import {
  Github,
  Linkedin,
  Globe,
  Database,
  TrendingUp,
  Users,
  Award,
  Briefcase,
  Code,
  BookOpen,
  Star,
  ChevronRight,
  CheckCircle,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';
import { designSystem } from '../../config/designSystem';

interface BenefitShowcaseProps {
  variant?: 'compact' | 'detailed' | 'interactive';
  showMetrics?: boolean;
  className?: string;
}

interface DataSource {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
  features: string[];
  impactMetrics: {
    primary: string;
    secondary: string;
    improvement: string;
  };
  beforeAfter: {
    before: string;
    after: string;
  };
}

export const ExternalDataBenefitsShowcase: React.FC<BenefitShowcaseProps> = ({
  variant = 'detailed',
  showMetrics = true,
  className = ''
}) => {
  const [activeSource, setActiveSource] = useState<string>('github');

  const dataSources: DataSource[] = [
    {
      id: 'github',
      name: 'GitHub Integration',
      icon: Github,
      color: 'text-gray-900',
      bgColor: 'from-gray-700 to-gray-900',
      description: 'Transform your code contributions into professional achievements',
      features: [
        'Repository analysis and project highlights',
        'Contribution graphs and code statistics',
        'Technical skill extraction from codebase',
        'Open source collaboration evidence',
        'Programming language proficiency mapping'
      ],
      impactMetrics: {
        primary: '+45%',
        secondary: 'Technical Credibility',
        improvement: 'Developers see 45% more technical interview requests'
      },
      beforeAfter: {
        before: 'Generic "Proficient in JavaScript" statement',
        after: '2+ years JavaScript experience with 47 repositories, 1.2K commits'
      }
    },
    {
      id: 'linkedin',
      name: 'LinkedIn Enhancement',
      icon: Linkedin,
      color: 'text-blue-600',
      bgColor: 'from-blue-500 to-blue-700',
      description: 'Sync your professional network and achievements automatically',
      features: [
        'Professional accomplishments and endorsements',
        'Industry connections and recommendations',
        'Certification and course completions',
        'Published articles and thought leadership',
        'Professional milestone tracking'
      ],
      impactMetrics: {
        primary: '+60%',
        secondary: 'Profile Completeness',
        improvement: 'Complete profiles receive 60% more recruiter attention'
      },
      beforeAfter: {
        before: 'Basic work history with generic descriptions',
        after: 'Rich profile with 12 endorsements, 3 recommendations, 5 certifications'
      }
    },
    {
      id: 'web',
      name: 'Web Presence Scan',
      icon: Globe,
      color: 'text-green-600',
      bgColor: 'from-green-500 to-green-700',
      description: 'Discover and integrate your digital professional footprint',
      features: [
        'Portfolio website analysis and project extraction',
        'Published work and article discovery',
        'Conference speaking engagements',
        'Industry mentions and press coverage',
        'Online certification verification'
      ],
      impactMetrics: {
        primary: '+38%',
        secondary: 'Online Authority',
        improvement: 'Strong web presence increases job match quality by 38%'
      },
      beforeAfter: {
        before: 'Hidden online achievements scattered across platforms',
        after: 'Consolidated digital portfolio with verified accomplishments'
      }
    },
    {
      id: 'fusion',
      name: 'Smart Data Fusion',
      icon: Database,
      color: 'text-purple-600',
      bgColor: 'from-purple-500 to-purple-700',
      description: 'AI-powered integration of all external data sources',
      features: [
        'Intelligent duplicate detection and merging',
        'Skill correlation across platforms',
        'Achievement prioritization and ranking',
        'ATS keyword optimization',
        'Contextual relevance scoring'
      ],
      impactMetrics: {
        primary: '+52%',
        secondary: 'ATS Score',
        improvement: 'Optimized CVs pass ATS screening 52% more often'
      },
      beforeAfter: {
        before: 'Disjointed information with potential duplicates',
        after: 'Seamlessly integrated professional narrative'
      }
    }
  ];

  const globalMetrics = [
    { value: '87%', label: 'More Interview Invites', icon: Target },
    { value: '3.2x', label: 'Faster Job Matching', icon: Zap },
    { value: '64%', label: 'Higher Salary Offers', icon: TrendingUp },
    { value: '15K+', label: 'Professionals Upgraded', icon: Users }
  ];

  const activeSourceData = dataSources.find(source => source.id === activeSource) || dataSources[0];

  if (variant === 'compact') {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          External Data Sources Benefits
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {dataSources.map((source) => (
            <div key={source.id} className="flex items-center gap-3">
              <div className={`w-8 h-8 bg-gradient-to-r ${source.bgColor} rounded-lg flex items-center justify-center`}>
                <source.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">{source.name}</span>
            </div>
          ))}
        </div>
        {showMetrics && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-center">
              {globalMetrics.slice(0, 2).map((metric, index) => (
                <div key={index}>
                  <div className="text-lg font-bold text-blue-600">{metric.value}</div>
                  <div className="text-xs text-gray-600">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Transform Your CV with External Data
        </h2>
        <p className="text-lg text-gray-700 max-w-3xl mx-auto">
          Automatically enrich your professional profile with data from GitHub, LinkedIn, 
          and across the web. Turn scattered achievements into a powerful career narrative.
        </p>
      </div>

      {/* Global Metrics */}
      {showMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {globalMetrics.map((metric, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-200"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <metric.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {metric.value}
              </div>
              <div className="text-sm text-gray-600">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === 'interactive' ? (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Source Selector */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Choose a Data Source to Explore
            </h3>
            <div className="space-y-3">
              {dataSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => setActiveSource(source.id)}
                  className={`
                    w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                    ${activeSource === source.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${source.bgColor} rounded-xl flex items-center justify-center`}>
                      <source.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {source.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {source.description}
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${
                      activeSource === source.id ? 'rotate-90 text-blue-500' : 'text-gray-400'
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Source Details */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 bg-gradient-to-r ${activeSourceData.bgColor} rounded-2xl flex items-center justify-center`}>
                <activeSourceData.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {activeSourceData.name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                  <TrendingUp className="w-4 h-4" />
                  {activeSourceData.impactMetrics.primary} {activeSourceData.impactMetrics.secondary}
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Key Features</h4>
              <div className="space-y-2">
                {activeSourceData.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Before/After */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Transformation Example</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="text-xs font-medium text-red-600 mb-1">BEFORE</div>
                    <p className="text-sm text-gray-700">{activeSourceData.beforeAfter.before}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="text-xs font-medium text-green-600 mb-1">AFTER</div>
                    <p className="text-sm text-gray-700">{activeSourceData.beforeAfter.after}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Metric */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Impact:</strong> {activeSourceData.impactMetrics.improvement}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Detailed View */
        <div className="grid lg:grid-cols-2 gap-8">
          {dataSources.map((source) => (
            <div 
              key={source.id} 
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 bg-gradient-to-r ${source.bgColor} rounded-2xl flex items-center justify-center`}>
                  <source.icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {source.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <BarChart3 className="w-4 h-4" />
                    {source.impactMetrics.primary} improvement
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">
                {source.description}
              </p>

              <div className="space-y-2 mb-4">
                {source.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">PROFESSIONAL IMPACT</p>
                <p className="text-sm font-medium text-gray-900">
                  {source.impactMetrics.improvement}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};