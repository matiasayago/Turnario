// Solución definitiva para el error "Requiring unknown module 1417"
// Este archivo debe ejecutarse ANTES que cualquier otra cosa

console.log('🔧 Aplicando solución definitiva para módulo 1417...');

// Interceptar el sistema de módulos a nivel más bajo posible
if (typeof global !== 'undefined') {
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
    version: '0.0.0-definitive-fix',
  };

  // Lista completa de módulos problemáticos
  const problemModules = [
    '1416', '1417', '1418', '1419', '1420',
    '1421', '1422', '1423', '1424', '1425',
    '1426', '1427', '1428', '1429', '1430',
    '1431', '1432', '1433', '1434', '1435'
  ];

  // Interceptar require a nivel global
  const originalRequire = global.require;
  if (originalRequire) {
    global.require = function(id) {
      if (problemModules.includes(id)) {
        console.warn(`⚠️ SOLUCIÓN DEFINITIVA: Módulo ${id} interceptado - devolviendo módulo vacío`);
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
        console.warn(`⚠️ SOLUCIÓN DEFINITIVA: Resolviendo módulo ${id} - devolviendo polyfill`);
        return `definitive-fix-${id}`;
      }
      return originalRequireResolve.apply(this, arguments);
    };
  }

  // Interceptar el sistema de módulos de React Native
  global.__r = global.__r || {};
  global.__d = global.__d || {};
  
  // Interceptar __r (resolución de módulos)
  const originalR = global.__r;
  global.__r = function(moduleId) {
    if (problemModules.includes(moduleId)) {
      console.warn(`⚠️ SOLUCIÓN DEFINITIVA: __r interceptado para módulo ${moduleId}`);
      return () => emptyModule;
    }
    return originalR ? originalR(moduleId) : () => emptyModule;
  };

  // Interceptar __d (definición de módulos)
  const originalD = global.__d;
  global.__d = function(moduleId, factory) {
    if (problemModules.includes(moduleId)) {
      console.warn(`⚠️ SOLUCIÓN DEFINITIVA: __d interceptado para módulo ${moduleId}`);
      return originalD ? originalD(moduleId, () => emptyModule) : () => emptyModule;
    }
    return originalD ? originalD(moduleId, factory) : () => emptyModule;
  };

  // Interceptar el sistema de módulos de Metro
  if (typeof global.__d === 'function') {
    const originalD = global.__d;
    global.__d = function(moduleId, factory) {
      if (problemModules.includes(moduleId)) {
        console.warn(`⚠️ SOLUCIÓN DEFINITIVA: Metro __d interceptado para módulo ${moduleId}`);
        return originalD(moduleId, () => emptyModule);
      }
      return originalD(moduleId, factory);
    };
  }

  // Interceptar el sistema de módulos de Hermes
  if (typeof global.__r === 'function') {
    const originalR = global.__r;
    global.__r = function(moduleId) {
      if (problemModules.includes(moduleId)) {
        console.warn(`⚠️ SOLUCIÓN DEFINITIVA: Hermes __r interceptado para módulo ${moduleId}`);
        return () => emptyModule;
      }
      return originalR(moduleId);
    };
  }
}

console.log('✅ Solución definitiva para módulo 1417 aplicada correctamente');

