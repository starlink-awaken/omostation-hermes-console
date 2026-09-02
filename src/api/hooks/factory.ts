/**
 * useResource — 标准化资源 Hook 工厂
 *
 * 统一数据获取模式，避免每个资源重复编写类似的 useQuery/useMutation。
 */
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiFetch, apiPost, apiPut, apiDelete } from '../index';

interface ResourceHooks<T> {
  useGet: (id: string, options?: UseQueryOptions<T>) => ReturnType<typeof useQuery<T>>;
  useList: (params?: Record<string, string>, options?: UseQueryOptions<T[]>) => ReturnType<typeof useQuery<T[]>>;
  useCreate: (options?: UseMutationOptions<T, Error, Partial<T>>) => ReturnType<typeof useMutation<T, Error, Partial<T>>>;
  useUpdate: (options?: UseMutationOptions<T, Error, { id: string; data: Partial<T> }>) => ReturnType<typeof useMutation<T, Error, { id: string; data: Partial<T> }>>;
  useRemove: (options?: UseMutationOptions<void, Error, string>) => ReturnType<typeof useMutation<void, Error, string>>;
}

/**
 * 创建一组标准化的资源 CRUD Hooks
 *
 * @example
 * const { useGet, useList, useCreate, useUpdate, useRemove } = createResourceHooks<Task>('/api/tasks');
 * const { data: task } = useGet('task-123');
 * const { data: tasks } = useList({ status: 'active' });
 */
export function createResourceHooks<T extends { id: string }>(
  endpoint: string,
  keyPrefix: string,
): ResourceHooks<T> {
  const queryClient = useQueryClient();

  const useGet = (id: string, options?: UseQueryOptions<T>) =>
    useQuery<T>({
      queryKey: [keyPrefix, 'detail', id],
      queryFn: () => apiFetch(`${endpoint}/${id}`),
      staleTime: 30_000,
      ...options,
    });

  const useList = (params?: Record<string, string>, options?: UseQueryOptions<T[]>) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return useQuery<T[]>({
      queryKey: [keyPrefix, 'list', params],
      queryFn: () => apiFetch(`${endpoint}${queryString}`),
      staleTime: 30_000,
      ...options,
    });
  };

  const useCreate = (options?: UseMutationOptions<T, Error, Partial<T>>) =>
    useMutation({
      mutationFn: (data) => apiPost(endpoint, data) as Promise<T>,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [keyPrefix, 'list'] });
      },
      ...options,
    });

  const useUpdate = (options?: UseMutationOptions<T, Error, { id: string; data: Partial<T> }>) =>
    useMutation({
      mutationFn: ({ id, data }) => apiPut(`${endpoint}/${id}`, data) as Promise<T>,
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: [keyPrefix, 'list'] });
        queryClient.invalidateQueries({ queryKey: [keyPrefix, 'detail', id] });
      },
      ...options,
    });

  const useRemove = (options?: UseMutationOptions<void, Error, string>) =>
    useMutation({
      mutationFn: (id) => apiDelete(`${endpoint}/${id}`) as Promise<void>,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [keyPrefix, 'list'] });
      },
      ...options,
    });

  return { useGet, useList, useCreate, useUpdate, useRemove };
}

/**
 * 创建单个查询 Hook (用于非 CRUD 场景)
 *
 * @example
 * const useHealth = createQueryHook<SystemHealth>('health', () => apiFetch('/api/health'));
 * const { data } = useHealth();
 */
export function createQueryHook<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
) {
  return () =>
    useQuery<T>({
      queryKey: [key],
      queryFn: fetcher,
      staleTime: 30_000,
      ...options,
    });
}

/**
 * 创建单个变更 Hook
 *
 * @example
 * const useCompileIntent = createMutationHook('intent-compile', (input) => apiPost('/api/compile/intent', input));
 * const { mutate, isPending } = useCompileIntent();
 */
export function createMutationHook<TInput, TOutput>(
  key: string,
  mutator: (input: TInput) => Promise<TOutput>,
  options?: Omit<UseMutationOptions<TOutput, Error, TInput>, 'mutationFn' | 'mutationKey'>,
) {
  return () =>
    useMutation({
      mutationKey: [key],
      mutationFn: mutator,
      ...options,
    });
}
