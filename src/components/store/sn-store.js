import { create } from 'zustand'

export const useSnStore = create()((set) => ({
  // context sn content
  context: {},
  setContext: (context) => set(() => ({ context: context })),
  // page sn content
  page: {},
  setPage: (page) => set(() => ({ page: page })),
  // widget sn contents
  widgets: [{}],
  setWidgets: (widgets) => set(() => ({ widgets: widgets })),  
  // layout sn content
  layout: 'vanilla',
  setLayout: (layout) => set(() => ({ layout: layout })),
  // layout react component
  wrappercompo: {},
  setCompo: (wrappercompo) => set(() => ({ wrappercompo: wrappercompo })),
}));
