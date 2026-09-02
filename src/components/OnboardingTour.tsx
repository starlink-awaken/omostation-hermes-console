/**
 * OnboardingTour — 新手引导组件
 *
 * 首次使用时的功能引导，分步骤介绍核心功能。
 */
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    title: '侧边栏导航',
    content: '从这里访问所有功能模块。点击任意项即可切换页面。',
    position: 'right',
  },
  {
    target: '[data-tour="search"]',
    title: '全局搜索',
    content: '按 Ctrl+K 打开搜索，快速找到页面、任务或文档。',
    position: 'bottom',
  },
  {
    target: '[data-tour="harness"]',
    title: 'Harness 合规',
    content: '管理 BET 交付的全生命周期合规，包括 8 阶段 DAG 和 12 章节检查。',
    position: 'right',
  },
  {
    target: '[data-tour="intent"]',
    title: 'Intent 编译器',
    content: '用自然语言描述需求，自动编译成可执行的 Spec。',
    position: 'right',
  },
  {
    target: '[data-tour="governance"]',
    title: '治理自检',
    content: '一键运行全量治理检查，发现架构漂移和合规风险。',
    position: 'right',
  },
];

const STORAGE_KEY = 'cockpit-onboarding-completed';

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // 检查是否已完成引导
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // 延迟显示，等待页面渲染
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const currentStep = TOUR_STEPS[step];

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop with cutout effect */}
      <div className="absolute inset-0 bg-black/50" onClick={handleSkip} />

      {/* Tour Card */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm">
        <div className="bg-surface-1 border border-border-subtle rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-tertiary">
                引导 {step + 1}/{TOUR_STEPS.length}
              </span>
            </div>
            <button onClick={handleSkip} className="p-1 hover:bg-surface-2 rounded">
              <X size={14} className="text-text-tertiary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-text-primary mb-2">{currentStep.title}</h3>
            <p className="text-sm text-text-secondary">{currentStep.content}</p>
          </div>

          {/* Progress */}
          <div className="flex gap-1 px-4">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i <= step ? 'bg-primary' : 'bg-surface-2'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-4">
            <button
              onClick={handlePrev}
              disabled={step === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary disabled:opacity-30"
            >
              <ChevronLeft size={14} />
              上一步
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSkip}
                className="px-3 py-1.5 text-sm text-text-tertiary hover:text-text-secondary"
              >
                跳过
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
              >
                {step === TOUR_STEPS.length - 1 ? (
                  <>
                    <Check size={14} />
                    完成
                  </>
                ) : (
                  <>
                    下一步
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 重置引导状态 (用于测试或重新显示)
 */
export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 检查是否已完成引导
 */
export function isOnboardingCompleted(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}
