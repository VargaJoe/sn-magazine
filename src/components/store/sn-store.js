import { create } from 'zustand'

export const useSnStore = create()((set) => ({
  context: {},
  setContext: (context) => set(() => ({ context: context })),
}));
