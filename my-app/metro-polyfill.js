// Polyfill específico para Metro Bundler - debe ejecutarse ANTES que cualquier cosa
console.log('🔧 Cargando polyfill específico para Metro Bundler...');

// Interceptar el sistema de módulos de Metro a nivel más bajo
if (typeof global !== 'undefined') {
  // Lista completa de módulos problemáticos
  const problemModules = [
    '1416', '1417', '1418', '1419', '1420',
    '1421', '1422', '1423', '1424', '1425',
    '1426', '1427', '1428', '1429', '1430',
    '1431', '1432', '1433', '1434', '1435'
  ];

  // Crear módulo vacío
  const emptyModule = {
    default: {},
    __esModule: true,
    Component: null,
    createElement: null,
    useState: null,
    useEffect: null,
    useCallback: null,
    useMemo: null,
    useRef: null,
    useContext: null,
    useReducer: null,
    useImperativeHandle: null,
    useLayoutEffect: null,
    useDebugValue: null,
    forwardRef: null,
    memo: null,
    lazy: null,
    Suspense: null,
    Fragment: null,
    StrictMode: null,
    PureComponent: null,
    createContext: null,
    createRef: null,
    isValidElement: null,
    cloneElement: null,
    Children: null,
    version: '0.0.0-metro-polyfill',
  };

  // Interceptar require a nivel global ANTES que Metro
  const originalRequire = global.require;
  if (originalRequire) {
    global.require = function(id) {
      if (problemModules.includes(id)) {
        console.warn(`🚫 METRO POLYFILL: Bloqueando módulo ${id} - devolviendo módulo vacío`);
        return emptyModule;
      }
      return originalRequire.apply(this, arguments);
    };
  }

  // Interceptar require.resolve
  if (originalRequire && originalRequire.resolve) {
    const originalRequireResolve = originalRequire.resolve;
    originalRequire.resolve = function(id) {
      if (problemModules.includes(id)) {
        console.warn(`🚫 METRO POLYFILL: Resolviendo módulo ${id} - devolviendo polyfill`);
        return `metro-polyfill-${id}`;
      }
      return originalRequireResolve.apply(this, arguments);
    };
  }

  // Interceptar el sistema de módulos de React Native/Metro
  global.__r = global.__r || {};
  global.__d = global.__d || {};
  
  // Interceptar __r (resolución de módulos) - Metro
  const originalR = global.__r;
  global.__r = function(moduleId) {
    if (problemModules.includes(moduleId)) {
      console.warn(`🚫 METRO POLYFILL: __r interceptado para módulo ${moduleId}`);
      return () => emptyModule;
    }
    return originalR ? originalR(moduleId) : () => emptyModule;
  };

  // Interceptar __d (definición de módulos) - Metro
  const originalD = global.__d;
  global.__d = function(moduleId, factory) {
    if (problemModules.includes(moduleId)) {
      console.warn(`🚫 METRO POLYFILL: __d interceptado para módulo ${moduleId}`);
      return originalD ? originalD(moduleId, () => emptyModule) : () => emptyModule;
    }
    return originalD ? originalD(moduleId, factory) : () => emptyModule;
  };
}

console.log('✅ Polyfill específico para Metro Bundler cargado correctamente');
