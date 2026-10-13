import { createContext, useCallback, useContext, useId, useMemo, useState } from 'react';

const TabsContext = createContext(null);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tabs components must be used inside Tabs.');
  return context;
};

export const Tabs = ({ defaultValue, value, onValueChange, children, className = '' }) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const id = useId();
  const activeValue = value ?? internalValue;
  const setValue = useCallback((nextValue) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }, [onValueChange, value]);
  const context = useMemo(
    () => ({ activeValue, setValue, id }),
    [activeValue, id, setValue],
  );

  return (
    <TabsContext.Provider value={context}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className = '', ...props }) => (
  <div
    role="tablist"
    {...props}
    className={`flex w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_8px_24px_rgba(19,44,95,0.04)] ${className}`}
  >
    {children}
  </div>
);

export const TabsTrigger = ({ value, children, className = '' }) => {
  const { activeValue, setValue, id } = useTabs();
  const selected = activeValue === value;
  const triggerId = `${id}-tab-${value}`;
  const panelId = `${id}-panel-${value}`;

  const moveFocus = (direction) => {
    const tabs = Array.from(
      document.querySelectorAll(`[role="tab"][data-tabs-group="${id}"]`),
    );
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    tabs[nextIndex]?.focus();
    tabs[nextIndex]?.click();
  };

  return (
    <button
      id={triggerId}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={panelId}
      tabIndex={selected ? 0 : -1}
      data-state={selected ? 'active' : 'inactive'}
      data-tabs-group={id}
      onClick={() => setValue(value)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          moveFocus(1);
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          moveFocus(-1);
        }
        if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          const tabs = Array.from(
            document.querySelectorAll(`[role="tab"][data-tabs-group="${id}"]`),
          );
          const target = event.key === 'Home' ? tabs[0] : tabs.at(-1);
          target?.focus();
          target?.click();
        }
      }}
      className={`min-h-10 flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:text-nu-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-1 data-[state=active]:bg-nu-navy data-[state=active]:text-white sm:px-5 ${className}`}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children, className = '' }) => {
  const { activeValue, id } = useTabs();
  if (activeValue !== value) return null;
  return (
    <div
      id={`${id}-panel-${value}`}
      role="tabpanel"
      aria-labelledby={`${id}-tab-${value}`}
      tabIndex={0}
      className={`min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </div>
  );
};
