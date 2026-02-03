# Dashboard Guidelines

> UI patterns and component usage for the Butler dashboard.

## Component Library

The dashboard uses a combination of:
- **shadcn/ui** - Base components (`components/ui/`)
- **Custom components** - Built on top of shadcn (`components/`)

### UI Components (`components/ui/`)

| Component | Purpose |
|-----------|---------|
| `Alert` | Page-level notifications with title, description, dismiss |
| `Badge` | Status indicators, labels, counts |
| `Button` | Actions with `variant`, `size`, and `loading` props |
| `Card` | Content containers with header, content, footer |
| `Checkbox` | Form checkboxes |
| `ConfirmDialog` | Confirmation modals for destructive actions |
| `Dialog` | Modal dialogs (base component) |
| `Drawer` | Slide-out panels |
| `DropdownMenu` | Action menus, context menus |
| `FilterTabs` | Tab-style filter buttons for tables |
| `InlineAlert` | Compact card-level errors/warnings |
| `Input` | Text inputs |
| `Label` | Form field labels |
| `SectionCard` | Card with icon + title header pattern |
| `Skeleton` | Animated loading placeholder |
| `Spinner` | Loading spinner with size variants (xs, sm, md, lg) |
| `Switch` | Toggle switches |
| `Table` | Data tables (for custom layouts) |
| `Tabs` | Tab navigation with icon support |
| `Textarea` | Multi-line text inputs |
| `Tooltip` | Hover tooltips (portal-based, works with overflow) |

### Shared Components (`components/`)

| Component | Purpose |
|-----------|---------|
| `ActionItems` | Onboarding checklist for dashboard home |
| `DataTable` | Full-featured table with search, filters, pagination |
| `EmptyState` | Empty/no-data states with icon and message |
| `PageContainer` | Page wrapper with consistent padding |
| `PageHeader` | Page header with actions slot |
| `SearchInput` | Search input with icon |
| `StatsBar` | Row of stat cards at top of pages |
| `ChannelIcon` | Icons for messaging channels (WhatsApp, SMS, Email) |
| `ExtensionIcon` | Icons for extensions/integrations |

---

## Alert Patterns

### Page-Level Alerts (`Alert`)

