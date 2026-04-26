// Polyfill específico para Hermes - debe cargarse ANTES que cualquier otra cosa
console.log('🔧 Cargando polyfill específico para Hermes...');

// Configuración específica para el motor Hermes
if (typeof global !== 'undefined') {
  // Crear un módulo vacío para todos los módulos problemáticos
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
    version: '0.0.0-hermes-polyfill',
  };

  // Lista de módulos problemáticos
  const numericModules = ['1416', '1417', '1418', '1419', '1420', '1421', '1422', '1423', '1424', '1425', '1426', '1427', '1428', '1429', '1430'];

  // Configurar el sistema de módulos de React Native para Hermes
  global.__r = global.__r || {};
  global.__d = global.__d || {};
  
  // Registrar cada módulo problemático
  numericModules.forEach(moduleId => {
    // Función de resolución de módulos
    global.__r[moduleId] = function() {
      console.warn(`⚠️ Hermes: Módulo ${moduleId} requerido - usando polyfill vacío`);
      return emptyModule;
    };
    
    // Función de definición de módulos
    global.__d[moduleId] = function() {
      console.warn(`⚠️ Hermes: Módulo ${moduleId} definido - usando polyfill vacío`);
      return emptyModule;
    };
  });

  // Interceptar require a nivel global
  const originalRequire = global.require;
  if (originalRequire) {
    global.require = function(id) {
      if (numericModules.includes(id)) {
        console.warn(`⚠️ Hermes: Intentando requerir módulo problemático ${id} - devolviendo polyfill`);
        return emptyModule;
      }
      return originalRequire.apply(this, arguments);
    };
  }

  // Interceptar require.resolve
  if (originalRequire && originalRequire.resolve) {
    const originalRequireResolve = originalRequire.resolve;
    originalRequire.resolve = function(id) {
      if (numericModules.includes(id)) {
        console.warn(`⚠️ Hermes: Intentando resolver módulo problemático ${id} - devolviendo polyfill`);
        return `hermes-polyfill-${id}`;
      }
      return originalRequireResolve.apply(this, arguments);
    };
  }

  // Configurar el sistema de módulos de Hermes
  if (typeof global.__d === 'function') {
    // Si __d es una función, la reemplazamos
    const originalD = global.__d;
    global.__d = function(moduleId, factory) {
      if (numericModules.includes(moduleId)) {
        console.warn(`⚠️ Hermes: Definiendo módulo problemático ${moduleId} - usando polyfill`);
        return originalD(moduleId, () => emptyModule);
      }
      return originalD.apply(this, arguments);
    };
  }
}

console.log('✅ Polyfill específico para Hermes cargado correctamente');

