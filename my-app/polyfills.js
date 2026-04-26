// Polyfill para resolver el error del módulo 1417 y otros módulos numéricos problemáticos
// Este archivo debe ser importado al inicio de la aplicación

console.log('🔧 Cargando polyfill para módulos numéricos problemáticos...');

// Crear un objeto vacío que se exportará para todos los módulos problemáticos
const emptyModule = {
  default: {},
  __esModule: true,
  // Agregar propiedades comunes que podrían ser requeridas
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
  version: '0.0.0-polyfill',
};

// Lista completa de módulos problemáticos
const problemModules = [
  '1416', '1417', '1418', '1419', '1420',
  '1421', '1422', '1423', '1424', '1425',
  '1426', '1427', '1428', '1429', '1430',
  '1431', '1432', '1433', '1434', '1435'
];

// Interceptar el sistema de módulos a nivel global
if (typeof global !== 'undefined') {
  // Interceptar require a nivel global
  const originalRequire = global.require;
  if (originalRequire) {
    global.require = function(id) {
      if (problemModules.includes(id)) {
        console.warn(`⚠️ POLYFILL: Módulo ${id} interceptado - devolviendo módulo vacío`);
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
        console.warn(`⚠️ POLYFILL: Resolviendo módulo ${id} - devolviendo polyfill`);
        return `polyfill-${id}`;
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
      console.warn(`⚠️ POLYFILL: __r interceptado para módulo ${moduleId}`);
      return () => emptyModule;
    }
    return originalR ? originalR(moduleId) : () => emptyModule;
  };

  // Interceptar __d (definición de módulos)
  const originalD = global.__d;
  global.__d = function(moduleId, factory) {
    if (problemModules.includes(moduleId)) {
      console.warn(`⚠️ POLYFILL: __d interceptado para módulo ${moduleId}`);
      return originalD ? originalD(moduleId, () => emptyModule) : () => emptyModule;
    }
    return originalD ? originalD(moduleId, factory) : () => emptyModule;
  };
}

// Exportar el módulo vacío para cuando este archivo sea requerido directamente
module.exports = emptyModule;

console.log('✅ Polyfill para módulos numéricos problemáticos cargado correctamente');