Use for errors, warnings, success messages at the top of a page.

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Error with dismiss
{error && (
  <Alert variant="destructive" className="mb-6" onDismiss={() => setError(null)}>
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}

// Error with title and action
<Alert variant="destructive" className="mb-6">
  <AlertTitle>Configuration Required</AlertTitle>
  <AlertDescription className="flex items-end justify-between">
    <span>Description text here.</span>
    <Link to="/settings" className="flex items-center gap-1 font-medium hover:underline ml-4 whitespace-nowrap">
      Configure <ArrowRight className="h-3 w-3" />
    </Link>
  </AlertDescription>
</Alert>

// Success message
<Alert variant="success" className="mb-6" onDismiss={() => setMessage(null)}>
  <AlertDescription>{message}</AlertDescription>
</Alert>
```

**Variants:** `default`, `info`, `success`, `warning`, `destructive`

### Card-Level Alerts (`InlineAlert`)

Use for compact errors/warnings inside cards.

```tsx
import { InlineAlert } from '@/components/ui/inline-alert';

{item.lastError && (
  <InlineAlert variant="error" className="mt-3">
    {item.lastError}
  </InlineAlert>
)}
```

**Variants:** `default`, `info`, `success`, `warning`, `error`

---

## Filter Tabs

Use for filtering table data with toggle-style buttons.

```tsx
import { FilterTabs } from '@/components/ui/filter-tabs';

// Define options (usually at module level)
const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

// In component
const [status, setStatus] = useState('all');

<DataTable
  filters={
    <FilterTabs
      options={statusFilters}
      value={status}
      onChange={setStatus}
    />
  }
  // ...
/>
```

For dynamic options (e.g., categories from API):
```tsx
const categoryOptions = [
  { value: '', label: 'All' },
  ...categories.map((cat) => ({ value: cat.id, label: cat.label })),
];
```

---

## Button Patterns

```tsx
import { Button } from '@/components/ui/button';

// Primary action
<Button>
  <Plus className="w-4 h-4 mr-1.5" />
  Add Item
</Button>

// Secondary/Destructive
<Button variant="outline">Cancel</Button>
<Button variant="destructive">Delete</Button>

// Loading state (built-in) - auto-adds spinner & disables
<Button loading={isPending}>Save</Button>
<Button loading={isPending}>
  <Save className="w-4 h-4 mr-1.5" />
  Save
</Button>

// Loading with icon replacement (when spinner should replace icon)
<Button disabled={saving}>
  {saving ? <Spinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
  Save
</Button>
```

**Button Sizes:**
| Size | Height | Use For |
|------|--------|---------|
| `xs` | 28px | Table row actions, compact spaces |
| `sm` | 36px | Header actions, card actions |
| `default` | 40px | Form submit buttons, modals |
| `lg` | 44px | Large CTAs |

---

## Page Structure

### Standard Page Layout

```tsx
import { PageContainer, StatsBar, DataTable, EmptyState } from '@/components';
import { usePageActions } from '@/contexts/PageActionsContext';

export function MyPage() {
  const { setActions } = usePageActions();

  // Set header actions
  useEffect(() => {
    setActions(
      <Button size="sm">
        <Plus className="w-4 h-4 mr-1.5" />
        Add New
      </Button>
    );
    return () => setActions(null);
  }, [setActions]);

  return (
    <PageContainer>
      {/* Page-level alerts */}
      {error && (
        <Alert variant="destructive" className="mb-6" onDismiss={() => setError(null)}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats bar (optional) */}
      <StatsBar items={[...]} />

      {/* Main content */}
      <DataTable
        data={items}
        columns={columns}
        loading={loading}
        emptyState={<EmptyState icon={Box} title="No items" description="..." />}
      />
    </PageContainer>
  );
}
```

### Card-Based Page

```tsx
<PageContainer>
  <Card>
    <CardHeader>
      <CardTitle>Section Title</CardTitle>
      <CardDescription>Optional description</CardDescription>
    </CardHeader>
    <CardContent>
      {/* Content */}
    </CardContent>
  </Card>
</PageContainer>
```

---

## Form Patterns

### Standard Form

```tsx
<Card>
  <CardHeader>
    <CardTitle>{editing ? 'Edit' : 'Add'} Item</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div>
      <label className="text-sm font-medium">Field Label</label>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Placeholder text"
        className="mt-1"
      />
    </div>

    <div className="flex justify-end gap-2 pt-4 border-t">
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onSave} loading={saving}>Save</Button>
    </div>
  </CardContent>
</Card>
```

---

## Table Patterns

### Using DataTable

```tsx
import { DataTable, EmptyState } from '@/components';
import type { Column } from '@/components/DataTable';

const columns: Column<Item>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (item) => <span className="font-medium">{item.name}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (item) => <Badge>{item.status}</Badge>,
  },
  {
    key: 'actions',
    header: '',
    className: 'w-16',
    render: (item) => (
      <DropdownMenu>
        <DropdownMenuTrigger>
          <button className="p-1.5 rounded hover:bg-gray-100">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onEdit(item)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(item)}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

<DataTable
  data={items}
  columns={columns}
  keyExtractor={(item) => item.id}
  loading={loading}
  emptyState={<EmptyState icon={Box} title="No items" />}
/>
```

---

## Confirmation Dialogs

```tsx
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

<ConfirmDialog
  open={showConfirm}
  onOpenChange={setShowConfirm}
  title="Delete Item"
  description="Are you sure? This action cannot be undone."
  confirmLabel="Delete"
  variant="destructive"
  onConfirm={handleDelete}
/>
```

---

## Loading States

### Skeleton Loading (Lists/Tables)

Use skeleton placeholders for list and table pages - they show the expected layout structure.

```tsx
// DataTable has built-in skeleton loading
<DataTable
  data={items}
  columns={columns}
  loading={isLoading}  // Automatically shows skeleton rows
  skeletonRows={5}     // Optional: default is 5
/>

// Custom list skeletons
import { ConversationListSkeleton, AutomationCardSkeleton } from '@/components';

{isLoading ? <ConversationListSkeleton count={6} /> : <ConversationList ... />}
{isLoading ? <AutomationCardSkeleton count={3} /> : <div>...</div>}
```

**Available Skeletons:**
| Component | Use For |
|-----------|---------|
| `Skeleton` | Base animated placeholder (`@/components/ui/skeleton`) |
| `ConversationListSkeleton` | Inbox conversation list |
| `ApprovalTableSkeleton` | Approval queue table rows |
| `AutomationCardSkeleton` | Automation rule cards |
| `ExtensionCardSkeleton` | Extension cards grid |

### Button Loading

Use the `loading` prop on Button - it automatically shows a spinner and disables the button.

```tsx
// Simple loading (adds spinner before text)
<Button loading={isPending}>Save</Button>

// Icon replacement pattern (when spinner should replace icon)
<Button disabled={saving}>
  {saving ? <Spinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
  Save
</Button>
```

### Page/Section Loading

```tsx
import { Spinner } from '@/components/ui/spinner';

// Detail page loading
if (loading) {
  return (
    <PageContainer>
      <div className="py-12 text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </PageContainer>
  );
}
```

**Spinner Sizes:** `xs` (12px), `sm` (16px), `md` (24px), `lg` (32px)

---

## Color Conventions

| Usage | How to Apply |
|-------|--------------|
| Primary buttons | Use `<Button>` default variant (uses `--primary` CSS variable) |
| Secondary buttons | `<Button variant="outline">` |
| Error/destructive | `variant="destructive"` or `bg-red-50 text-red-700` |
| Success | `variant="success"` or `bg-green-50 text-green-700` |
| Warning | `variant="warning"` or `bg-yellow-50 text-yellow-700` |
| Info | `variant="info"` or `bg-blue-50 text-blue-700` |
| Muted text | `text-gray-500` or `text-muted-foreground` |

**CSS Variables (defined in `index.css`):**
- `--primary: 0 0% 0%` - True black for primary actions
- `--primary-foreground: 0 0% 100%` - White text on primary

---

## Icon Usage

Import from `lucide-react`:

```tsx
import { Plus, AlertCircle, Check, X, MoreHorizontal } from 'lucide-react';
```

Use the `iconSize` constants from `@/lib/icons` for consistent sizing:

```tsx
import { iconSize } from '@/lib/icons';

<Plus className={iconSize.sm} />  // 16px - standard button/inline
<AlertCircle className={iconSize.xl} />  // 32px - feature icons
```

| Size | Class | Pixels | Use For |
|------|-------|--------|---------|
| `xs` | `w-3 h-3` | 12px | Tiny icons in compact badges |
| `xs-button` | `w-3.5 h-3.5` | 14px | Button icons (size="xs") |
| `sm` | `w-4 h-4` | 16px | Standard buttons and inline text |
| `md` | `w-5 h-5` | 20px | Medium icons |
| `lg` | `w-6 h-6` | 24px | Large icons |
| `xl` | `w-8 h-8` | 32px | Spinners, feature icons |
| `2xl` | `w-12 h-12` | 48px | Empty state icons |

---

## File Organization

```
apps/dashboard/src/
├── components/
│   ├── ui/              # Base UI components (shadcn-style)
│   ├── shared/          # Shared business components
│   ├── layout/          # Layout components
│   └── [domain]/        # Domain-specific (conversations/, extensions/)
├── pages/               # Page components by feature
├── hooks/               # Custom React hooks
├── contexts/            # React contexts
├── lib/                 # Utilities (api, utils, config)
└── types/               # TypeScript types
```

## Naming Conventions

| Location | Convention | Examples |
|----------|------------|----------|
| `components/ui/` | lowercase kebab-case | `button.tsx`, `confirm-dialog.tsx` |
| `components/*` (other) | PascalCase | `DataTable.tsx`, `EmptyState.tsx` |
| `pages/` | PascalCase | `Login.tsx`, `Guests.tsx` |
| `contexts/` | PascalCase | `PageActionsContext.tsx` |
| `hooks/` | camelCase with `use` prefix | `useAuth.ts`, `useFilteredQuery.ts` |
| `lib/` | lowercase | `api.ts`, `formatters.ts`, `config.ts` |
| `types/` | lowercase | `api.ts` |

- **Folders** are always lowercase: `guests/`, `settings/`, `ui/`
- **`ui/`** follows shadcn/ui convention (lowercase kebab-case)
- **All other components** use PascalCase to match React component names