// State management: Zustand, Jotai, or Redux Toolkit — each with a counter
// store and a matching demo card.

// ---------------------------------------------------------------------------
// Zustand
// ---------------------------------------------------------------------------

export function zustandStore() {
  return `import { create } from "zustand";

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  decrement: () => set((s) => ({ count: s.count - 1 })),
}));
`;
}

// ---------------------------------------------------------------------------
// Jotai
// ---------------------------------------------------------------------------

export function jotaiStore() {
  return `import { atom } from "jotai";

export const countAtom = atom(0);

// Derived atom example: reads other atoms, recomputes automatically
export const doubleCountAtom = atom((get) => get(countAtom) * 2);
`;
}

// ---------------------------------------------------------------------------
// Redux Toolkit
// ---------------------------------------------------------------------------

export function reduxStore() {
  return `import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "./counter-slice";

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`;
}

export function reduxSlice() {
  return `import { createSlice } from "@reduxjs/toolkit";

const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
  },
});

export const { increment, decrement } = counterSlice.actions;
export default counterSlice.reducer;
`;
}

export function reduxHooks() {
  return `import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";

// Pre-typed hooks — use these instead of plain useDispatch/useSelector
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
`;
}

// ---------------------------------------------------------------------------
// Counter demo (varies by state library)
// ---------------------------------------------------------------------------

export function counterDemo(state) {
  const titles = {
    zustand: ["Zustand store", "src/stores/counter.ts"],
    jotai: ["Jotai atoms", "src/stores/counter.ts"],
    redux: ["Redux Toolkit", "src/stores/counter-slice.ts"],
  };
  const [title, file] = titles[state];

  let hookImport;
  let hookUsage;
  if (state === "zustand") {
    hookImport = `import { useCounterStore } from "@/stores/counter";`;
    hookUsage = `  const { count, increment, decrement } = useCounterStore();`;
  } else if (state === "jotai") {
    hookImport = `import { useAtom } from "jotai";
import { countAtom } from "@/stores/counter";`;
    hookUsage = `  const [count, setCount] = useAtom(countAtom);
  const increment = () => setCount((c) => c + 1);
  const decrement = () => setCount((c) => c - 1);`;
  } else {
    hookImport = `import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { decrement as decrementAction, increment as incrementAction } from "@/stores/counter-slice";`;
    hookUsage = `  const count = useAppSelector((s) => s.counter.value);
  const dispatch = useAppDispatch();
  const increment = () => dispatch(incrementAction());
  const decrement = () => dispatch(decrementAction());`;
  }

  return `import { Minus, Plus } from "lucide-react";
${hookImport}
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CounterDemo() {
${hookUsage}

  return (
    <Card>
      <CardHeader>
        <CardTitle>${title}</CardTitle>
        <CardDescription>
          Global state from <code>${file}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={decrement}>
          <Minus className="size-4" />
        </Button>
        <span className="min-w-10 text-center text-2xl font-bold tabular-nums">
          {count}
        </span>
        <Button variant="outline" size="icon" onClick={increment}>
          <Plus className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
`;
}

/** Files + deps for the chosen state library. */
export function statePlan(state) {
  if (state === "zustand") {
    return {
      deps: ["zustand"],
      files: {
        "src/stores/counter.ts": zustandStore(),
        "src/components/counter-demo.tsx": counterDemo("zustand"),
      },
    };
  }
  if (state === "jotai") {
    return {
      deps: ["jotai"],
      files: {
        "src/stores/counter.ts": jotaiStore(),
        "src/components/counter-demo.tsx": counterDemo("jotai"),
      },
    };
  }
  if (state === "redux") {
    return {
      deps: ["@reduxjs/toolkit", "react-redux"],
      files: {
        "src/stores/store.ts": reduxStore(),
        "src/stores/counter-slice.ts": reduxSlice(),
        "src/stores/hooks.ts": reduxHooks(),
        "src/components/counter-demo.tsx": counterDemo("redux"),
      },
    };
  }
  return { deps: [], files: {} };
}
