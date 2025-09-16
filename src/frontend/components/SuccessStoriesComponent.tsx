/**
 * SuccessStoriesComponent - Social proof and testimonials for External Data Sources
 * 
 * This component showcases real user success stories and transformation examples
 * to build trust and demonstrate the tangible value of the External Data Sources feature.
 */

import React, { useState } from 'react';
import {
  Star,
  Quote,
  TrendingUp,
  Users,
  Award,
  Briefcase,
  Code,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle
} from 'lucide-react';
import { designSystem } from '../../config/designSystem';

interface SuccessStory {
  id: string;
  name: string;
  role: string;
  company: string;
  industry: string;
  avatar: string;
  rating: number;
  testimonial: string;
  shortQuote: string;
  metrics: {
    interviews: string;
    timeToHire: string;
    salaryIncrease?: string;
  };
  beforeAfter: {
    before: string;
    after: string;
  };
  dataSourcesUsed: string[];
  featured?: boolean;
}

interface SuccessStoriesProps {
  variant?: 'carousel' | 'grid' | 'featured';
  showMetrics?: boolean;
  showBeforeAfter?: boolean;
  className?: string;
}

export const SuccessStoriesComponent: React.FC<SuccessStoriesProps> = ({
  variant = 'carousel',
  showMetrics = true,
  showBeforeAfter = false,
  className = ''
}) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const successStories: SuccessStory[] = [
    {
      id: '1',
      name: 'Sarah Chen',
      role: 'Senior Software Engineer',
      company: 'Google',
      industry: 'Technology',
      avatar: 'SC',
      rating: 5,
      testimonial: "External Data Sources completely transformed my job search. It automatically pulled in my GitHub contributions, LinkedIn endorsements, and even found certifications I had forgotten about. Within 2 weeks, I had 3 interviews lined up including the one that got me my dream job at Google. The AI integration made my CV stand out in a sea of generic applications.",
      shortQuote: "Got 3x more interviews and landed my dream job at Google!",
      metrics: {
        interviews: '+240%',
        timeToHire: '3 weeks',
        salaryIncrease: '+35%'
      },
      beforeAfter: {
        before: "Generic CV with basic work history and skills list",
        after: "Rich profile with 47 GitHub repos, 12 endorsements, 5 certifications, and verified achievements"
      },
      dataSourcesUsed: ['GitHub', 'LinkedIn', 'Web Presence'],
      featured: true
    },
    {
      id: '2',
      name: 'Marcus Johnson',
      role: 'Product Manager',
      company: 'Microsoft',
      industry: 'Technology',
      avatar: 'MJ',
      rating: 5,
      testimonial: "As someone who switched from engineering to product management, I needed to showcase both my technical background and business acumen. External Data Sources pulled my technical contributions from GitHub while highlighting my leadership experience from LinkedIn. The automatic integration saved me hours and created a compelling narrative.",
      shortQuote: "Perfect for career transitions - landed PM role at Microsoft!",
      metrics: {
        interviews: '+180%',
        timeToHire: '5 weeks',
        salaryIncrease: '+28%'
      },
      beforeAfter: {
        before: "Struggled to present diverse skill set cohesively",
        after: "Clear narrative showing technical expertise and business leadership"
      },
      dataSourcesUsed: ['GitHub', 'LinkedIn'],
      featured: false
    },
    {
      id: '3',
      name: 'Elena Rodriguez',
      role: 'UX Design Lead',
      company: 'Airbnb',
      industry: 'Design',
      avatar: 'ER',
      rating: 5,
      testimonial: "The web presence scanning found portfolio projects I had scattered across different platforms and presented them beautifully. It even discovered mentions of my work in design blogs! Recruiters were impressed by the comprehensive view of my design impact across the industry.",
      shortQuote: "Web scanning revealed hidden achievements - got offers from 4 top companies!",
      metrics: {
        interviews: '+320%',
        timeToHire: '4 weeks'
      },
      beforeAfter: {
        before: "Portfolio scattered across multiple platforms",
        after: "Unified portfolio with verified industry mentions and impact metrics"
      },
      dataSourcesUsed: ['Web Presence', 'LinkedIn'],
      featured: true
    },
    {
      id: '4',
      name: 'David Park',
      role: 'Data Scientist',
      company: 'Netflix',
      industry: 'Data Science',
      avatar: 'DP',
      rating: 5,
      testimonial: "The AI-powered data fusion was incredible. It connected my Kaggle competitions, GitHub projects, and research publications into a cohesive data science narrative. What used to take days of CV crafting happened automatically, and the results were better than anything I could have created manually.",
      shortQuote: "AI fusion created a perfect data science narrative - Netflix here I come!",
      metrics: {
        interviews: '+200%',
        timeToHire: '6 weeks',
        salaryIncrease: '+42%'
      },
      beforeAfter: {
        before: "Disconnected projects and achievements",
        after: "Cohesive data science portfolio with quantified impact"
      },
      dataSourcesUsed: ['GitHub', 'Web Presence', 'Smart Fusion'],
      featured: false
    }
  ];

  const overallStats = [
    { value: '87%', label: 'More Interviews', icon: TrendingUp },
    { value: '3.2x', label: 'Faster Hiring', icon: Award },
    { value: '15,000+', label: 'Success Stories', icon: Users },
    { value: '4.9/5', label: 'User Rating', icon: Star }
  ];

  const nextStory = () => {
    setCurrentStoryIndex((prev) => (prev + 1) % successStories.length);
  };

  const prevStory = () => {
    setCurrentStoryIndex((prev) => (prev - 1 + successStories.length) % successStories.length);
  };

  if (variant === 'featured') {
    const featuredStories = successStories.filter(story => story.featured);
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 ${className}`}>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Success Stories That Inspire
          </h2>
          <p className="text-lg text-gray-700">
            Real professionals, real results with External Data Sources
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {featuredStories.map((story) => (
            <div key={story.id} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg">
                  {story.avatar}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">
                    {story.name}
                  </h3>
                  <p className="text-gray-600">
                    {story.role} at {story.company}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {[...Array(story.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Quote */}
              <div className="mb-6">
                <Quote className="w-8 h-8 text-blue-500 mb-3" />
                <blockquote className="text-gray-800 text-lg italic leading-relaxed">
                  "{story.shortQuote}"
                </blockquote>
              </div>

              {/* Metrics */}
              {showMetrics && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {story.metrics.interviews}
                    </div>
                    <div className="text-sm text-gray-600">More Interviews</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {story.metrics.timeToHire}
                    </div>
                    <div className="text-sm text-gray-600">Time to Hire</div>
                  </div>
                </div>
              )}

              {/* Data Sources */}
              <div className="flex flex-wrap gap-2">
                {story.dataSourcesUsed.map((source) => (
                  <span 
                    key={source}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full font-medium"
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {overallStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'carousel') {
    const currentStory = successStories[currentStoryIndex];
    
    return (
      <div className={`bg-white rounded-2xl shadow-lg overflow-hidden ${className}`}>
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Success Stories</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={prevStory}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
                aria-label="Previous story"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextStory}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
                aria-label="Next story"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Story Header */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
              {currentStory.avatar}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {currentStory.name}
              </h3>
              <p className="text-lg text-gray-600 mb-3">
                {currentStory.role} at {currentStory.company}
              </p>
              <div className="flex items-center gap-1">
                {[...Array(currentStory.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-sm text-gray-500 ml-2">
                  {currentStory.rating}/5 stars
                </span>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="mb-8">
            <Quote className="w-10 h-10 text-blue-500 mb-4" />
            <blockquote className="text-gray-800 text-lg leading-relaxed italic">
              "{currentStory.testimonial}"
            </blockquote>
          </div>

          {/* Metrics and Data Sources */}
          <div className="grid lg:grid-cols-2 gap-8 mb-6">
            {/* Metrics */}
            {showMetrics && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Results Achieved</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-gray-700">More Interviews</span>
                    <span className="font-bold text-green-600">{currentStory.metrics.interviews}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-gray-700">Time to Hire</span>
                    <span className="font-bold text-blue-600">{currentStory.metrics.timeToHire}</span>
                  </div>
                  {currentStory.metrics.salaryIncrease && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-gray-700">Salary Increase</span>
                      <span className="font-bold text-purple-600">{currentStory.metrics.salaryIncrease}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Before/After */}
            {showBeforeAfter && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Transformation</h4>
                <div className="space-y-4">
                  <div className="p-4 border-l-4 border-red-400 bg-red-50">
                    <div className="text-sm font-medium text-red-600 mb-1">BEFORE</div>
                    <p className="text-sm text-gray-700">{currentStory.beforeAfter.before}</p>
                  </div>
                  <div className="p-4 border-l-4 border-green-500 bg-green-50">
                    <div className="text-sm font-medium text-green-600 mb-1">AFTER</div>
                    <p className="text-sm text-gray-700">{currentStory.beforeAfter.after}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Data Sources Used */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Data Sources:</span>
            {currentStory.dataSourcesUsed.map((source, index) => (
              <React.Fragment key={source}>
                <span className="px-2 py-1 bg-gray-100 rounded-full font-medium">
                  {source}
                </span>
                {index < currentStory.dataSourcesUsed.length - 1 && (
                  <span className="text-gray-400">•</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Story Navigation */}
          <div className="flex justify-center mt-6">
            <div className="flex gap-2">
              {successStories.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStoryIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                    index === currentStoryIndex
                      ? 'bg-blue-500'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to story ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <div className={`${className}`}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Join Thousands of Successful Professionals
        </h2>
        <p className="text-lg text-gray-700">
          See how External Data Sources transformed their careers
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {successStories.map((story) => (
          <div key={story.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                {story.avatar}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">
                  {story.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {story.role} at {story.company}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(story.rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
            </div>
            
            <blockquote className="text-gray-800 italic text-sm mb-4">
              "{story.shortQuote}"
            </blockquote>

            {showMetrics && (
              <div className="flex gap-4 text-center">
                <div className="flex-1">
                  <div className="text-lg font-bold text-green-600">
                    {story.metrics.interviews}
                  </div>
                  <div className="text-xs text-gray-600">Interviews</div>
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-blue-600">
                    {story.metrics.timeToHire}
                  </div>
                  <div className="text-xs text-gray-600">Time to Hire</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overallStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-2">
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {stat.value}
            </div>
            <div className="text-xs text-gray-600">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};