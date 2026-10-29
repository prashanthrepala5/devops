export const PROFILE_CATEGORIES = [
  { value: 'frontend-web', label: 'Frontend / Web Development' },
  { value: 'backend-java', label: 'Backend / Java' },
  { value: 'full-stack', label: 'Full Stack' },
  { value: 'data-engineering', label: 'Data Engineering / Analytics' },
  { value: 'qa-testing', label: 'QA / Testing' },
  { value: 'devops-cloud', label: 'DevOps / Cloud' },
  { value: 'mobile-development', label: 'Mobile Development' },
  { value: 'dotnet', label: '.NET' },
  { value: 'custom', label: 'Other / Custom' }
];

export function profileCategoryLabel(value, customCategory = '') {
  if (value === 'custom') return customCategory || 'Other / Custom';
  return PROFILE_CATEGORIES.find(item => item.value === value)?.label || 'Not specified';
}
