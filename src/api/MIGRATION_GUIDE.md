# API Layer Migration Guide

## Overview

This guide explains how to migrate from the old scattered `fetch()` pattern to the new centralized API layer with React Query.

## Old Pattern (Before)

```tsx
// ❌ Old pattern: scattered fetch calls, manual state management
function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/some-endpoint')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>{data}</div>;
}
```

**Problems:**
- No request cancellation (memory leak on unmount)
- No caching (same data fetched multiple times)
- No deduplication (multiple components fetch same data)
- Manual loading/error state management
- No background refetching
- Inconsistent error handling

## New Pattern (After)

```tsx
// ✅ New pattern: React Query hooks, automatic state management
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

function MyComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['some-endpoint'],
    queryFn: async () => {
      const response = await apiFetch('/api/some-endpoint');
      if (!response.ok) throw new Error(response.error);
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{data}</div>;
}
```

**Benefits:**
- ✅ Automatic request cancellation
- ✅ Automatic caching (configurable staleTime)
- ✅ Request deduplication (multiple components share one request)
- ✅ Automatic loading/error states
- ✅ Background refetching (configurable refetchInterval)
- ✅ Consistent error handling
- ✅ Retry on failure (configurable retry count)

## Migration Steps

### Step 1: Import the API client

```tsx
import { apiFetch } from '../api/client';
// or
import { useSystemMap, useTasks } from '../api/hooks';
```

### Step 2: Replace useEffect + fetch with useQuery

**Before:**
```tsx
const [data, setData] = useState(null);
useEffect(() => {
  fetch('/api/endpoint').then(res => res.json()).then(setData);
}, []);
```

**After:**
```tsx
const { data } = useQuery({
  queryKey: ['endpoint'],
  queryFn: () => apiFetch('/api/endpoint'),
});
```

### Step 3: Use pre-built hooks when available

```tsx
// Instead of manual query setup, use the pre-built hooks
const { data: systemMap } = useSystemMap();
const { data: tasks } = useTasks();
const { data: alerts } = useAlerts();
```

### Step 4: Handle loading and error states

```tsx
const { data, isLoading, error } = useQuery(...);

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <DataDisplay data={data} />;
```

### Step 5: Use mutations for data modifications

```tsx
import { useUpdateTaskStatus } from '../api/hooks';

function TaskComponent({ task }) {
  const updateStatus = useUpdateTaskStatus();
  
  const handleComplete = () => {
    updateStatus.mutate({ 
      taskId: task.id, 
      status: 'completed' 
    });
  };
  
  return (
    <button 
      onClick={handleComplete}
      disabled={updateStatus.isPending}
    >
      {updateStatus.isPending ? 'Updating...' : 'Complete'}
    </button>
  );
}
```

## Available Hooks

### Data Fetching Hooks

| Hook | Description | Cache Time |
|------|-------------|------------|
| `useSystemMap()` | System map data | 30s |
| `useTasks(params?)` | Task list | 30s |
| `useDomainApps()` | Domain applications | 60s |
| `useAlerts(limit?)` | Alert list | 15s |
| `useAlertRules()` | Alert rules | 60s |
| `useBosServices()` | BOS services | 60s |
| `useComputeStatus()` | Compute status | 30s |
| `useLogs(limit?)` | Log entries | 10s |
| `useResearch(params?)` | Research items | 60s |
| `useWorkflows(params?)` | Workflows | 30s |
| `useEcosSkills()` | Ecos skills | 60s |
| `usePipelines()` | Pipelines | 60s |
| `useDebt()` | Debt status | 60s |
| `useL4Health()` | L4 health | 30s |
| `useProposals()` | Proposals | 60s |
| `useGBrainAgents()` | GBrain agents | 60s |
| `useQuests()` | Quests | 60s |
| `useKosSearch(query, limit?)` | KOS search | 30s |
| `useSystemHealth()` | System health | 15s |

### Mutation Hooks

| Hook | Description |
|------|-------------|
| `useUpdateTaskStatus()` | Update task status |
| `useCreateTask()` | Create new task |
| `useDeleteTask()` | Delete task |
| `useCreateAlertRule()` | Create alert rule |

## Example Migration

See `src/components/home/HealthSummarySectionMigrated.tsx` for a complete migration example.

## Best Practices

1. **Use pre-built hooks** when available instead of manual `useQuery` calls
2. **Set appropriate staleTime** based on data freshness requirements
3. **Use queryKey arrays** for cache invalidation and deduplication
4. **Handle loading/error states** gracefully in the UI
5. **Use mutations** for data modifications instead of manual `fetch` calls
6. **Invalidate queries** after mutations to refetch related data

## Troubleshooting

### Data not updating after mutation

Make sure to invalidate the query after mutation:
```tsx
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: ...,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  },
});
```

### Multiple requests for same data

This is normal with React Query. It deduplicates requests with the same `queryKey`. If you see multiple requests, check that your `queryKey` is consistent.

### Stale data showing

Adjust `staleTime` to control how long data is considered fresh:
```tsx
useQuery({
  queryKey: ['data'],
  queryFn: ...,
  staleTime: 60000, // 1 minute
});
```
